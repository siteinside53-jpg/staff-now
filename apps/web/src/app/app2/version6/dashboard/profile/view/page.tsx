'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { workers, businesses, jobs as jobsApi } from '../../../_lib/api';
import { Avatar, ChevronLeft, FullPageSpinner, Pill, ScreenHeader, VerifiedBadge, ErrorState } from '../../../_lib/ui';
import { roleLabel, businessTypeLabel, formatSalary } from '../../../_lib/format';

// Static export requires `dynamic = 'force-static'` for [search] params... but we
// just render client side with useSearchParams.

export const dynamic = 'force-static';

export default function ProfileViewPage() {
  return (
    <Suspense fallback={<FullPageSpinner />}>
      <ProfileView />
    </Suspense>
  );
}

function ProfileView() {
  const router = useRouter();
  const search = useSearchParams();
  const id = search.get('id');
  const type = (search.get('type') || 'worker') as 'worker' | 'job' | 'business';
  const [data, setData] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    (async () => {
      try {
        let payload;
        if (type === 'worker') {
          payload = await workers.view(id);
        } else if (type === 'job') {
          // For a job tap, fetch the business behind it
          const list = await jobsApi.list({ limit: 50 });
          const job = list.items?.find((j: any) => j.id === id);
          if (!job) throw new Error('Δεν βρέθηκε η αγγελία');
          payload = { ...job, _isJob: true };
        } else {
          payload = await businesses.view(id);
        }
        setData(payload);
      } catch (e: any) {
        setError(e?.message || 'Σφάλμα φόρτωσης');
      } finally {
        setLoading(false);
      }
    })();
  }, [id, type]);

  if (loading) return <FullPageSpinner />;
  if (error) return <ErrorState message={error} onRetry={() => router.refresh()} />;
  if (!data) return <ErrorState message="Δεν βρέθηκε το προφίλ." />;

  if (type === 'worker') return <WorkerView data={data} onBack={() => router.back()} />;
  if (type === 'job') return <JobView data={data} onBack={() => router.back()} />;
  return <BusinessView data={data} onBack={() => router.back()} />;
}

function WorkerView({ data, onBack }: { data: any; onBack: () => void }) {
  const profile = data.profile || data;
  const roles: string[] = data.roles || profile.roles || [];
  const langs: string[] = data.languages || profile.languages || [];
  return (
    <>
      <ScreenHeader title="Προφίλ Εργαζόμενου" back={onBack} />
      <div className="bg-gradient-to-br from-emerald-500 to-teal-600 h-32 -mt-1" />
      <div className="px-4 -mt-12 pb-8">
        <div className="bg-white rounded-3xl shadow-md ring-1 ring-gray-100 p-5">
          <div className="flex flex-col items-center -mt-12">
            <Avatar src={profile.photo_url} name={profile.full_name} size="xl" ring />
            <div className="mt-3 flex items-center gap-1.5">
              <h2 className="text-xl font-black text-gray-900">{profile.full_name || '—'}</h2>
              {profile.verified === 1 && <VerifiedBadge className="h-5 w-5" />}
            </div>
            <p className="text-sm text-gray-500">
              {[profile.city, profile.region].filter(Boolean).join(', ')}
            </p>
          </div>

          {profile.bio && (
            <section className="mt-5">
              <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400">Σχετικά</h3>
              <p className="mt-2 text-sm text-gray-700 leading-relaxed">{profile.bio}</p>
            </section>
          )}

          {roles.length > 0 && (
            <section className="mt-5">
              <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400">Ρόλοι</h3>
              <div className="mt-2 flex flex-wrap gap-2">
                {roles.map((r) => (
                  <Pill key={r} tone="green">
                    {roleLabel(r)}
                  </Pill>
                ))}
              </div>
            </section>
          )}

          <dl className="mt-5 space-y-2 text-sm">
            <Row label="Εμπειρία" value={profile.years_of_experience ? `${profile.years_of_experience} έτη` : '—'} />
            <Row label="Αναμενόμενος μισθός" value={profile.expected_monthly_salary ? `${Number(profile.expected_monthly_salary).toLocaleString('el-GR')}€/μήνα` : '—'} />
            <Row label="Διαθεσιμότητα" value={profile.availability || '—'} />
            <Row label="Μετακίνηση" value={profile.willing_to_relocate ? 'Ναι' : 'Όχι'} />
          </dl>

          {langs.length > 0 && (
            <section className="mt-5">
              <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400">Γλώσσες</h3>
              <div className="mt-2 flex flex-wrap gap-2">
                {langs.map((l) => (
                  <Pill key={l} tone="blue">
                    {l}
                  </Pill>
                ))}
              </div>
            </section>
          )}
        </div>
      </div>
    </>
  );
}

