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

/** «σε 7 ώρες 12 λεπτά» από ένα ISO timestamp στο μέλλον. */
function remaining(iso: string): string {
  const ms = new Date(iso.replace(' ', 'T') + (iso.endsWith('Z') ? '' : 'Z')).getTime() - Date.now();
  if (ms <= 0) return 'λήγει';
  const h = Math.floor(ms / 3_600_000);
  const m = Math.floor((ms % 3_600_000) / 60_000);
  return h > 0 ? `${h} ώρ. ${m} λεπτά` : `${m} λεπτά`;
}

export default function WorkerBoostPage() {
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
      toast.success('Το προφίλ σου ανέβηκε στην κορυφή για 24 ώρες!');
    } catch (err: any) {
      // 402 PREMIUM_REQUIRED → πάμε κατευθείαν στη συνδρομή.
      if (err?.code === 'PREMIUM_REQUIRED' || err?.status === 402) {
        toast.error('Το Boost είναι για συνδρομητές Premium.');
        router.push('/dashboard/billing');
        return;
      }
      toast.error(err?.message || 'Δεν έγινε το boost. Δοκίμασε ξανά.');
    } finally {
      setBoosting(false);
    }
  };

  if (user?.role === 'business')
    return (
      <div className="mx-auto max-w-2xl">
        <h1 className="mb-1 text-2xl font-bold text-gray-900">Boost</h1>
        <p className="mb-4 text-sm text-gray-600">Οι επιχειρήσεις κάνουν boost σε συγκεκριμένη αγγελία.</p>
        <Link href="/dashboard/jobs">
          <Button>Πήγαινε στις Αγγελίες</Button>
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
      <h1 className="mb-1 text-2xl font-bold text-gray-900">🚀 Boost προφίλ</h1>
      <p className="mb-4 text-sm text-gray-600">
        Για 24 ώρες το προφίλ σου εμφανίζεται <strong>πρώτο</strong> στη λίστα των επιχειρήσεων που ψάχνουν προσωπικό.
      </p>

      {active && expiresAt ? (
        <Card className="border-amber-200 bg-gradient-to-br from-amber-50 to-orange-50">
          <CardContent className="p-6 text-center">
            <div className="text-4xl">🚀</div>
            <p className="mt-2 text-lg font-bold text-amber-900">Το boost σου είναι ενεργό</p>
            <p className="mt-1 text-sm text-amber-800">Απομένουν {remaining(expiresAt)}.</p>
            <Link href="/dashboard/discover">
              <Button variant="outline" className="mt-4">Δες θέσεις εργασίας</Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <>
          <Card className="mb-4 border-blue-200 bg-blue-50">
            <CardContent className="p-4">
              <p className="text-sm font-bold text-blue-900">Τι κερδίζεις</p>
              <ul className="mt-2 space-y-1 text-sm text-blue-800">
                <li>• Πρώτη θέση στην αναζήτηση των επιχειρήσεων για 24 ώρες</li>
                <li>• Πολλαπλάσιες προβολές προφίλ</li>
                <li>• Περισσότερα αιτήματα και matches</li>
              </ul>
            </CardContent>
          </Card>

          {premium ? (
            <Card>
              <CardContent className="p-5">
                <p className="text-sm text-gray-600">
                  Ως συνδρομητής Premium έχεις <strong>απεριόριστα boost</strong>, χωρίς επιπλέον χρέωση.
                </p>
                <Button onClick={handleBoost} disabled={boosting} size="lg" className="mt-4 w-full">
                  {boosting ? 'Γίνεται boost…' : '🚀 Κάνε Boost τώρα (24 ώρες)'}
                </Button>
              </CardContent>
            </Card>
          ) : (
            <Card className="border-amber-200">
              <CardContent className="p-5 text-center">
                <div className="text-3xl">🔒</div>
                <p className="mt-2 font-bold text-gray-900">Το Boost είναι για συνδρομητές Premium</p>
                <p className="mt-1 text-sm text-gray-600">
                  Με 4,99€ <strong>μία φορά</strong> ξεκλειδώνεις για πάντα απεριόριστα boost, το σήμα Premium,
                  προχωρημένα φίλτρα και στατιστικά προβολών.
                </p>
                <Link href="/dashboard/billing">
                  <Button size="lg" className="mt-4 w-full">Δες το Premium — 4,99€ εφάπαξ</Button>
                </Link>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
