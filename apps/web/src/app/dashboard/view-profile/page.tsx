'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { api } from '@/lib/api';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Spinner } from '@/components/ui/spinner';
import { WORKER_JOB_ROLE_LABELS_EL } from '@staffnow/config';
import Link from 'next/link';

function ViewProfileInner() {
  const searchParams = useSearchParams();
  const id = searchParams.get('id');
  const type = searchParams.get('type');
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      if (!id) return;
      try {
        if (type === 'worker') {
          const res = await api.workers.getById(id) as any;
          if (res.success) setProfile({ ...res.data, profileType: 'worker' });
        } else {
          const res = await api.jobs.getById(id) as any;
          if (res.success) setProfile({ ...res.data, profileType: 'job' });
        }
      } catch {} finally { setLoading(false); }
    }
    load();
  }, [id, type]);

  if (loading) return <div className="flex justify-center py-20"><Spinner className="h-8 w-8" /></div>;
  if (!profile) return <div className="text-center py-20"><p className="text-gray-500">Το προφίλ δεν βρέθηκε.</p><Link href="/dashboard/discover" className="mt-4 inline-block text-blue-600 hover:underline">← Πίσω στην Ανακάλυψη</Link></div>;

  if (profile.profileType === 'worker') {
    const p = profile.profile || profile;
    const roles = profile.roles || [];
    const langs = profile.languages || [];
    return (
      <div className="max-w-2xl mx-auto">
        <Link href="/dashboard/discover" className="mb-6 inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700">← Πίσω</Link>

        <Card className="overflow-hidden">
          <div className="bg-gradient-to-br from-blue-500 to-indigo-600 px-6 pb-8 pt-10 text-center text-white">
            {p.photo_url ? (
              <img src={p.photo_url} alt="" className="mx-auto h-24 w-24 rounded-full object-cover border-4 border-white/30" />
            ) : (
              <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-full bg-white/20 text-3xl font-bold">
                {p.full_name?.[0]?.toUpperCase() || '?'}
              </div>
            )}
            <h1 className="mt-4 text-2xl font-bold">{p.full_name || 'Εργαζόμενος'}</h1>
            {p.verified === 1 && <Badge className="mt-2 bg-green-500/20 text-green-100">✓ Verified</Badge>}
            {p.city && <p className="mt-2 text-sm text-blue-100">📍 {p.city}{p.region ? `, ${p.region}` : ''}</p>}
          </div>

          <CardContent className="p-6 space-y-6">
            {p.bio && <div><h3 className="font-semibold text-gray-900 mb-2">Σχετικά</h3><p className="text-gray-600 text-sm">{p.bio}</p></div>}

            {roles.length > 0 && (
              <div><h3 className="font-semibold text-gray-900 mb-2">Ρόλοι</h3>
                <div className="flex flex-wrap gap-2">{roles.map((r: string) => <Badge key={r} variant="secondary">{WORKER_JOB_ROLE_LABELS_EL[r] || r}</Badge>)}</div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              {p.years_of_experience != null && (
                <div className="rounded-lg bg-gray-50 p-3"><p className="text-xs text-gray-500">Εμπειρία</p><p className="font-semibold">{p.years_of_experience} χρόνια</p></div>
              )}
              {p.expected_monthly_salary && (
                <div className="rounded-lg bg-gray-50 p-3"><p className="text-xs text-gray-500">Μισθός</p><p className="font-semibold">{p.expected_monthly_salary}€/μήνα</p></div>
              )}
              {p.expected_hourly_rate && (
                <div className="rounded-lg bg-gray-50 p-3"><p className="text-xs text-gray-500">Ωρομίσθιο</p><p className="font-semibold">{p.expected_hourly_rate}€/ώρα</p></div>
              )}
              {p.availability && (
                <div className="rounded-lg bg-gray-50 p-3"><p className="text-xs text-gray-500">Διαθεσιμότητα</p><p className="font-semibold">{p.availability}</p></div>
              )}
            </div>

            {langs.length > 0 && (
              <div><h3 className="font-semibold text-gray-900 mb-2">Γλώσσες</h3>
                <div className="flex flex-wrap gap-2">{langs.map((l: any) => <Badge key={l.language || l} variant="secondary">{l.language || l}</Badge>)}</div>
              </div>
            )}

            <div className="flex items-center gap-3 text-sm text-gray-400">
              {p.willing_to_relocate === 1 && <span>✈️ Διαθέσιμος/η για μετακόμιση</span>}
              {p.cv_url && <a href={p.cv_url} target="_blank" className="text-blue-600 hover:underline">📄 Βιογραφικό</a>}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Job profile
  return (
    <div className="max-w-2xl mx-auto">
      <Link href="/dashboard/discover" className="mb-6 inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700">← Πίσω</Link>
      <Card>
        <CardHeader>
          <h1 className="text-2xl font-bold text-gray-900">{profile.title}</h1>
          {profile.company_name && <p className="text-gray-600">🏢 {profile.company_name}</p>}
          {profile.city && <p className="text-sm text-gray-400">📍 {profile.city}{profile.region ? `, ${profile.region}` : ''}</p>}
        </CardHeader>
        <CardContent className="space-y-4">
          {profile.description && <p className="text-gray-600">{profile.description}</p>}
          <div className="grid grid-cols-2 gap-4">
            {profile.salary_min && profile.salary_max && (
              <div className="rounded-lg bg-gray-50 p-3"><p className="text-xs text-gray-500">Μισθός</p><p className="font-semibold">{profile.salary_min}-{profile.salary_max}€</p></div>
            )}
            {profile.employment_type && (
              <div className="rounded-lg bg-gray-50 p-3"><p className="text-xs text-gray-500">Τύπος</p><p className="font-semibold">{profile.employment_type}</p></div>
            )}
          </div>
          <div className="flex gap-3 text-sm">
            {profile.housing_provided === 1 && <Badge className="bg-emerald-50 text-emerald-700">🏠 Διαμονή</Badge>}
            {profile.meals_provided === 1 && <Badge className="bg-emerald-50 text-emerald-700">🍽️ Σίτιση</Badge>}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default function ViewProfilePage() {
  return (
    <Suspense fallback={<div className="flex justify-center py-20"><Spinner className="h-8 w-8" /></div>}>
      <ViewProfileInner />
    </Suspense>
  );
}
