import { Hono } from 'hono';
import type { Env, AuthUser } from '../types';
import { requireAuth } from '../middleware/auth';
import { success, error } from '../lib/response';
import { generateId } from '../lib/id';
import { recordDataChange, getRequestIp, getGeoFromRequest } from '../lib/activity';

const uploads = new Hono<{ Bindings: Env; Variables: { user: AuthUser } }>();

// Allowed MIME types and their extensions
const ALLOWED_TYPES: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/jpg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif',
  // HEIC/HEIF — default format on iPhone photos; macOS Safari often forwards
  // these MIME types when picking from Photos. Accept and store as-is so
  // mobile users can attach iPhone photos without converting first.
  'image/heic': 'heic',
  'image/heif': 'heif',
  'application/pdf': 'pdf',
  'application/msword': 'doc',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
  // Plain text files — useful for sharing notes, CSVs, code snippets etc.
  // No magic-byte signature (any byte stream is technically valid) so we
  // accept on MIME alone but still cap size and sanitize the filename.
  'text/plain': 'txt',
  'text/csv': 'csv',
};

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const MAX_IMAGE_SIZE = 5 * 1024 * 1024; // 5MB

// Magic bytes (file signatures) to verify actual file content matches claimed MIME
function verifyMagicBytes(bytes: Uint8Array, mimeType: string): boolean {
  if (bytes.length < 12) return false;
  const b = bytes;
  switch (mimeType) {
    case 'image/jpeg':
    case 'image/jpg':
      return b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff;
    case 'image/png':
      return b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47;
    case 'image/gif':
      return b[0] === 0x47 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x38;
    case 'image/webp':
      return b[0] === 0x52 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x46 &&
             b[8] === 0x57 && b[9] === 0x45 && b[10] === 0x42 && b[11] === 0x50;
    case 'image/heic':
    case 'image/heif':
      // HEIC/HEIF: ISO Base Media File Format ("ftyp" box at bytes 4-7) with a
      // brand of heic/heix/hevc/heim/heis/hevm/hevs/mif1/msf1.
      if (b[4] !== 0x66 || b[5] !== 0x74 || b[6] !== 0x79 || b[7] !== 0x70) return false;
      const brand = String.fromCharCode(b[8], b[9], b[10], b[11]);
      return ['heic','heix','hevc','heim','heis','hevm','hevs','mif1','msf1'].includes(brand);
    case 'application/pdf':
      return b[0] === 0x25 && b[1] === 0x50 && b[2] === 0x44 && b[3] === 0x46;
    case 'application/msword':
      return b[0] === 0xd0 && b[1] === 0xcf && b[2] === 0x11 && b[3] === 0xe0;
    case 'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
      // DOCX is a zip — starts with PK
      return b[0] === 0x50 && b[1] === 0x4b && (b[2] === 0x03 || b[2] === 0x05 || b[2] === 0x07);
    default:
      return false;
  }
}

function sanitizeFilename(name: string): string {
  return name.replace(/[^\w\s.-]/g, '').replace(/\s+/g, '_').slice(0, 120);
}

/**
 * Δημόσιο URL αρχείου.
 *
 * Παλιά έδειχνε στο `pub-<hash>.r2.dev`. Αυτό είναι το ΠΡΟΣΩΡΙΝΟ domain
 * ανάπτυξης της Cloudflare για κουβάδες R2: το μπλοκάρουν πολλοί πάροχοι και
 * routers (στο δίκτυο του πελάτη το DNS το γυρνάει σε 127.0.0.1, οπότε καμία
 * φωτογραφία δεν φόρτωνε) και η ίδια η Cloudflare το χαρακτηρίζει ακατάλληλο
 * για παραγωγή επειδή του βάζει όριο ρυθμού.
 *
 * Τώρα τα αρχεία σερβίρονται από τον ίδιο τον server του API (`GET /uploads/f/*`),
 * που είναι εξ ορισμού προσβάσιμος αφού όλη η εφαρμογή ήδη τον καλεί.
 *
 * Το origin βγαίνει από το ίδιο το αίτημα, ώστε τοπικά/staging/production να
 * δίνουν αυτόματα σωστό host χωρίς επιπλέον ρύθμιση.
 */
function publicFileUrl(requestUrl: string, key: string): string {
  return `${new URL(requestUrl).origin}/uploads/f/${key}`;
}

