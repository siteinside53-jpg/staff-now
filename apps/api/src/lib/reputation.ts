/**
 * Πραγματικοί αριθμοί φήμης — από τους πίνακες `hires` και `hire_ratings`.
 *
 * Μέχρι τώρα οι οθόνες έδειχναν σταθερά «4.8 — 23 αξιολογήσεις» γραμμένα στο
 * χέρι, χωρίς να υπάρχει καν πίνακας αξιολογήσεων. Εδώ βγαίνουν τα αληθινά:
 * αν κανείς δεν έχει αξιολογήσει, το `rating_count` είναι 0 και η οθόνη γράφει
 * «Καμία αξιολόγηση ακόμη» αντί για ψεύτικα αστέρια.
 *
 * Μετράνε ΜΟΝΟ οι επιβεβαιωμένες προσλήψεις (status='confirmed'), δηλαδή αυτές
 * που πάτησαν και οι δύο πλευρές. Γι' αυτό δεν πλαστογραφείται.
 */

export interface Reputation {
  rating_avg: number | null;
  rating_count: number;
  hire_count: number;
  /** Οι τρεις υποβαθμολογίες, με τη σειρά που τις δείχνει η κάρτα. */
  score_a_avg: number | null;
  score_b_avg: number | null;
  score_c_avg: number | null;
}

const EMPTY: Reputation = {
  rating_avg: null,
  rating_count: 0,
  hire_count: 0,
  score_a_avg: null,
  score_b_avg: null,
  score_c_avg: null,
};

const round1 = (v: number | null | undefined): number | null =>
  v === null || v === undefined ? null : Math.round(v * 10) / 10;

export async function getReputation(
  db: D1Database,
  userId: string,
  role: 'worker' | 'business',
): Promise<Reputation> {
  try {
    const hireCol = role === 'worker' ? 'worker_id' : 'business_id';
    const [ratings, hires] = await Promise.all([
      db
        .prepare(
          `SELECT COUNT(*) as n, AVG(overall) as avg_overall,
                  AVG(score_a) as avg_a, AVG(score_b) as avg_b, AVG(score_c) as avg_c
             FROM hire_ratings WHERE ratee_id = ?`,
        )
        .bind(userId)
        .first<{ n: number; avg_overall: number | null; avg_a: number | null; avg_b: number | null; avg_c: number | null }>(),
      db
        .prepare(`SELECT COUNT(*) as n FROM hires WHERE ${hireCol} = ? AND status = 'confirmed'`)
        .bind(userId)
        .first<{ n: number }>(),
    ]);

    const count = ratings?.n ?? 0;
    return {
      rating_avg: count > 0 ? round1(ratings?.avg_overall) : null,
      rating_count: count,
      hire_count: hires?.n ?? 0,
      score_a_avg: count > 0 ? round1(ratings?.avg_a) : null,
      score_b_avg: count > 0 ? round1(ratings?.avg_b) : null,
      score_c_avg: count > 0 ? round1(ratings?.avg_c) : null,
    };
  } catch {
    // Αν για οποιονδήποτε λόγο λείπουν οι πίνακες (π.χ. δεν έχει τρέξει ακόμη η
    // μετανάστευση σε ένα περιβάλλον), το προφίλ πρέπει να ανοίγει κανονικά.
    return EMPTY;
  }
}
