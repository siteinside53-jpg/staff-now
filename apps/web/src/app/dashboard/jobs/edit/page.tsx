'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { api } from '@/lib/api';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Spinner } from '@/components/ui/spinner';
import {
  LANGUAGES_COMMON,
  EMPLOYMENT_TYPE_LABELS_EL,
  SALARY_TYPE_LABELS_EL,
  SHIFT_TYPE_LABELS_EL,
  EXPERIENCE_LABELS_EL,
  BENEFITS_OPTIONS,
} from '@staffnow/config';
import { RolePicker } from '@/components/ui/role-picker';

const sel = "flex h-10 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500";

interface JobFormData {
  title: string; description: string; city: string; region: string; address: string; postalCode: string;
  requiresRelocation: boolean; employmentType: string; salaryType: string; salaryMin: string; salaryMax: string; salaryGross: boolean;
  housing_provided: boolean; meals_provided: boolean; transport_provided: boolean; bonus_provided: boolean; insurance_provided: boolean; no_benefits: boolean;
  hoursPerDay: string; daysPerWeek: string; hasDayOff: boolean; dayOffDescription: string; shiftType: string;
  startDate: string; endDate: string;
  experienceRequired: string; requiresDriversLicense: boolean; requiresPhysicalFitness: boolean; requiresCommunicationSkills: boolean;
  languages: string[]; roles: string[];
}

