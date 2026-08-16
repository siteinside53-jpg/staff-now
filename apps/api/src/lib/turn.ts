/**
 * Ο «αναμεταδότης» των βιντεοκλήσεων (TURN), μέσω Cloudflare.
 *
 * Οι δύο συσκευές προσπαθούν πρώτα να συνδεθούν απευθείας. Σε αρκετές
 * συνδέσεις — κυρίως σε κινητό internet, όπου ο πάροχος κρύβει πολλούς
 * συνδρομητές πίσω από την ίδια διεύθυνση — αυτό αποτυγχάνει. Τότε η εικόνα
 * περνά από έναν αναμεταδότη. Χωρίς αυτόν, τέτοιες κλήσεις μένουν για πάντα
 * στο «σύνδεση...».
 *
 * ΣΗΜΑΝΤΙΚΟ: το μόνιμο κλειδί ΔΕΝ φεύγει ποτέ προς τον browser. Εδώ ζητάμε
 * βραχύβια στοιχεία (μιας ώρας) και μόνο αυτά ταξιδεύουν.
 *
 * Αν τα κλειδιά δεν έχουν μπει ακόμη, δεν σκάμε: γυρνάμε δημόσιους STUN
 * servers. Οι περισσότερες κλήσεις δουλεύουν και έτσι — απλώς όσες χρειάζονται
 * αναμεταδότη θα αποτυγχάνουν, αντί να μην δουλεύει τίποτα.
 */

import type { Env } from '../types';

/** Ένα λεπτό λιγότερο από την ώρα, ώστε να μη λήξουν πάνω στην κλήση. */
const CREDENTIAL_TTL_SECONDS = 3600;

/** Πάντα διαθέσιμοι, χωρίς λογαριασμό — βρίσκουν τη δημόσια διεύθυνση. */
const PUBLIC_STUN: IceServer[] = [
  { urls: 'stun:stun.cloudflare.com:3478' },
  { urls: 'stun:stun.l.google.com:19302' },
];

export interface IceServer {
  urls: string | string[];
  username?: string;
  credential?: string;
}

interface TurnResponse {
  iceServers?: { urls?: string[]; username?: string; credential?: string };
}

export async function getIceServers(env: Env): Promise<IceServer[]> {
  const keyId = env.TURN_KEY_ID;
  const keySecret = env.TURN_KEY_SECRET;
  if (!keyId || !keySecret) return PUBLIC_STUN;

  try {
    const res = await fetch(
      `https://rtc.live.cloudflare.com/v1/turn/keys/${keyId}/credentials/generate`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${keySecret}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ ttl: CREDENTIAL_TTL_SECONDS }),
      }
    );
    if (!res.ok) return PUBLIC_STUN;

    const data = (await res.json()) as TurnResponse;
    const urls = data.iceServers?.urls;
    const username = data.iceServers?.username;
    const credential = data.iceServers?.credential;
    if (!Array.isArray(urls) || !urls.length || !username || !credential) return PUBLIC_STUN;

    // Η θύρα 53 είναι κλειδωμένη στους browsers — αν μείνει μέσα, χάνεται
    // χρόνος σε δρόμο που δεν πρόκειται να ανοίξει ποτέ.
    const usable = urls.filter((u) => typeof u === 'string' && !u.includes(':53'));
    if (!usable.length) return PUBLIC_STUN;

    return [...PUBLIC_STUN, { urls: usable, username, credential }];
  } catch {
    return PUBLIC_STUN;
  }
}
