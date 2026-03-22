export const ERROR_CODES = {
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  NOT_FOUND: 'NOT_FOUND',
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  CONFLICT: 'CONFLICT',
  RATE_LIMITED: 'RATE_LIMITED',
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  SUBSCRIPTION_REQUIRED: 'SUBSCRIPTION_REQUIRED',
  SWIPE_LIMIT_REACHED: 'SWIPE_LIMIT_REACHED',
  MATCH_LIMIT_REACHED: 'MATCH_LIMIT_REACHED',
  DUPLICATE_SWIPE: 'DUPLICATE_SWIPE',
  PROFILE_INCOMPLETE: 'PROFILE_INCOMPLETE',
  FILE_TOO_LARGE: 'FILE_TOO_LARGE',
  INVALID_FILE_TYPE: 'INVALID_FILE_TYPE',
} as const;

export type ErrorCode = (typeof ERROR_CODES)[keyof typeof ERROR_CODES];

export const ERROR_MESSAGES_EL: Record<ErrorCode, string> = {
  UNAUTHORIZED: 'Δεν είστε συνδεδεμένος.',
  FORBIDDEN: 'Δεν έχετε πρόσβαση σε αυτή την ενέργεια.',
  NOT_FOUND: 'Δεν βρέθηκε.',
  VALIDATION_ERROR: 'Τα δεδομένα δεν είναι έγκυρα.',
  CONFLICT: 'Υπάρχει ήδη αυτή η εγγραφή.',
  RATE_LIMITED: 'Πολλές προσπάθειες. Δοκιμάστε αργότερα.',
  INTERNAL_ERROR: 'Κάτι πήγε στραβά. Δοκιμάστε ξανά.',
  SUBSCRIPTION_REQUIRED: 'Χρειάζεστε συνδρομή για αυτή τη λειτουργία.',
  SWIPE_LIMIT_REACHED: 'Φτάσατε το όριο αναζητήσεων για αυτόν τον μήνα.',
  MATCH_LIMIT_REACHED: 'Φτάσατε το μέγιστο αριθμό ενεργών ταιριασμάτων.',
  DUPLICATE_SWIPE: 'Έχετε ήδη αξιολογήσει αυτό το προφίλ.',
  PROFILE_INCOMPLETE: 'Παρακαλώ συμπληρώστε το προφίλ σας πρώτα.',
  FILE_TOO_LARGE: 'Το αρχείο είναι πολύ μεγάλο. Μέγιστο μέγεθος: 5MB.',
  INVALID_FILE_TYPE: 'Μη αποδεκτός τύπος αρχείου.',
};
