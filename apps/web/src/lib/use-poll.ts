'use client';

import { useEffect, useRef } from 'react';

/**
 * Περιοδικό ρώτημα του server, με τρεις κανόνες που έλειπαν παντού:
 *
 *  1. ΠΑΥΣΗ ΟΤΑΝ Η ΚΑΡΤΕΛΑ ΕΙΝΑΙ ΚΡΥΦΗ. Μια ξεχασμένη καρτέλα έκανε ~12
 *     κλήσεις/λεπτό επ' άπειρον (~17.000 την ημέρα) χωρίς κανείς να κοιτάει.
 *  2. ΑΜΕΣΗ ΑΝΑΝΕΩΣΗ ΜΟΛΙΣ ΕΠΙΣΤΡΕΨΕΙΣ. Χωρίς αυτό, η παύση θα σήμαινε ότι
 *     βλέπεις παλιά δεδομένα μέχρι τον επόμενο κύκλο.
 *  3. ΥΠΟΧΩΡΗΣΗ ΣΤΟ 429. Ο server μπλοκάρει στις 120 κλήσεις/λεπτό ανά σύνδεση.
 *     Παλιά το 429 «καταπινόταν» από ένα `catch {}` και ο κύκλος συνέχιζε να
 *     σφυροκοπάει, οπότε το μπλόκο δεν έληγε ποτέ. Τώρα διπλασιάζεται το
 *     διάστημα μέχρι 5 λεπτά και επανέρχεται με την πρώτη επιτυχία.
 */

const MAX_BACKOFF_MS = 300_000; // 5 λεπτά
const FIRST_LOAD_RETRY_MS = 3_000;
// Ελάχιστο κενό ανάμεσα σε δύο ρωτήματα που προκάλεσε η επιστροφή στην καρτέλα.
// Χωρίς αυτό, γρήγορη εναλλαγή καρτελών ξαναγίνεται σφυροκόπημα (10 εναλλαγές
// στο dashboard = 30 κλήσεις μέσα σε δευτερόλεπτα).
const MIN_REFOCUS_GAP_MS = 10_000;

function isRateLimited(err: unknown): boolean {
  const e = err as { status?: number; code?: string } | null;
  return e?.status === 429 || e?.code === 'RATE_LIMITED';
}

/**
 * @param fn        Τι να ρωτήσει. Πρέπει να πετάει σφάλμα στο 429 για να πιάσει
 *                  η υποχώρηση (ο ApiClient το κάνει ήδη).
 * @param intervalMs Κανονικό διάστημα σε ms.
 * @param enabled   Αν false, δεν τρέχει τίποτα (π.χ. πριν συνδεθεί ο χρήστης).
 */
export function usePoll(fn: () => Promise<void>, intervalMs: number, enabled = true) {
  // Σε ref ώστε μια νέα αναφορά συνάρτησης σε κάθε render να μη στήνει
  // ξανά τον χρονομετρητή — αυτό θα ξανάφερνε το ίδιο πρόβλημα.
  const fnRef = useRef(fn);
  fnRef.current = fn;

  useEffect(() => {
    if (!enabled) return;

    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | null = null;
    let backoffMs = 0; // 0 = κανονική λειτουργία
    let succeededOnce = false;
    let lastAttemptAt = 0;

    const schedule = (ms: number) => {
      if (cancelled) return;
      if (timer) clearTimeout(timer);
      timer = setTimeout(run, ms);
    };

    const run = async () => {
      if (cancelled) return;

      // Κρυφή καρτέλα: δεν ρωτάμε καθόλου. Ο κύκλος ξαναρχίζει από τον
      // listener του visibilitychange παρακάτω.
      if (typeof document !== 'undefined' && document.hidden) {
        timer = null;
        return;
      }

      lastAttemptAt = Date.now();

      try {
        await fnRef.current();
        if (cancelled) return;
        succeededOnce = true;
        backoffMs = 0;
        schedule(intervalMs);
      } catch (err) {
        if (cancelled) return;
        if (isRateLimited(err)) {
          backoffMs = Math.min(backoffMs ? backoffMs * 2 : intervalMs * 2, MAX_BACKOFF_MS);
          schedule(backoffMs);
        } else if (!succeededOnce) {
          // Η πρώτη φόρτωση απέτυχε → ξαναδοκίμασε γρήγορα, αλλιώς η σελίδα
          // μένει άδεια για πάντα.
          schedule(FIRST_LOAD_RETRY_MS);
        } else {
          schedule(intervalMs);
        }
      }
    };

    const onVisible = () => {
      if (cancelled || document.hidden) return;
      // Επιστροφή στην καρτέλα → ρώτα αμέσως, μη περιμένεις τον κύκλο.
      // Ακόμα κι αν είμαστε σε υποχώρηση λόγω 429 δίνουμε άμεση δοκιμή: αλλιώς
      // ο χρήστης που γυρίζει θα έβλεπε παλιά δεδομένα έως και 5 λεπτά — δηλαδή
      // ακριβώς το «κολλάει» που διορθώνουμε. Απαιτούμε όμως ένα ελάχιστο κενό
      // από το προηγούμενο ρώτημα, ώστε η γρήγορη εναλλαγή καρτελών να μη
      // γίνεται καινούργιο σφυροκόπημα.
      const minGap = backoffMs > 0 ? intervalMs : Math.min(intervalMs, MIN_REFOCUS_GAP_MS);
      const since = Date.now() - lastAttemptAt;
      if (since < minGap) {
        if (!timer) schedule(minGap - since);
        return;
      }
      schedule(0);
    };

    document.addEventListener('visibilitychange', onVisible);
    run();

    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [intervalMs, enabled]);
}