function JobView({ data, onBack }: { data: any; onBack: () => void }) {
  return (
    <>
      <ScreenHeader title="Αγγελία" back={onBack} />
      <div className="bg-gradient-to-br from-blue-600 to-indigo-700 h-32 -mt-1 relative">
        {data.company_cover_photo && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={data.company_cover_photo} alt="" className="absolute inset-0 h-full w-full object-cover opacity-50" />
        )}
      </div>
      <div className="px-4 -mt-12 pb-8">
        <div className="bg-white rounded-3xl shadow-md ring-1 ring-gray-100 p-5">
          <div className="flex items-start gap-3">
            <Avatar src={data.company_logo} name={data.display_company_name || data.company_name} size="lg" ring />
            <div className="flex-1 min-w-0">
              <h2 className="text-xl font-black text-gray-900 leading-tight">{data.title}</h2>
              <p className="text-sm text-gray-500">
                {data.display_company_name || data.company_name} ·{' '}
                {[data.display_city, data.display_region].filter(Boolean).join(', ')}
              </p>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            {(data.salary_min || data.salary_max) && (
              <Pill tone="green">{formatSalary(data.salary_min, data.salary_max, data.salary_type)}</Pill>
            )}
            {data.employment_type && <Pill>{data.employment_type}</Pill>}
            {data.housing_provided === 1 && <Pill tone="amber">🏠 Διαμονή</Pill>}
            {data.meals_provided === 1 && <Pill tone="amber">🍽️ Σίτιση</Pill>}
          </div>

          {data.description && (
            <section className="mt-5">
              <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400">Περιγραφή</h3>
              <p className="mt-2 text-sm text-gray-700 leading-relaxed whitespace-pre-line">{data.description}</p>
            </section>
          )}
        </div>
      </div>
    </>
  );
}

function BusinessView({ data, onBack }: { data: any; onBack: () => void }) {
  const p = data.profile || data;
  return (
    <>
      <ScreenHeader title="Επιχείρηση" back={onBack} />
      <div className="bg-gradient-to-br from-blue-600 to-indigo-700 h-32 -mt-1" />
      <div className="px-4 -mt-12 pb-8">
        <div className="bg-white rounded-3xl shadow-md ring-1 ring-gray-100 p-5">
          <div className="flex flex-col items-center -mt-12">
            <Avatar src={p.logo_url} name={p.company_name} size="xl" ring />
            <div className="mt-3 flex items-center gap-1.5">
              <h2 className="text-xl font-black text-gray-900">{p.company_name || '—'}</h2>
              {p.verified === 1 && <VerifiedBadge className="h-5 w-5" />}
            </div>
            <p className="text-sm text-gray-500">
              {businessTypeLabel(p.business_type)} · {[p.city, p.region].filter(Boolean).join(', ')}
            </p>
          </div>

          {p.description && (
            <section className="mt-5">
              <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400">Σχετικά</h3>
              <p className="mt-2 text-sm text-gray-700 leading-relaxed">{p.description}</p>
            </section>
          )}
        </div>
      </div>
    </>
  );
}

function Row({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="flex justify-between py-2 border-b border-gray-100 last:border-0">
      <dt className="text-gray-500">{label}</dt>
      <dd className="font-semibold text-gray-900">{value}</dd>
    </div>
  );
}
