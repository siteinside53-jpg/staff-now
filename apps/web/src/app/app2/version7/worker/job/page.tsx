'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  AppBar,
  Avatar,
  Badge,
  Body,
  Btn,
  Card,
  EmptyState,
  FullPageSpinner,
  Section,
  Spinner,
} from '../../_lib/ui';
import { jobs as jobsApi } from '../../_lib/api';
import { API_BASE, getToken } from '../../_lib/api';

export default function WorkerJobDetailPage() {
  return (
    <Suspense fallback={<FullPageSpinner />}>
      <WorkerJobDetail />
    </Suspense>
  );
}

function WorkerJobDetail() {
  const params = useSearchParams();
  const router = useRouter();
  const id = params?.get('id') || '';
  const [job, setJob] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [matched, setMatched] = useState<{ matched: boolean; conversationId?: string } | null>(null);
  const [acting, setActing] = useState<'like' | 'skip' | null>(null);

  useEffect(() => {
    if (!id) { setLoading(false); return; }
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`${API_BASE}/jobs/${id}`, {
          headers: getToken() ? { Authorization: `Bearer ${getToken()}` } : {},
        });
        const data = await res.json();
        if (!cancelled) setJob(data?.data || null);
      } catch {} finally { if (!cancelled) setLoading(false); }
    })();
    return () => { cancelled = true; };
  }, [id]);

  const onLike = async () => {
    if (!id) return;
    setActing('like');
    try {
      const r = await jobsApi.like(id);
      setMatched({ matched: !!r.matched, conversationId: r.conversationId });
    } catch {} finally { setActing(null); }
  };
  const onSkip = async () => {
    if (!id) return;
    setActing('skip');
    try { await jobsApi.skip(id); router.back(); } catch {} finally { setActing(null); }
  };

  if (loading) return <div className="fixed inset-0 flex items-center justify-center bg-white"><Spinner /></div>;
  if (!job) {
    return (
      <div className="fixed inset-0 flex flex-col bg-white">
        <AppBar back title="Αγγελία" />
        <Body><EmptyState icon="🔎" title="Δεν βρέθηκε" description="Η αγγελία ίσως αρχειοθετήθηκε." /></Body>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 flex flex-col bg-[#F5F7FB]">
      <AppBar back title="Λεπτομέρειες" />
      <Body className="pb-32">
        <Card className="p-5 bg-gradient-to-br from-blue-600 to-indigo-700 text-white">
          <Avatar name={job.business_name || job.title} src={job.business_logo} size="lg" ring />
          <h2 className="mt-3 text-xl font-extrabold leading-tight">{job.title}</h2>
          <p className="mt-1 text-sm text-white/85">{job.business_name || '—'}</p>
          <p className="mt-0.5 text-[12px] text-white/75">📍 {job.city || job.region || 'Όλη η Ελλάδα'}</p>
          <div className="mt-3 flex flex-wrap gap-1.5">
            {job.employment_type && <Badge tone="cyan">{label(job.employment_type)}</Badge>}
            {(job.salary_min || job.salary_max) && (
              <Badge tone="green">{salary(job.salary_min, job.salary_max, job.salary_type)}</Badge>
            )}
          </div>
        </Card>

        {job.description && (
          <Section title="Περιγραφή">
            <Card className="p-4">
              <p className="text-[13px] leading-relaxed text-gray-700 whitespace-pre-wrap">{job.description}</p>
            </Card>
          </Section>
        )}

        <Section title="Παροχές">
          <Card className="p-3">
            <div className="grid grid-cols-2 gap-2">
              <BenefitChip on={job.housing_provided} icon="🏠" label="Διαμονή" />
              <BenefitChip on={job.meals_provided} icon="🍽️" label="Σίτιση" />
              <BenefitChip on={job.transport_provided} icon="🚌" label="Μεταφορά" />
              <BenefitChip on={job.bonus_provided} icon="💰" label="Bonus" />
            </div>
          </Card>
        </Section>

        {(job.shift_type || job.experience_required) && (
          <Section title="Συνθήκες εργασίας">
            <Card className="p-3 space-y-2">
              {job.shift_type && <Field k="Ωράριο" v={shift(job.shift_type)} />}
              {job.experience_required && <Field k="Εμπειρία" v={exp(job.experience_required)} />}
              {job.hours_per_day && <Field k="Ώρες/ημέρα" v={`${job.hours_per_day}`} />}
              {job.days_per_week && <Field k="Μέρες/εβδομάδα" v={`${job.days_per_week}`} />}
            </Card>
          </Section>
        )}
      </Body>

      <div
        className="flex-shrink-0 bg-white border-t border-gray-100 px-4 py-3 flex gap-3"
        style={{ paddingBottom: 'calc(12px + env(safe-area-inset-bottom))' }}
      >
        <Btn variant="secondary" onClick={onSkip} loading={acting === 'skip'} className="flex-1">
          ✕ Παράλειψη
        </Btn>
        <Btn onClick={onLike} loading={acting === 'like'} className="flex-1">
          💕 Με ενδιαφέρει
        </Btn>
      </div>

      {matched && (
        <MatchModal
          matched={matched.matched}
          conversationId={matched.conversationId}
          onClose={() => setMatched(null)}
        />
      )}
    </div>
  );
}

function BenefitChip({ on, icon, label }: { on?: number | boolean; icon: string; label: string }) {
  return (
    <div className={`flex items-center gap-2 rounded-xl px-3 py-2 text-[12px] font-bold ${on ? 'bg-emerald-50 text-emerald-700' : 'bg-gray-50 text-gray-400'}`}>
      <span className="text-base">{icon}</span>
      <span>{label}</span>
      {on ? <span className="ml-auto">✓</span> : null}
    </div>
  );
}

function Field({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex justify-between text-[13px]">
      <span className="text-gray-500">{k}</span>
      <span className="font-bold text-gray-900">{v}</span>
    </div>
  );
}

function MatchModal({ matched, conversationId, onClose }: { matched: boolean; conversationId?: string; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-6">
      <div className="w-full max-w-sm rounded-3xl bg-gradient-to-br from-blue-600 to-indigo-700 p-6 text-center text-white shadow-2xl">
        <div className="text-6xl">{matched ? '🎉' : '💕'}</div>
        <h2 className="mt-3 text-2xl font-black">{matched ? 'It\'s a Match!' : 'Στάλθηκε!'}</h2>
        <p className="mt-2 text-sm text-white/90">
          {matched ? 'Η επιχείρηση σε διάλεξε επίσης. Ξεκίνα τη συζήτηση!' : 'Σε ενημερώνουμε αν σε επιλέξει.'}
        </p>
        <div className="mt-5 flex flex-col gap-2">
          {matched && conversationId && (
            <a
              href={`/app2/version7/worker/chat?id=${conversationId}`}
              className="rounded-full bg-white px-5 py-3 text-sm font-extrabold text-blue-700 shadow-md"
            >
              💬 Στείλε μήνυμα
            </a>
          )}
          <button onClick={onClose} className="rounded-full border-2 border-white/40 px-5 py-2.5 text-sm font-bold text-white">
            Συνέχεια
          </button>
        </div>
      </div>
    </div>
  );
}

function label(t: string): string { return ({ full_time: 'Πλήρης', part_time: 'Μερική', seasonal: 'Σεζόν' } as any)[t] || t; }
function shift(t: string): string { return ({ morning: 'Πρωί', evening: 'Βράδυ', split: 'Σπαστό', flexible: 'Ευέλικτο' } as any)[t] || t; }
function exp(t: string): string { return ({ none: 'Χωρίς εμπειρία', '1_2_years': '1-2 χρόνια', '3_plus_years': '3+ χρόνια' } as any)[t] || t; }
function salary(min?: number, max?: number, type?: string): string {
  const suf = type === 'hourly' ? '€/ώρα' : type === 'daily' ? '€/μέρα' : '€/μήνα';
  if (min && max) return `${min}-${max} ${suf}`;
  if (min) return `Από ${min} ${suf}`;
  if (max) return `Έως ${max} ${suf}`;
  return 'Συζητήσιμα';
}
