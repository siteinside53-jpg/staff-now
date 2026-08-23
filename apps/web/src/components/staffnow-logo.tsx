/**
 * Το σήμα του StaffNow — ΜΙΑ φορά γραμμένο, για όλο το site.
 *
 * ΤΙ ΥΠΗΡΧΕ ΠΡΙΝ: επτά αντίγραφα, σε δύο διαφορετικές μορφές.
 *
 *   • Η επάνω μπάρα, το υποσέλιδο, το πλαίσιο cookies και η ειδοποίηση push
 *     ζωγράφιζαν ένα σχέδιο με λεπτό, γωνιακό τικ.
 *   • Ο πίνακας ελέγχου και η οθόνη σύνδεσης έδειχναν ΑΛΛΟ σχέδιο — μια
 *     εικόνα 306 KB με χοντρό, στρογγυλεμένο τικ.
 *
 * Δηλαδή το ίδιο σήμα δεν ήταν το ίδιο. Και τα μεγέθη δεν συμφωνούσαν με τα
 * γράμματα: στην μπάρα το σημάδι ήταν 1,2 φορές το ύψος των γραμμάτων, στον
 * πίνακα ελέγχου 1,8 — γι' αυτό εκεί έδειχνε μεγάλο και ασύμμετρο.
 *
 * ΤΙ ΙΣΧΥΕΙ ΤΩΡΑ: ένα σχέδιο, αυτό της εικόνας (χοντρό στρογγυλεμένο τικ σε
 * μπλε κύκλο), γραμμένο ως σχήμα αντί για εικόνα. Κερδίζουμε τρία πράγματα:
 * είναι καθαρό σε κάθε μέγεθος και οθόνη, δεν κατεβαίνει εικόνα 306 KB για
 * ένα σημάδι 24 εικονοστοιχείων, και αλλάζει από ΕΝΑ σημείο.
 *
 * Η ΑΝΑΛΟΓΙΑ ΕΙΝΑΙ ΚΛΕΙΔΩΜΕΝΗ: κάθε μέγεθος ορίζει μαζί το σημάδι ΚΑΙ τα
 * γράμματα, πάντα γύρω στο 1,2. Δεν δίνεται ξεχωριστό μέγεθος σημαδιού —
 * ακριβώς έτσι ξέφυγαν τα προηγούμενα.
 */

const BRAND_BLUE = '#2084ee';

const SIZES = {
  /** Μέσα σε γραμμή κειμένου ή μικρή ειδοποίηση. */
  sm: { mark: 'h-4 w-4', text: 'text-sm', gap: 'gap-1.5' },
  /** Προεπιλογή για μενού και κάρτες. */
  md: { mark: 'h-5 w-5', text: 'text-lg', gap: 'gap-2' },
  /** Επάνω μπάρα, υποσέλιδο, πλαϊνό μενού του πίνακα. */
  lg: { mark: 'h-6 w-6', text: 'text-xl', gap: 'gap-2' },
  /** Τίτλος παραθύρου. */
  xl: { mark: 'h-7 w-7', text: 'text-2xl', gap: 'gap-2.5' },
} as const;

export type StaffNowLogoSize = keyof typeof SIZES;

/**
 * Μόνο το σημάδι, χωρίς γράμματα.
 *
 * Για τις λίγες θέσεις που το θέλουν μόνο του και μεγάλο — π.χ. πάνω από τη
 * φόρμα σύνδεσης, όπου τα γράμματα μπαίνουν από κάτω και όχι δίπλα.
 */
export function StaffNowMark({ className = 'h-6 w-6' }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 32 32"
      className={'block shrink-0 ' + className}
      role="img"
      aria-label="StaffNow"
    >
      <circle cx="16" cy="16" r="16" fill={BRAND_BLUE} />
      <path
        d="M7.6 15.6 L13.5 21.6 L24.4 10.4"
        fill="none"
        stroke="white"
        strokeWidth="5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/**
 * Το πλήρες σήμα: σημάδι + «StaffNow».
 *
 * `light` για σκούρο φόντο — μόνο το «Staff» αλλάζει, το «Now» μένει μπλε
 * γιατί αυτό είναι το χρώμα της μάρκας και διαβάζεται και στα δύο φόντα.
 */
export function StaffNowLogo({
  size = 'lg',
  light = false,
  className = '',
}: {
  size?: StaffNowLogoSize;
  light?: boolean;
  className?: string;
}) {
  const s = SIZES[size];
  return (
    <span
      className={
        `inline-flex items-center ${s.gap} ${s.text} font-extrabold tracking-tight ` + className
      }
    >
      <StaffNowMark className={s.mark} />
      <span>
        <span className={light ? 'text-white' : 'text-gray-900'}>Staff</span>
        <span className={light ? 'text-blue-300' : 'text-blue-500'}>Now</span>
      </span>
    </span>
  );
}
