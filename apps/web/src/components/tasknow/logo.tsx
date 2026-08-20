/**
 * Το σήμα του TaskNow — ΜΙΑ φορά γραμμένο.
 *
 * Υπήρχε σε τρία αντίγραφα (σελίδα, πίνακας χρήστη, μενού) και το μενού είχε
 * καταλήξει να δείχνει emoji κεραυνό αντί για το σήμα. Ό,τι αλλάζει εδώ,
 * αλλάζει παντού.
 *
 * Το χρώμα ακολουθεί τη λογική του StaffNow: το πρώτο μισό της λέξης σκούρο,
 * το «Now» στο χρώμα της ενότητας. Στο StaffNow είναι μπλε, εδώ πορτοκαλί.
 */

export function TaskNowMark({ className = 'h-5 w-5' }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={'block shrink-0 ' + className} aria-hidden="true">
      <circle cx="16" cy="16" r="16" fill="#f59e0b" />
      <path
        d="M17.5 6l-8 11h5.5l-1.5 9 8-11h-5.5z"
        fill="white"
        stroke="white"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function TaskNowLogo({
  className = 'text-2xl',
  markClassName = 'h-7 w-7',
  darkClassName = 'text-gray-900',
  accentClassName = 'text-amber-500',
}: {
  className?: string;
  markClassName?: string;
  darkClassName?: string;
  /** Πάνω σε πορτοκαλί φόντο το amber-500 εξαφανίζεται — δώσε ανοιχτότερο. */
  accentClassName?: string;
}) {
  return (
    <span className={'inline-flex items-center gap-1.5 font-extrabold tracking-tight ' + className}>
      <TaskNowMark className={markClassName} />
      <span>
        <span className={darkClassName}>Task</span>
        <span className={accentClassName}>Now</span>
      </span>
    </span>
  );
}
