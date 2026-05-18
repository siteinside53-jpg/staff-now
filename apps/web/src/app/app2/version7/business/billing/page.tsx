'use client';

import { useEffect, useState } from 'react';
import {
  AppBar,
  Badge,
  Body,
  Btn,
  Card,
  EmptyState,
  Section,
  Spinner,
} from '../../_lib/ui';
import { API_BASE, getToken } from '../../_lib/api';

export default function BillingPage() {
  const [subs, setSubs] = useState<any>(null);
  const [payments, setPayments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const headers = getToken() ? { Authorization: `Bearer ${getToken()}` } : {};
    Promise.all([
      fetch(`${API_BASE}/billing/subscription`, { headers }).then((r) => r.json()).catch(() => null),
      fetch(`${API_BASE}/billing/payments`, { headers }).then((r) => r.json()).catch(() => null),
    ]).then(([s, p]) => {
      if (cancelled) return;
      setSubs(s?.data || null);
      setPayments(p?.data?.items || []);
    }).finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  if (loading) return <div className="fixed inset-0 flex items-center justify-center bg-white"><Spinner /></div>;

  return (
    <div className="fixed inset-0 flex flex-col bg-[#F5F7FB]">
      <AppBar back title="Πληρωμές & Συνδρομή" />
      <Body>
        <Section title="Τρέχουσα συνδρομή">
          {subs?.plan ? (
            <Card className="p-5 bg-gradient-to-br from-blue-600 to-indigo-700 text-white">
              <p className="text-[11px] font-bold uppercase tracking-wider text-white/90">Πλάνο</p>
              <p className="mt-1 text-2xl font-extrabold">{labelPlan(subs.plan)}</p>
              <p className="mt-1 text-[12px] text-white/85">
                {subs.status === 'active' ? '✓ Ενεργή' : subs.status === 'past_due' ? '⚠️ Καθυστέρηση πληρωμής' : 'Ανενεργή'}
                {subs.current_period_end && ` · Επόμενη χρέωση ${new Date(subs.current_period_end).toLocaleDateString('el-GR')}`}
              </p>
              <div className="mt-4 flex gap-2">
                <a
                  href="/app2/version7/business/boost"
                  className="rounded-full bg-white px-4 py-2 text-[12px] font-extrabold text-blue-700"
                >
                  ⬆️ Αναβάθμιση
                </a>
                <button className="rounded-full border-2 border-white/40 px-4 py-2 text-[12px] font-bold">
                  Ακύρωση
                </button>
              </div>
            </Card>
          ) : (
            <EmptyState
              icon="💳"
              title="Δωρεάν λογαριασμός"
              description="Αναβάθμισε για περισσότερες δυνατότητες."
              action={<a href="/app2/version7/business/boost" className="rounded-full bg-blue-600 px-5 py-2.5 text-sm font-bold text-white">Δες πλάνα</a>}
            />
          )}
        </Section>

        <Section title="Ιστορικό πληρωμών">
          {payments.length === 0 ? (
            <EmptyState icon="📃" title="Καμία χρέωση ακόμα" description="Όλες οι πληρωμές σου θα εμφανίζονται εδώ." />
          ) : (
            <div className="space-y-2">
              {payments.map((p) => <PaymentRow key={p.id} p={p} />)}
            </div>
          )}
        </Section>
      </Body>
    </div>
  );
}

function PaymentRow({ p }: { p: any }) {
  const amount = ((p.amount_cents || 0) / 100).toFixed(2);
  return (
    <Card className="p-3">
      <div className="flex items-center gap-3">
        <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-50 text-base">💳</span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold text-gray-900 truncate">
            {p.description || labelPlan(p.plan_id) || 'Πληρωμή'}
          </p>
          <p className="text-[11px] text-gray-500">
            {new Date(p.created_at).toLocaleDateString('el-GR')} · {(p.provider || 'stripe').toUpperCase()}
          </p>
        </div>
        <div className="flex flex-col items-end gap-0.5">
          <p className="text-sm font-extrabold text-gray-900">{amount} {p.currency || '€'}</p>
          <Badge tone={p.status === 'succeeded' ? 'green' : p.status === 'failed' ? 'rose' : 'amber'}>
            {labelStatus(p.status)}
          </Badge>
        </div>
      </div>
    </Card>
  );
}

function labelPlan(p?: string): string { return ({ starter: 'Starter', pro: 'Pro', elite: 'Elite' } as any)[p || ''] || p || ''; }
function labelStatus(s?: string): string { return ({ succeeded: 'Επιτυχής', failed: 'Απέτυχε', refunded: 'Επιστροφή', pending: 'Σε εκκρεμότητα' } as any)[s || ''] || s || ''; }
