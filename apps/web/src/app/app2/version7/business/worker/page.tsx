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
import { workers as workersApi } from '../../_lib/api';

export default function WorkerDetailPage() {
  return (
    <Suspense fallback={<FullPageSpinner />}>
      <WorkerDetail />
    </Suspense>
  );
}

function WorkerDetail() {
  const params = useSearchParams();
  const router = useRouter();
  const id = params?.get('id') || '';
  const [worker, setWorker] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [matched, setMatched] = useState<{ matched: boolean; conversationId?: string } | null>(null);
  const [acting, setActing] = useState<'like' | 'skip' | null>(null);

  useEffect(() => {
    if (!id) { setLoading(false); return; }
    let cancelled = false;
    (async () => {
      try {
        const data = await workersApi.view(id);
        if (!cancelled) setWorker(data);
      } catch {} finally { if (!cancelled) setLoading(false); }
    })();
    return () => { cancelled = true; };
  }, [id]);

  const onLike = async () => {
    if (!id) return;
    setActing('like');
    try {
      const r = await workersApi.like(id);
      setMatched({ matched: !!r.matched, conversationId: r.conversationId });
    } catch {} finally { setActing(null); }
  };
  const onSkip = async () => {
    if (!id) return;
    setActing('skip');
    try { await workersApi.skip(id); router.back(); } catch {} finally { setActing(null); }
  };

  if (loading) return <div className="fixed inset-0 flex items-center justify-center bg-white"><Spinner /></div>;
  if (!worker) {
    return (
      <div className="fixed inset-0 flex flex-col bg-white">
        <AppBar back title="Εργαζόμενος" />
        <Body><EmptyState icon="🔎" title="Δεν βρέθηκε" /></Body>
      </div>
    );
  }

  const profile = worker.profile || worker;
  const roles = worker.roles || profile.roles || [];

  return (
    <div className="fixed inset-0 flex flex-col bg-[#F5F7FB]">
      <AppBar back title="Εργαζόμενος" />
      <Body className="pb-32">
        <Card className="p-5 text-center bg-gradient-to-br from-blue-600 to-indigo-700 text-white">
          <div className="flex justify-center">
            <Avatar name={profile.full_name} src={profile.avatar_url} size="xl" ring />
          </div>
          <h2 className="mt-3 text-xl font-extrabold">{profile.full_name || 'Εργαζόμενος'}</h2>
          <p className="mt-0.5 text-sm text-white/85">{profile.title || roles[0] || '—'}</p>
          {profile.city && <p className="mt-0.5 text-[12px] text-white/75">📍 {profile.city}</p>}
          <div className="mt-3 flex justify-center gap-1.5 flex-wrap">
            {profile.is_premium && <Badge tone="amber">⭐ Premium</Badge>}
            {profile.verified && <Badge tone="green">✓ Επαληθευμένος</Badge>}
          </div>
        </Card>

        {profile.bio && (
          <Section title="Σχετικά">
            <Card className="p-4">
              <p className="text-[13px] leading-relaxed text-gray-700 whitespace-pre-wrap">{profile.bio}</p>
            </Card>
          </Section>
        )}

        {roles.length > 0 && (
          <Section title="Ειδικότητες">
            <Card className="p-3">
              <div className="flex flex-wrap gap-1.5">
                {roles.map((r: string) => (
                  <span key={r} className="rounded-full bg-blue-50 px-2.5 py-1 text-[11px] font-bold text-blue-700">
                    {r.replace(/_/g, ' ')}
                  </span>
                ))}
              </div>
            </Card>
          </Section>
        )}

        {(profile.languages || []).length > 0 && (
          <Section title="Γλώσσες">
            <Card className="p-3">
              <div className="flex flex-wrap gap-1.5">
                {profile.languages.map((l: string) => (
                  <span key={l} className="rounded-full bg-cyan-50 px-2.5 py-1 text-[11px] font-bold text-cyan-700">
                    🌐 {l}
                  </span>
                ))}
              </div>
            </Card>
          </Section>
        )}
      </Body>

      <div
        className="flex-shrink-0 bg-white border-t border-gray-100 px-4 py-3 flex gap-3"
        style={{ paddingBottom: 'calc(12px + env(safe-area-inset-bottom))' }}
      >
        <Btn variant="secondary" onClick={onSkip} loading={acting === 'skip'} className="flex-1">✕ Skip</Btn>
        <Btn onClick={onLike} loading={acting === 'like'} className="flex-1">💕 Με ενδιαφέρει</Btn>
      </div>

      {matched && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-6">
          <div className="w-full max-w-sm rounded-3xl bg-gradient-to-br from-blue-600 to-indigo-700 p-6 text-center text-white shadow-2xl">
            <div className="text-6xl">{matched.matched ? '🎉' : '💕'}</div>
            <h2 className="mt-3 text-2xl font-black">{matched.matched ? 'It\'s a Match!' : 'Στάλθηκε!'}</h2>
            <p className="mt-2 text-sm text-white/90">
              {matched.matched
                ? 'Ο εργαζόμενος σε διάλεξε επίσης. Ξεκίνα τη συζήτηση!'
                : 'Σε ενημερώνουμε αν σε επιλέξει.'}
            </p>
            <div className="mt-5 flex flex-col gap-2">
              {matched.matched && matched.conversationId && (
                <a
                  href={`/app2/version7/business/chat?id=${matched.conversationId}`}
                  className="rounded-full bg-white px-5 py-3 text-sm font-extrabold text-blue-700 shadow-md"
                >
                  💬 Στείλε μήνυμα
                </a>
              )}
              <button onClick={() => setMatched(null)} className="rounded-full border-2 border-white/40 px-5 py-2.5 text-sm font-bold text-white">
                Συνέχεια
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
