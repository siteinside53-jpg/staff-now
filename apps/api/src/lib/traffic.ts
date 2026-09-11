/**
 * Από πού ήρθε ο επισκέπτης — και με τι συσκευή.
 *
 * Το referrer και τα utm_* δεν τα διάβαζε κανείς: το referrer γραφόταν σε μια
 * στήλη που δεν έβλεπε καμία οθόνη, τα utm δεν αποθηκεύονταν καθόλου. Εδώ
 * γίνονται ένα καθαρό «Google / Facebook / Instagram / TikTok / …» που μπορεί
 * να το μετρήσει ο υπεύθυνος social.
 */

const KNOWN: Array<[RegExp, string]> = [
  [/(^|\.)google\./i, 'google'],
  [/(^|\.)bing\.com$/i, 'bing'],
  [/(^|\.)yahoo\./i, 'yahoo'],
  [/(^|\.)duckduckgo\.com$/i, 'duckduckgo'],
  [/(^|\.)(facebook|fb)\.com$/i, 'facebook'],
  [/(^|\.)messenger\.com$/i, 'facebook'],
  [/(^|\.)instagram\.com$/i, 'instagram'],
  [/(^|\.)tiktok\.com$/i, 'tiktok'],
  [/(^|\.)linkedin\.com$/i, 'linkedin'],
  [/(^|\.)(youtube\.com|youtu\.be)$/i, 'youtube'],
  [/(^|\.)(twitter\.com|x\.com|t\.co)$/i, 'x'],
  [/(^|\.)threads\.net$/i, 'threads'],
  [/(^|\.)pinterest\./i, 'pinterest'],
  [/(^|\.)reddit\.com$/i, 'reddit'],
  [/(^|\.)(whatsapp\.com|wa\.me)$/i, 'whatsapp'],
  [/(^|\.)(telegram\.org|t\.me)$/i, 'telegram'],
  [/(^|\.)viber\.com$/i, 'viber'],
  [/(^|\.)(skroutz|kariera|jobfind|indeed|glassdoor)\./i, 'job-boards'],
];

const UTM_ALIASES: Record<string, string> = {
  fb: 'facebook',
  facebook: 'facebook',
  ig: 'instagram',
  instagram: 'instagram',
  tiktok: 'tiktok',
  tt: 'tiktok',
  google: 'google',
  adwords: 'google',
  linkedin: 'linkedin',
  li: 'linkedin',
  youtube: 'youtube',
  yt: 'youtube',
  newsletter: 'email',
  email: 'email',
  mail: 'email',
  qr: 'qr',
  flyer: 'print',
  print: 'print',
};

const OWN_HOSTS = /(^|\.)(staffnow\.gr|staffnow\.pages\.dev|localhost)$/i;

export function classifySource(referrer: string | null | undefined, utmSource?: string | null): string {
  const utm = (utmSource || '').trim().toLowerCase();
  if (utm) {
    return UTM_ALIASES[utm] || `campaign:${utm.slice(0, 40)}`;
  }
  const ref = (referrer || '').trim();
  if (!ref) return 'direct';
  let host = '';
  try {
    host = new URL(ref).hostname.replace(/^www\./i, '');
  } catch {
    return 'other';
  }
  if (!host || OWN_HOSTS.test(host)) return 'direct';
  for (const [re, name] of KNOWN) if (re.test(host)) return name;
  return `other:${host.slice(0, 60)}`;
}

/** Ελληνική ετικέτα για την οθόνη. */
export function sourceLabel(source: string): string {
  const map: Record<string, string> = {
    direct: 'Απευθείας',
    google: 'Google',
    bing: 'Bing',
    yahoo: 'Yahoo',
    duckduckgo: 'DuckDuckGo',
    facebook: 'Facebook',
    instagram: 'Instagram',
    tiktok: 'TikTok',
    linkedin: 'LinkedIn',
    youtube: 'YouTube',
    x: 'X / Twitter',
    threads: 'Threads',
    pinterest: 'Pinterest',
    reddit: 'Reddit',
    whatsapp: 'WhatsApp',
    telegram: 'Telegram',
    viber: 'Viber',
    'job-boards': 'Job boards',
    email: 'Email / Newsletter',
    qr: 'QR code',
    print: 'Έντυπο',
    other: 'Άλλο',
  };
  if (map[source]) return map[source]!;
  if (source.startsWith('other:')) return source.slice(6);
  if (source.startsWith('campaign:')) return `Καμπάνια ${source.slice(9)}`;
  return source;
}

export function deviceFromUserAgent(ua: string | null | undefined): 'mobile' | 'tablet' | 'desktop' {
  const s = ua || '';
  if (/iPad|Tablet|PlayBook|Silk/i.test(s) || (/Android/i.test(s) && !/Mobile/i.test(s))) return 'tablet';
  if (/Mobi|iPhone|Android|IEMobile|Opera Mini/i.test(s)) return 'mobile';
  return 'desktop';
}
