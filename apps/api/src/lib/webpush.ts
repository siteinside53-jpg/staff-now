/**
 * Workers-compatible Web Push (VAPID + aes128gcm content encoding).
 *
 * The npm `web-push` package depends on Node's `crypto` and does NOT run on
 * Cloudflare Workers, so this is a minimal from-scratch implementation on top of
 * the Web Crypto API (`crypto.subtle`) available in the Workers runtime.
 *
 *   • VAPID auth  → ES256 (P-256 ECDSA) JWT  — RFC 8292
 *   • Payload     → aes128gcm encryption     — RFC 8291 (keying) + RFC 8188 (framing)
 *
 * Keep this file dependency-free; it only uses Web Crypto + fetch.
 */

export interface PushSubscriptionKeys {
  endpoint: string;
  p256dh: string; // base64url — client public key (65 bytes, uncompressed)
  auth: string; // base64url — client auth secret (16 bytes)
}

export interface VapidConfig {
  publicKey: string; // base64url uncompressed P-256 point
  privateKey: string; // base64url 32-byte scalar
  subject: string; // "mailto:..." or an https URL
}

export interface PushResult {
  endpoint: string;
  status: number;
  ok: boolean;
  /** true when the push service reports the subscription is gone (404/410). */
  expired: boolean;
}

// ── base64url + byte helpers ────────────────────────────────────────────────

function b64urlToBytes(input: string): Uint8Array {
  let s = input.replace(/-/g, '+').replace(/_/g, '/');
  const pad = s.length % 4;
  if (pad) s += '='.repeat(4 - pad);
  const bin = atob(s);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

function bytesToB64url(bytes: Uint8Array): string {
  let bin = '';
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]!);
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function concatBytes(...parts: Uint8Array[]): Uint8Array {
  let total = 0;
  for (const p of parts) total += p.length;
  const out = new Uint8Array(total);
  let offset = 0;
  for (const p of parts) {
    out.set(p, offset);
    offset += p.length;
  }
  return out;
}

const utf8 = (s: string) => new TextEncoder().encode(s);

// ── VAPID JWT (ES256) ───────────────────────────────────────────────────────

async function importVapidSigningKey(vapid: VapidConfig): Promise<CryptoKey> {
  const pub = b64urlToBytes(vapid.publicKey); // 65 bytes: 0x04 | X(32) | Y(32)
  const priv = b64urlToBytes(vapid.privateKey); // 32-byte scalar d
  const jwk: JsonWebKey = {
    kty: 'EC',
    crv: 'P-256',
    d: bytesToB64url(priv),
    x: bytesToB64url(pub.slice(1, 33)),
    y: bytesToB64url(pub.slice(33, 65)),
    ext: true,
  };
  return crypto.subtle.importKey('jwk', jwk, { name: 'ECDSA', namedCurve: 'P-256' }, false, [
    'sign',
  ]);
}

async function createVapidJwt(vapid: VapidConfig, audience: string): Promise<string> {
  const key = await importVapidSigningKey(vapid);
  const header = { typ: 'JWT', alg: 'ES256' };
  const payload = {
    aud: audience,
    exp: Math.floor(Date.now() / 1000) + 12 * 60 * 60, // 12h
    sub: vapid.subject,
  };
  const signingInput = `${bytesToB64url(utf8(JSON.stringify(header)))}.${bytesToB64url(
    utf8(JSON.stringify(payload)),
  )}`;
  const signature = await crypto.subtle.sign(
    { name: 'ECDSA', hash: 'SHA-256' },
    key,
    utf8(signingInput),
  );
  return `${signingInput}.${bytesToB64url(new Uint8Array(signature))}`;
}

// ── aes128gcm payload encryption (RFC 8291 / RFC 8188) ──────────────────────

