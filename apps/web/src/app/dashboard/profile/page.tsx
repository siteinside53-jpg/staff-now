'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { useAuth } from '@/lib/auth-context';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Spinner } from '@/components/ui/spinner';
import {
  REGIONS_GREECE,
  WORKER_JOB_ROLES,
  WORKER_JOB_ROLE_LABELS_EL,
  LANGUAGES_COMMON,
} from '@staffnow/config';

interface WorkerForm {
  fullName: string;
  bio: string;
  city: string;
  region: string;
  availability: string;
  employmentType: string;
  willingToRelocate: boolean;
  yearsOfExperience: string;
  expectedHourlyRate: string;
  expectedMonthlySalary: string;
  compensationType: 'hourly' | 'monthly';
  roles: string[];
  languages: string[];
  isVisible: boolean;
}

export default function ProfilePage() {
  const { user, profile, refreshUser } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const isWorker = user?.role === 'worker';

  const [wf, setWf] = useState<WorkerForm>({
    fullName: '', bio: '', city: '', region: '', availability: '',
    employmentType: '', willingToRelocate: false, yearsOfExperience: '',
    expectedHourlyRate: '', expectedMonthlySalary: '', compensationType: 'monthly',
    roles: [], languages: [], isVisible: true,
  });
  const [bizForm, setBizForm] = useState({ company_name: '', description: '', business_type: '' });
  const [completeness, setCompleteness] = useState(0);
  const [badges, setBadges] = useState<string[]>([]);
  const [verified, setVerified] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        if (isWorker) {
          const res = await api.workers.getProfile() as any;
          if (res.success && res.data) {
            const p = res.data.profile || {};
            const roles = res.data.roles || [];
            const langs = (res.data.languages || []).map((l: any) => typeof l === 'string' ? l : l.language);
            setWf({
              fullName: p.full_name || '', bio: p.bio || '', city: p.city || '', region: p.region || '',
              availability: p.availability || '', employmentType: p.employment_type || '',
              willingToRelocate: p.willing_to_relocate === 1, yearsOfExperience: p.years_of_experience?.toString() || '',
              expectedHourlyRate: p.expected_hourly_rate?.toString() || '', expectedMonthlySalary: p.expected_monthly_salary?.toString() || '',
              compensationType: p.expected_hourly_rate ? 'hourly' : 'monthly', roles, languages: langs, isVisible: p.is_visible !== 0,
            });
            setCompleteness(p.profile_completeness || 0);
            setBadges(p.badges ? JSON.parse(p.badges) : []);
            setVerified(p.verified === 1);
          }
        } else if (profile) {
          setBizForm({ company_name: (profile as any).company_name || '', description: (profile as any).description || '', business_type: (profile as any).business_type || '' });
        }
      } catch {} finally { setLoading(false); }
    }
    load();
  }, [isWorker, profile]);

  const wc = (f: keyof WorkerForm, v: any) => setWf((p) => ({ ...p, [f]: v }));
  const toggleRole = (r: string) => setWf((p) => p.roles.includes(r) ? { ...p, roles: p.roles.filter((x) => x !== r) } : p.roles.length >= 5 ? (toast.error('Μέχρι 5 ρόλοι'), p) : { ...p, roles: [...p.roles, r] });
  const toggleLang = (l: string) => setWf((p) => p.languages.includes(l) ? { ...p, languages: p.languages.filter((x) => x !== l) } : { ...p, languages: [...p.languages, l] });

  const saveWorker = async () => {
    setSaving(true);
    try {
      const body: any = { fullName: wf.fullName, bio: wf.bio, city: wf.city, region: wf.region, availability: wf.availability || undefined, employmentType: wf.employmentType || undefined, willingToRelocate: wf.willingToRelocate, roles: wf.roles, languages: wf.languages, isVisible: wf.isVisible };
      if (wf.yearsOfExperience) body.yearsOfExperience = parseInt(wf.yearsOfExperience);
      if (wf.compensationType === 'hourly' && wf.expectedHourlyRate) body.expectedHourlyRate = parseFloat(wf.expectedHourlyRate);
      if (wf.compensationType === 'monthly' && wf.expectedMonthlySalary) body.expectedMonthlySalary = parseFloat(wf.expectedMonthlySalary);
      const res = await api.workers.updateProfile(body) as any;
      if (res.success) { setCompleteness(res.data?.profile?.profile_completeness || completeness); await refreshUser(); toast.success('Το προφίλ ενημερώθηκε!'); }
    } catch { toast.error('Αποτυχία αποθήκευσης.'); } finally { setSaving(false); }
  };

  const saveBiz = async () => { setSaving(true); try { await api.businesses.updateProfile(bizForm); await refreshUser(); toast.success('Ενημερώθηκε!'); } catch { toast.error('Σφάλμα.'); } finally { setSaving(false); } };

  if (loading) return <div className="flex justify-center py-20"><Spinner className="h-8 w-8" /></div>;

  // ===================== BUSINESS =====================
  if (!isWorker) return (
    <div>
      <div className="mb-8"><h1 className="text-2xl font-bold text-gray-900">Προφίλ Επιχείρησης</h1></div>
      <Card><CardHeader><h2 className="text-lg font-semibold text-gray-900">Βασικά Στοιχεία</h2></CardHeader><CardContent className="space-y-4">
        <div><label className="mb-1.5 block text-sm font-medium text-gray-700">Επωνυμία</label><Input value={bizForm.company_name} onChange={(e) => setBizForm((p) => ({ ...p, company_name: e.target.value }))} /></div>
        <div><label className="mb-1.5 block text-sm font-medium text-gray-700">Περιγραφή</label><Textarea value={bizForm.description} onChange={(e) => setBizForm((p) => ({ ...p, description: e.target.value }))} rows={4} /></div>
        <div><label className="mb-1.5 block text-sm font-medium text-gray-700">Τύπος</label>
          <select value={bizForm.business_type} onChange={(e) => setBizForm((p) => ({ ...p, business_type: e.target.value }))} className="flex h-10 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm">
            <option value="">Επέλεξε</option><option value="hotel">Ξενοδοχείο</option><option value="restaurant">Εστιατόριο</option><option value="bar">Μπαρ</option><option value="cafe">Καφετέρια</option><option value="other">Άλλο</option>
          </select></div>
        <Button onClick={saveBiz} disabled={saving}>{saving ? 'Αποθήκευση...' : 'Αποθήκευση'}</Button>
      </CardContent></Card>
    </div>
  );

  // ===================== WORKER =====================
  const sLabel = completeness >= 80 ? 'Εξαιρετικό' : completeness >= 60 ? 'Δυνατό' : completeness >= 40 ? 'Βασικό' : 'Αδύναμο';
  const sColor = completeness >= 80 ? 'text-emerald-600' : completeness >= 60 ? 'text-blue-600' : completeness >= 40 ? 'text-amber-600' : 'text-red-600';
  const bColor = completeness >= 80 ? 'bg-emerald-500' : completeness >= 60 ? 'bg-blue-500' : completeness >= 40 ? 'bg-amber-500' : 'bg-red-500';
  const sel = "flex h-10 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-blue-500";

  return (
    <div className="max-w-3xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Προφίλ Εργαζομένου</h1>
        <p className="mt-1 text-gray-600">Συμπλήρωσε όλα τα στοιχεία για καλύτερα ταιριάσματα.</p>
      </div>

      {/* HEADER */}
      <Card className="mb-6"><CardContent className="p-6">
        <div className="flex items-center gap-5">
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-blue-100 text-2xl font-bold text-blue-600 flex-shrink-0">
            {wf.fullName ? wf.fullName.split(' ').map((n) => n[0]).join('').substring(0, 2).toUpperCase() : '?'}
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-gray-900 truncate">{wf.fullName || 'Ονοματεπώνυμο'}</h2>
              {verified && <Badge className="bg-emerald-100 text-emerald-700 text-xs">✓ Verified</Badge>}
            </div>
            <div className="mt-3 flex items-center justify-between text-sm mb-1">
              <span className="text-gray-500">Πληρότητα προφίλ</span>
              <span className={`font-semibold ${sColor}`}>{completeness}% — {sLabel}</span>
            </div>
            <div className="h-2 w-full rounded-full bg-gray-100"><div className={`h-2 rounded-full transition-all ${bColor}`} style={{ width: `${completeness}%` }} /></div>
            {badges.length > 0 && <div className="mt-2 flex flex-wrap gap-1">{badges.map((b) => <Badge key={b} variant="secondary" className="text-xs">{b}</Badge>)}</div>}
          </div>
        </div>
      </CardContent></Card>

      {/* BASIC */}
      <Card className="mb-6"><CardHeader><h2 className="text-lg font-semibold text-gray-900">📝 Βασικά Στοιχεία</h2></CardHeader>
        <CardContent className="space-y-4">
          <div><label className="mb-1.5 block text-sm font-medium text-gray-700">Ονοματεπώνυμο</label><Input value={wf.fullName} onChange={(e) => wc('fullName', e.target.value)} placeholder="π.χ. Γιώργος Παπαδόπουλος" /></div>
          <div><label className="mb-1.5 block text-sm font-medium text-gray-700">Σύντομη περιγραφή</label><Textarea value={wf.bio} onChange={(e) => wc('bio', e.target.value)} rows={3} placeholder="Περίγραψε τον εαυτό σου..." /><p className="mt-1 text-xs text-gray-400">{wf.bio.length}/1000</p></div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div><label className="mb-1.5 block text-sm font-medium text-gray-700">Πόλη</label><Input value={wf.city} onChange={(e) => wc('city', e.target.value)} placeholder="π.χ. Μύκονος" /></div>
            <div><label className="mb-1.5 block text-sm font-medium text-gray-700">Περιοχή</label>
              <select value={wf.region} onChange={(e) => wc('region', e.target.value)} className={sel}>
                <option value="">Επέλεξε</option>{REGIONS_GREECE.map((r) => <option key={r} value={r}>{r}</option>)}
              </select></div>
          </div>
        </CardContent></Card>

      {/* PREFERENCES */}
      <Card className="mb-6"><CardHeader><h2 className="text-lg font-semibold text-gray-900">💼 Εργασιακές Προτιμήσεις</h2></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div><label className="mb-1.5 block text-sm font-medium text-gray-700">Διαθεσιμότητα</label>
              <select value={wf.availability} onChange={(e) => wc('availability', e.target.value)} className={sel}>
                <option value="">Επέλεξε</option><option value="immediate">Άμεση</option><option value="within_7_days">Εντός 7 ημερών</option><option value="seasonal">Εποχιακή</option><option value="part_time">Μερικής</option><option value="full_time">Πλήρης</option>
              </select></div>
            <div><label className="mb-1.5 block text-sm font-medium text-gray-700">Τύπος Απασχόλησης</label>
              <select value={wf.employmentType} onChange={(e) => wc('employmentType', e.target.value)} className={sel}>
                <option value="">Επέλεξε</option><option value="seasonal">☀️ Σεζόν</option><option value="full_time">📅 Πλήρης</option><option value="part_time">⏰ Μερική</option><option value="freelancer">💼 Freelancer</option>
              </select></div>
          </div>
          <div><label className="mb-1.5 block text-sm font-medium text-gray-700">Χρόνια Εμπειρίας</label>
            <Input type="number" min="0" max="50" value={wf.yearsOfExperience} onChange={(e) => wc('yearsOfExperience', e.target.value)} placeholder="0" /></div>
          <label className="flex items-center gap-3 cursor-pointer">
            <div onClick={() => wc('willingToRelocate', !wf.willingToRelocate)} className={`relative w-11 h-6 rounded-full transition-colors cursor-pointer ${wf.willingToRelocate ? 'bg-blue-600' : 'bg-gray-300'}`}>
              <div className={`absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${wf.willingToRelocate ? 'translate-x-5' : ''}`} /></div>
            <span className="text-sm font-medium text-gray-700">Διαθέσιμος/η για μετακόμιση</span>
          </label>
        </CardContent></Card>

      {/* COMPENSATION */}
      <Card className="mb-6"><CardHeader><h2 className="text-lg font-semibold text-gray-900">💰 Αμοιβή</h2></CardHeader>
        <CardContent className="space-y-4">
          <div className="flex rounded-lg border border-gray-200 overflow-hidden">
            <button onClick={() => wc('compensationType', 'monthly')} className={`flex-1 py-2.5 text-sm font-medium transition-colors ${wf.compensationType === 'monthly' ? 'bg-blue-600 text-white' : 'bg-white text-gray-600'}`}>Μηνιαίος Μισθός</button>
            <button onClick={() => wc('compensationType', 'hourly')} className={`flex-1 py-2.5 text-sm font-medium transition-colors ${wf.compensationType === 'hourly' ? 'bg-blue-600 text-white' : 'bg-white text-gray-600'}`}>Ωριαία Αμοιβή</button>
          </div>
          {wf.compensationType === 'monthly' ? (
            <div><label className="mb-1.5 block text-sm font-medium text-gray-700">Επιθυμητός μηνιαίος μισθός (€)</label><Input type="number" min="0" value={wf.expectedMonthlySalary} onChange={(e) => wc('expectedMonthlySalary', e.target.value)} placeholder="π.χ. 1500" /></div>
          ) : (
            <div><label className="mb-1.5 block text-sm font-medium text-gray-700">Επιθυμητό ωρομίσθιο (€/ώρα)</label><Input type="number" min="0" step="0.5" value={wf.expectedHourlyRate} onChange={(e) => wc('expectedHourlyRate', e.target.value)} placeholder="π.χ. 10" /></div>
          )}
        </CardContent></Card>

      {/* ROLES */}
      <Card className="mb-6"><CardHeader><div className="flex items-center justify-between"><h2 className="text-lg font-semibold text-gray-900">🏷️ Ρόλοι Εργασίας</h2><span className="text-xs text-gray-400">{wf.roles.length}/5</span></div></CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {WORKER_JOB_ROLES.map((r) => { const on = wf.roles.includes(r); return (
              <label key={r} className={`flex items-center gap-2 rounded-lg border p-2.5 cursor-pointer transition-all text-sm ${on ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-gray-200 hover:border-gray-300 text-gray-700'}`}>
                <input type="checkbox" checked={on} onChange={() => toggleRole(r)} className="sr-only" />
                <div className={`flex h-4 w-4 items-center justify-center rounded border flex-shrink-0 ${on ? 'border-blue-500 bg-blue-500 text-white' : 'border-gray-300'}`}>
                  {on && <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>}
                </div>{WORKER_JOB_ROLE_LABELS_EL[r] || r}
              </label>); })}
          </div>
        </CardContent></Card>

      {/* LANGUAGES */}
      <Card className="mb-6"><CardHeader><h2 className="text-lg font-semibold text-gray-900">🌍 Γλώσσες</h2></CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {LANGUAGES_COMMON.map((l) => { const on = wf.languages.includes(l); return (
              <label key={l} className={`flex items-center gap-2 rounded-lg border p-2.5 cursor-pointer transition-all text-sm ${on ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-gray-200 hover:border-gray-300 text-gray-700'}`}>
                <input type="checkbox" checked={on} onChange={() => toggleLang(l)} className="sr-only" />
                <div className={`flex h-4 w-4 items-center justify-center rounded border flex-shrink-0 ${on ? 'border-blue-500 bg-blue-500 text-white' : 'border-gray-300'}`}>
                  {on && <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>}
                </div>{l}
              </label>); })}
          </div>
        </CardContent></Card>

      {/* VISIBILITY */}
      <Card className="mb-6"><CardHeader><h2 className="text-lg font-semibold text-gray-900">👁️ Ορατότητα</h2></CardHeader>
        <CardContent>
          <label className="flex items-center gap-3 cursor-pointer">
            <div onClick={() => wc('isVisible', !wf.isVisible)} className={`relative w-11 h-6 rounded-full transition-colors cursor-pointer ${wf.isVisible ? 'bg-blue-600' : 'bg-gray-300'}`}>
              <div className={`absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${wf.isVisible ? 'translate-x-5' : ''}`} /></div>
            <div><span className="text-sm font-medium text-gray-700">Εμφάνιση στην Ανακάλυψη</span><p className="text-xs text-gray-400">Αν απενεργοποιηθεί, οι επιχειρήσεις δεν θα σε βλέπουν</p></div>
          </label>
        </CardContent></Card>

      {/* SAVE */}
      <div className="sticky bottom-0 bg-gray-50/95 backdrop-blur border-t border-gray-200 -mx-4 px-4 py-4 sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8">
        <Button onClick={saveWorker} disabled={saving} className="w-full sm:w-auto" size="lg">
          {saving ? 'Αποθήκευση...' : '💾 Αποθήκευση Αλλαγών'}
        </Button>
      </div>
    </div>
  );
}
