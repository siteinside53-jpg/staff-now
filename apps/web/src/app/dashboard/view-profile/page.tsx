'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { api } from '@/lib/api';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Spinner } from '@/components/ui/spinner';
import Link from 'next/link';
import { useT } from '@/i18n/locale-provider';
import { useLabels } from '@/i18n/labels';

function ViewProfileInner() {
  const t = useT();
  const labels = useLabels();
  const searchParams = useSearchParams();
  const id = searchParams.get('id');
  const type = searchParams.get('type');
  const workerId = searchParams.get('worker');
  const businessId = searchParams.get('business');
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        if (workerId || type === 'worker') {
          const res = await api.workers.getById(workerId || id!) as any;
          if (res.success) setProfile({ ...res.data, profileType: 'worker' });
        } else if (businessId) {
          const token = localStorage.getItem('staffnow_token');
          const API = process.env.NEXT_PUBLIC_API_URL || 'https://staffnow-api-production.siteinside53.workers.dev';
          const res = await fetch(`${API}/businesses/${businessId}`, {
            headers: { 'Authorization': `Bearer ${token}` },
            credentials: 'include',
          });
          const data = await res.json() as any;
          if (data.success) setProfile({ ...data.data, profileType: 'business' });
        } else if (id) {
          const res = await api.jobs.getById(id) as any;
          if (res.success) setProfile({ ...res.data, profileType: 'job' });
        }
      } catch {} finally { setLoading(false); }
    }
    if (id || workerId || businessId) load();
    else setLoading(false);
  }, [id, type, workerId, businessId]);

  if (loading) return <div className="flex justify-center py-20"><Spinner className="h-8 w-8" /></div>;
  if (!profile) return <div className="text-center py-20"><p className="text-gray-500">{t('viewProfile.notFound')}</p><Link href="/dashboard/discover" className="mt-4 inline-block text-blue-600 hover:underline">{t('viewProfile.backToDiscover')}</Link></div>;

  if (profile.profileType === 'worker') {
    const p = profile.profile || profile;
    const roles = profile.roles || [];
    const langs = profile.languages || [];
    return (
      <div className="max-w-2xl mx-auto">
        <Link href="/dashboard/discover" className="mb-6 inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700">{t('viewProfile.back')}</Link>

        <Card className="overflow-hidden">
          <div className="bg-gradient-to-br from-blue-500 to-indigo-600 px-6 pb-8 pt-10 text-center text-white">
            {p.photo_url ? (
              <img src={p.photo_url} alt="" className="mx-auto h-24 w-24 rounded-full object-cover border-4 border-white/30" />
            ) : (
              <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-full bg-white/20 text-3xl font-bold">
                {p.full_name?.[0]?.toUpperCase() || '?'}
              </div>
            )}
            <h1 className="mt-4 text-2xl font-bold">{p.full_name || t('viewProfile.worker')}</h1>
            {p.verified === 1 && <Badge className="mt-2 bg-green-500/20 text-green-100">{t('viewProfile.verified')}</Badge>}
            {p.city && <p className="mt-2 text-sm text-blue-100">📍 {p.city}{p.region ? `, ${p.region}` : ''}</p>}
          </div>

          <CardContent className="p-6 space-y-6">
            {p.bio && <div><h3 className="font-semibold text-gray-900 mb-2">{t('viewProfile.about')}</h3><p className="text-gray-600 text-sm">{p.bio}</p></div>}

            {roles.length > 0 && (
              <div><h3 className="font-semibold text-gray-900 mb-2">{t('viewProfile.roles')}</h3>
                <div className="flex flex-wrap gap-2">{roles.map((r: string) => <Badge key={r} variant="secondary">{labels.role(r)}</Badge>)}</div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              {p.years_of_experience != null && (
                <div className="rounded-lg bg-gray-50 p-3"><p className="text-xs text-gray-500">{t('viewProfile.experience')}</p><p className="font-semibold">{t('viewProfile.years', { n: p.years_of_experience })}</p></div>
              )}
              {p.expected_monthly_salary && (
                <div className="rounded-lg bg-gray-50 p-3"><p className="text-xs text-gray-500">{t('viewProfile.salary')}</p><p className="font-semibold">{t('viewProfile.perMonth', { v: p.expected_monthly_salary })}</p></div>
              )}
              {p.expected_hourly_rate && (
                <div className="rounded-lg bg-gray-50 p-3"><p className="text-xs text-gray-500">{t('viewProfile.hourly')}</p><p className="font-semibold">{t('viewProfile.perHour', { v: p.expected_hourly_rate })}</p></div>
              )}
              {p.availability && (
                <div className="rounded-lg bg-gray-50 p-3"><p className="text-xs text-gray-500">{t('viewProfile.availability')}</p><p className="font-semibold">{p.availability}</p></div>
              )}
            </div>

            {langs.length > 0 && (
              <div><h3 className="font-semibold text-gray-900 mb-2">{t('viewProfile.languages')}</h3>
                <div className="flex flex-wrap gap-2">{langs.map((l: any) => <Badge key={l.language || l} variant="secondary">{l.language || l}</Badge>)}</div>
              </div>
            )}

            <div className="flex items-center gap-3 text-sm text-gray-400">
              {p.willing_to_relocate === 1 && <span>{t('viewProfile.relocate')}</span>}
              {p.cv_url && <a href={p.cv_url} target="_blank" className="text-blue-600 hover:underline">{t('viewProfile.cv')}</a>}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Business profile
  if (profile.profileType === 'business') {
    const b = profile.profile || profile;
    return (
      <div className="max-w-2xl mx-auto">
        <Link href="/dashboard/messages" className="mb-6 inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700">{t('viewProfile.back')}</Link>
        <Card className="overflow-hidden">
          <div className="bg-gradient-to-br from-emerald-500 to-teal-600 px-6 pb-8 pt-10 text-center text-white">
            {(b.logo_url || profile.logo_url) ? (
              <img src={b.logo_url || profile.logo_url} alt="" className="mx-auto h-24 w-24 rounded-xl object-cover border-4 border-white/30" />
            ) : (
              <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-xl bg-white/20 text-3xl font-bold">
                {(b.company_name || profile.company_name)?.[0]?.toUpperCase() || '🏢'}
              </div>
            )}
            <h1 className="mt-4 text-2xl font-bold">{b.company_name || profile.company_name || t('viewProfile.business')}</h1>
            {(b.business_type || profile.business_type) && <Badge className="mt-2 bg-white/20 text-white">{b.business_type || profile.business_type}</Badge>}
            {(b.region || profile.region) && <p className="mt-2 text-sm text-emerald-100">📍 {b.city || profile.city || ''}{b.region || profile.region ? `, ${b.region || profile.region}` : ''}</p>}
          </div>
          <CardContent className="p-6 space-y-4">
            {(b.description || profile.description) && <div><h3 className="font-semibold text-gray-900 mb-2">{t('viewProfile.description')}</h3><p className="text-gray-600 text-sm">{b.description || profile.description}</p></div>}
            <div className="flex flex-wrap gap-3 text-sm">
              {(b.staff_housing === 1 || profile.staff_housing === 1) && <Badge className="bg-emerald-50 text-emerald-700">{t('viewProfile.providesHousing')}</Badge>}
              {(b.meals_provided === 1 || profile.meals_provided === 1) && <Badge className="bg-emerald-50 text-emerald-700">{t('viewProfile.providesMeals')}</Badge>}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Job profile
  return (
    <div className="max-w-2xl mx-auto">
      <Link href="/dashboard/discover" className="mb-6 inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700">{t('viewProfile.back')}</Link>
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
              <div className="rounded-lg bg-gray-50 p-3"><p className="text-xs text-gray-500">{t('viewProfile.salary')}</p><p className="font-semibold">{profile.salary_min}-{profile.salary_max}€</p></div>
            )}
            {profile.employment_type && (
              <div className="rounded-lg bg-gray-50 p-3"><p className="text-xs text-gray-500">{t('viewProfile.type')}</p><p className="font-semibold">{profile.employment_type}</p></div>
            )}
          </div>
          <div className="flex gap-3 text-sm">
            {profile.housing_provided === 1 && <Badge className="bg-emerald-50 text-emerald-700">{t('viewProfile.housing')}</Badge>}
            {profile.meals_provided === 1 && <Badge className="bg-emerald-50 text-emerald-700">{t('viewProfile.meals')}</Badge>}
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
