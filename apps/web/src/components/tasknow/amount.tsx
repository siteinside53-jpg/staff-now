/**
 * Το ποσό — ΕΝΑ σημείο, για όλο το TaskNow.
 *
 * ΚΑΝΟΝΑΣ ΠΟΥ ΔΕΝ ΠΑΡΑΒΙΑΖΕΤΑΙ:
 * Το ποσό είναι ΠΑΝΤΑ σκούρο γκρι με στοιχισμένα ψηφία. Ποτέ πράσινο, ποτέ
 * χρυσό, ποτέ πάνω σε γεμάτο ή διαβαθμισμένο φόντο, ποτέ κινούμενο, ποτέ με
 * μετρητή που ανεβαίνει, ποτέ χρωματισμένο ανάλογα με το μέγεθος, ποτέ με
 * «+» ή «έως» μπροστά, ποτέ με ετικέτα «hot» ή «κορυφαίο».
 *
 * Το πορτοκαλί επιτρέπεται ΜΟΝΟ στο σήμα, στις πινέζες του χάρτη, στο κουμπί
 * «Ανέβασε δουλειά» και στο ενεργό φίλτρο. Μεγάλα ποσά + πορτοκαλί = οθόνη
 * στοιχηματικής. Αυτό που φτιάχνουμε είναι πίνακας αμοιβών, όχι τζόγος.
 *
 * Η μονάδα («ανά βόλτα» / «για όλη τη δουλειά») ΔΕΝ κόβεται ποτέ: η στήλη
 * προσκαλεί σύγκριση 10€ με 200€, και τα δύο δεν είναι το ίδιο πράγμα.
 */

const SIZES = {
  row: { value: 'text-[26px] sm:text-[30px]', euro: 'text-base', note: 'text-[10px]' },
  band: { value: 'text-[22px]', euro: 'text-sm', note: 'text-[10px]' },
  hero: { value: 'text-4xl', euro: 'text-xl', note: 'text-xs' },
  chip: { value: 'text-base', euro: 'text-xs', note: 'text-[10px]' },
} as const;

export function Amount({
  value,
  note,
  size = 'row',
  direction = false,
  muted = false,
}: {
  value: number;
  /** Η μονάδα. Αν λείπει, γράφεται «για όλη τη δουλειά». */
  note?: string;
  size?: keyof typeof SIZES;
  /** Δείχνει «δίνει» από πάνω — ποια κατεύθυνση έχουν τα χρήματα. */
  direction?: boolean;
  /** Ξεθωριασμένο, για γραμμές που ο χρήστης πρέπει να προσπερνά. */
  muted?: boolean;
}) {
  const s = SIZES[size];
  return (
    <div className="text-right">
      {direction && (
        <div className={s.note + ' leading-none text-gray-400'}>δίνει</div>
      )}
      <div
        className={
          'mt-0.5 font-extrabold leading-none tracking-tight tabular-nums ' +
          s.value +
          (muted ? ' text-gray-400' : ' text-gray-900')
        }
      >
        {value}
        <span className={'font-bold text-gray-400 ' + s.euro}>€</span>
      </div>
      <div className={'mt-1 leading-tight text-gray-500 ' + s.note}>
        {note ?? 'για όλη τη δουλειά'}
      </div>
    </div>
  );
}
