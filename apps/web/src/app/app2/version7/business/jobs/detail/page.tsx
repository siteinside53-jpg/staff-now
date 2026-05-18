'use client';

import Link from 'next/link';
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
  Stat,
} from '../../../_lib/ui';
import { jobs as jobsApi, API_BASE, getToken } from '../../../_lib/api';

export default function BusinessJobDetailPage() {
  return (
    <Suspense fallback={<FullPageSpinner />}>
      <BusinessJobDetail />
    </Suspense>
  );
}

function BusinessJobDetail() {
  const params = useSearchParams();
  const router = useRouter();
  const id = params?.get('id') || '';
  const [job, setJob] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState<string | null>(null);

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

  const refresh = async () => {
    try {
      const res = await fetch(`${API_BASE}/jobs/${id}`, {
        headers: getToken() ? { Authorization: `Bearer ${getToken()}` } : {},
      });
      const data = await res.json();
      setJob(data?.data || null);
    } catch {}
  };

  const onPublish = async () => { setActing('publish'); try { await jobsApi.publish(id); await refresh(); } catch {} finally { setActing(null); } };
  const onArchive = async () => { setActing('archive'); try { await jobsApi.archive(id); await refresh(); } catch {} finally { setActing(null); } };
  const onDelete = async () => {
    if (!confirm('Σίγουρα; Η αγγελία θα διαγραφεί οριστικά.')) return;
    setActing('delete');
    try { await jobsApi.remove(id); router.replace('/app2/version7/business/jobs'); } catch {} finally { setActing(null); }
  };

  if (loading) return <div className="fixed inset-0 flex items-center justify-center bg-white"><Spinner /></div>;
  if (!job) return (
    <div className="fixed inset-0 flex flex-col bg-white">
      <AppBar back title="Αγγελία" />
      <Body><EmptyState icon="🔎" title="Δεν βρέθηκε" /></Body>
    </div>
  );

  return (
    <div className="fixed inset-0 flex flex-col bg-[#F5F7FB]">
      <AppBar
        back
        title={job.title}
        right={
          <Link
            href={`/app2/version7/business/jobs/edit?id=${job.id}`}
            className="rounded-full bg-blue-600 px-4 py-1.5 text-[12px] font-bold text-white"
          >
            ✏️ Edit
          </Link>
        }
      />
      <Body className="pb-32">
        {/* Statistics */}
        <Section title="Στατιστικά">
          <div className="grid grid-cols-2 gap-2.5">
            <Stat label="Views" value={job.view_count || 0} tone="cyan" icon={<span>👁️</span>} />
            <Stat label="Likes" value={job.like_count || 0} tone="rose" icon={<span>💕</span>} />
            <Stat label="Matches" value={job.match_count || 0} tone="green" icon={<span>🎯</span>} />
            <Stat label="Conversations" value={job.conversation_count || 0} tone="blue" icon={<span>💬</span>} />
          </div>
        </Section>

        <Section title="Κατάσταση">
          <Card className="p-4 flex items-center justify-between">
            <div>
              <Badge tone={statusTone(job.status)}>{statusLabel(job.status)}</Badge>
              <p className="mt-1 text-[11px] text-gray-500">
                Δημιουργήθηκε {new Date(job.created_at).toLocaleDateString('el-GR')}
              </p>
            </div>
            <Link
              href={`/app2/version7/business/jobs/stats?id=${job.id}`}
              className="rounded-full bg-blue-50 px-3 py-1.5 text-[12px] font-bold text-blue-700"
            >
              📊 Λεπτομέρειες
            </Link>
          </Card>
        </Section>

        {job.description && (
          <Section title="Περιγραφή">
            <Card className="p-4">
              <p className="text-[13px] leading-relaxed text-gray-700 whitespace-pre-wrap">{job.description}</p>
            </Card>
          </Section>
        )}

        <Section title="Ενέργειες">
          <Card className="p-3 space-y-2">
            {job.status !== 'published' && (
              <Btn full onClick={onPublish} loading={acting === 'publish'}>🚀 Δημοσίευση</Btn>
            )}
            {job.status === 'published' && (
              <Btn variant="secondary" full onClick={onArchive} loading={acting === 'archive'}>📦 Αρχειοθέτηση</Btn>
            )}
            <Btn variant="ghost" full onClick={() => router.push(`/app2/version7/business/boost?job=${job.id}`)}>
              🚀 Boost αγγελίας
            </Btn>
            <Btn variant="danger" full onClick={onDelete} loading={acting === 'delete'}>🗑️ Διαγραφή</Btn>
          </Card>
        </Section>
      </Body>
    </div>
  );
}

function statusLabel(s?: string): string { return ({ published: 'Δημοσιευμένη', draft: 'Πρόχειρο', paused: 'Σε παύση', archived: 'Αρχείο', filled: 'Καλύφθηκε' } as any)[s || ''] || s || ''; }
function statusTone(s?: string): any { return ({ published: 'green', draft: 'gray', paused: 'amber', archived: 'gray', filled: 'blue' } as any)[s || ''] || 'gray'; }
