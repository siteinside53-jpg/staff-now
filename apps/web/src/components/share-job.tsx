'use client';

import { useEffect, useRef, useState } from 'react';
import { Share2, Facebook, Link2, Check, MessageCircle } from 'lucide-react';

/**
 * Κουμπί «Κοινοποίηση» για μία αγγελία.
 *
 * Μπαίνει σε τέσσερα σημεία, ώστε να μπορεί να κοινοποιήσει και ο επισκέπτης
 * χωρίς λογαριασμό και ο συνδεδεμένος χρήστης:
 *   1. Στη δημόσια σελίδα της αγγελίας (όποιος τη δει, χωρίς εγγραφή).
 *   2. Στην καρτέλα της αγγελίας στην «Εύρεση δουλειάς» (επισκέπτες).
 *   3. Στην καρτέλα της αγγελίας μέσα στον πίνακα του εργαζόμενου.
 *   4. Στον πίνακα της επιχείρησης, δίπλα σε κάθε δική της αγγελία.
 *
 * Ο σύνδεσμος που μοιράζεται είναι πάντα η δημόσια σελίδα (staffnow.gr/jobs/…),
 * που έχει ήδη τίτλο, περιγραφή και αυτόματη εικόνα για το Facebook.
 */

const SITE_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://staffnow.gr';

type Props = {
  jobId: string;
  jobTitle: string;
  /** Μικρό κουμπί χωρίς λεζάντα — για τη λίστα αγγελιών στον πίνακα. */
  compact?: boolean;
  /**
   * Το μενού ανοίγει προς τα πάνω. Χρειάζεται όταν το κουμπί βρίσκεται στο κάτω
   * μέρος μιας καρτέλας ή σε σταθερή μπάρα, γιατί αλλιώς το μενού θα άνοιγε
   * κάτω από το ορατό όριο και ο χρήστης δεν θα το έβλεπε ποτέ.
   */
  dropUp?: boolean;
  /** Πιάνει όλο το πλάτος — για κινητό, όπου τα κουμπιά μπαίνουν σε στήλη. */
  fullWidth?: boolean;
};

export function ShareJob({
  jobId,
  jobTitle,
  compact = false,
  dropUp = false,
  fullWidth = false,
}: Props) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [notReady, setNotReady] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);

  const url = `${SITE_URL}/jobs/${jobId}`;
  const text = `${jobTitle} — δες την αγγελία στο StaffNow`;

  // Κλείσιμο όταν ο χρήστης πατήσει έξω από το πλαίσιο ή το Escape.
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      // Σε παλιά κινητά ή χωρίς https δεν επιτρέπεται η αντιγραφή. Τότε δείχνουμε
      // τον σύνδεσμο διαλεγμένο, ώστε ο χρήστης να τον αντιγράψει μόνος του.
      const tmp = document.createElement('textarea');
      tmp.value = url;
      document.body.appendChild(tmp);
      tmp.select();
      try {
        document.execCommand('copy');
      } catch {
        /* τίποτα άλλο δεν μπορούμε να κάνουμε */
      }
      tmp.remove();
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function openWindow(target: string) {
    window.open(target, '_blank', 'noopener,noreferrer,width=640,height=640');
    setOpen(false);
  }

  /**
   * Η δημόσια σελίδα της αγγελίας ξαναφτιάχνεται κάθε 6 ώρες. Άρα μια ολοκαίνουργια
   * αγγελία μπορεί να μην έχει ακόμα σελίδα — και αν την κοινοποιούσε η επιχείρηση,
   * όποιος πατούσε τον σύνδεσμο στο Facebook θα έβλεπε «η σελίδα δεν βρέθηκε».
   * Γι' αυτό ρωτάμε πρώτα αν υπάρχει. Αν δεν μπορούμε να ρωτήσουμε (π.χ. δεν
   * υπάρχει δίκτυο), προχωράμε κανονικά — δεν εμποδίζουμε τον χρήστη στα τυφλά.
   */
  async function isLive(): Promise<boolean> {
    try {
      const res = await fetch(url, { method: 'HEAD', cache: 'no-store' });
      return res.ok;
    } catch {
      return true;
    }
  }

  async function handleClick() {
    if (!(await isLive())) {
      setNotReady(true);
      setOpen(true);
      return;
    }
    setNotReady(false);

    // Στο κινητό ανοίγει το κανονικό μενού κοινοποίησης της συσκευής (Facebook,
    // Messenger, WhatsApp, Viber, SMS…). Στον υπολογιστή δεν υπάρχει, οπότε
    // δείχνουμε το δικό μας μικρό μενού.
    if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
      try {
        await navigator.share({ title: jobTitle, text, url });
        return;
      } catch {
        // Ο χρήστης το ακύρωσε ή η συσκευή δεν το υποστήριξε — πάμε στο δικό μας.
      }
    }
    setOpen((v) => !v);
  }

  return (
    <div ref={boxRef} className={fullWidth ? 'relative block' : 'relative inline-block'}>
      <button
        type="button"
        onClick={handleClick}
        aria-label={`Κοινοποίηση αγγελίας: ${jobTitle}`}
        className={[
          fullWidth ? 'flex w-full justify-center' : 'inline-flex',
          compact
            ? 'items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 transition'
            : 'items-center gap-2 rounded-xl border border-gray-200 bg-white px-5 py-3 text-sm font-semibold text-gray-800 hover:bg-gray-50 transition',
        ].join(' ')}
      >
        <Share2 className={compact ? 'h-3.5 w-3.5' : 'h-4 w-4'} />
        Κοινοποίηση
      </button>

      {open && (
        <div
          role="menu"
          className={[
            'absolute right-0 z-50 w-60 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-lg',
            dropUp ? 'bottom-full mb-2' : 'mt-2',
          ].join(' ')}
        >
          {notReady && (
            <p className="border-b border-amber-100 bg-amber-50 px-4 py-3 text-xs leading-relaxed text-amber-800">
              Η δημόσια σελίδα της αγγελίας ετοιμάζεται ακόμα. Αν τη μοιραστείς
              τώρα, όποιος την ανοίξει δεν θα τη βρει. Δοκίμασε ξανά αργότερα.
            </p>
          )}

          <button
            type="button"
            role="menuitem"
            onClick={() =>
              openWindow(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`)
            }
            className="flex w-full items-center gap-3 px-4 py-3 text-sm text-gray-800 hover:bg-gray-50"
          >
            <Facebook className="h-4 w-4 text-[#1877F2]" />
            Facebook
          </button>

          <button
            type="button"
            role="menuitem"
            onClick={() =>
              openWindow(`https://wa.me/?text=${encodeURIComponent(`${text}\n${url}`)}`)
            }
            className="flex w-full items-center gap-3 px-4 py-3 text-sm text-gray-800 hover:bg-gray-50"
          >
            <MessageCircle className="h-4 w-4 text-[#25D366]" />
            WhatsApp
          </button>

          <button
            type="button"
            role="menuitem"
            onClick={copyLink}
            className="flex w-full items-center gap-3 border-t border-gray-100 px-4 py-3 text-sm text-gray-800 hover:bg-gray-50"
          >
            {copied ? (
              <>
                <Check className="h-4 w-4 text-emerald-600" />
                <span className="text-emerald-700">Ο σύνδεσμος αντιγράφηκε</span>
              </>
            ) : (
              <>
                <Link2 className="h-4 w-4 text-gray-500" />
                Αντιγραφή συνδέσμου
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
}
