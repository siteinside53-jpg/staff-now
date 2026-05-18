'use client';

/**
 * /dashboard/billing — worker view.
 *
 *   • Free core (matching, messaging, browsing) — clearly stated
 *   • Worker Premium upgrade CTA (4.99 €/μήνα → Premium Tick + perks)
 *   • Credits balance + buy more
 *   • AI Tools: AI CV Generator, AI Profile Optimizer
 *   • Boosts: Discover boost (24h), Application boost (per-job)
 *   • Recent credit transactions
 */

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import { useCredits } from '@/components/credits/credits-context';

const API_BASE =
  process.env.NEXT_PUBLIC_API_URL ||
  'https://staffnow-api-production.siteinside53.workers.dev';

interface BillingMe {
  subscription: any | null;
  plan: any | null;
}

export function WorkerBillingSection() {
  const { balance, packages, refresh, buyPackage } = useCredits();
  const [billingMe, setBillingMe] = useState<BillingMe | null>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [buying, setBuying] = useState<string | null>(null);
  const [running, setRunning] = useState<string | null>(null);
  const [aiOutput, setAiOutput] = useState<{ kind: 'cv' | 'opt'; text: string } | null>(null);
  const [editingCv, setEditingCv] = useState(false);
  const [editCvDraft, setEditCvDraft] = useState('');

  const loadHistory = async () => {
    try {
      const token = localStorage.getItem('staffnow_token');
      const res = await fetch(`${API_BASE}/credits/history?limit=10`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const j = (await res.json()) as any;
      if (j.success) setHistory(j.data || []);
    } catch {}
  };
  const loadBilling = async () => {
    try {
      const token = localStorage.getItem('staffnow_token');
      const res = await fetch(`${API_BASE}/billing/me`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const j = (await res.json()) as any;
      if (j.success) setBillingMe(j.data);
    } catch {}
  };
  const loadSavedCv = async () => {
    try {
      const token = localStorage.getItem('staffnow_token');
      const res = await fetch(`${API_BASE}/workers/me/cv`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const j = (await res.json()) as any;
      if (j.success && j.data?.cv) {
        setAiOutput({ kind: 'cv', text: j.data.cv });
      }
    } catch {}
  };

  useEffect(() => { loadHistory(); loadBilling(); loadSavedCv(); }, []);

  const isPremium =
    billingMe?.subscription?.plan_id === 'worker_premium' &&
    billingMe?.subscription?.status === 'active';
  const periodEnd: string | null = billingMe?.subscription?.current_period_end || null;

  const onBuy = async (id: string) => {
    setBuying(id);
    try {
      const r = await buyPackage(id);
      if (r.ok) { toast.success(r.message || 'Έτοιμο'); await refresh(); await loadHistory(); }
      else toast.error(r.message || 'Αποτυχία');
    } finally { setBuying(null); }
  };

  const upgradeToPremium = async () => {
    const token = localStorage.getItem('staffnow_token');
    const res = await fetch(`${API_BASE}/billing/checkout`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        planId: 'worker_premium',
        period: 'monthly',
        documentType: 'receipt',
        successUrl: window.location.origin + '/dashboard/billing?premium=1',
        cancelUrl: window.location.origin + '/dashboard/billing?canceled=1',
      }),
    });
    const j = (await res.json()) as any;
    if (j.success && j.data?.url) window.location.href = j.data.url;
    else toast.error(j.error?.message || 'Σφάλμα');
  };

  const runAi = async (path: string, kind: 'cv' | 'opt') => {
    setRunning(kind);
    if (kind !== 'cv' || !aiOutput) setAiOutput(null);
    try {
      const token = localStorage.getItem('staffnow_token');
      const res = await fetch(`${API_BASE}${path}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: '{}',
      });
      const j = (await res.json()) as any;
      if (!j.success) {
        toast.error(j.error?.message || 'Αποτυχία');
        return;
      }
      const text = j.data?.cv || j.data?.bio || '';
      setAiOutput({ kind, text });
      toast.success('Έτοιμο');
      await refresh();
      await loadHistory();
    } finally {
      setRunning(null);
    }
  };

  const saveCvManually = async () => {
    if (!editCvDraft.trim()) return;
    setRunning('save-cv');
    try {
      const token = localStorage.getItem('staffnow_token');
      const res = await fetch(`${API_BASE}/workers/me/cv`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ cv: editCvDraft }),
      });
      const j = (await res.json()) as any;
      if (!j.success) {
        toast.error(j.error?.message || 'Αποτυχία');
        return;
      }
      setAiOutput({ kind: 'cv', text: editCvDraft });
      setEditingCv(false);
      toast.success('Αποθηκεύτηκε στο προφίλ');
    } finally {
      setRunning(null);
    }
  };

  const downloadCvPdf = () => {
    if (!aiOutput) return;
    // Open a print-friendly window. The browser's "Save as PDF" produces a
    // proper PDF without us having to ship a server-side PDF renderer.
    const win = window.open('', '_blank');
    if (!win) {
      toast.error('Επίτρεψε popups για να κατεβάσεις το PDF.');
      return;
    }
    const html = `<!doctype html><html lang="el"><head><meta charset="utf-8"><title>Βιογραφικό</title>
<style>
 body { font-family: Georgia, "Times New Roman", serif; max-width: 720px; margin: 32px auto; padding: 0 24px; line-height: 1.55; color: #111; }
 h1 { font-size: 22px; border-bottom: 2px solid #111; padding-bottom: 6px; }
 pre { white-space: pre-wrap; word-wrap: break-word; font-family: inherit; font-size: 14px; }
 @media print { body { margin: 0; padding: 0 16px; } }
</style></head>
<body><h1>Βιογραφικό</h1><pre>${aiOutput.text.replace(/[<>&]/g, m => ({'<':'&lt;','>':'&gt;','&':'&amp;'}[m]!))}</pre>
<script>setTimeout(() => window.print(), 300);</script>
</body></html>`;
    win.document.write(html);
    win.document.close();
  };

  const boost = async (path: string, label: string, kind: string) => {
    setRunning(kind);
    try {
      const token = localStorage.getItem('staffnow_token');
      const res = await fetch(`${API_BASE}${path}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: '{}',
      });
      const j = (await res.json()) as any;
      if (!j.success) {
        toast.error(j.error?.message || 'Αποτυχία');
        return;
      }
      toast.success(`${label} ενεργό μέχρι ${new Date(j.data.expiresAt).toLocaleString('el-GR')}`);
      await refresh();
      await loadHistory();
    } finally {
      setRunning(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* ----- Premium status / upgrade CTA ----- */}
      {isPremium ? (
        <div className="rounded-2xl border border-amber-300 bg-gradient-to-br from-amber-50 to-yellow-50 p-5">
          <div className="flex items-start gap-3">
            <span className="text-3xl">✨</span>
            <div className="flex-1">
              <p className="text-xs font-bold uppercase tracking-wider text-amber-700">Worker Premium</p>
              <h3 className="mt-1 text-lg font-bold text-gray-900">Είσαι Premium! ✓</h3>
              <p className="mt-1 text-xs text-gray-700">
                Premium Tick · 30 credits/μήνα · απεριόριστα boosts · advanced filters
              </p>
              {periodEnd && (
                <p className="mt-1 text-xs text-amber-700">
                  Ανανέωση: <strong>{new Date(periodEnd).toLocaleDateString('el-GR')}</strong>
                </p>
              )}
            </div>
          </div>
        </div>
      ) : (
        <div className="rounded-2xl border-2 border-amber-300 bg-gradient-to-br from-amber-50 via-yellow-50 to-orange-50 p-6">
          <div className="flex flex-wrap items-start gap-4">
            <span className="text-4xl">✨</span>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold uppercase tracking-wider text-amber-700">
                Αναβάθμιση
              </p>
              <h3 className="mt-1 text-xl font-extrabold text-gray-900">
                Worker Premium — μόνο <span className="text-amber-700">4,99€/μήνα</span>
              </h3>
              <ul className="mt-2 space-y-0.5 text-sm text-gray-700">
                <li>✓ <strong>Premium Tick</strong> δίπλα στο όνομά σου (πάντα)</li>
                <li>✓ 30 credits/μήνα δωρεάν (αξίας ~10€)</li>
                <li>✓ Απεριόριστα boosts στο Discover</li>
                <li>✓ Advanced filters & profile views statistics</li>
                <li>✓ Read receipts στα μηνύματα</li>
              </ul>
            </div>
            <button
              type="button"
              onClick={upgradeToPremium}
              className="rounded-xl bg-amber-600 px-5 py-2.5 text-sm font-bold text-white shadow-lg shadow-amber-600/25 hover:bg-amber-700"
            >
              Αναβάθμιση
            </button>
          </div>
        </div>
      )}

      {/* ----- Credits balance ----- */}
      <div className="rounded-2xl bg-gradient-to-br from-blue-500 via-blue-600 to-indigo-600 p-6 text-white shadow-lg">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-white/70">Τα credits σου</p>
            <div className="mt-1 flex items-baseline gap-2">
              <span className="text-4xl font-extrabold tabular-nums">{balance}</span>
              <span className="text-lg">💎</span>
            </div>
            <p className="text-[11px] text-white/70">
              Χρησιμοποίησέ τα για AI CV, optimization, ή boost στο Discover
            </p>
          </div>
        </div>
      </div>

      {/* ----- AI Tools ----- */}
      <div className="rounded-2xl border border-gray-200 bg-white p-5">
        <p className="text-xs font-bold uppercase tracking-wider text-gray-500">🤖 AI Εργαλεία</p>
        <p className="mt-1 text-xs text-gray-500">
          Φτιάξε επαγγελματικό CV ή βελτίωσε το προφίλ σου με τη βοήθεια AI.
          {isPremium ? ' (δωρεάν για Premium)' : ''}
        </p>

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <button
            type="button"
            disabled={!!running}
            onClick={() => runAi('/workers/ai/cv-generate', 'cv')}
            className="flex items-start gap-3 rounded-xl border border-gray-200 bg-white p-4 text-left transition-all hover:border-blue-300 hover:shadow-sm disabled:opacity-50"
          >
            <span className="text-2xl">🎨</span>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-gray-900">AI CV Generator</p>
              <p className="text-xs text-gray-600">
                Δημιουργία πλήρους βιογραφικού από τα στοιχεία προφίλ.
              </p>
              <span className="mt-1 inline-block rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-bold text-amber-700 ring-1 ring-amber-200">
                {isPremium ? 'Δωρεάν για Premium' : '5 credits 💎'}
              </span>
            </div>
            {running === 'cv' && (
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
            )}
          </button>

          <button
            type="button"
            disabled={!!running}
            onClick={() => runAi('/workers/ai/profile-optimize', 'opt')}
            className="flex items-start gap-3 rounded-xl border border-gray-200 bg-white p-4 text-left transition-all hover:border-blue-300 hover:shadow-sm disabled:opacity-50"
          >
            <span className="text-2xl">✨</span>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-gray-900">AI Profile Optimizer</p>
              <p className="text-xs text-gray-600">
                Βελτίωση bio με keywords για να σε βρίσκουν πιο εύκολα οι businesses.
              </p>
              <span className="mt-1 inline-block rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-bold text-amber-700 ring-1 ring-amber-200">
                {isPremium ? 'Δωρεάν για Premium' : '3 credits 💎'}
              </span>
            </div>
            {running === 'opt' && (
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
            )}
          </button>
        </div>

        {aiOutput && (
          <div className="mt-4 rounded-xl bg-gray-50 p-4">
            <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
              <p className="text-xs font-bold text-gray-700">
                {aiOutput.kind === 'cv' ? '🎨 Το βιογραφικό σου' : '✨ Βελτιωμένο bio'}
                {aiOutput.kind === 'cv' && (
                  <span className="ml-2 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
                    ✓ αποθηκεύτηκε στο προφίλ
                  </span>
                )}
              </p>
              <div className="flex flex-wrap gap-1">
                <button
                  type="button"
                  onClick={() => navigator.clipboard.writeText(aiOutput.text).then(() => toast.success('Αντιγράφηκε'))}
                  className="rounded-md border border-gray-200 bg-white px-2 py-1 text-[10px] font-bold text-gray-700 hover:bg-gray-100"
                >
                  Αντιγραφή
                </button>
                {aiOutput.kind === 'cv' && (
                  <>
                    <button
                      type="button"
                      onClick={() => {
                        setEditCvDraft(aiOutput.text);
                        setEditingCv(true);
                      }}
                      className="rounded-md border border-gray-200 bg-white px-2 py-1 text-[10px] font-bold text-gray-700 hover:bg-gray-100"
                    >
                      ✏️ Επεξεργασία
                    </button>
                    <button
                      type="button"
                      disabled={!!running}
                      onClick={() => runAi('/workers/ai/cv-regenerate', 'cv')}
                      className="rounded-md border border-amber-200 bg-amber-50 px-2 py-1 text-[10px] font-bold text-amber-800 hover:bg-amber-100 disabled:opacity-50"
                    >
                      {running === 'cv' ? '...' : '🔄 Ξανά'} <span className="ml-0.5 opacity-70">({isPremium ? 'δωρεάν' : '1 💎'})</span>
                    </button>
                    <button
                      type="button"
                      onClick={downloadCvPdf}
                      className="rounded-md bg-blue-600 px-2 py-1 text-[10px] font-bold text-white hover:bg-blue-700"
                    >
                      📄 Λήψη PDF
                    </button>
                    <button
                      type="button"
                      disabled={running === 'save-pdf'}
                      onClick={async () => {
                        setRunning('save-pdf');
                        try {
                          const token = localStorage.getItem('staffnow_token');
                          const res = await fetch(`${API_BASE}/workers/me/cv/save-as-pdf`, {
                            method: 'POST',
                            headers: { Authorization: `Bearer ${token}` },
                          });
                          const j = (await res.json()) as any;
                          if (!j.success) {
                            toast.error(j.error?.message || 'Αποτυχία αποθήκευσης');
                            return;
                          }
                          toast.success('🎉 Το CV αποθηκεύτηκε ως PDF στο προφίλ σου!');
                        } finally {
                          setRunning(null);
                        }
                      }}
                      className="rounded-md bg-emerald-600 px-2 py-1 text-[10px] font-bold text-white hover:bg-emerald-700 disabled:opacity-50"
                    >
                      {running === 'save-pdf' ? '...' : '✓ Αποθήκευση ως CV'}
                    </button>
                  </>
                )}
              </div>
            </div>

            {!editingCv ? (
              <pre className="max-h-72 overflow-auto whitespace-pre-wrap text-xs text-gray-800">{aiOutput.text}</pre>
            ) : (
              <>
                <textarea
                  value={editCvDraft}
                  onChange={(e) => setEditCvDraft(e.target.value)}
                  rows={14}
                  className="w-full rounded-lg border border-gray-300 bg-white p-3 text-xs font-mono text-gray-800 focus:border-blue-500 focus:outline-none"
                />
                <div className="mt-2 flex gap-2">
                  <button
                    type="button"
                    onClick={saveCvManually}
                    disabled={running === 'save-cv'}
                    className="rounded-md bg-blue-600 px-3 py-1.5 text-[11px] font-bold text-white disabled:opacity-50"
                  >
                    {running === 'save-cv' ? 'Αποθήκευση...' : '✓ Αποθήκευση'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditingCv(false)}
                    className="rounded-md border border-gray-200 bg-white px-3 py-1.5 text-[11px] font-semibold text-gray-700"
                  >
                    Ακύρωση
                  </button>
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {/* ----- Boosts ----- */}
      <div className="rounded-2xl border border-gray-200 bg-white p-5">
        <p className="text-xs font-bold uppercase tracking-wider text-gray-500">🚀 Boost ορατότητας</p>
        <p className="mt-1 text-xs text-gray-500">
          Εμφανίσου πρώτος στις κάρτες των businesses ή στους applicants μιας αγγελίας.
          {isPremium ? ' (απεριόριστα για Premium)' : ''}
        </p>

        <button
          type="button"
          disabled={!!running}
          onClick={() => boost('/workers/boost/discover', 'Boost Discover', 'boost-d')}
          className="mt-4 flex w-full items-center justify-between gap-3 rounded-xl border border-gray-200 bg-white p-4 text-left transition-all hover:border-blue-300 hover:shadow-sm disabled:opacity-50"
        >
          <div>
            <p className="text-sm font-bold text-gray-900">Boost στο Discover (24 ώρες)</p>
            <p className="text-xs text-gray-600">
              Μπες στις πρώτες κάρτες όλων των businesses που ψάχνουν.
            </p>
          </div>
          <span className="rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-bold text-blue-700 ring-1 ring-blue-200">
            {isPremium ? 'Δωρεάν' : '2 💎'}
          </span>
        </button>
      </div>

      {/* ----- Buy more credits ----- */}
      <div className="rounded-2xl border border-gray-200 bg-white p-5">
        <p className="text-xs font-bold uppercase tracking-wider text-gray-500">💎 Αγορά credits</p>
        <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {packages.map((pkg) => (
            <button
              key={pkg.id}
              type="button"
              onClick={() => onBuy(pkg.id)}
              disabled={buying !== null}
              className="relative rounded-xl border border-gray-200 bg-white p-3 text-center transition-all hover:border-blue-300 hover:shadow-sm disabled:opacity-50"
            >
              <p className="text-xl font-extrabold text-gray-900">{pkg.credits}</p>
              <p className="text-[10px] text-gray-500">credits</p>
              <p className="mt-1 text-sm font-bold text-gray-900">{pkg.priceDisplay}</p>
              {buying === pkg.id && (
                <div className="absolute inset-0 flex items-center justify-center rounded-xl bg-white/80">
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
                </div>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* ----- Recent transactions ----- */}
      {history.length > 0 && (
        <div className="rounded-2xl border border-gray-200 bg-white p-5">
          <p className="text-xs font-bold uppercase tracking-wider text-gray-500">Τελευταίες κινήσεις</p>
          <ul className="mt-3 divide-y divide-gray-100">
            {history.slice(0, 8).map((t: any) => (
              <li key={t.id} className="flex items-center justify-between gap-3 py-2 text-xs">
                <div className="min-w-0 flex-1 truncate">
                  <p className="text-sm text-gray-900 truncate">{t.description}</p>
                  <p className="text-[10px] text-gray-500">
                    {new Date(t.created_at).toLocaleString('el-GR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
                <span className={`flex-shrink-0 font-bold tabular-nums ${t.amount > 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                  {t.amount > 0 ? '+' : ''}{t.amount} 💎
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Bottom note */}
      <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-4 text-xs text-emerald-900">
        💚 <strong>Η εύρεση εργασίας είναι 100% δωρεάν.</strong> Όλα τα credits/Premium είναι
        προαιρετικά — για να ξεχωρίσεις, όχι για να βρεις δουλειά. Μπορείς πάντα να χρησιμοποιείς
        το StaffNow χωρίς να πληρώσεις τίποτα. {' '}
        <Link href="/pricing" className="font-bold underline">Δες όλα τα πλάνα →</Link>
      </div>
    </div>
  );
}
