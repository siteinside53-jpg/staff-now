/**
 * Realistic Greek mock data for admin panel sections that don't yet have
 * live API endpoints. Pure data, no side effects.
 */

export interface MockPayment {
  id: string;
  user: string;
  company?: string;
  amount: number;
  status: 'succeeded' | 'pending' | 'failed' | 'refunded';
  method: 'card' | 'sepa' | 'paypal';
  plan: string;
  createdAt: string;
}

export interface MockAuditLog {
  id: string;
  action: string;
  target: string;
  adminEmail: string;
  adminName: string;
  timestamp: string;
  reason?: string;
  severity: 'info' | 'warning' | 'critical';
}

export interface MockAdminUser {
  id: string;
  email: string;
  fullName: string;
  role: 'super_admin' | 'ops_admin' | 'moderation_admin' | 'support_admin' | 'finance_admin' | 'analytics_viewer';
  status: 'active' | 'invited' | 'disabled';
  lastLogin: string;
  avatarUrl?: string;
}

export interface MockSystemEvent {
  id: string;
  type: 'report' | 'payment_failed' | 'suspicious' | 'signup' | 'churn' | 'spike';
  title: string;
  body: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  read: boolean;
  createdAt: string;
}

export interface MockActivity {
  id: string;
  icon: string;
  text: string;
  timeAgo: string;
  type: 'signup' | 'match' | 'report' | 'payment' | 'job';
}

export const MOCK_PAYMENTS: MockPayment[] = [
  { id: 'pay_k9m2nq', user: 'ThessMontarisma', company: 'ThessMontarisma Ε.Ε.', amount: 49.9, status: 'succeeded', method: 'card', plan: 'Professional', createdAt: '2026-04-07T14:22:00Z' },
  { id: 'pay_j8l7pt', user: 'Beach Bar Oasis', company: 'Oasis Beach Bar', amount: 99, status: 'succeeded', method: 'card', plan: 'Enterprise', createdAt: '2026-04-07T11:05:00Z' },
  { id: 'pay_h3f4rv', user: 'Mykonos Suites', company: 'Mykonos Suites Α.Ε.', amount: 29.9, status: 'pending', method: 'sepa', plan: 'Starter', createdAt: '2026-04-07T09:44:00Z' },
  { id: 'pay_f1d8xy', user: 'Athens Rooftop', company: 'Athens Rooftop Hotel', amount: 49.9, status: 'failed', method: 'card', plan: 'Professional', createdAt: '2026-04-07T08:15:00Z' },
  { id: 'pay_e7g5ws', user: 'Taverna Dionysos', company: 'Ταβέρνα Διόνυσος', amount: 29.9, status: 'succeeded', method: 'card', plan: 'Starter', createdAt: '2026-04-06T19:33:00Z' },
  { id: 'pay_d4k2mn', user: 'Olive Grove Villas', company: 'Olive Grove Villas', amount: 49.9, status: 'refunded', method: 'card', plan: 'Professional', createdAt: '2026-04-06T16:10:00Z' },
  { id: 'pay_c9n3qw', user: 'Santorini Cliff Hotel', company: 'Santorini Cliff Hotel', amount: 99, status: 'succeeded', method: 'card', plan: 'Enterprise', createdAt: '2026-04-06T12:47:00Z' },
  { id: 'pay_b6t1sk', user: 'Crete Beach Resort', company: 'Crete Beach Resort Ε.Π.Ε.', amount: 49.9, status: 'succeeded', method: 'paypal', plan: 'Professional', createdAt: '2026-04-05T22:11:00Z' },
];

export const MOCK_AUDIT: MockAuditLog[] = [
  { id: 'au_001', action: 'report_resolved', target: 'rep_kq9m', adminEmail: 'e.safendoulidis@staffnow.gr', adminName: 'Ε. Σαφενδουλίδης', timestamp: '2026-04-07T15:32:00Z', reason: 'Fake profile verified and resolved', severity: 'info' },
  { id: 'au_002', action: 'user_suspended', target: 'usr_n4x2', adminEmail: 'moderator@staffnow.gr', adminName: 'Moderator Team', timestamp: '2026-04-07T14:50:00Z', reason: 'Harassment in messages', severity: 'critical' },
  { id: 'au_003', action: 'job_deleted', target: 'job_8kf2', adminEmail: 'moderator@staffnow.gr', adminName: 'Moderator Team', timestamp: '2026-04-07T13:18:00Z', reason: 'Misleading salary information', severity: 'warning' },
  { id: 'au_004', action: 'verification_approved', target: 'ver_q3n7', adminEmail: 'e.safendoulidis@staffnow.gr', adminName: 'Ε. Σαφενδουλίδης', timestamp: '2026-04-07T12:05:00Z', severity: 'info' },
  { id: 'au_005', action: 'refund_issued', target: 'pay_d4k2mn', adminEmail: 'finance@staffnow.gr', adminName: 'Finance Team', timestamp: '2026-04-06T16:11:00Z', reason: 'Customer request', severity: 'warning' },
  { id: 'au_006', action: 'platform_setting_changed', target: 'feature_flags.video_call', adminEmail: 'e.safendoulidis@staffnow.gr', adminName: 'Ε. Σαφενδουλίδης', timestamp: '2026-04-06T10:44:00Z', severity: 'info' },
  { id: 'au_007', action: 'user_verified', target: 'usr_m2p8', adminEmail: 'ops@staffnow.gr', adminName: 'Ops Team', timestamp: '2026-04-05T17:22:00Z', severity: 'info' },
];

