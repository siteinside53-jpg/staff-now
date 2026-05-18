'use client';

/**
 * /admin/settings — platform configuration.
 *
 * Editable plans:        GET /admin/plans/effective + PATCH /admin/plans/:id (D1 plan_overrides)
 * Feature flags:         KV-backed (`platform:feature_flags`)
 * Moderation rules:      KV-backed (`platform:moderation_rules`)
 * AI Engine backfill:    POST /ai/embed/backfill
 * Admin team / RBAC:     /admin/admins (CRUD + role list)
 *
 * No mock data. No dead buttons.
 */

import { useEffect, useState } from 'react';
import { toast } from 'sonner';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'https://staffnow-api-production.siteinside53.workers.dev';

const FEATURE_FLAGS_DEFAULT = [
  { key: 'video_call', label: 'Video calls στα μηνύματα', description: 'Ενεργοποίηση Jitsi video call button', enabled: true },
  { key: 'quick_replies', label: 'Quick reply templates', description: '1-click templates για business → worker', enabled: true },
  { key: 'ai_matching', label: 'AI-powered matching', description: 'Embedding-based match scoring στο Discover feed', enabled: false },
  { key: 'profile_boost', label: 'Premium profile boost', description: 'Paid feature για προώθηση προφίλ', enabled: true },
  { key: 'reviews', label: 'Σύστημα αξιολογήσεων', description: 'Employers review workers μετά τη συνεργασία', enabled: false },
  { key: 'ai_shortlist', label: 'AI Auto-Shortlist', description: 'Αυτόματο top-5 candidates με AI explanation ανά αγγελία', enabled: false },
  { key: 'ai_profile_summary', label: 'AI Profile Summary', description: '3-bullet summary για κάθε worker (Llama 3.1)', enabled: false },
];

const MODERATION_RULES_DEFAULT = [
  { key: 'spam_keywords', label: 'Αυτόματη απόκρυψη spam', description: 'Φιλτράρισμα αγγελιών με keywords: crypto, forex, betting, εύκολα χρήματα κτλ', enabled: true },
  { key: 'report_rate_limit', label: 'Rate limiting αναφορών', description: 'Μέγιστο 3 αναφορές ανά χρήστη ανά ημέρα', enabled: true },
  { key: 'pii_masking', label: 'Phone/email detection στα messages', description: 'Blur τηλεφώνων/emails μέχρι τον 2ο κύκλο μηνυμάτων (αντι-platform-bypass)', enabled: true },
  { key: 'external_link_flag', label: 'External links detection', description: 'Flag συνομιλιών με εξωτερικά URLs για admin review', enabled: true },
];

interface Toggle { key: string; label: string; description: string; enabled: boolean }

interface ResolvedPlan {
  id: string;
  name: string;
  nameEl: string;
  priceMonthly: number;
  priceYearly: number;
  badge: string | null;
  features: Record<string, any>;
}

const authHeaders = (): HeadersInit => {
  const token = typeof window !== 'undefined' ? localStorage.getItem('staffnow_token') : null;
  return token ? { Authorization: `Bearer ${token}` } : {};
};

