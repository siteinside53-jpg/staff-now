'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { useAuth } from '@/lib/auth-context';
import { api } from '@/lib/api';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { useT } from '@/i18n/locale-provider';

/** «σε 7 ώρες 12 λεπτά» από ένα ISO timestamp στο μέλλον. */
function remaining(iso: string, t: (k: string, params?: Record<string, any>) => string): string {
  const ms = new Date(iso.replace(' ', 'T') + (iso.endsWith('Z') ? '' : 'Z')).getTime() - Date.now();
  if (ms <= 0) return t('boostPage.expiring');
  const h = Math.floor(ms / 3_600_000);
  const m = Math.floor((ms % 3_600_000) / 60_000);
  return h > 0 ? t('boostPage.remainingHm', { h, m }) : t('boostPage.remainingM', { m });
}

export default function WorkerBoostPage() {
  const t = useT();
  const { user } = useAuth();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [boosting, setBoosting] = useState(false);
  const [premium, setPremium] = useState(false);
  const [active, setActive] = useState(false);
  const [expiresAt, setExpiresAt] = useState<string | null>(null);
  const [, setTick] = useState(0);

  const load = useCallback(async () => {
    if (user?.role !== 'worker') return;
    try {
      const res = (await (api as any).workers.getBoostStatus()) as any;
      const d = res?.data || {};
      setPremium(!!d.premium);
      setActive(!!d.active);
      setExpiresAt(d.expiresAt || null);
    } catch {
      // Σιωπηλά — δείχνουμε την κανονική οθόνη.
    } finally {
      setLoading(false);
    }
  }, [user?.role]);

  useEffect(() => {
    load();
  }, [load]);

  // Ανανέωση του countdown κάθε λεπτό όσο τρέχει boost.
  useEffect(() => {
    if (!active) return;
    const t = setInterval(() => setTick((n) => n + 1), 60_000);
    return () => clearInterval(t);
  }, [active]);

  const handleBoost = async () => {
    setBoosting(true);
    try {
      const res = (await (api as any).workers.boostDiscover()) as any;
      setActive(true);
      setExpiresAt(res?.data?.expiresAt || null);
      toast.success(t('boostPage.boosted'));
    } catch (err: any) {
      // 402 PREMIUM_REQUIRED → πάμε κατευθείαν στη συνδρομή.
      if (err?.code === 'PREMIUM_REQUIRED' || err?.status === 402) {
        toast.error(t('boostPage.premiumRequired'));
        router.push('/dashboard/billing');
        return;
      }
      toast.error(err?.message || t('boostPage.boostFailed'));
    } finally {
      setBoosting(false);
    }
  };

  if (user?.role === 'business')
    return (
      <div className="mx-auto max-w-2xl">
        <h1 className="mb-1 text-2xl font-bold text-gray-900">{t('boostPage.title')}</h1>
        <p className="mb-4 text-sm text-gray-600">{t('boostPage.businessNote')}</p>
        <Link href="/dashboard/jobs">
          <Button>{t('boostPage.goToJobs')}</Button>
        </Link>
      </div>
    );

  if (loading)
    return (
      <div className="flex justify-center py-20">
        <Spinner className="h-8 w-8" />
      </div>
    );

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="mb-1 text-2xl font-bold text-gray-900">{t('boostPage.profileBoost')}</h1>
      <p className="mb-4 text-sm text-gray-600">
        {t('boostPage.introPrefix')} <strong>{t('boostPage.introStrong')}</strong> {t('boostPage.introSuffix')}
      </p>

      {active && expiresAt ? (
        <Card className="border-amber-200 bg-gradient-to-br from-amber-50 to-orange-50">
          <CardContent className="p-6 text-center">
            <div className="text-4xl">🚀</div>
            <p className="mt-2 text-lg font-bold text-amber-900">{t('boostPage.activeTitle')}</p>
            <p className="mt-1 text-sm text-amber-800">{t('boostPage.remaining', { time: remaining(expiresAt, t) })}</p>
            <Link href="/dashboard/discover">
              <Button variant="outline" className="mt-4">{t('boostPage.seeJobs')}</Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <>
          <Card className="mb-4 border-blue-200 bg-blue-50">
            <CardContent className="p-4">
              <p className="text-sm font-bold text-blue-900">{t('boostPage.whatYouGet')}</p>
              <ul className="mt-2 space-y-1 text-sm text-blue-800">
                <li>{t('boostPage.perk1')}</li>
                <li>{t('boostPage.perk2')}</li>
                <li>{t('boostPage.perk3')}</li>
              </ul>
            </CardContent>
          </Card>

          {premium ? (
            <Card>
              <CardContent className="p-5">
                <p className="text-sm text-gray-600">
                  {t('boostPage.premiumPrefix')} <strong>{t('boostPage.premiumStrong')}</strong>{t('boostPage.premiumSuffix')}
                </p>
                <Button onClick={handleBoost} disabled={boosting} size="lg" className="mt-4 w-full">
                  {boosting ? t('boostPage.boosting') : t('boostPage.boostNow')}
                </Button>
              </CardContent>
            </Card>
          ) : (
            <Card className="border-amber-200">
              <CardContent className="p-5 text-center">
                <div className="text-3xl">🔒</div>
                <p className="mt-2 font-bold text-gray-900">{t('boostPage.lockedTitle')}</p>
                <p className="mt-1 text-sm text-gray-600">
                  {t('boostPage.lockedPrefix')} <strong>{t('boostPage.lockedStrong')}</strong> {t('boostPage.lockedSuffix')}
                </p>
                <Link href="/dashboard/billing">
                  <Button size="lg" className="mt-4 w-full">{t('boostPage.seePremium')}</Button>
                </Link>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