async function hkdf(
  salt: Uint8Array,
  ikm: Uint8Array,
  info: Uint8Array,
  length: number,
): Promise<Uint8Array> {
  const key = await crypto.subtle.importKey('raw', ikm, 'HKDF', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits(
    { name: 'HKDF', hash: 'SHA-256', salt, info },
    key,
    length * 8,
  );
  return new Uint8Array(bits);
}

async function encryptPayload(
  sub: PushSubscriptionKeys,
  plaintext: Uint8Array,
): Promise<Uint8Array> {
  const uaPublic = b64urlToBytes(sub.p256dh); // 65 bytes
  const authSecret = b64urlToBytes(sub.auth); // 16 bytes

  // Ephemeral (application-server) ECDH key pair.
  const asKeyPair = (await crypto.subtle.generateKey(
    { name: 'ECDH', namedCurve: 'P-256' },
    true,
    ['deriveBits'],
  )) as CryptoKeyPair;
  const asPublic = new Uint8Array(
    (await crypto.subtle.exportKey('raw', asKeyPair.publicKey)) as ArrayBuffer,
  ); // 65 bytes

  const uaKey = await crypto.subtle.importKey(
    'raw',
    uaPublic,
    { name: 'ECDH', namedCurve: 'P-256' },
    false,
    [],
  );
  const ecdhSecret = new Uint8Array(
    await crypto.subtle.deriveBits(
      // Web Crypto standard uses `public`; Cloudflare's .d.ts names it `$public`.
      { name: 'ECDH', public: uaKey } as unknown as SubtleCryptoDeriveKeyAlgorithm,
      asKeyPair.privateKey,
      256,
    ),
  );

  const salt = crypto.getRandomValues(new Uint8Array(16));

  // RFC 8291: derive the input keying material.
  const keyInfo = concatBytes(utf8('WebPush: info\0'), uaPublic, asPublic);
  const ikm = await hkdf(authSecret, ecdhSecret, keyInfo, 32);

  // RFC 8188: derive content-encryption key + nonce.
  const cek = await hkdf(salt, ikm, utf8('Content-Encoding: aes128gcm\0'), 16);
  const nonce = await hkdf(salt, ikm, utf8('Content-Encoding: nonce\0'), 12);

  const aesKey = await crypto.subtle.importKey('raw', cek, 'AES-GCM', false, ['encrypt']);
  // Single record: plaintext followed by the 0x02 last-record delimiter.
  const record = concatBytes(plaintext, new Uint8Array([0x02]));
  const ciphertext = new Uint8Array(
    await crypto.subtle.encrypt({ name: 'AES-GCM', iv: nonce, tagLength: 128 }, aesKey, record),
  );

  // RFC 8188 header: salt(16) | rs(4, BE) | idlen(1) | keyid(as_public) | ciphertext
  const rs = new Uint8Array(4);
  new DataView(rs.buffer).setUint32(0, 4096, false);
  const idlen = new Uint8Array([asPublic.length]);
  return concatBytes(salt, rs, idlen, asPublic, ciphertext);
}

// ── send ────────────────────────────────────────────────────────────────────

/**
 * Send a single Web Push message. `message` is an arbitrary string (we send
 * JSON) that the service worker receives in its `push` event.
 */
export async function sendWebPush(
  vapid: VapidConfig,
  sub: PushSubscriptionKeys,
  message: string,
): Promise<PushResult> {
  const url = new URL(sub.endpoint);
  const audience = `${url.protocol}//${url.host}`;
  const jwt = await createVapidJwt(vapid, audience);
  const body = await encryptPayload(sub, utf8(message));

  const res = await fetch(sub.endpoint, {
    method: 'POST',
    headers: {
      Authorization: `vapid t=${jwt}, k=${vapid.publicKey}`,
      'Content-Encoding': 'aes128gcm',
      'Content-Type': 'application/octet-stream',
      TTL: '2419200', // 28 days
      Urgency: 'normal',
    },
    body,
  });

  return {
    endpoint: sub.endpoint,
    status: res.status,
    ok: res.ok,
    expired: res.status === 404 || res.status === 410,
  };
}
