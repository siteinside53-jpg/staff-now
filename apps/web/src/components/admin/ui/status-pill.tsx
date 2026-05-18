interface Props {
  status: string;
  size?: 'sm' | 'md';
}

const STATUS_STYLES: Record<string, { label: string; classes: string; dot: string }> = {
  active:        { label: 'Ενεργός', classes: 'bg-emerald-50 text-emerald-700 border-emerald-200', dot: 'bg-emerald-500' },
  published:     { label: 'Δημοσιευμένη', classes: 'bg-emerald-50 text-emerald-700 border-emerald-200', dot: 'bg-emerald-500' },
  pending:       { label: 'Σε αναμονή', classes: 'bg-amber-50 text-amber-700 border-amber-200', dot: 'bg-amber-500' },
  draft:         { label: 'Πρόχειρη', classes: 'bg-gray-50 text-gray-700 border-gray-200', dot: 'bg-gray-400' },
  paused:        { label: 'Σε παύση', classes: 'bg-orange-50 text-orange-700 border-orange-200', dot: 'bg-orange-500' },
  archived:      { label: 'Αρχειοθετημένη', classes: 'bg-gray-50 text-gray-600 border-gray-200', dot: 'bg-gray-400' },
  suspended:     { label: 'Ανεστάλη', classes: 'bg-red-50 text-red-700 border-red-200', dot: 'bg-red-500' },
  blocked:       { label: 'Αποκλεισμένος', classes: 'bg-red-50 text-red-700 border-red-200', dot: 'bg-red-500' },
  verified:      { label: 'Επαληθ.', classes: 'bg-blue-50 text-blue-700 border-blue-200', dot: 'bg-blue-500' },
  resolved:      { label: 'Επιλύθηκε', classes: 'bg-emerald-50 text-emerald-700 border-emerald-200', dot: 'bg-emerald-500' },
  dismissed:     { label: 'Απορρίφθηκε', classes: 'bg-gray-50 text-gray-700 border-gray-200', dot: 'bg-gray-400' },
  action_taken:  { label: 'Λήφθηκαν μέτρα', classes: 'bg-blue-50 text-blue-700 border-blue-200', dot: 'bg-blue-500' },
  approved:      { label: 'Εγκρίθηκε', classes: 'bg-emerald-50 text-emerald-700 border-emerald-200', dot: 'bg-emerald-500' },
  rejected:      { label: 'Απορρίφθηκε', classes: 'bg-red-50 text-red-700 border-red-200', dot: 'bg-red-500' },
  succeeded:     { label: 'Επιτυχής', classes: 'bg-emerald-50 text-emerald-700 border-emerald-200', dot: 'bg-emerald-500' },
  failed:        { label: 'Απέτυχε', classes: 'bg-red-50 text-red-700 border-red-200', dot: 'bg-red-500' },
  refunded:      { label: 'Επιστροφή', classes: 'bg-purple-50 text-purple-700 border-purple-200', dot: 'bg-purple-500' },
  invited:       { label: 'Προσκλήθηκε', classes: 'bg-amber-50 text-amber-700 border-amber-200', dot: 'bg-amber-500' },
  disabled:      { label: 'Απενεργοπ.', classes: 'bg-gray-50 text-gray-500 border-gray-200', dot: 'bg-gray-400' },
};

export function StatusPill({ status, size = 'md' }: Props) {
  const config = STATUS_STYLES[status] || { label: status, classes: 'bg-gray-50 text-gray-700 border-gray-200', dot: 'bg-gray-400' };
  const sizes = size === 'sm' ? 'px-2 py-0.5 text-[10px]' : 'px-2.5 py-1 text-xs';
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border font-semibold ${config.classes} ${sizes}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${config.dot}`} />
      {config.label}
    </span>
  );
}