export default function SettingsPage() {
  const [flags, setFlags] = useState<Toggle[]>(FEATURE_FLAGS_DEFAULT);
  const [moderation, setModeration] = useState<Toggle[]>(MODERATION_RULES_DEFAULT);
  const [plans, setPlans] = useState<ResolvedPlan[]>([]);
  const [planCounts, setPlanCounts] = useState<Record<string, number>>({});
  const [editingPlan, setEditingPlan] = useState<ResolvedPlan | null>(null);
  const [loading, setLoading] = useState(true);
  const [backfilling, setBackfilling] = useState(false);

  const reloadPlans = async () => {
    const r = await fetch(`${API_BASE}/admin/plans/effective`, { headers: authHeaders() });
    const d = (await r.json()) as any;
    if (d?.success) setPlans(d.data?.items || []);
  };

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const [flagsRes, modRes, plansRes, plansSummary] = await Promise.all([
          fetch(`${API_BASE}/admin/settings/flags`, { headers: authHeaders() }).then((r) => r.json() as any).catch(() => ({})),
          fetch(`${API_BASE}/admin/settings/moderation`, { headers: authHeaders() }).then((r) => r.json() as any).catch(() => ({})),
          fetch(`${API_BASE}/admin/plans/effective`, { headers: authHeaders() }).then((r) => r.json() as any).catch(() => ({})),
          fetch(`${API_BASE}/admin/settings/plans-summary`, { headers: authHeaders() }).then((r) => r.json() as any).catch(() => ({})),
        ]);

        if (flagsRes?.success && flagsRes?.data) {
          const saved = flagsRes.data as Record<string, boolean>;
          setFlags((prev) => prev.map((f) => ({ ...f, enabled: saved[f.key] ?? f.enabled })));
        }
        if (modRes?.success && modRes?.data) {
          const saved = modRes.data as Record<string, boolean>;
          setModeration((prev) => prev.map((m) => ({ ...m, enabled: saved[m.key] ?? m.enabled })));
        }
        if (plansRes?.success && plansRes?.data?.items) {
          setPlans(plansRes.data.items as ResolvedPlan[]);
        }
        if (plansSummary?.success && plansSummary?.data?.items) {
          const map: Record<string, number> = {};
          (plansSummary.data.items as any[]).forEach((row) => { map[row.plan_id] = row.count; });
          setPlanCounts(map);
        }
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const persistTogglesToKV = async (
    endpoint: 'flags' | 'moderation',
    list: Toggle[],
  ) => {
    const map: Record<string, boolean> = {};
    list.forEach((f) => { map[f.key] = f.enabled; });
    const res = await fetch(`${API_BASE}/admin/settings/${endpoint}`, {
      method: 'POST',
      headers: { ...authHeaders(), 'Content-Type': 'application/json' },
      body: JSON.stringify(map),
    });
    return (await res.json()) as { success: boolean; error?: { message?: string } };
  };

  const toggleFlag = async (key: string) => {
    const before = flags;
    const updated = flags.map((f) => (f.key === key ? { ...f, enabled: !f.enabled } : f));
    setFlags(updated);
    const target = updated.find((f) => f.key === key);
    try {
      const data = await persistTogglesToKV('flags', updated);
      if (data.success) toast.success(`${target?.label}: ${target?.enabled ? 'ON' : 'OFF'}`);
      else throw new Error(data.error?.message || 'Αποτυχία αποθήκευσης');
    } catch (err: any) {
      toast.error(err?.message || 'Σφάλμα σύνδεσης');
      setFlags(before);
    }
  };

  const toggleModeration = async (key: string) => {
    const before = moderation;
    const updated = moderation.map((m) => (m.key === key ? { ...m, enabled: !m.enabled } : m));
    setModeration(updated);
    const target = updated.find((m) => m.key === key);
    try {
      const data = await persistTogglesToKV('moderation', updated);
      if (data.success) toast.success(`${target?.label}: ${target?.enabled ? 'ON' : 'OFF'}`);
      else throw new Error(data.error?.message || 'Αποτυχία αποθήκευσης');
    } catch (err: any) {
      toast.error(err?.message || 'Σφάλμα σύνδεσης');
      setModeration(before);
    }
  };

  const runBackfill = async () => {
    setBackfilling(true);
    try {
      const res = await fetch(`${API_BASE}/ai/embed/backfill`, { method: 'POST', headers: authHeaders() });
      const data = (await res.json()) as any;
      if (data.success) toast.success(`Backfill: ${data.data?.backfilled?.workers || 0} workers + ${data.data?.backfilled?.jobs || 0} jobs embedded`);
      else toast.error(data?.error?.message || 'Σφάλμα backfill');
    } catch (err: any) {
      toast.error(err?.message || 'Σφάλμα δικτύου');
    } finally {
      setBackfilling(false);
    }
  };

  // The 4 business plans + the worker plan, in display order.
  const businessPlans = plans.filter((p) => p.id !== 'worker_premium');
  const workerPlans = plans.filter((p) => p.id === 'worker_premium');

  const fmtLimit = (v: number | null | undefined) => (v == null ? '∞' : v.toLocaleString('el-GR'));

  return (
    <div className="space-y-6">
      {/* ─── Plans (editable) ─── */}
      <section>
        <SectionHeader
          icon="💰"
          title="Συνδρομητικά πακέτα"
          description="Επεξεργαστείτε τιμές, όρια και χαρακτηριστικά. Οι αλλαγές εφαρμόζονται άμεσα σε όλη την πλατφόρμα."
        />
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {[...businessPlans, ...workerPlans].map((plan) => {
            const subs = planCounts[plan.id] || 0;
            return (
              <div key={plan.id} className="relative rounded-xl border border-gray-200 bg-white p-5 shadow-sm flex flex-col">
                {plan.badge === 'popular' && (
                  <span className="absolute -top-2 right-3 rounded-full bg-blue-600 px-2 py-0.5 text-[10px] font-bold text-white">Popular</span>
                )}
                {plan.badge === 'founding' && (
                  <span className="absolute -top-2 right-3 rounded-full bg-amber-500 px-2 py-0.5 text-[10px] font-bold text-white">Founding</span>
                )}
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h3 className="font-bold text-gray-900">{plan.nameEl}</h3>
                    <p className="text-[10px] font-mono text-gray-400">{plan.id}</p>
                  </div>
                  <span className="text-lg font-bold text-gray-900">
                    {plan.priceMonthly}€<span className="text-xs font-normal text-gray-400">/μήνα</span>
                  </span>
                </div>
                <div className="flex-1 space-y-1.5 text-xs text-gray-600">
                  {plan.id !== 'worker_premium' ? (
                    <>
                      <Row label="Αγγελίες/μήνα" value={fmtLimit(plan.features.maxJobListings)} />
                      <Row label="Active matches" value={fmtLimit(plan.features.maxActiveMatches)} />
                      <Row label="Credits/μήνα" value={fmtLimit(plan.features.monthlyCredits)} />
                      <Row label="AI Shortlist" value={plan.features.aiShortlist ? '✓' : '—'} />
                      <Row label="AI Hiring Chat" value={plan.features.aiHiringChat ? '✓' : '—'} />
                      <Row label="Verified badge" value={plan.features.verifiedBadge ? '✓' : '—'} />
                    </>
                  ) : (
                    <>
                      <Row label="Premium tick" value={plan.features.premiumTick ? '✓' : '—'} />
                      <Row label="Bonus credits" value={fmtLimit(plan.features.monthlyCreditsBonus)} />
                      <Row label="Unlimited boosts" value={plan.features.unlimitedBoosts ? '✓' : '—'} />
                      <Row label="Stats προβολών" value={plan.features.profileViewsStats ? '✓' : '—'} />
                      <Row label="Read receipts" value={plan.features.readReceipts ? '✓' : '—'} />
                    </>
                  )}
                </div>
                <div className="mt-4 flex items-center justify-between rounded-lg bg-gray-50 px-3 py-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500">Active subs</span>
                  <span className="text-sm font-bold text-gray-900 tabular-nums">{subs}</span>
                </div>
                <button
                  onClick={() => setEditingPlan(plan)}
                  className="mt-3 w-full rounded-lg border border-blue-200 bg-blue-50 py-2 text-xs font-bold text-blue-700 hover:bg-blue-100 transition-colors"
                >
                  ✎ Επεξεργασία
                </button>
              </div>
            );
          })}
        </div>
        <p className="mt-3 text-[11px] text-gray-500">
          Οι αλλαγές αποθηκεύονται στο D1 (<code>plan_overrides</code>) και υπερισχύουν των defaults.
          Stripe Price IDs (μηνιαία/ετήσια χρέωση) ρυθμίζονται από το Stripe Dashboard — εδώ ρυθμίζετε μόνο
          ό,τι βλέπει ο χρήστης (τιμή, όρια, features).
        </p>
      </section>

      {/* ─── Feature flags ─── */}
      <section>
        <SectionHeader icon="🚩" title="Feature flags" description="Ενεργοποίηση/απενεργοποίηση χαρακτηριστικών — αποθηκεύονται στο KV." />
        <ToggleList items={flags} onToggle={toggleFlag} loading={loading} />
      </section>

      {/* ─── Moderation rules ─── */}
      <section>
        <SectionHeader icon="🛡" title="Moderation rules" description="Κανόνες αυτόματου ελέγχου — αποθηκεύονται στο KV." />
        <ToggleList items={moderation} onToggle={toggleModeration} loading={loading} />
      </section>

      {/* ─── AI engine ─── */}
      <section>
        <SectionHeader icon="🧠" title="AI Matching Engine" description="Cloudflare Workers AI — embedding pipeline & vector matching." />
        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm space-y-4">
          <p className="text-xs text-gray-600">
            Backfill embeddings για όλους τους workers + αγγελίες χωρίς embedding. Τρέχει max 20 ανά κλήση (CPU limit του CF).
          </p>
          <button
            onClick={runBackfill}
            disabled={backfilling}
            className="rounded-lg bg-purple-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-purple-700 disabled:opacity-50 disabled:cursor-wait transition-colors"
          >
            {backfilling ? '🧠 Backfill σε εξέλιξη…' : '🧠 Backfill embeddings'}
          </button>
        </div>
      </section>

      {editingPlan && (
        <PlanEditor
          plan={editingPlan}
          onClose={() => setEditingPlan(null)}
          onSaved={async () => { setEditingPlan(null); await reloadPlans(); toast.success('Το πλάνο ενημερώθηκε'); }}
        />
      )}
    </div>
  );
}

