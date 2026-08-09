/**
 * SMS επιβεβαίωσης μέσω Twilio (https://twilio.com) REST API.
 *
 * Δίδυμο του `lib/email.ts`: τρέχει σε Cloudflare Workers με σκέτο `fetch`
 * (χωρίς SDK). Χρειάζεται:
 *   • TWILIO_ACCOUNT_SID — Account SID από το Twilio Console (secret)
 *   • TWILIO_AUTH_TOKEN  — Auth Token από το Twilio Console (secret)
 *   • TWILIO_SMS_FROM    — όνομα αποστολέα, π.χ. "StaffNow". Στην Ελλάδα το
 *     alphanumeric sender ID δουλεύει χωρίς καμία προηγούμενη δήλωση.
 *
 * Αν λείπει έστω ένα κλειδί, το `smsConfigured()` επιστρέφει false και ο καλών
 * δείχνει τη χειροκίνητη εκδοχή («θα σε πάρουμε τηλέφωνο») αντί να προσπαθήσει
 * να στείλει. Έτσι δεν υπάρχει σιωπηλή αποτυχία και δεν χρεώνεται τίποτα.
 */

export interface SmsConfig {
  accountSid: string;
  authToken: string;
  from: string;
}

export interface SendSmsInput {
  /** Ελληνικό κινητό, 10 ψηφία (π.χ. "6912345678"). Το +30 μπαίνει εδώ. */
  to: string;
  body: string;
}

/** Υπάρχουν και τα δύο κλειδιά ώστε να μπορεί να σταλεί SMS; */
export function smsConfigured(env: { TWILIO_ACCOUNT_SID?: string; TWILIO_AUTH_TOKEN?: string }): boolean {
  return !!(env.TWILIO_ACCOUNT_SID && env.TWILIO_AUTH_TOKEN);
}

/**
 * Best-effort αποστολή: επιστρέφει `false` αντί να πετάξει σφάλμα, ακριβώς όπως
 * το `sendEmail`. Ο καλών αποφασίζει τι λέει στον χρήστη.
 */
export async function sendSms(cfg: SmsConfig, input: SendSmsInput): Promise<boolean> {
  if (!cfg.accountSid || !cfg.authToken || !input.to) return false;

  // Τα κρατάμε 10ψήφια παντού στη βάση· το διεθνές πρόθεμα μπαίνει μόνο εδώ.
  const to = input.to.startsWith('+') ? input.to : `+30${input.to}`;

  try {
    const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${cfg.accountSid}/Messages.json`, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${btoa(`${cfg.accountSid}:${cfg.authToken}`)}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        To: to,
        From: cfg.from || 'StaffNow',
        Body: input.body,
      }),
    });
    return res.ok;
  } catch {
    return false;
  }
}
