'use client';

import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { useAuth } from '@/lib/auth-context';
import { api } from '@/lib/api';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Spinner } from '@/components/ui/spinner';
import { JobPreviewPanel } from '@/components/dashboard/job-preview-panel';
import { EmptyState } from '@/components/ui/empty-state';
import {
  WORKER_JOB_ROLE_LABELS_EL,
  LANGUAGES_COMMON,
  EMPLOYMENT_TYPE_LABELS_EL,
  SALARY_TYPE_LABELS_EL,
  SHIFT_TYPE_LABELS_EL,
  EXPERIENCE_LABELS_EL,
  BENEFITS_OPTIONS,
} from '@staffnow/config';

const sel = "flex h-10 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500";

interface Position {
  role: string;
  description: string;
  positions_count: string;
}

const EMPTY_POS: Position = { role: '', description: '', positions_count: '1' };

interface JobFormData {
  title: string;
  description: string;
  city: string;
  region: string;
  address: string;
  postalCode: string;
  requiresRelocation: boolean;
  employmentType: string;
  salaryType: string;
  salaryMin: string;
  salaryMax: string;
  salaryGross: boolean;
  housing_provided: boolean;
  meals_provided: boolean;
  transport_provided: boolean;
  bonus_provided: boolean;
  insurance_provided: boolean;
  no_benefits: boolean;
  hoursPerDay: string;
  daysPerWeek: string;
  hasDayOff: boolean;
  dayOffDescription: string;
  shiftType: string;
  startDate: string;
  endDate: string;
  experienceRequired: string;
  requiresDriversLicense: boolean;
  requiresPhysicalFitness: boolean;
  requiresCommunicationSkills: boolean;
  languages: string[];
  roles: string[];
  branchId: string;
}

const EMPTY_FORM: JobFormData = {
  title: '', description: '', city: '', region: '', address: '', postalCode: '',
  requiresRelocation: false, employmentType: 'seasonal',
  salaryType: 'monthly', salaryMin: '', salaryMax: '', salaryGross: true,
  housing_provided: false, meals_provided: false, transport_provided: false,
  bonus_provided: false, insurance_provided: false, no_benefits: false,
  hoursPerDay: '', daysPerWeek: '', hasDayOff: false, dayOffDescription: '', shiftType: '',
  startDate: '', endDate: '',
  experienceRequired: '', requiresDriversLicense: false, requiresPhysicalFitness: false, requiresCommunicationSkills: false,
  languages: [], roles: [], branchId: '',
};