export const MOCK_ADMINS: MockAdminUser[] = [
  { id: 'adm_001', email: 'e.safendoulidis@staffnow.gr', fullName: 'Ευγένιος Σαφενδουλίδης', role: 'super_admin', status: 'active', lastLogin: '2026-04-07T16:01:00Z' },
  { id: 'adm_002', email: 'moderator@staffnow.gr', fullName: 'Moderator Team', role: 'moderation_admin', status: 'active', lastLogin: '2026-04-07T15:44:00Z' },
  { id: 'adm_003', email: 'ops@staffnow.gr', fullName: 'Operations Team', role: 'ops_admin', status: 'active', lastLogin: '2026-04-07T14:22:00Z' },
  { id: 'adm_004', email: 'finance@staffnow.gr', fullName: 'Finance Team', role: 'finance_admin', status: 'active', lastLogin: '2026-04-07T13:18:00Z' },
  { id: 'adm_005', email: 'support@staffnow.gr', fullName: 'Support Team', role: 'support_admin', status: 'active', lastLogin: '2026-04-07T12:05:00Z' },
  { id: 'adm_006', email: 'analyst@staffnow.gr', fullName: 'Maria Ioannidou', role: 'analytics_viewer', status: 'invited', lastLogin: '—' },
];

export const MOCK_EVENTS: MockSystemEvent[] = [
  { id: 'ev_001', type: 'report', title: 'Νέα αναφορά — Fake profile', body: 'Χρήστης "Βασίλης Π." ανέφερε fake προφίλ από Μύκονο', severity: 'high', read: false, createdAt: '2026-04-07T16:12:00Z' },
  { id: 'ev_002', type: 'spike', title: 'Αύξηση matches +312%', body: 'Αφύσικη αύξηση στα matches την τελευταία ώρα στην κατηγορία Beach Bar', severity: 'medium', read: false, createdAt: '2026-04-07T15:45:00Z' },
  { id: 'ev_003', type: 'payment_failed', title: 'Αποτυχία πληρωμής — Athens Rooftop', body: 'Card declined για Professional plan (49,90€)', severity: 'medium', read: false, createdAt: '2026-04-07T08:15:00Z' },
  { id: 'ev_004', type: 'signup', title: 'Νέο high-value signup', body: 'Santorini Cliff Hotel — ξενοδοχείο 120 δωματίων', severity: 'low', read: true, createdAt: '2026-04-06T22:11:00Z' },
  { id: 'ev_005', type: 'suspicious', title: 'Ύποπτη δραστηριότητα login', body: '5 αποτυχημένες προσπάθειες από IP 89.210.x.x', severity: 'critical', read: false, createdAt: '2026-04-06T18:44:00Z' },
  { id: 'ev_006', type: 'churn', title: 'Churn warning', body: 'Mykonos Suites δεν έχει ενεργοποιήσει τη συνδρομή (trial ends σε 2 ημέρες)', severity: 'medium', read: true, createdAt: '2026-04-05T14:22:00Z' },
];

export const MOCK_ACTIVITY: MockActivity[] = [
  { id: 'a1', icon: '🎯', text: 'Νέο match: Γιώργος Π. ↔ ThessMontarisma', timeAgo: 'πριν 3 λεπτά', type: 'match' },
  { id: 'a2', icon: '🆕', text: 'Νέα εγγραφή εργαζόμενου: Μαρία Κ. (Μύκονος)', timeAgo: 'πριν 8 λεπτά', type: 'signup' },
  { id: 'a3', icon: '💼', text: 'Νέα αγγελία: Ζητείται Μονταδόρος — ThessMontarisma', timeAgo: 'πριν 14 λεπτά', type: 'job' },
  { id: 'a4', icon: '💳', text: 'Νέα πληρωμή: Beach Bar Oasis — 99€ (Enterprise)', timeAgo: 'πριν 22 λεπτά', type: 'payment' },
  { id: 'a5', icon: '🚨', text: 'Νέα αναφορά: Spam στα messages', timeAgo: 'πριν 35 λεπτά', type: 'report' },
  { id: 'a6', icon: '🆕', text: 'Νέα εγγραφή επιχείρησης: Santorini Cliff Hotel', timeAgo: 'πριν 52 λεπτά', type: 'signup' },
  { id: 'a7', icon: '🎯', text: 'Νέο match: Δημήτρης Β. ↔ Olive Grove Villas', timeAgo: 'πριν 1 ώρα', type: 'match' },
];

