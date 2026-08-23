/**
 * Το όνομα με το οποίο εμφανίζεται ΚΑΠΟΙΟΣ σε κάποιον ΑΛΛΟΝ.
 *
 * Υπάρχει επειδή το ίδιο ερώτημα γραφόταν ξανά και ξανά, κάθε φορά λίγο
 * διαφορετικά — και οι μισές εκδοχές έβγαζαν κενό:
 *
 *   • Η ειδοποίηση ενδιαφέροντος διάβαζε ΜΟΝΟ business_profiles.company_name.
 *     Ο λογαριασμός «ThessMontarisma» έχει το όνομά του στο υποκατάστημα
 *     (business_branches.name) και κενό company_name — οπότε ο εργαζόμενος
 *     έπαιρνε «Μια επιχείρηση ενδιαφέρθηκε για το προφίλ σου», χωρίς να μαθαίνει
 *     ποια. Άχρηστη ειδοποίηση: δεν μπορείς να αποφασίσεις χωρίς όνομα.
 *
 *   • Η ειδοποίηση μηνύματος έκανε `wp.full_name || ''`. Όταν έλειπε το όνομα,
 *     το email έγραφε «Νέο μήνυμα από » και μετά τίποτα.
 *
 * Η σειρά είναι η ίδια που δείχνει και η οθόνη, ώστε το email να λέει ΑΚΡΙΒΩΣ
 * το όνομα που βλέπει ο χρήστης μέσα στην εφαρμογή.
 *
 * ΤΟ EMAIL ΔΕΝ ΜΠΑΙΝΕΙ ΠΟΤΕ ΩΣ ΟΝΟΜΑ. Αλλού στον κώδικα υπάρχει fallback στο
 * `u.email`· εδώ όχι, επίτηδες. Θα σήμαινε ότι στέλνουμε τη διεύθυνση κάποιου
 * σε τρίτον μέσα σε ειδοποίηση — διαρροή, όχι ευκολία. Αν λείπουν όλα, λέμε τι
 * ΕΙΝΑΙ ο άλλος, όχι ποιος.
 */

export interface DisplayInfo {
  name: string;
  avatar: string | null;
  /**
   * Εργαζόμενος ή επιχείρηση.
   *
   * Το ερώτημα από κάτω το διάβαζε ήδη — απλώς δεν το επέστρεφε. Το χρειάζεται
   * το TaskNow: η ίδια κάρτα δείχνει «Μαρία Κ. · εργαζόμενος» ή «Καφέ Ρόδος ·
   * επιχείρηση», και χωρίς αυτό θα έπρεπε δεύτερο ερώτημα για κάθε γραμμή.
   */
  role: 'worker' | 'business' | 'admin' | null;
}

const SQL = `
  SELECT
    COALESCE(
      NULLIF(br.name, ''),
      NULLIF(bp.company_name, ''),
      NULLIF(wp.full_name, ''),
      NULLIF(u.display_name, '')
    ) AS name,
    COALESCE(wp.photo_url, br.logo_url, bp.logo_url, u.avatar_url) AS avatar,
    u.role AS role
  FROM users u
  LEFT JOIN business_branches br ON br.user_id = u.id
  LEFT JOIN business_profiles bp ON bp.user_id = u.id
  LEFT JOIN worker_profiles wp   ON wp.user_id = u.id
  WHERE u.id = ?
`;

function fallbackFor(role: string | null | undefined): string {
  if (role === 'business') return 'Μια επιχείρηση';
  if (role === 'worker') return 'Ένας εργαζόμενος';
  return 'Χρήστης';
}

/** Όνομα και φωτογραφία μαζί — για οθόνες που δείχνουν και τα δύο. */
export async function displayInfoFor(db: D1Database, userId: string): Promise<DisplayInfo> {
  const row = await db
    .prepare(SQL)
    .bind(userId)
    .first<{ name: string | null; avatar: string | null; role: string | null }>();
  return {
    name: row?.name || fallbackFor(row?.role),
    avatar: row?.avatar || null,
    role: (row?.role as DisplayInfo['role']) ?? null,
  };
}

/** Μόνο το όνομα — για τίτλους ειδοποιήσεων και email. */
export async function displayNameFor(db: D1Database, userId: string): Promise<string> {
  return (await displayInfoFor(db, userId)).name;
}
