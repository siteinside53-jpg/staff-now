import { WORKER_JOB_ROLE_GROUPS } from '@staffnow/config';
import { CategoriesContent } from './categories-content';

/**
 * /categories — Πλήρης λίστα 24 κατηγοριών × 250+ ειδικοτήτων.
 *
 * Σκοπός:
 *  • SEO: μια σελίδα με όλες τις ειδικότητες ως αναζητήσιμο κείμενο +
 *    crawlable internal links → καλύτερο ranking για queries τύπου
 *    "δουλειά σερβιτόρος αθήνα", "θέσεις ηλεκτρολόγος μηχανικός".
 *  • Marketing: σαφής απεικόνιση εύρους πλατφόρμας — δείχνει ότι
 *    καλύπτουμε *πραγματικά* όλους τους κλάδους.
 *  • UX: anchor links ανά κατηγορία, sticky table-of-contents για γρήγορη πλοήγηση.
 */

const TOTAL_ROLES = WORKER_JOB_ROLE_GROUPS.reduce((s, g) => s + g.roles.length, 0);

export const metadata = {
  title: 'Όλοι οι κλάδοι & ειδικότητες',
  description: `Δες και τις 24 κατηγορίες με ${TOTAL_ROLES}+ ειδικότητες που καλύπτει το StaffNow — από τουρισμό και εστίαση μέχρι IT, νομικά και ναυτιλία.`,
  alternates: { canonical: '/categories' },
};

export default function CategoriesPage() {
  return <CategoriesContent />;
}