export const MOCK_MATCHES = [
  { id: 'm1', employer: 'ThessMontarisma', worker: 'Γιώργος Παπαδόπουλος', matchedAt: '2026-04-07T15:32:00Z', status: 'active', initiator: 'worker', hasConversation: true, responseTimeMin: 12 },
  { id: 'm2', employer: 'Beach Bar Oasis', worker: 'Μαρία Κωνσταντίνου', matchedAt: '2026-04-07T14:18:00Z', status: 'active', initiator: 'business', hasConversation: true, responseTimeMin: 45 },
  { id: 'm3', employer: 'Mykonos Suites', worker: 'Νίκος Δημητρίου', matchedAt: '2026-04-07T12:44:00Z', status: 'active', initiator: 'worker', hasConversation: false, responseTimeMin: null },
  { id: 'm4', employer: 'Olive Grove Villas', worker: 'Έλενα Μαυροειδή', matchedAt: '2026-04-07T10:22:00Z', status: 'archived', initiator: 'business', hasConversation: true, responseTimeMin: 8 },
  { id: 'm5', employer: 'Crete Beach Resort', worker: 'Σοφία Τσιρίκου', matchedAt: '2026-04-07T09:15:00Z', status: 'active', initiator: 'worker', hasConversation: true, responseTimeMin: 22 },
  { id: 'm6', employer: 'Athens Rooftop', worker: 'Δημήτρης Βλάχος', matchedAt: '2026-04-06T22:11:00Z', status: 'active', initiator: 'business', hasConversation: false, responseTimeMin: null },
  { id: 'm7', employer: 'Taverna Dionysos', worker: 'Κατερίνα Λεμονίδου', matchedAt: '2026-04-06T19:44:00Z', status: 'active', initiator: 'worker', hasConversation: true, responseTimeMin: 5 },
  { id: 'm8', employer: 'Santorini Cliff Hotel', worker: 'Αντώνης Παπαγεωργίου', matchedAt: '2026-04-06T17:30:00Z', status: 'active', initiator: 'business', hasConversation: true, responseTimeMin: 18 },
];

export const MOCK_CATEGORIES = [
  { id: 'hotel', label: 'Ξενοδοχείο', count: 42 },
  { id: 'restaurant', label: 'Εστιατόριο', count: 68 },
  { id: 'beach_bar', label: 'Beach Bar', count: 23 },
  { id: 'bar', label: 'Μπαρ', count: 31 },
  { id: 'cafe', label: 'Καφετέρια', count: 55 },
  { id: 'villa', label: 'Βίλα', count: 12 },
  { id: 'resort', label: 'Resort', count: 8 },
  { id: 'tourism_company', label: 'Τουριστική Εταιρεία', count: 6 },
];

/** KPI time series (daily for last 14 days) */
export const MOCK_KPI_SERIES = {
  dau: [180, 205, 198, 220, 245, 260, 255, 272, 290, 310, 298, 322, 340, 358],
  signups: [12, 18, 14, 22, 28, 24, 30, 35, 32, 42, 38, 48, 52, 58],
  matches: [25, 32, 28, 41, 48, 52, 55, 62, 70, 68, 82, 91, 98, 105],
  messages: [120, 145, 138, 175, 210, 198, 232, 255, 272, 290, 310, 348, 372, 398],
  revenue: [490, 540, 490, 620, 680, 720, 780, 830, 890, 940, 1010, 1120, 1180, 1280],
};

export const MOCK_FUNNEL = [
  { stage: 'Εγγραφές', count: 1240, percentage: 100 },
  { stage: 'Ολοκληρωμένο προφίλ', count: 892, percentage: 72 },
  { stage: 'Ενεργοί στο Discover', count: 720, percentage: 58 },
  { stage: 'Πρώτο Match', count: 485, percentage: 39 },
  { stage: 'Πρώτο μήνυμα', count: 352, percentage: 28 },
  { stage: 'Paid subscription', count: 142, percentage: 11 },
];

export const REPORT_TYPES_EL: Record<string, string> = {
  fake_profile: 'Ψεύτικο προφίλ',
  spam: 'Spam',
  harassment: 'Παρενόχληση',
  inappropriate_content: 'Ακατάλληλο περιεχόμενο',
  scam: 'Απάτη',
  misleading_job: 'Παραπλανητική αγγελία',
  impersonation: 'Αντιποίηση',
  payment_issue: 'Πρόβλημα πληρωμής',
  other: 'Άλλο',
};

export const REPORT_SEVERITY: Record<string, 'low' | 'medium' | 'high' | 'critical'> = {
  fake_profile: 'high',
  spam: 'low',
  harassment: 'critical',
  inappropriate_content: 'high',
  scam: 'critical',
  misleading_job: 'medium',
  impersonation: 'critical',
  payment_issue: 'medium',
  other: 'low',
};