function EditJobInner() {
  const searchParams = useSearchParams();
  const jobId = searchParams.get('id');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState('published');

  const [form, setForm] = useState<JobFormData>({
    title: '', description: '', city: '', region: '', address: '', postalCode: '',
    requiresRelocation: false, employmentType: 'seasonal',
    salaryType: 'monthly', salaryMin: '', salaryMax: '', salaryGross: true,
    housing_provided: false, meals_provided: false, transport_provided: false,
    bonus_provided: false, insurance_provided: false, no_benefits: false,
    hoursPerDay: '', daysPerWeek: '', hasDayOff: false, dayOffDescription: '', shiftType: '',
    startDate: '', endDate: '',
    experienceRequired: '', requiresDriversLicense: false, requiresPhysicalFitness: false, requiresCommunicationSkills: false,
    languages: [], roles: [],
  });

  const f = (field: keyof JobFormData, value: any) => setForm((p) => ({ ...p, [field]: value }));

  useEffect(() => {
    if (!jobId) return;
    async function load() {
      try {
        const res = await api.jobs.getById(jobId!) as any;
        if (res.success && res.data) {
          const j = res.data?.job || res.data;
          const roles = res.data?.roles || j.roles || [];
          let langs: string[] = [];
          try { langs = j.languages ? (typeof j.languages === 'string' ? JSON.parse(j.languages) : j.languages) : []; } catch {}

          setForm({
            title: j.title || '', description: j.description || '',
            city: j.city || '', region: j.region || '', address: j.address || '', postalCode: j.postal_code || '',
            requiresRelocation: j.requires_relocation === 1,
            employmentType: j.employment_type || 'seasonal',
            salaryType: j.salary_type || 'monthly',
            salaryMin: j.salary_min?.toString() || '', salaryMax: j.salary_max?.toString() || '',
            salaryGross: j.salary_gross !== 0,
            housing_provided: j.housing_provided === 1, meals_provided: j.meals_provided === 1,
            transport_provided: j.transport_provided === 1, bonus_provided: j.bonus_provided === 1,
            insurance_provided: j.insurance_provided === 1, no_benefits: j.no_benefits === 1,
            hoursPerDay: j.hours_per_day?.toString() || '', daysPerWeek: j.days_per_week?.toString() || '',
            hasDayOff: j.has_day_off === 1, dayOffDescription: j.day_off_description || '',
            shiftType: j.shift_type || '',
            startDate: j.start_date || '', endDate: j.end_date || '',
            experienceRequired: j.experience_required || '',
            requiresDriversLicense: j.requires_drivers_license === 1,
            requiresPhysicalFitness: j.requires_physical_fitness === 1,
            requiresCommunicationSkills: j.requires_communication_skills === 1,
            languages: langs, roles,
          });
          setStatus(j.status || 'published');
        }
      } catch {} finally { setLoading(false); }
    }
    load();
  }, [jobId]);

  const toggleBenefit = (key: string) => {
    if (key === 'no_benefits') {
      setForm((p) => ({ ...p, housing_provided: false, meals_provided: false, transport_provided: false, bonus_provided: false, insurance_provided: false, no_benefits: !p.no_benefits }));
    } else {
      setForm((p) => ({ ...p, [key]: !(p as any)[key], no_benefits: false }));
    }
  };

  const toggleLanguage = (lang: string) => {
    setForm((p) => ({ ...p, languages: p.languages.includes(lang) ? p.languages.filter((l) => l !== lang) : [...p.languages, lang] }));
  };

  const handleSave = async () => {
    if (!form.title) { toast.error('Συμπλήρωσε τον τίτλο'); return; }
    setSaving(true);
    try {
      await api.jobs.update(jobId!, {
        title: form.title, description: form.description,
        city: form.city || null, region: form.region || null,
        address: form.address || null, postal_code: form.postalCode || null,
        requires_relocation: form.requiresRelocation,
        employment_type: form.employmentType,
        salary_type: form.salaryType,
        salary_min: form.salaryMin ? parseFloat(form.salaryMin) : null,
        salary_max: form.salaryMax ? parseFloat(form.salaryMax) : null,
        salary_gross: form.salaryGross,
        housing_provided: form.housing_provided, meals_provided: form.meals_provided,
        transport_provided: form.transport_provided, bonus_provided: form.bonus_provided,
        insurance_provided: form.insurance_provided, no_benefits: form.no_benefits,
        hours_per_day: form.hoursPerDay ? parseFloat(form.hoursPerDay) : null,
        days_per_week: form.daysPerWeek ? parseInt(form.daysPerWeek) : null,
        has_day_off: form.hasDayOff, day_off_description: form.dayOffDescription || null,
        shift_type: form.shiftType || null,
        start_date: form.startDate || null, end_date: form.endDate || null,
        experience_required: form.experienceRequired || null,
        requires_drivers_license: form.requiresDriversLicense,
        requires_physical_fitness: form.requiresPhysicalFitness,
        requires_communication_skills: form.requiresCommunicationSkills,
        languages: form.languages.length > 0 ? form.languages : undefined,
        roles: form.roles.length > 0 ? form.roles : undefined,
      });
      toast.success('Η αγγελία ενημερώθηκε!');
    } catch { toast.error('Αποτυχία αποθήκευσης'); } finally { setSaving(false); }
  };

  const handleStatusChange = async (newStatus: string) => {
    try {
      if (newStatus === 'published') { await api.jobs.publish(jobId!); setStatus('published'); toast.success('Δημοσιεύτηκε!'); }
      else if (newStatus === 'archived') { await api.jobs.archive(jobId!); setStatus('archived'); toast.success('Αρχειοθετήθηκε'); }
      else if (newStatus === 'paused') { await api.jobs.pause(jobId!); setStatus('paused'); toast.success('Σε παύση'); }
      else if (newStatus === 'resume') { await api.jobs.resume(jobId!); setStatus('published'); toast.success('Ενεργοποιήθηκε!'); }
    } catch (err: any) {
      if (err?.code === 'JOB_LIMIT_REACHED') {
        toast.error(err.message || 'Έφτασες το όριο αγγελιών — αναβάθμισε το πλάνο σου.', {
          action: { label: 'Αναβάθμιση', onClick: () => window.location.href = '/pricing' },
          duration: 8000,
        });
      } else {
        toast.error('Σφάλμα αλλαγής κατάστασης');
      }
    }
  };

  const handleBoost = async () => {
    if (!jobId) return;
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

  if (loading) return <div className="flex justify-center py-20"><Spinner className="h-8 w-8" /></div>;

  const statusLabels: Record<string, string> = { draft: 'Πρόχειρη', published: 'Ενεργή', paused: 'Σε παύση', archived: 'Αρχείο', filled: 'Πληρώθηκε' };
  const statusColors: Record<string, string> = { draft: 'bg-gray-100 text-gray-700', published: 'bg-emerald-100 text-emerald-700', paused: 'bg-red-100 text-red-700', archived: 'bg-amber-100 text-amber-700' };

  return (
    <div className="max-w-3xl">
      <div className="mb-6 flex items-center gap-4">
        <a href="/dashboard/jobs" className="rounded-lg border border-gray-300 p-2 hover:bg-gray-50">
          <svg className="h-5 w-5 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" /></svg>
        </a>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-gray-900">Επεξεργασία Αγγελίας</h1>
          <span className={`mt-1 inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold ${statusColors[status] || 'bg-gray-100 text-gray-700'}`}>
            {statusLabels[status] || status}
          </span>
        </div>
      </div>

      <div className="space-y-6">
        {/* 1. Βασικά Στοιχεία */}
        <Card><CardHeader><h3 className="text-base font-bold text-gray-900"><span className="text-blue-600 mr-2">1.</span>Βασικά Στοιχεία</h3></CardHeader>
          <CardContent className="space-y-4">
            <div><label className="mb-1.5 block text-sm font-medium text-gray-700">Τίτλος *</label>
              <Input value={form.title} onChange={(e) => f('title', e.target.value)} placeholder="π.χ. Ζητείται Σερβιτόρος/α" /></div>
            <div><label className="mb-1.5 block text-sm font-medium text-gray-700">Περιγραφή <span className="text-gray-400 text-xs">({form.description.length}/300)</span></label>
              <Textarea value={form.description} onChange={(e) => { if (e.target.value.length <= 300) f('description', e.target.value); }} rows={3} placeholder="Σύντομη περιγραφή..." /></div>
          </CardContent></Card>

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
                <Input value={form.address} onChange={(e) => f('address', e.target.value)} /></div>
              <div><label className="mb-1.5 block text-sm font-medium text-gray-700">Τ.Κ.</label>
                <Input value={form.postalCode} onChange={(e) => f('postalCode', e.target.value.replace(/\D/g, '').substring(0, 5))} maxLength={5} /></div>
            </div>
            <label className="flex items-center gap-3 cursor-pointer">
              <input type="checkbox" checked={form.requiresRelocation} onChange={(e) => f('requiresRelocation', e.target.checked)} className="h-4 w-4 rounded border-gray-300 text-blue-600" />
              <span className="text-sm text-gray-700">Απαιτείται μετακίνηση</span>
            </label>
          </CardContent></Card>

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
          </CardContent></Card>

        {/* 4. Μισθός */}
        <Card><CardHeader><h3 className="text-base font-bold text-gray-900"><span className="text-blue-600 mr-2">4.</span>Μισθός</h3></CardHeader>
          <CardContent className="space-y-4">
            <div><label className="mb-1.5 block text-sm font-medium text-gray-700">Τύπος Μισθού</label>
              <select value={form.salaryType} onChange={(e) => f('salaryType', e.target.value)} className={sel}>
                {Object.entries(SALARY_TYPE_LABELS_EL).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select></div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div><label className="mb-1.5 block text-sm font-medium text-gray-700">Από (€)</label>
                <Input type="number" min="0" value={form.salaryMin} onChange={(e) => f('salaryMin', e.target.value)} placeholder="1200" /></div>
              <div><label className="mb-1.5 block text-sm font-medium text-gray-700">Έως (€)</label>
                <Input type="number" min="0" value={form.salaryMax} onChange={(e) => f('salaryMax', e.target.value)} placeholder="1800" /></div>
            </div>
            <div className="flex gap-2">
              <button onClick={() => f('salaryGross', true)} className={`flex-1 rounded-lg border-2 py-2.5 text-sm font-semibold transition-all ${form.salaryGross ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-gray-200 text-gray-500'}`}>Μικτά</button>
              <button onClick={() => f('salaryGross', false)} className={`flex-1 rounded-lg border-2 py-2.5 text-sm font-semibold transition-all ${!form.salaryGross ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-gray-200 text-gray-500'}`}>Καθαρά</button>
            </div>
          </CardContent></Card>

        {/* 5. Παροχές */}
        <Card><CardHeader><h3 className="text-base font-bold text-gray-900"><span className="text-blue-600 mr-2">5.</span>Παροχές</h3></CardHeader>
          <CardContent>
            <div className="grid gap-3 sm:grid-cols-3">
              {BENEFITS_OPTIONS.map((item) => {
                const on = !!(form as any)[item.key];
                return (
                  <div key={item.key} onClick={() => toggleBenefit(item.key)}
                    className={`cursor-pointer rounded-xl border-2 p-4 text-center transition-all ${on ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'}`}>
                    <p className="text-sm font-semibold">{item.label}</p>
                    <p className="mt-1 text-xs text-gray-500">{item.desc}</p>
                    <div className={`mt-2 inline-block rounded-full px-3 py-0.5 text-xs font-medium ${on ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-500'}`}>{on ? 'Ναι' : 'Όχι'}</div>
                  </div>
                );
              })}
            </div>
          </CardContent></Card>

        {/* 6. Ωράριο */}
        <Card><CardHeader><h3 className="text-base font-bold text-gray-900"><span className="text-blue-600 mr-2">6.</span>Ωράριο Εργασίας</h3></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div><label className="mb-1.5 block text-sm font-medium text-gray-700">Ώρες/ημέρα</label>
                <Input type="number" min="1" max="24" value={form.hoursPerDay} onChange={(e) => f('hoursPerDay', e.target.value)} placeholder="8" /></div>
              <div><label className="mb-1.5 block text-sm font-medium text-gray-700">Ημέρες/εβδομάδα</label>
                <Input type="number" min="1" max="7" value={form.daysPerWeek} onChange={(e) => f('daysPerWeek', e.target.value)} placeholder="6" /></div>
            </div>
            <div>
              <label className="flex items-center gap-3 cursor-pointer">
                <input type="checkbox" checked={form.hasDayOff} onChange={(e) => f('hasDayOff', e.target.checked)} className="h-4 w-4 rounded border-gray-300 text-blue-600" />
                <span className="text-sm text-gray-700">Ρεπό</span>
              </label>
              {form.hasDayOff && <Input value={form.dayOffDescription} onChange={(e) => f('dayOffDescription', e.target.value)} placeholder="π.χ. 1 μέρα/εβδομάδα" className="mt-2" />}
            </div>
            <div><label className="mb-1.5 block text-sm font-medium text-gray-700">Βάρδια</label>
              <select value={form.shiftType} onChange={(e) => f('shiftType', e.target.value)} className={sel}>
                <option value="">Επέλεξε</option>{Object.entries(SHIFT_TYPE_LABELS_EL).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select></div>
          </CardContent></Card>

        {/* 7. Διάρκεια */}
        <Card><CardHeader><h3 className="text-base font-bold text-gray-900"><span className="text-blue-600 mr-2">7.</span>Διάρκεια</h3></CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-2">
              <div><label className="mb-1.5 block text-sm font-medium text-gray-700">Μήνας Έναρξης</label>
                <Input type="month" value={form.startDate} onChange={(e) => f('startDate', e.target.value)} /></div>
              <div><label className="mb-1.5 block text-sm font-medium text-gray-700">Μήνας Λήξης</label>
                <Input type="month" value={form.endDate} onChange={(e) => f('endDate', e.target.value)} /></div>
            </div>
          </CardContent></Card>

        {/* 8. Απαιτήσεις */}
        <Card><CardHeader><h3 className="text-base font-bold text-gray-900"><span className="text-blue-600 mr-2">8.</span>Απαιτήσεις</h3></CardHeader>
          <CardContent className="space-y-4">
            <div><label className="mb-1.5 block text-sm font-medium text-gray-700">Εμπειρία</label>
              <select value={form.experienceRequired} onChange={(e) => f('experienceRequired', e.target.value)} className={sel}>
                <option value="">Επέλεξε</option>{Object.entries(EXPERIENCE_LABELS_EL).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
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
          </CardContent></Card>

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
          </CardContent></Card>

        {/* 10. Ειδικότητες */}
        <Card><CardHeader><h3 className="text-base font-bold text-gray-900"><span className="text-blue-600 mr-2">10.</span>Ειδικότητες</h3></CardHeader>
          <CardContent>
            <p className="text-xs text-gray-500 mb-3">Επίλεξε τις ειδικότητες που ταιριάζουν με την αγγελία.</p>
            <RolePicker
              value={form.roles}
              onChange={(next) => f('roles', next)}
              max={10}
              triggerLabel="+ Προσθήκη ειδικοτήτων"
            />
          </CardContent></Card>

        {/* Actions */}
        <div className="flex flex-wrap gap-3">
          <Button onClick={handleSave} disabled={saving} size="lg">
            {saving ? 'Αποθήκευση...' : '💾 Αποθήκευση'}
          </Button>
          {status === 'draft' && <Button onClick={() => handleStatusChange('published')} variant="outline" size="lg" className="text-emerald-600 border-emerald-300 hover:bg-emerald-50">🚀 Δημοσίευση</Button>}
          {status === 'published' && <Button onClick={handleBoost} variant="outline" size="lg" className="text-amber-600 border-amber-400 bg-amber-50 hover:bg-amber-100 font-bold">🚀 Boost (5 credits · 7 ημέρες)</Button>}
          {status === 'published' && <Button onClick={() => handleStatusChange('paused')} variant="outline" size="lg" className="text-orange-600 border-orange-300 hover:bg-orange-50">⏸️ Παύση</Button>}
          {status === 'published' && <Button onClick={() => handleStatusChange('archived')} variant="outline" size="lg" className="text-amber-600 border-amber-300 hover:bg-amber-50">📦 Αρχειοθέτηση</Button>}
          {status === 'paused' && <Button onClick={() => handleStatusChange('resume')} variant="outline" size="lg" className="text-emerald-600 border-emerald-300 hover:bg-emerald-50">▶️ Επανεκκίνηση</Button>}
          {status === 'archived' && <Button onClick={() => handleStatusChange('published')} variant="outline" size="lg" className="text-emerald-600 border-emerald-300 hover:bg-emerald-50">🚀 Επαναδημοσίευση</Button>}
          <a href="/dashboard/jobs" className="inline-flex items-center justify-center rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50">← Πίσω</a>
        </div>
      </div>
    </div>
  );
}

export default function EditJobPage() {
  return (
    <Suspense fallback={<div className="flex justify-center py-20"><Spinner className="h-8 w-8" /></div>}>
      <EditJobInner />
    </Suspense>
  );
}