export default function JobsPage() {
  const { user } = useAuth();
  const [jobs, setJobs] = useState<any[]>([]);
  const [branches, setBranches] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [previewJobId, setPreviewJobId] = useState<string | null>(null);
  const [form, setForm] = useState<JobFormData>({ ...EMPTY_FORM });
  const [positions, setPositions] = useState<Position[]>([{ ...EMPTY_POS }]);

  const f = (field: keyof JobFormData, value: any) => setForm((p) => ({ ...p, [field]: value }));
  const updatePosition = (idx: number, field: keyof Position, value: string) => {
    setPositions((prev) => prev.map((p, i) => i === idx ? { ...p, [field]: value } : p));
  };
  const addPosition = () => {
    if (positions.length >= 10) { toast.error('Μέχρι 10 ειδικότητες'); return; }
    setPositions((prev) => [...prev, { ...EMPTY_POS }]);
  };
  const removePosition = (idx: number) => {
    if (positions.length <= 1) return;
    setPositions((prev) => prev.filter((_, i) => i !== idx));
  };

  const fetchData = useCallback(async () => {
    try {
      const [jobsRes, branchesRes] = await Promise.all([
        api.jobs.list() as any,
        (api as any).branches.list() as any,
      ]);
      setJobs(Array.isArray(jobsRes?.data) ? jobsRes.data : []);
      setBranches(Array.isArray(branchesRes?.data) ? branchesRes.data : []);
    } catch {} finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Auto-fill location from branch
  useEffect(() => {
    if (!form.branchId) return;
    const branch = branches.find((b: any) => b.id === form.branchId);
    if (branch) {
      setForm((p) => ({
        ...p,
        city: branch.city || p.city,
        region: branch.region || p.region,
        address: branch.address || p.address,
        postalCode: branch.postal_code || p.postalCode,
      }));
    }
  }, [form.branchId, branches]);

  // Benefits mutual exclusion
  const toggleBenefit = (key: string) => {
    if (key === 'no_benefits') {
      setForm((p) => ({
        ...p,
        housing_provided: false, meals_provided: false, transport_provided: false,
        bonus_provided: false, insurance_provided: false, no_benefits: !p.no_benefits,
      }));
    } else {
      setForm((p) => ({ ...p, [key]: !(p as any)[key], no_benefits: false }));
    }
  };

  const toggleLanguage = (lang: string) => {
    setForm((p) => ({
      ...p,
      languages: p.languages.includes(lang) ? p.languages.filter((l) => l !== lang) : [...p.languages, lang],
    }));
  };

  const toggleRole = (role: string) => {
    setForm((p) => ({
      ...p,
      roles: p.roles.includes(role) ? p.roles.filter((r) => r !== role) : [...p.roles, role],
    }));
  };

  const handleCreate = async () => {
    if (!form.title) { toast.error('Συμπλήρωσε τίτλο αγγελίας'); return; }
    if (!form.city) { toast.error('Η πόλη είναι υποχρεωτική'); return; }
    if (!form.branchId && branches.length > 0) { toast.error('Επέλεξε επιχείρηση'); return; }
    const hasBenefit = form.housing_provided || form.meals_provided || form.transport_provided || form.bonus_provided || form.insurance_provided || form.no_benefits;
    if (!hasBenefit) { toast.error('Επέλεξε τουλάχιστον μία παροχή'); return; }
    if (form.salaryType !== 'negotiable' && !form.salaryMin && !form.salaryMax) { toast.error('Συμπλήρωσε μισθό ή επέλεξε "Συζητήσιμο"'); return; }

    setSaving(true);
    try {
      await api.jobs.create({
        title: form.title,
        description: form.description,
        city: form.city,
        region: form.region || undefined,
        address: form.address || undefined,
        postal_code: form.postalCode || undefined,
        requires_relocation: form.requiresRelocation,
        employment_type: form.employmentType,
        salary_type: form.salaryType,
        salary_min: form.salaryMin ? parseFloat(form.salaryMin) : undefined,
        salary_max: form.salaryMax ? parseFloat(form.salaryMax) : undefined,
        salary_gross: form.salaryGross,
        housing_provided: form.housing_provided,
        meals_provided: form.meals_provided,
        transport_provided: form.transport_provided,
        bonus_provided: form.bonus_provided,
        insurance_provided: form.insurance_provided,
        no_benefits: form.no_benefits,
        hours_per_day: form.hoursPerDay ? parseFloat(form.hoursPerDay) : undefined,
        days_per_week: form.daysPerWeek ? parseInt(form.daysPerWeek) : undefined,
        has_day_off: form.hasDayOff,
        day_off_description: form.dayOffDescription || undefined,
        shift_type: form.shiftType || undefined,
        start_date: form.startDate || undefined,
        end_date: form.endDate || undefined,
        experience_required: form.experienceRequired || undefined,
        requires_drivers_license: form.requiresDriversLicense,
        requires_physical_fitness: form.requiresPhysicalFitness,
        requires_communication_skills: form.requiresCommunicationSkills,
        languages: form.languages.length > 0 ? form.languages : undefined,
        roles: positions.map((p) => p.role).filter(Boolean),
        branch_id: form.branchId || undefined,
      });
      toast.success('Η αγγελία δημοσιεύτηκε!');
      setShowForm(false);
      setForm({ ...EMPTY_FORM });
      await fetchData();
    } catch (err: any) {
      if (err?.code === 'JOB_LIMIT_REACHED') {
        toast.error(err.message || 'Έφτασες το όριο αγγελιών — αναβάθμισε το πλάνο σου.', {
          action: { label: 'Αναβάθμιση', onClick: () => window.location.href = '/pricing' },
          duration: 8000,
        });
      } else {
        toast.error('Αποτυχία δημιουργίας.');
      }
    } finally { setSaving(false); }
  };

  if (user?.role === 'worker') return (
    <div><h1 className="mb-4 text-2xl font-bold text-gray-900">Αγγελίες</h1><p className="text-gray-600">Σελίδα μόνο για επιχειρήσεις.</p></div>
  );

  if (loading) return <div className="flex justify-center py-20"><Spinner className="h-8 w-8" /></div>;

  const empLabels: Record<string, string> = { full_time: 'Πλήρης', part_time: 'Μερική', seasonal: 'Εποχιακή' };
  const statusLabels: Record<string, string> = { draft: 'Πρόχειρη', published: 'Ενεργή', paused: 'Σε παύση', archived: 'Αρχείο', filled: 'Πληρώθηκε' };

  const handlePauseResume = async (jobId: string, currentStatus: string) => {
    try {
      if (currentStatus === 'published') { await api.jobs.pause(jobId); toast.success('Η αγγελία τέθηκε σε παύση'); }
      else if (currentStatus === 'paused') { await api.jobs.resume(jobId); toast.success('Η αγγελία ενεργοποιήθηκε ξανά!'); }
      await fetchData();
    } catch { toast.error('Σφάλμα ενημέρωσης'); }
  };

  const handleDelete = async (jobId: string) => {
    if (!confirm('Σίγουρα θέλεις να διαγράψεις αυτή την αγγελία;')) return;
    try { await api.jobs.delete(jobId); toast.success('Η αγγελία διαγράφηκε'); await fetchData(); } catch { toast.error('Σφάλμα διαγραφής'); }
  };

  const handleBoost = async (jobId: string) => {
    if (!confirm('Boost για 7 ημέρες; Κοστίζει 5 credits και η αγγελία θα εμφανίζεται πρώτη στους εργαζόμενους.')) return;
    try {
      const res = await (api.jobs as any).boost(jobId);
      const exp = res?.data?.expiresAt;
      toast.success(`🚀 Boost ενεργοποιήθηκε! Λήξη: ${exp ? new Date(exp).toLocaleDateString('el-GR') : '7 ημέρες'}`);
    } catch (err: any) {
      if (err?.code === 'BOOST_LOCKED') {
        toast.error(err.message || 'Το Boost είναι μόνο για Pro+', {
          action: { label: 'Αναβάθμιση', onClick: () => (window.location.href = '/pricing') },
          duration: 8000,
        });
      } else if (err?.code === 'INSUFFICIENT_CREDITS') {
        toast.error(err.message || 'Δεν φτάνουν τα credits.', {
          action: { label: 'Αγορά credits', onClick: () => (window.location.href = '/dashboard/billing') },
          duration: 8000,
        });
      } else if (err?.code === 'ALREADY_BOOSTED') {
        toast.info(err.message || 'Η αγγελία είναι ήδη boosted.');
      } else {
        toast.error(err?.message || 'Σφάλμα boost');
      }
    }
  };

  return (
    <div>
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Αγγελίες</h1>
          <p className="mt-1 text-gray-600">{jobs.length > 0 ? `${jobs.length} αγγελίες` : 'Δεν έχεις αγγελίες'}</p>
        </div>
        <Button onClick={() => { setForm({ ...EMPTY_FORM }); setPositions([{ ...EMPTY_POS }]); setShowForm(!showForm); }}>
          {showForm ? 'Ακύρωση' : '+ Νέα Αγγελία'}
        </Button>
      </div>

      {/* ====== CREATE FORM ====== */}
      {showForm && (
        <div className="mb-8 max-w-3xl space-y-6">
          <div className="flex items-center gap-3 mb-2">
            <button onClick={() => setShowForm(false)} className="rounded-lg border border-gray-300 p-2 hover:bg-gray-50">
              <svg className="h-5 w-5 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" /></svg>
            </button>
            <div>
              <h2 className="text-xl font-bold text-gray-900">Νέα Αγγελία</h2>
              <p className="text-sm text-gray-500">Συμπλήρωσε τα στοιχεία της θέσης εργασίας</p>
            </div>
          </div>

          {/* Branch Selection */}
          {branches.length > 0 && (
            <Card><CardContent className="p-5">
              <label className="mb-1.5 block text-sm font-medium text-gray-700">Για ποια επιχείρηση; *</label>
              <select value={form.branchId} onChange={(e) => f('branchId', e.target.value)} className={sel}>
                <option value="">Επέλεξε επιχείρηση</option>
                {branches.map((b: any) => <option key={b.id} value={b.id}>{b.name} {b.city ? `(${b.city})` : ''}</option>)}
              </select>
            </CardContent></Card>
          )}
          {branches.length === 0 && (
            <div className="rounded-lg bg-amber-50 border border-amber-200 p-4 text-sm text-amber-800">
              Πρόσθεσε πρώτα μια επιχείρηση στο <a href="/dashboard/profile" className="font-semibold underline">Προφίλ</a>.
            </div>
          )}

          {/* 1. Βασικά Στοιχεία */}
          <Card><CardHeader><h3 className="text-base font-bold text-gray-900"><span className="text-blue-600 mr-2">1.</span>Βασικά Στοιχεία</h3></CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">Τίτλος Αγγελίας *</label>
                <Input value={form.title} onChange={(e) => f('title', e.target.value)} placeholder="π.χ. Ζητείται Σερβιτόρος/α για Σεζόν 2026" />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">Περιγραφή <span className="text-gray-400 text-xs">({form.description.length}/300)</span></label>
                <Textarea value={form.description} onChange={(e) => { if (e.target.value.length <= 300) f('description', e.target.value); }} rows={3} placeholder="Σύντομη περιγραφή της θέσης..." />
              </div>
            </CardContent>
          </Card>

          {/* 2. Τοποθεσία */}
          <Card><CardHeader><h3 className="text-base font-bold text-gray-900"><span className="text-blue-600 mr-2">2.</span>Τοποθεσία</h3></CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div><label className="mb-1.5 block text-sm font-medium text-gray-700">Πόλη *</label>
                  <Input value={form.city} onChange={(e) => f('city', e.target.value)} placeholder="π.χ. Μύκονος" /></div>
                <div><label className="mb-1.5 block text-sm font-medium text-gray-700">Περιοχή</label>
                  <Input value={form.region} onChange={(e) => f('region', e.target.value)} placeholder="π.χ. Καλαμαριά" /></div>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div><label className="mb-1.5 block text-sm font-medium text-gray-700">Διεύθυνση</label>
                  <Input value={form.address} onChange={(e) => f('address', e.target.value)} placeholder="Αυτόματη συμπλήρωση" /></div>
                <div><label className="mb-1.5 block text-sm font-medium text-gray-700">Τ.Κ.</label>
                  <Input value={form.postalCode} onChange={(e) => f('postalCode', e.target.value.replace(/\D/g, '').substring(0, 5))} placeholder="84600" maxLength={5} /></div>
              </div>
              <label className="flex items-center gap-3 cursor-pointer">
                <input type="checkbox" checked={form.requiresRelocation} onChange={(e) => f('requiresRelocation', e.target.checked)} className="h-4 w-4 rounded border-gray-300 text-blue-600" />
                <span className="text-sm text-gray-700">Απαιτείται μετακίνηση</span>
              </label>
            </CardContent>
          </Card>

          {/* 3. Τύπος Εργασίας */}
          <Card><CardHeader><h3 className="text-base font-bold text-gray-900"><span className="text-blue-600 mr-2">3.</span>Τύπος Εργασίας</h3></CardHeader>
            <CardContent>
              <div className="grid gap-3 sm:grid-cols-3">
                {Object.entries(EMPLOYMENT_TYPE_LABELS_EL).map(([v, l]) => (
                  <div key={v} onClick={() => f('employmentType', v)}
                    className={`cursor-pointer rounded-xl border-2 p-4 text-center transition-all ${form.employmentType === v ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'}`}>
                    <p className="text-sm font-semibold">{v === 'seasonal' ? '☀️' : v === 'full_time' ? '📅' : '⏰'} {l}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* 4. Μισθός */}
          <Card><CardHeader><h3 className="text-base font-bold text-gray-900"><span className="text-blue-600 mr-2">4.</span>Μισθός</h3></CardHeader>
            <CardContent className="space-y-4">
              <div><label className="mb-1.5 block text-sm font-medium text-gray-700">Τύπος Μισθού</label>
                <select value={form.salaryType} onChange={(e) => f('salaryType', e.target.value)} className={sel}>
                  {Object.entries(SALARY_TYPE_LABELS_EL).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                </select></div>
              {form.salaryType !== 'negotiable' && (
                <>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div><label className="mb-1.5 block text-sm font-medium text-gray-700">Μισθός από (€) *</label>
                      <Input type="number" min="0" value={form.salaryMin} onChange={(e) => f('salaryMin', e.target.value)} placeholder="1200" /></div>
                    <div><label className="mb-1.5 block text-sm font-medium text-gray-700">Μισθός έως (€)</label>
                      <Input type="number" min="0" value={form.salaryMax} onChange={(e) => f('salaryMax', e.target.value)} placeholder="1800" /></div>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => f('salaryGross', true)}
                      className={`flex-1 rounded-lg border-2 py-2.5 text-sm font-semibold transition-all ${form.salaryGross ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-gray-200 text-gray-500 hover:border-gray-300'}`}>
                      Μικτά
                    </button>
                    <button onClick={() => f('salaryGross', false)}
                      className={`flex-1 rounded-lg border-2 py-2.5 text-sm font-semibold transition-all ${!form.salaryGross ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-gray-200 text-gray-500 hover:border-gray-300'}`}>
                      Καθαρά
                    </button>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* 5. Παροχές */}
          <Card><CardHeader><h3 className="text-base font-bold text-gray-900"><span className="text-blue-600 mr-2">5.</span>Παροχές <span className="text-xs text-gray-400 font-normal">(τουλάχιστον 1)</span></h3></CardHeader>
            <CardContent>
              <div className="grid gap-3 sm:grid-cols-3">
                {BENEFITS_OPTIONS.map((item) => {
                  const on = !!(form as any)[item.key];
                  return (
                    <div key={item.key} onClick={() => toggleBenefit(item.key)}
                      className={`cursor-pointer rounded-xl border-2 p-4 text-center transition-all ${on ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'}`}>
                      <p className="text-sm font-semibold">{item.label}</p>
                      <p className="mt-1 text-xs text-gray-500">{item.desc}</p>
                      <div className={`mt-2 inline-block rounded-full px-3 py-0.5 text-xs font-medium ${on ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-500'}`}>
                        {on ? 'Ναι' : 'Όχι'}
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* 6. Ωράριο Εργασίας */}
          <Card><CardHeader><h3 className="text-base font-bold text-gray-900"><span className="text-blue-600 mr-2">6.</span>Ωράριο Εργασίας</h3></CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div><label className="mb-1.5 block text-sm font-medium text-gray-700">Ώρες ανά ημέρα</label>
                  <Input type="number" min="1" max="24" value={form.hoursPerDay} onChange={(e) => f('hoursPerDay', e.target.value)} placeholder="8" /></div>
                <div><label className="mb-1.5 block text-sm font-medium text-gray-700">Ημέρες ανά εβδομάδα</label>
                  <Input type="number" min="1" max="7" value={form.daysPerWeek} onChange={(e) => f('daysPerWeek', e.target.value)} placeholder="6" /></div>
              </div>
              <div>
                <label className="flex items-center gap-3 cursor-pointer">
                  <input type="checkbox" checked={form.hasDayOff} onChange={(e) => f('hasDayOff', e.target.checked)} className="h-4 w-4 rounded border-gray-300 text-blue-600" />
                  <span className="text-sm text-gray-700">Ρεπό</span>
                </label>
                {form.hasDayOff && (
                  <Input value={form.dayOffDescription} onChange={(e) => f('dayOffDescription', e.target.value)} placeholder="π.χ. 1 μέρα/εβδομάδα" className="mt-2" />
                )}
              </div>
              <div><label className="mb-1.5 block text-sm font-medium text-gray-700">Βάρδια</label>
                <select value={form.shiftType} onChange={(e) => f('shiftType', e.target.value)} className={sel}>
                  <option value="">Επέλεξε</option>
                  {Object.entries(SHIFT_TYPE_LABELS_EL).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                </select></div>
            </CardContent>
          </Card>

          {/* 7. Διάρκεια */}
          <Card><CardHeader><h3 className="text-base font-bold text-gray-900"><span className="text-blue-600 mr-2">7.</span>Διάρκεια</h3></CardHeader>
            <CardContent>
              <div className="grid gap-4 sm:grid-cols-2">
                <div><label className="mb-1.5 block text-sm font-medium text-gray-700">Μήνας Έναρξης</label>
                  <Input type="month" value={form.startDate} onChange={(e) => f('startDate', e.target.value)} /></div>
                <div><label className="mb-1.5 block text-sm font-medium text-gray-700">Μήνας Λήξης</label>
                  <Input type="month" value={form.endDate} onChange={(e) => f('endDate', e.target.value)} /></div>
              </div>
            </CardContent>
          </Card>

          {/* 8. Απαιτήσεις */}
          <Card><CardHeader><h3 className="text-base font-bold text-gray-900"><span className="text-blue-600 mr-2">8.</span>Απαιτήσεις</h3></CardHeader>
            <CardContent className="space-y-4">
              <div><label className="mb-1.5 block text-sm font-medium text-gray-700">Εμπειρία</label>
                <select value={form.experienceRequired} onChange={(e) => f('experienceRequired', e.target.value)} className={sel}>
                  <option value="">Επέλεξε</option>
                  {Object.entries(EXPERIENCE_LABELS_EL).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                </select></div>
              <div className="space-y-3">
                {[
                  { key: 'requiresDriversLicense' as const, label: 'Δίπλωμα οδήγησης' },
                  { key: 'requiresPhysicalFitness' as const, label: 'Καλή φυσική κατάσταση' },
                  { key: 'requiresCommunicationSkills' as const, label: 'Επικοινωνιακές δεξιότητες' },
                ].map((item) => (
                  <label key={item.key} className="flex items-center gap-3 cursor-pointer">
                    <input type="checkbox" checked={form[item.key]} onChange={(e) => f(item.key, e.target.checked)} className="h-4 w-4 rounded border-gray-300 text-blue-600" />
                    <span className="text-sm text-gray-700">{item.label}</span>
                  </label>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* 9. Γλώσσες */}
          <Card><CardHeader><h3 className="text-base font-bold text-gray-900"><span className="text-blue-600 mr-2">9.</span>Γλώσσες</h3></CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {LANGUAGES_COMMON.map((lang) => {
                  const on = form.languages.includes(lang);
                  return (
                    <button key={lang} onClick={() => toggleLanguage(lang)}
                      className={`rounded-full border px-4 py-2 text-sm font-medium transition-all ${on ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-gray-200 text-gray-600 hover:border-gray-300'}`}>
                      {lang}
                    </button>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* 10. Ειδικότητες */}
          <Card><CardHeader><h3 className="text-base font-bold text-gray-900"><span className="text-blue-600 mr-2">10.</span>Ειδικότητες που ψάχνεις</h3></CardHeader>
            <CardContent className="space-y-4">
              {positions.map((pos, idx) => (
                <div key={idx} className="rounded-xl border border-gray-200 bg-gray-50 p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold text-gray-700">Ειδικότητα #{idx + 1}</span>
                    {positions.length > 1 && (
                      <button onClick={() => removePosition(idx)} className="text-xs text-red-500 hover:text-red-700">✕ Αφαίρεση</button>
                    )}
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div><label className="mb-1 block text-xs font-medium text-gray-600">Ρόλος *</label>
                      <select value={pos.role} onChange={(e) => updatePosition(idx, 'role', e.target.value)} className={sel}>
                        <option value="">Επέλεξε</option>
                        {Object.entries(WORKER_JOB_ROLE_LABELS_EL).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                      </select></div>
                    <div><label className="mb-1 block text-xs font-medium text-gray-600">Άτομα</label>
                      <Input type="number" min="1" max="50" value={pos.positions_count} onChange={(e) => updatePosition(idx, 'positions_count', e.target.value)} /></div>
                  </div>
                  <div><label className="mb-1 block text-xs font-medium text-gray-600">Χαρακτηριστικά / Απαιτήσεις</label>
                    <Textarea value={pos.description} onChange={(e) => updatePosition(idx, 'description', e.target.value)} rows={2} placeholder="π.χ. Εμπειρία 2+ χρόνια, Αγγλικά..." className="text-sm" /></div>
                </div>
              ))}
              <button onClick={addPosition} className="flex w-full items-center justify-center gap-2 rounded-lg border-2 border-dashed border-gray-300 py-3 text-sm font-medium text-gray-500 hover:border-blue-400 hover:text-blue-600 transition-colors">
                + Πρόσθεσε κι άλλη ειδικότητα
              </button>
            </CardContent>
          </Card>

          {/* Submit */}
          <Button onClick={handleCreate} disabled={saving} size="lg" className="w-full">
            {saving ? 'Δημοσίευση...' : '🚀 Δημοσίευση Αγγελίας'}
          </Button>
        </div>
      )}

      {/* ====== JOB LIST ====== */}
      {jobs.length === 0 && !showForm ? (
        <EmptyState title="Δεν έχεις αγγελίες" description="Δημιούργησε την πρώτη σου αγγελία." />
      ) : !showForm && (
        <div className="space-y-4">
          {jobs.map((job: any) => (
            <Card key={job.id} className={`transition-shadow ${job.status === 'paused' ? 'opacity-75 border-orange-200' : 'hover:shadow-md'}`}>
              <CardContent className="p-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <span className={`flex-shrink-0 h-3 w-3 rounded-full ${
                        job.status === 'published' ? 'bg-emerald-500 shadow-sm shadow-emerald-500/50' :
                        job.status === 'paused' ? 'bg-red-500 shadow-sm shadow-red-500/50' :
                        job.status === 'archived' ? 'bg-gray-400' : 'bg-yellow-400'
                      }`} title={statusLabels[job.status] || job.status} />
                      <h3 className="text-lg font-semibold text-gray-900">{job.title}</h3>
                      <Badge variant={job.status === 'published' ? 'default' : 'secondary'} className={
                        job.status === 'paused' ? 'bg-red-100 text-red-700 border-red-200' : ''
                      }>
                        {statusLabels[job.status] || job.status}
                      </Badge>
                    </div>
                    <p className="mt-1 text-sm text-gray-500 line-clamp-2">{job.description}</p>
                    <div className="mt-2 flex flex-wrap gap-3 text-sm text-gray-400">
                      {job.city && <span>📍 {job.city}{job.region ? `, ${job.region}` : ''}</span>}
                      {(job.salary_min || job.salary_max || job.salary_type === 'negotiable') && (() => {
                        const unit = job.salary_type === 'hourly' ? '/ώρα' : job.salary_type === 'daily' ? '/ημέρα' : job.salary_type === 'negotiable' ? '' : '/μήνα';
                        if (job.salary_type === 'negotiable') return <span>💰 Συζητήσιμο</span>;
                        const amount = job.salary_min && job.salary_max ? `${job.salary_min}-${job.salary_max}€` : job.salary_min ? `από ${job.salary_min}€` : `έως ${job.salary_max}€`;
                        return <span>💰 {amount}{unit}</span>;
                      })()}
                    </div>
                    {(job.housing_provided === 1 || job.meals_provided === 1 || job.transport_provided === 1 || job.bonus_provided === 1 || job.insurance_provided === 1) && (
                      <div className="mt-2 flex flex-wrap gap-2">
                        {job.housing_provided === 1 && <span className="rounded-full bg-emerald-50 border border-emerald-200 px-2.5 py-1 text-xs font-medium text-emerald-700">🏠 Διαμονή</span>}
                        {job.meals_provided === 1 && <span className="rounded-full bg-emerald-50 border border-emerald-200 px-2.5 py-1 text-xs font-medium text-emerald-700">🍽️ Σίτιση</span>}
                        {job.transport_provided === 1 && <span className="rounded-full bg-emerald-50 border border-emerald-200 px-2.5 py-1 text-xs font-medium text-emerald-700">🚌 Μεταφορά</span>}
                        {job.bonus_provided === 1 && <span className="rounded-full bg-emerald-50 border border-emerald-200 px-2.5 py-1 text-xs font-medium text-emerald-700">💰 Bonus</span>}
                        {job.insurance_provided === 1 && <span className="rounded-full bg-emerald-50 border border-emerald-200 px-2.5 py-1 text-xs font-medium text-emerald-700">⏰ Ευέλικτο ωράριο</span>}
                      </div>
                    )}
                  </div>
                  <div className="flex flex-shrink-0 gap-1.5">
                    {(job.status === 'published' || job.status === 'paused') && (
                      <button onClick={() => handlePauseResume(job.id, job.status)}
                        title={job.status === 'published' ? 'Παύση' : 'Επανεκκίνηση'}
                        className={`rounded-lg border p-2 transition-colors ${job.status === 'paused' ? 'border-emerald-200 text-emerald-500 hover:bg-emerald-50' : 'border-gray-200 text-gray-400 hover:bg-orange-50 hover:text-orange-600'}`}>
                        {job.status === 'paused' ? (
                          <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z" /></svg>
                        ) : (
                          <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" /></svg>
                        )}
                      </button>
                    )}
                    {job.status === 'published' && (
                      <button
                        onClick={() => handleBoost(job.id)}
                        title="🚀 Boost (5 credits · 7 ημέρες) — Pro+ only"
                        className="rounded-lg border border-amber-300 bg-amber-50 px-2 py-1.5 hover:bg-amber-100 text-amber-700 transition-colors text-xs font-bold flex items-center gap-1"
                      >
                        🚀 Boost
                      </button>
                    )}
                    <button onClick={() => setPreviewJobId(job.id)} title="Προεπισκόπηση" className="rounded-lg border border-gray-200 p-2 hover:bg-gray-50 text-gray-400 hover:text-emerald-600 transition-colors">
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                    </button>
                    <a href={`/dashboard/jobs/edit?id=${job.id}`} title="Επεξεργασία" className="rounded-lg border border-gray-200 p-2 hover:bg-gray-50 text-gray-400 hover:text-blue-600 transition-colors">
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" /></svg>
                    </a>
                    <button onClick={() => handleDelete(job.id)} title="Διαγραφή" className="rounded-lg border border-gray-200 p-2 hover:bg-red-50 text-gray-400 hover:text-red-600 transition-colors">
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" /></svg>
                    </button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {previewJobId && (
        <JobPreviewPanel jobId={previewJobId} onClose={() => setPreviewJobId(null)} />
      )}
    </div>
  );
}