/**
 * GET /uploads/f/<key> — σερβίρει ένα αρχείο του R2.
 *
 * Χωρίς έλεγχο ταυτότητας, ακριβώς όπως και πριν: το `r2.dev` ήταν δημόσιο,
 * οπότε όποιος ήξερε το URL έβλεπε το αρχείο. Δεν αλλάζει τίποτα στην
 * πρόσβαση — το κλειδί περιέχει τυχαίο id, δεν μαντεύεται.
 *
 * Τα κλειδιά είναι αμετάβλητα (κάθε ανέβασμα φτιάχνει καινούργιο id), γι' αυτό
 * η απάντηση είναι cacheable για έναν χρόνο· έτσι ο browser και το δίκτυο της
 * Cloudflare δεν ξαναρωτούν και ο worker δεν πληρώνει αναγνώσεις R2.
 */
uploads.get('/f/*', async (c) => {
  const key = decodeURIComponent(c.req.path.replace(/^\/uploads\/f\//, ''));
  if (!key || key.includes('..')) return error(c, 'Μη έγκυρο αρχείο', 400);

  const object = await c.env.R2.get(key, {
    // Αν ο browser έχει ήδη το αρχείο, το R2 απαντά χωρίς σώμα (304).
    onlyIf: c.req.raw.headers,
  });

  if (!object) return error(c, 'Το αρχείο δεν βρέθηκε', 404);

  const headers = new Headers();
  object.writeHttpMetadata(headers);
  headers.set('etag', object.httpEtag);
  headers.set('Cache-Control', 'public, max-age=31536000, immutable');
  // Οι φωτογραφίες/έγγραφα δεν εκτελούνται ποτέ ως σελίδα.
  headers.set('X-Content-Type-Options', 'nosniff');
  headers.set('Content-Disposition', 'inline');

  // Χωρίς `body` σημαίνει ότι το onlyIf ταίριαξε → δεν χρειάζεται μεταφορά.
  if (!('body' in object) || !object.body) {
    return new Response(null, { status: 304, headers });
  }

  return new Response(object.body, { headers });
});

// Detect the real MIME type from the first bytes, regardless of what the
// browser claimed. Files often have wrong extensions (e.g. JPEG saved as
// .png from a screenshot tool, iPhone HEIC pushed through a Mac with the
// wrong extension), so we trust the bytes over the claim.
function detectMimeFromBytes(b: Uint8Array): string | null {
  if (b.length < 12) return null;
  if (b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return 'image/jpeg';
  if (b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47) return 'image/png';
  if (b[0] === 0x47 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x38) return 'image/gif';
  if (b[0] === 0x52 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x46 &&
      b[8] === 0x57 && b[9] === 0x45 && b[10] === 0x42 && b[11] === 0x50) return 'image/webp';
  if (b[4] === 0x66 && b[5] === 0x74 && b[6] === 0x79 && b[7] === 0x70) {
    const brand = String.fromCharCode(b[8], b[9], b[10], b[11]);
    if (['heic','heix','hevc','heim','heis','hevm','hevs'].includes(brand)) return 'image/heic';
    if (['mif1','msf1'].includes(brand)) return 'image/heif';
  }
  if (b[0] === 0x25 && b[1] === 0x50 && b[2] === 0x44 && b[3] === 0x46) return 'application/pdf';
  if (b[0] === 0xd0 && b[1] === 0xcf && b[2] === 0x11 && b[3] === 0xe0) return 'application/msword';
  if (b[0] === 0x50 && b[1] === 0x4b && (b[2] === 0x03 || b[2] === 0x05 || b[2] === 0x07)) {
    return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
  }
  return null;
}

// POST / — multipart file upload to R2
uploads.post('/', requireAuth, async (c) => {
  const user = c.get('user');
  const r2 = c.env.R2;

  let formData: FormData;
  try {
    formData = await c.req.formData();
  } catch {
    return error(c, 'Μη έγκυρα δεδομένα φόρμας', 400);
  }

  const file = formData.get('file') as File | null;
  const category = (formData.get('category') as string) || 'general';

  if (!file) {
    return error(c, 'Δεν βρέθηκε αρχείο', 400);
  }

  // Read bytes once and prefer detected MIME over the browser claim — files
  // often have the wrong extension (e.g. JPEG saved as .png by a screenshot
  // tool). For plaintext where no signature exists, fall back to the claim.
  const arrayBuffer = await file.arrayBuffer();
  const first16 = new Uint8Array(arrayBuffer.slice(0, 16));
  const detected = detectMimeFromBytes(first16);
  const claimed = file.type || '';
  let mimeType = detected || claimed;

  // Plaintext / CSV: no binary signature, so we accept the browser claim
  // when bytes don't match any known signature.
  if (!detected && (claimed === 'text/plain' || claimed === 'text/csv')) {
    mimeType = claimed;
  }

  if (!ALLOWED_TYPES[mimeType]) {
    return error(
      c,
      `Μη αποδεκτός τύπος αρχείου (${claimed || 'άγνωστο'}). Επιτρέπονται: εικόνες (JPG/PNG/GIF/WEBP/HEIC), PDF, DOC/DOCX, TXT, CSV.`,
      400,
    );
  }

  // For known binary formats, the detected type IS the truth — no extra
  // magic-byte check needed (we used the bytes to derive it).
  // For plaintext fallback there is nothing to verify against.

  // Validate file size
  const isImage = mimeType.startsWith('image/');
  const maxSize = isImage ? MAX_IMAGE_SIZE : MAX_FILE_SIZE;

  if (file.size > maxSize) {
    const maxMB = maxSize / (1024 * 1024);
    return error(c, `Το αρχείο είναι πολύ μεγάλο. Μέγιστο μέγεθος: ${maxMB}MB`, 400);
  }

  // Generate unique key
  const ext = ALLOWED_TYPES[mimeType];
  const fileId = generateId();
  const key = `${category}/${user.id}/${fileId}.${ext}`;

  await r2.put(key, arrayBuffer, {
    httpMetadata: {
      contentType: mimeType,
    },
    customMetadata: {
      userId: user.id,
      originalName: sanitizeFilename(file.name),
      category,
      uploadedAt: new Date().toISOString(),
    },
  });

  const url = publicFileUrl(c.req.url, key);

  // Trust & Safety: log every file upload
  c.executionCtx.waitUntil(
    recordDataChange(c.env, {
      actorUserId: user.id,
      actorRole: user.role,
      actorEmail: user.email,
      action: 'file_upload',
      entityType: 'file',
      entityId: key,
      entityOwnerId: user.id,
      metadata: {
        category,
        fileName: sanitizeFilename(file.name),
        fileSize: file.size,
        mimeType,
        url,
      },
      ip: getRequestIp(c),
      userAgent: c.req.header('User-Agent') || null,
      geo: getGeoFromRequest(c),
    }),
  );

  return success(
    c,
    {
      url,
      key,
      fileName: file.name,
      fileSize: file.size,
      mimeType,
      category,
    },
    201
  );
});

// POST /presign — return a presigned upload URL for direct client uploads
uploads.post('/presign', requireAuth, async (c) => {
  const user = c.get('user');
  const body = await c.req.json<{
    fileName: string;
    mimeType: string;
    fileSize: number;
    category?: string;
  }>();

  const { fileName, mimeType, fileSize, category = 'general' } = body;

  if (!fileName || !mimeType) {
    return error(c, 'Λείπουν απαιτούμενα πεδία (fileName, mimeType)', 400);
  }

  // Validate MIME type
  if (!ALLOWED_TYPES[mimeType]) {
    return error(
      c,
      `Μη αποδεκτός τύπος αρχείου. Επιτρέπονται: ${Object.keys(ALLOWED_TYPES).join(', ')}`,
      400
    );
  }

  // Validate file size
  const isImage = mimeType.startsWith('image/');
  const maxSize = isImage ? MAX_IMAGE_SIZE : MAX_FILE_SIZE;

  if (fileSize > maxSize) {
    const maxMB = maxSize / (1024 * 1024);
    return error(c, `Το αρχείο είναι πολύ μεγάλο. Μέγιστο μέγεθος: ${maxMB}MB`, 400);
  }

  // Generate unique key
  const ext = ALLOWED_TYPES[mimeType];
  const fileId = generateId();
  const key = `${category}/${user.id}/${fileId}.${ext}`;

  // Create a presigned URL for multipart upload
  // R2 supports creating multipart uploads
  const multipartUpload = await c.env.R2.createMultipartUpload(key, {
    httpMetadata: {
      contentType: mimeType,
    },
    customMetadata: {
      userId: user.id,
      originalName: fileName,
      category,
      uploadedAt: new Date().toISOString(),
    },
  });

  const url = publicFileUrl(c.req.url, key);

  return success(c, {
    uploadId: multipartUpload.uploadId,
    key,
    url,
    maxSize,
    allowedType: mimeType,
  });
});

export default uploads;
