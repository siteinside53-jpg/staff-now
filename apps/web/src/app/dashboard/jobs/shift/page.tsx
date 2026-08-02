'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { useAuth } from '@/lib/auth-context';
import { api } from '@/lib/api';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Spinner } from '@/components/ui/spinner';
import { WORKER_JOB_ROLE_LABELS_EL } from '@staffnow/config';
import { netOf, shiftHours } from '@/lib/shift-display';

const sel =
  'flex h-10 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-red-500 focus:ring-1 focus:ring-red-500';

/** 'YYYY-MM-DD' για σήμερα/αύριο σε ώρα Ελλάδας. */
function athensDate(offsetDays = 0): string {
  const d = new Date(Date.now() + offsetDays * 86_400_000);
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Athens',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(d);
}

export default function ShiftPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [branches, setBranches] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [branchId, setBranchId] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [roles, setRoles] = useState<string[]>([]);
  const [city, setCity] = useState('');
  const [region, setRegion] = useState('');
  const [date, setDate] = useState(athensDate(0));
  const [days, setDays] = useState('1');
  const [from, setFrom] = useState('18:00');
  const [to, setTo] = useState('02:00');
  const [positions, setPositions] = useState('1');
  const [pay, setPay] = useState('');

  const fetchBranches = useCallback(async () => {
    try {
      const res = (await (api as any).branches.list()) as any;
      setBranches(Array.isArray(res?.data) ? res.data : []);
    } catch {
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBranches();
  }, [fetchBranches]);

  // Auto-fill τοποθεσίας από το υποκατάστημα
  useEffect(() => {
    if (!branchId) return;
    const b = branches.find((x: any) => x.id === branchId);
    if (b) {
      setCity((p) => b.city || p);
      setRegion((p) => b.region || p);
    }
  }, [branchId, branches]);

  const hours = useMemo(() => shiftHours(from, to), [from, to]);
  const net = useMemo(() => netOf(parseFloat(pay)), [pay]);

  const handleCreate = async () => {
    if (!title.trim()) return toast.error('Συμπλήρωσε τίτλο (π.χ. «Σερβιτόρος για απόψε»)');
    if (!branchId && branches.length > 0) return toast.error('Επέλεξε επιχείρηση');
    if (!city.trim()) return toast.error('Η πόλη είναι υποχρεωτική');
    if (roles.length === 0) return toast.error('Επέλεξε τουλάχιστον μία ειδικότητα');
    if (!date) return toast.error('Επέλεξε ημερομηνία βάρδιας');
    if (!hours) return toast.error('Η ώρα λήξης δεν μπορεί να είναι ίδια με την έναρξη');
    if (!pay || parseFloat(pay) <= 0) return toast.error('Συμπλήρωσε την αμοιβή της βάρδιας');

    setSaving(true);
    try {
      await api.jobs.create({
        listing_kind: 'shift',
        title: title.trim(),
        description: description.trim(),
        city: city.trim(),
        region: region.trim() || undefined,
        branch_id: branchId || undefined,
        roles,
        shift_date: date,
        shift_days: parseInt(days, 10) || 1,
        shift_start_time: from,
        shift_end_time: to,
        shift_positions: parseInt(positions, 10) || 1,
        hours_per_day: hours,
        salary_type: 'daily',
        salary_min: parseFloat(pay),
        salary_gross: true,
        no_benefits: true,
      } as any);
      toast.success('🚨 Η έκτακτη βάρδια δημοσιεύτηκε! Ειδοποιήθηκαν οι εργαζόμενοι.');
      router.push('/dashboard/jobs');
    } catch (err: any) {
      if (err?.code === 'JOB_LIMIT_REACHED') {
        toast.error(err.message || 'Έφτασες το όριο αγγελιών — αναβάθμισε το πλάνο σου.', {
          action: { label: 'Αναβάθμιση', onClick: () => (window.location.href = '/pricing') },
          duration: 8000,
        });
      } else {
        toast.error(err?.message || 'Αποτυχία δημιουργίας.');
      }
    } finally {
      setSaving(false);
    }
  };

  if (user?.role === 'worker')
    return (
      <div>
        <h1 className="mb-4 text-2xl font-bold text-gray-900">Έκτακτη βάρδια</h1>
        <p className="text-gray-600">Σελίδα μόνο για επιχειρήσεις.</p>
      </div>
    );

  if (loading)
    return (
      <div className="flex justify-center py-20">
        <Spinner className="h-8 w-8" />
      </div>
    );

  const today = athensDate(0);
  const tomorrow = athensDate(1);

  return (
    <div className="max-w-2xl">
      <div className="mb-6 flex items-center gap-3">
        <button
          onClick={() => router.push('/dashboard/jobs')}
          className="rounded-lg border border-gray-300 p-2 hover:bg-gray-50"
          aria-label="Πίσω"
        >
          <svg className="h-5 w-5 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
          </svg>
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">🚨 Έκτακτη βάρδια</h1>
          <p className="mt-0.5 text-sm text-gray-500">
            Για μία βάρδια ή λίγες μέρες — οι εργαζόμενοι ειδοποιούνται αμέσως και δηλώνουν διαθεσιμότητα.
          </p>
        </div>
      </div>

      <div className="space-y-5">
        {branches.length > 0 && (
          <Card>
            <CardContent className="p-5">
              <label className="mb-1.5 block text-sm font-medium text-gray-700">Για ποια επιχείρηση; *</label>
              <select value={branchId} onChange={(e) => setBranchId(e.target.value)} className={sel}>
                <option value="">Επέλεξε επιχείρηση</option>
                {branches.map((b: any) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                    {b.city ? ` — ${b.city}` : ''}
                  </option>
                ))}
              </select>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardContent className="space-y-4 p-5">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">Τίτλος *</label>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="π.χ. Σερβιτόρος για απόψε"
                maxLength={200}
              />
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">Ειδικότητα *</label>
              {/* Λίστα, όχι chips: οι ειδικότητες είναι >100 και η φόρμα πρέπει
                  να μένει σύντομη — μια βάρδια ανεβαίνει βιαστικά. */}
              <select
                value={roles[0] ?? ''}
                onChange={(e) => setRoles(e.target.value ? [e.target.value] : [])}
                className={sel}
              >
                <option value="">Επέλεξε ειδικότητα…</option>
                {Object.entries(WORKER_JOB_ROLE_LABELS_EL).map(([key, label]) => (
                  <option key={key} value={key}>
                    {label as string}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">Πόλη *</label>
                <Input value={city} onChange={(e) => setCity(e.target.value)} placeholder="π.χ. Αθήνα" />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">Περιοχή</label>
                <Input value={region} onChange={(e) => setRegion(e.target.value)} placeholder="π.χ. Γλυφάδα" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="space-y-4 p-5">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">Πότε; *</label>
              <div className="mb-2 flex gap-2">
                {[
                  ['Σήμερα', today],
                  ['Αύριο', tomorrow],
                ].map(([label, value]) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setDate(value as string)}
                    className={`rounded-full border px-3.5 py-1.5 text-sm font-medium transition-colors ${
                      date === value
                        ? 'border-red-600 bg-red-600 text-white'
                        : 'border-gray-300 bg-white text-gray-700 hover:border-red-300'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
              <Input type="date" value={date} min={today} onChange={(e) => setDate(e.target.value)} />
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">Από *</label>
                <Input type="time" value={from} onChange={(e) => setFrom(e.target.value)} />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">Έως *</label>
                <Input type="time" value={to} onChange={(e) => setTo(e.target.value)} />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">Διάρκεια</label>
                <div className="flex h-10 items-center rounded-lg border border-gray-200 bg-gray-50 px-3 text-sm font-semibold text-gray-700">
                  {hours ? `${hours} ώρες` : '—'}
                </div>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">Πόσες ημέρες;</label>
                <select value={days} onChange={(e) => setDays(e.target.value)} className={sel}>
                  {[1, 2, 3, 4, 5, 6, 7].map((n) => (
                    <option key={n} value={String(n)}>
                      {n === 1 ? 'Μία βάρδια' : `${n} ημέρες`}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">Πόσα άτομα;</label>
                <select value={positions} onChange={(e) => setPositions(e.target.value)} className={sel}>
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
                    <option key={n} value={String(n)}>
                      {n === 1 ? '1 άτομο' : `${n} άτομα`}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="space-y-4 p-5">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">Αμοιβή ανά βάρδια (μικτά) *</label>
              <div className="relative">
                <Input
                  type="number"
                  min="1"
                  value={pay}
                  onChange={(e) => setPay(e.target.value)}
                  placeholder="π.χ. 70"
                  className="pr-10"
                />
                <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-gray-400">
                  €
                </span>
              </div>
              {net !== null && (
                <p className="mt-2 text-sm text-emerald-700">
                  ≈ <strong>{net}€ καθαρά</strong> (ενδεικτικά) · δηλώνεται στην ΕΡΓΑΝΗ
                </p>
              )}
              <p className="mt-1 text-xs text-gray-500">
                Η εκτίμηση αφαιρεί μόνο τις εισφορές εργαζομένου (ΕΦΚΑ), όχι παρακράτηση φόρου.
              </p>
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">Σημείωση (προαιρετικό)</label>
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="π.χ. Αντικατάσταση λόγω ασθένειας. Απαραίτητη εμπειρία σε μπαρ."
                maxLength={300}
                rows={3}
              />
              <p className="mt-1 text-right text-xs text-gray-400">{description.length}/300</p>
            </div>
          </CardContent>
        </Card>

        <div className="flex gap-3">
          <Button onClick={handleCreate} disabled={saving} className="bg-red-600 hover:bg-red-700">
            {saving ? 'Δημοσίευση…' : '🚨 Δημοσίευση βάρδιας'}
          </Button>
          <Button variant="outline" onClick={() => router.push('/dashboard/jobs')} disabled={saving}>
            Ακύρωση
          </Button>
        </div>

        <p className="pb-6 text-xs text-gray-500">
          Η έκτακτη βάρδια μετράει κανονικά στο όριο αγγελιών του πλάνου σου και αρχειοθετείται αυτόματα μόλις ξεκινήσει.
        </p>
      </div>
    </div>
  );
}
