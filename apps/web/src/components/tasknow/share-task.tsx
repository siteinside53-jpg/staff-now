'use client';

import { useEffect, useRef, useState } from 'react';
import { Share2, Facebook, Link2, Check, MessageCircle } from 'lucide-react';

/**
 * «Κοινοποίηση» για μια μικροδουλειά — ίδια λογική με την κοινοποίηση των
 * αγγελιών, στα χρώματα του TaskNow.
 *
 * Ο σύνδεσμος είναι πάντα ο βαθύς σύνδεσμος της δουλειάς
 * (staffnow.gr/tasknow?task=…), που ανοίγει την καρτέλα της κατευθείαν.
 *
 * ΟΣΟ ΕΙΝΑΙ ΜΑΚΕΤΑ: η λέξη «ΜΑΚΕΤΑ» μπαίνει ΜΕΣΑ στο κείμενο που φεύγει, όχι
 * μόνο στην οθόνη μας. Αν κάποιος στείλει τον σύνδεσμο σε Facebook ή
 * WhatsApp, ο παραλήπτης δεν έχει μπροστά του τη δική μας σελίδα για να δει
 * την προειδοποίηση — έχει μόνο το κείμενο. Δεν επιτρέπεται να φύγει
 * παράδειγμα που να διαβάζεται ως αληθινή αγγελία.
 *
 * Όταν οι μικροδουλειές γίνουν αληθινές, γύρισε το `MOCK` σε false.
 */

const SITE_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://staffnow.gr';
// Οι μικροδουλειές είναι πλέον αληθινές — ζουν στη βάση, όχι στον browser.
// Ο διακόπτης μένει γιατί τα ΠΑΡΑΔΕΙΓΜΑΤΑ σημαδεύονται ξεχωριστά, ανά αγγελία.
const MOCK = false;

export function ShareTask({
  taskId,
  title,
  budget,
  area,
  compact = false,
}: {
  taskId: string;
  title: string;
  budget: number;
  area: string;
  /** Μικρό κουμπί χωρίς λεζάντα. */
  compact?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);

  /**
   * Οι δουλειές των δειγμάτων έχουν δική τους σελίδα, με δικό τους τίτλο,
   * περιγραφή και εικόνα — αυτή δίνει το «post» στο Facebook. Όσες ανεβάζει ο
   * επισκέπτης μέσα στη μακέτα ζουν μόνο στον browser του, οπότε δεν υπάρχει
   * σελίδα να δείξουμε: γι' αυτές μοιραζόμαστε τον σύνδεσμο της ροής.
   */
  const hasOwnPage = !taskId.startsWith('my-');
  const url = hasOwnPage ? `${SITE_URL}/tasknow/${taskId}` : `${SITE_URL}/tasknow?task=${taskId}`;
  const text = MOCK
    ? `[ΜΑΚΕΤΑ — παράδειγμα, όχι αληθινή αγγελία] ${title} · ${budget}€ · ${area} — TaskNow`
    : `${title} · ${budget}€ · ${area} — δες τη μικροδουλειά στο TaskNow`;

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
      // Σε παλιά κινητά ή χωρίς https δεν επιτρέπεται η αντιγραφή.
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

  async function handleClick() {
    // Στο κινητό ανοίγει το κανονικό μενού της συσκευής. Στον υπολογιστή δεν
    // υπάρχει, οπότε δείχνουμε το δικό μας.
    if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
      try {
        await navigator.share({ title, text, url });
        return;
      } catch {
        // Ακυρώθηκε ή δεν υποστηρίχθηκε — πάμε στο δικό μας μενού.
      }
    }
    setOpen((v) => !v);
  }

  return (
    <div ref={boxRef} className="relative inline-block">
      <button
        type="button"
        onClick={handleClick}
        aria-label={`Κοινοποίηση μικροδουλειάς: ${title}`}
        className={
          compact
            ? 'inline-flex items-center gap-1.5 rounded-lg border border-amber-200 bg-amber-50 px-2.5 py-1.5 text-xs font-semibold text-amber-800 transition hover:bg-amber-100'
            : 'inline-flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-2.5 text-sm font-semibold text-amber-800 transition hover:bg-amber-100'
        }
      >
        <Share2 className={compact ? 'h-3.5 w-3.5' : 'h-4 w-4'} />
        Κοινοποίηση
      </button>

      {open && (
        <div
          role="menu"
          /* Ανοίγει προς τα δεξιά: το κουμπί κάθεται στην αριστερή άκρη της
             καρτέλας, οπότε το «right-0» έβγαζε το μενού έξω από το παράθυρο. */
          className="absolute left-0 z-50 mt-2 w-64 max-w-[calc(100vw-2rem)] overflow-hidden rounded-xl border border-amber-200 bg-white shadow-lg"
        >
          {MOCK && (
            <p className="border-b border-amber-200 bg-amber-50 px-4 py-3 text-xs leading-relaxed text-amber-900">
              <strong className="font-bold">ΜΑΚΕΤΑ.</strong> Ο σύνδεσμος οδηγεί σε
              παράδειγμα, όχι σε αληθινή αγγελία — και αυτό γράφεται μέσα στο μήνυμα που
              φεύγει.
            </p>
          )}

          <button
            type="button"
            role="menuitem"
            onClick={() =>
              openWindow(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`)
            }
            className="flex w-full items-center gap-3 px-4 py-3 text-sm text-gray-800 hover:bg-amber-50"
          >
            <Facebook className="h-4 w-4 text-[#1877F2]" />
            Facebook
          </button>

          <button
            type="button"
            role="menuitem"
            onClick={() => openWindow(`https://wa.me/?text=${encodeURIComponent(`${text}\n${url}`)}`)}
            className="flex w-full items-center gap-3 px-4 py-3 text-sm text-gray-800 hover:bg-amber-50"
          >
            <MessageCircle className="h-4 w-4 text-[#25D366]" />
            WhatsApp
          </button>

          <button
            type="button"
            role="menuitem"
            onClick={() => openWindow(`viber://forward?text=${encodeURIComponent(`${text}\n${url}`)}`)}
            className="flex w-full items-center gap-3 px-4 py-3 text-sm text-gray-800 hover:bg-amber-50"
          >
            <MessageCircle className="h-4 w-4 text-[#7360F2]" />
            Viber
          </button>

          <button
            type="button"
            role="menuitem"
            onClick={copyLink}
            className="flex w-full items-center gap-3 border-t border-gray-100 px-4 py-3 text-sm text-gray-800 hover:bg-amber-50"
          >
            {copied ? (
              <>
                <Check className="h-4 w-4 text-emerald-600" />
                Αντιγράφηκε
              </>
            ) : (
              <>
                <Link2 className="h-4 w-4 text-amber-600" />
                Αντιγραφή συνδέσμου
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
}
