import { createMiddleware } from 'hono/factory';
import type { Env } from '../types';

interface RateLimitConfig {
  windowMs: number;
  maxRequests: number;
  keyPrefix?: string;
  /**
   * Μέτρα ανά συνδεδεμένο χρήστη αντί για ανά IP. Χρειάζεται σε endpoints που
   * τρέχουν μετά το `requireAuth`: οι εταιρείες κινητής τηλεφωνίας δίνουν την
   * ίδια δημόσια IP σε πολλούς συνδρομητές, οπότε το μέτρημα ανά IP θα έκοβε
   * αθώους χρήστες που απλώς τυχαίνει να είναι στο ίδιο δίκτυο.
   */
  perUser?: boolean;
}

const DEFAULT_CONFIG: RateLimitConfig = {
  windowMs: 60_000,
  maxRequests: 60,
  keyPrefix: 'rl',
};

export const rateLimiter = (config?: Partial<RateLimitConfig>) =>
  createMiddleware<{ Bindings: Env; Variables: { user?: { id: string } } }>(async (c, next) => {
    const { windowMs, maxRequests, keyPrefix, perUser } = { ...DEFAULT_CONFIG, ...config };
    const ip = c.req.header('CF-Connecting-IP') || c.req.header('X-Forwarded-For') || 'unknown';
    const subject = (perUser && c.get('user')?.id) || ip;
    const window = Math.floor(Date.now() / windowMs);
    const key = `${keyPrefix}:${subject}:${window}`;

    try {
      const current = await c.env.KV.get(key);
      const count = current ? parseInt(current, 10) : 0;

      if (count >= maxRequests) {
        return c.json(
          { success: false, error: { code: 'RATE_LIMITED', message: 'Πολλές προσπάθειες. Δοκιμάστε αργότερα.' } },
          429,
        );
      }

      c.executionCtx.waitUntil(
        c.env.KV.put(key, String(count + 1), { expirationTtl: Math.ceil(windowMs / 1000) + 1 }),
      );
    } catch {
      // If KV fails, allow through
    }

    await next();
  });

// Global limiter backed by Cloudflare's native Rate Limiting binding.
// Unlike the KV-based limiter above, this performs NO KV writes, so it does not
// consume the daily KV-write quota on every request. Falls back to allowing the
// request through if the binding is unavailable (e.g. local dev without it).
export const globalRateLimiter = () =>
  createMiddleware<{ Bindings: Env }>(async (c, next) => {
    const limiter = c.env.RATE_LIMITER;
    if (limiter) {
      const ip =
        c.req.header('CF-Connecting-IP') || c.req.header('X-Forwarded-For') || 'unknown';
      try {
        const { success } = await limiter.limit({ key: ip });
        if (!success) {
          return c.json(
            { success: false, error: { code: 'RATE_LIMITED', message: 'Πολλές προσπάθειες. Δοκιμάστε αργότερα.' } },
            429,
          );
        }
      } catch {
        // If the limiter fails, allow the request through.
      }
    }
    await next();
  });

// Auth-specific limiters stay on KV: their windows (15min / 1hr) exceed the
// native binding's max period (60s), and they only fire on a handful of auth
// endpoints, so they don't meaningfully consume the KV-write quota.
export const authRateLimiter = rateLimiter({
  windowMs: 900_000,
  maxRequests: 10,
  keyPrefix: 'rl_auth',
});

export const passwordResetRateLimiter = rateLimiter({
  windowMs: 3_600_000,
  maxRequests: 3,
  keyPrefix: 'rl_pwd_reset',
});

// Κωδικός επιβεβαίωσης email: ξεχωριστό prefix από το password reset ώστε το
// «ξαναστείλε» να μη μπλοκάρεται επειδή ο χρήστης έκανε νωρίτερα reset κωδικού.
export const emailCodeRateLimiter = rateLimiter({
  windowMs: 900_000,
  maxRequests: 5,
  keyPrefix: 'rl_email_code',
});

// Κωδικός επιβεβαίωσης κινητού. Πιο σφιχτό από το email (3 αντί για 5) επειδή
// κάθε αποστολή κοστίζει πραγματικά χρήματα στο Twilio. Δεύτερο, ανεξάρτητο
// φρένο υπάρχει στη βάση: σκληρό όριο συνολικών SMS ανά λογαριασμό.
export const phoneCodeRateLimiter = rateLimiter({
  windowMs: 900_000,
  maxRequests: 3,
  keyPrefix: 'rl_phone_code',
  perUser: true,
});

/**
 * Φρένο στο *μάντεμα* του 6ψήφιου κωδικού (email και κινητού).
 *
 * Η αποστολή είχε ήδη φρένο, η επιβεβαίωση όχι: κάποιος μπορούσε να δοκιμάζει
 * νούμερα μέχρι να βρει το σωστό. Με 10 προσπάθειες ανά 15 λεπτά, το να
 * σαρώσει κανείς και το ένα εκατομμύριο συνδυασμούς θέλει ~28 χρόνια.
 *
 * Μετράει ανά χρήστη (τρέχει μετά το requireAuth), ώστε να μην κόβονται αθώοι
 * που τυχαίνει να μοιράζονται IP κινητής τηλεφωνίας. Το 10 αφήνει άνετο
 * περιθώριο σε όποιον πληκτρολογήσει λάθος ή δοκιμάσει παλιό κωδικό.
 */
export const confirmCodeRateLimiter = rateLimiter({
  windowMs: 900_000,
  maxRequests: 10,
  keyPrefix: 'rl_confirm_code',
  perUser: true,
});

/**
 * Το δεύτερο βήμα της σύνδεσης (διπλή επαλήθευση).
 *
 * Μετράει ανά IP επειδή σε αυτό το σημείο ο χρήστης **δεν έχει ακόμη
 * συνεδρία** — έχει μόνο μια προσωρινή «απόδειξη ότι ο κωδικός ήταν σωστός».
 *
 * Ξεχωριστό prefix από το `rl_auth`, ώστε οι προσπάθειες του 6ψήφιου να **μην**
 * γεμίζουν τον κουβά της σύνδεσης: αλλιώς μερικές λάθος πληκτρολογήσεις θα
 * εμπόδιζαν τον χρήστη να ξαναρχίσει από την αρχή.
 *
 * Το 20 είναι χαλαρό επίτηδες. Τα πραγματικά φρένα είναι εκείνα που μετράνε
 * ανά **λογαριασμό** μέσα στο `auth.ts` (5 ανά απόπειρα σύνδεσης, 10 ανά 15
 * λεπτά)· αυτό εδώ απλώς εμποδίζει κάποιον να σφυροκοπάει από μία IP.
 */
export const twoFactorRateLimiter = rateLimiter({
  windowMs: 900_000,
  maxRequests: 20,
  keyPrefix: 'rl_2fa',
});