/* ─── Plan editor modal ─── */

function PlanEditor({ plan, onClose, onSaved }: { plan: ResolvedPlan; onClose: () => void; onSaved: () => void }) {
  const isWorker = plan.id === 'worker_premium';
  const [form, setForm] = useState({
    name_el: plan.nameEl,
    price_monthly: plan.priceMonthly,
    price_yearly: plan.priceYearly,
    badge: plan.badge || '',
    max_job_listings: numOrNull(plan.features.maxJobListings),
    max_active_matches: numOrNull(plan.features.maxActiveMatches),
    monthly_credits: numOrNull(plan.features.monthlyCredits),
    advanced_filters: !!plan.features.advancedFilters,
    boosted_visibility: !!plan.features.boostedVisibility,
    verified_badge: !!plan.features.verifiedBadge,
    favorite_lists: !!plan.features.favoriteLists,
    priority_support: !!plan.features.prioritySupport,
    ai_shortlist: !!plan.features.aiShortlist,
    ai_hiring_chat: !!plan.features.aiHiringChat,
    api_access: !!plan.features.apiAccess,
    premium_tick: !!plan.features.premiumTick,
    unlimited_boosts: !!plan.features.unlimitedBoosts,
    profile_views_stats: !!plan.features.profileViewsStats,
    read_receipts: !!plan.features.readReceipts,
    monthly_credits_bonus: numOrNull(plan.features.monthlyCreditsBonus),
  });
  const [saving, setSaving] = useState(false);
  const [resetting, setResetting] = useState(false);

  const save = async () => {
    setSaving(true);
    try {
      const body: Record<string, any> = {
        name_el: form.name_el,
        price_monthly: Number(form.price_monthly),
        price_yearly: Number(form.price_yearly),
        badge: form.badge || null,
        max_job_listings: form.max_job_listings,
        max_active_matches: form.max_active_matches,
        monthly_credits: form.monthly_credits,
        advanced_filters: form.advanced_filters,
        boosted_visibility: form.boosted_visibility,
        verified_badge: form.verified_badge,
        favorite_lists: form.favorite_lists,
        priority_support: form.priority_support,
        ai_shortlist: form.ai_shortlist,
        ai_hiring_chat: form.ai_hiring_chat,
        api_access: form.api_access,
      };
      if (isWorker) {
        body.premium_tick = form.premium_tick;
        body.unlimited_boosts = form.unlimited_boosts;
        body.profile_views_stats = form.profile_views_stats;
        body.read_receipts = form.read_receipts;
        body.monthly_credits_bonus = form.monthly_credits_bonus;
      }
      const res = await fetch(`${API_BASE}/admin/plans/${plan.id}`, {
        method: 'PATCH',
        headers: { ...authHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = (await res.json()) as any;
      if (data.success) onSaved();
      else toast.error(data?.error?.message || 'Αποτυχία αποθήκευσης');
    } catch (err: any) {
      toast.error(err?.message || 'Σφάλμα δικτύου');
    } finally {
      setSaving(false);
    }
  };

  const resetToDefaults = async () => {
    if (!confirm(`Επαναφορά του ${plan.nameEl} στις προεπιλογές κώδικα; Όλες οι αλλαγές σου θα χαθούν.`)) return;
    setResetting(true);
    try {
      const res = await fetch(`${API_BASE}/admin/plans/${plan.id}/overrides`, {
        method: 'DELETE',
        headers: authHeaders(),
      });
      const data = (await res.json()) as any;
      if (data.success) onSaved();
      else toast.error(data?.error?.message || 'Σφάλμα επαναφοράς');
    } catch (err: any) {
      toast.error(err?.message || 'Σφάλμα δικτύου');
    } finally {
      setResetting(false);
    }
  };

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm" onClick={() => !saving && !resetting && onClose()} />
      <div className="fixed inset-y-0 right-0 z-50 flex w-full max-w-lg flex-col bg-white shadow-2xl">
        <div className="border-b border-gray-100 p-5 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-gray-900">Επεξεργασία πλάνου</h2>
            <p className="font-mono text-[10px] text-gray-400">{plan.id}</p>
          </div>
          <button onClick={onClose} className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-100 text-gray-500 hover:bg-gray-200">✕</button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-6">
          <Field label="Εμφανιζόμενο όνομα">
            <input
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              value={form.name_el}
              onChange={(e) => setForm((f) => ({ ...f, name_el: e.target.value }))}
            />
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Μηνιαία τιμή (€)">
              <input
                type="number" step="0.01" min="0"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                value={form.price_monthly}
                onChange={(e) => setForm((f) => ({ ...f, price_monthly: Number(e.target.value) }))}
              />
            </Field>
            <Field label="Ετήσια τιμή (€)">
              <input
                type="number" step="0.01" min="0"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                value={form.price_yearly}
                onChange={(e) => setForm((f) => ({ ...f, price_yearly: Number(e.target.value) }))}
              />
            </Field>
          </div>

          <Field label="Badge (badge στο cards)">
            <select
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              value={form.badge}
              onChange={(e) => setForm((f) => ({ ...f, badge: e.target.value }))}
            >
              <option value="">— χωρίς —</option>
              <option value="popular">Popular</option>
              <option value="founding">Founding</option>
            </select>
          </Field>

          {!isWorker ? (
            <>
              <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500 -mb-2">Όρια</h3>
              <LimitField label="Αγγελίες/μήνα" value={form.max_job_listings} onChange={(v) => setForm((f) => ({ ...f, max_job_listings: v }))} />
              <LimitField label="Active matches" value={form.max_active_matches} onChange={(v) => setForm((f) => ({ ...f, max_active_matches: v }))} />
              <LimitField label="Credits/μήνα" value={form.monthly_credits} onChange={(v) => setForm((f) => ({ ...f, monthly_credits: v }))} />

              <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500 -mb-2">Features</h3>
              <FeatureToggle label="Advanced filters" v={form.advanced_filters} on={(v) => setForm((f) => ({ ...f, advanced_filters: v }))} />
              <FeatureToggle label="Boosted visibility" v={form.boosted_visibility} on={(v) => setForm((f) => ({ ...f, boosted_visibility: v }))} />
              <FeatureToggle label="Verified badge" v={form.verified_badge} on={(v) => setForm((f) => ({ ...f, verified_badge: v }))} />
              <FeatureToggle label="Favorite lists" v={form.favorite_lists} on={(v) => setForm((f) => ({ ...f, favorite_lists: v }))} />
              <FeatureToggle label="Priority support" v={form.priority_support} on={(v) => setForm((f) => ({ ...f, priority_support: v }))} />
              <FeatureToggle label="AI Shortlist" v={form.ai_shortlist} on={(v) => setForm((f) => ({ ...f, ai_shortlist: v }))} />
              <FeatureToggle label="AI Hiring Chat" v={form.ai_hiring_chat} on={(v) => setForm((f) => ({ ...f, ai_hiring_chat: v }))} />
              <FeatureToggle label="API access" v={form.api_access} on={(v) => setForm((f) => ({ ...f, api_access: v }))} />
            </>
          ) : (
            <>
              <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500 -mb-2">Worker features</h3>
              <FeatureToggle label="Premium tick" v={form.premium_tick} on={(v) => setForm((f) => ({ ...f, premium_tick: v }))} />
              <LimitField label="Bonus credits/μήνα" value={form.monthly_credits_bonus} onChange={(v) => setForm((f) => ({ ...f, monthly_credits_bonus: v }))} />
              <FeatureToggle label="Unlimited boosts" v={form.unlimited_boosts} on={(v) => setForm((f) => ({ ...f, unlimited_boosts: v }))} />
              <FeatureToggle label="Stats προβολών προφίλ" v={form.profile_views_stats} on={(v) => setForm((f) => ({ ...f, profile_views_stats: v }))} />
              <FeatureToggle label="Read receipts" v={form.read_receipts} on={(v) => setForm((f) => ({ ...f, read_receipts: v }))} />
              <FeatureToggle label="Advanced filters" v={form.advanced_filters} on={(v) => setForm((f) => ({ ...f, advanced_filters: v }))} />
            </>
          )}
        </div>

        <div className="border-t border-gray-100 bg-gray-50 p-4 flex items-center gap-2">
          <button
            onClick={resetToDefaults}
            disabled={saving || resetting}
            className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-xs font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
          >
            {resetting ? 'Επαναφορά…' : '↺ Επαναφορά defaults'}
          </button>
          <div className="flex-1" />
          <button onClick={onClose} disabled={saving || resetting} className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50">
            Άκυρο
          </button>
          <button onClick={save} disabled={saving || resetting} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50">
            {saving ? 'Αποθήκευση…' : 'Αποθήκευση'}
          </button>
        </div>
      </div>
    </>
  );
}

function numOrNull(v: any): number | null {
  if (v === null || v === undefined) return null;
  return Number(v);
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-semibold text-gray-700">{label}</span>
      {children}
    </label>
  );
}

function LimitField({ label, value, onChange }: { label: string; value: number | null; onChange: (v: number | null) => void }) {
  const isUnlimited = value === null;
  return (
    <Field label={label}>
      <div className="flex items-center gap-2">
        <input
          type="number" min="0"
          className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm disabled:bg-gray-50 disabled:text-gray-400"
          value={value ?? ''}
          disabled={isUnlimited}
          onChange={(e) => onChange(e.target.value === '' ? null : Number(e.target.value))}
          placeholder={isUnlimited ? '∞ (unlimited)' : '0'}
        />
        <label className="flex items-center gap-1 text-xs text-gray-600 whitespace-nowrap">
          <input
            type="checkbox"
            checked={isUnlimited}
            onChange={(e) => onChange(e.target.checked ? null : 0)}
          />
          ∞ unlimited
        </label>
      </div>
    </Field>
  );
}

function FeatureToggle({ label, v, on }: { label: string; v: boolean; on: (v: boolean) => void }) {
  return (
    <div className="flex items-center justify-between rounded-lg bg-gray-50 px-3 py-2">
      <span className="text-sm text-gray-700">{label}</span>
      <button
        type="button"
        onClick={() => on(!v)}
        className={`relative h-5 w-9 rounded-full transition-colors ${v ? 'bg-blue-600' : 'bg-gray-300'}`}
      >
        <span className={`absolute top-0.5 left-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform ${v ? 'translate-x-4' : ''}`} />
      </button>
    </div>
  );
}

/* ─── helpers ─── */

function SectionHeader({ icon, title, description }: { icon: string; title: string; description: string }) {
  return (
    <div className="mb-3">
      <h2 className="flex items-center gap-2 text-base font-bold text-gray-900">
        <span>{icon}</span>{title}
      </h2>
      <p className="mt-0.5 text-xs text-gray-500">{description}</p>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-gray-500">{label}</span>
      <span className="font-semibold text-gray-900">{value}</span>
    </div>
  );
}

function ToggleList({ items, onToggle, loading }: { items: Toggle[]; onToggle: (key: string) => void; loading: boolean }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
      <div className="divide-y divide-gray-100">
        {items.map((f) => (
          <div key={f.key} className="flex items-center justify-between p-4">
            <div className="min-w-0 pr-4">
              <p className="font-semibold text-gray-900">{f.label}</p>
              <p className="text-xs text-gray-500">{f.description}</p>
            </div>
            <button
              onClick={() => onToggle(f.key)}
              disabled={loading}
              className={`relative h-6 w-11 flex-shrink-0 rounded-full transition-colors disabled:opacity-50 ${
                f.enabled ? 'bg-blue-600' : 'bg-gray-300'
              }`}
              aria-label={`Toggle ${f.label}`}
            >
              <span className={`absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${f.enabled ? 'translate-x-5' : ''}`} />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
