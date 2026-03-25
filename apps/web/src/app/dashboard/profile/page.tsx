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
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [cvUrl, setCvUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState<string | null>(null);
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
            setPhotoUrl(p.photo_url || null);
            setCvUrl(p.cv_url || null);
          }
        } else if (profile) {
          const p2 = profile as any;
          setBizForm({
            company_name: p2.company_name || '', description: p2.description || '', business_type: p2.business_type || '',
            region: p2.region || '', address: p2.address || '', phone: p2.phone || '', website: p2.website || '',
            logo_url: p2.logo_url || '', staff_housing: p2.staff_housing || 0, meals_provided: p2.meals_provided || 0,
            transportation_assistance: p2.transportation_assistance || 0, salary_range_min: p2.salary_range_min || '', salary_range_max: p2.salary_range_max || '',
            verified: p2.verified || 0,
          } as any);
        }
      } catch {} finally { setLoading(false); }
    }
    load();
  }, [isWorker, profile]);

  const wc = (f: keyof WorkerForm, v: any) => setWf((p) => ({ ...p, [f]: v }));
  const toggleRole = (r: string) => setWf((p) => p.roles.includes(r) ? { ...p, roles: p.roles.filter((x) => x !== r) } : p.roles.length >= 5 ? (toast.error('Μέχρι 5 ρόλοι'), p) : { ...p, roles: [...p.roles, r] });
  const toggleLang = (l: string) => setWf((p) => p.languages.includes(l) ? { ...p, languages: p.languages.filter((x) => x !== l) } : { ...p, languages: [...p.languages, l] });

  // File upload handler
  const handleFileUpload = async (file: File, category: 'avatar' | 'cv') => {
    setUploading(category);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('category', category);

      const token = localStorage.getItem('staffnow_token');
      const res = await fetch('https://staffnow-api-production.siteinside53.workers.dev/uploads', {
        method: 'POST',
        headers: token ? { 'Authorization': `Bearer ${token}` } : {},
        body: formData,
      });
      const data = await res.json() as any;

      if (data.success && data.data?.url) {
        if (category === 'avatar') {
          setPhotoUrl(data.data.url);
          await api.workers.updateProfile({ photoUrl: data.data.url });
          toast.success('Η φωτογραφία ανέβηκε!');
        } else {
          setCvUrl(data.data.url);
          await api.workers.updateProfile({ cvUrl: data.data.url });
          toast.success('Το βιογραφικό ανέβηκε!');
        }
      } else {
        toast.error(data.error?.message || 'Αποτυχία upload');
      }
    } catch {
      toast.error('Σφάλμα κατά το upload');
    } finally {
      setUploading(null);
    }
  };

  const saveWorker = async () => {
    setSaving(true);
    try {
      const body: any = { fullName: wf.fullName, bio: wf.bio, city: wf.city, region: wf.region, availability: wf.availability || undefined, employmentType: wf.employmentType || undefined, willingToRelocate: wf.willingToRelocate, roles: wf.roles, languages: wf.languages, isVisible: wf.isVisible };
      if (photoUrl) body.photoUrl = photoUrl;
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
  if (!isWorker) {
    const bc = (f: string, v: any) => setBizForm((p: any) => ({ ...p, [f]: v }));
    const bsel = "flex h-10 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-blue-500";
    return (
    <div className="max-w-3xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Προφίλ Επιχείρησης</h1>
        <p className="mt-1 text-gray-600">Συμπλήρωσε όλα τα στοιχεία για να προσελκύσεις τους καλύτερους υποψηφίους.</p>
      </div>

      {/* Logo + Name Header */}
      <Card className="mb-6"><CardContent className="p-6">
        <div className="flex items-center gap-5">
          <label className="cursor-pointer group relative flex-shrink-0">
            <input type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFileUpload(f, 'avatar'); }} />
            {(bizForm as any).logo_url ? (
              <img src={(bizForm as any).logo_url} alt="" className="h-20 w-20 rounded-xl object-cover border-2 border-gray-200 group-hover:border-blue-400" />
            ) : (
              <div className="flex h-20 w-20 items-center justify-center rounded-xl bg-blue-100 text-2xl font-bold text-blue-600 group-hover:bg-blue-200">
                {bizForm.company_name?.[0]?.toUpperCase() || '🏢'}
              </div>
            )}
            <div className="absolute -bottom-1 -right-1 flex h-7 w-7 items-center justify-center rounded-full bg-blue-600 text-white shadow-md">
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z" /><path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0z" /></svg>
            </div>
          </label>
          <div>
            <h2 className="text-lg font-bold text-gray-900">{bizForm.company_name || 'Όνομα Επιχείρησης'}</h2>
            {(bizForm as any).verified && <Badge className="bg-emerald-100 text-emerald-700 text-xs mt-1">✓ Επαληθευμένη</Badge>}
          </div>
        </div>
      </CardContent></Card>

      {/* Basic Info */}
      <Card className="mb-6"><CardHeader><h2 className="text-lg font-semibold text-gray-900">🏢 Στοιχεία Επιχείρησης</h2></CardHeader>
        <CardContent className="space-y-4">
          <div><label className="mb-1.5 block text-sm font-medium text-gray-700">Επωνυμία *</label>
            <Input value={bizForm.company_name} onChange={(e) => bc('company_name', e.target.value)} placeholder="π.χ. Sunset Boutique Hotel" /></div>
          <div><label className="mb-1.5 block text-sm font-medium text-gray-700">Περιγραφή *</label>
            <Textarea value={bizForm.description} onChange={(e) => bc('description', e.target.value)} rows={4} placeholder="Περίγραψε την επιχείρησή σου..." /></div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div><label className="mb-1.5 block text-sm font-medium text-gray-700">Τύπος Επιχείρησης</label>
              <select value={bizForm.business_type} onChange={(e) => bc('business_type', e.target.value)} className={bsel}>
                <option value="">Επέλεξε</option><option value="hotel">🏨 Ξενοδοχείο</option><option value="restaurant">🍽️ Εστιατόριο</option>
                <option value="beach_bar">🏖️ Beach Bar</option><option value="bar">🍸 Μπαρ</option><option value="cafe">☕ Καφετέρια</option>
                <option value="villa">🏡 Βίλα</option><option value="tourism_company">✈️ Τουριστική Εταιρεία</option><option value="resort">🌴 Resort</option><option value="other">📋 Άλλο</option>
              </select></div>
            <div><label className="mb-1.5 block text-sm font-medium text-gray-700">Περιοχή</label>
              <select value={(bizForm as any).region || ''} onChange={(e) => bc('region', e.target.value)} className={bsel}>
                <option value="">Επέλεξε</option>{REGIONS_GREECE.map((r) => <option key={r} value={r}>{r}</option>)}
              </select></div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div><label className="mb-1.5 block text-sm font-medium text-gray-700">Τηλέφωνο</label>
              <Input value={(bizForm as any).phone || ''} onChange={(e) => bc('phone', e.target.value)} placeholder="+30 210 1234567" /></div>
            <div><label className="mb-1.5 block text-sm font-medium text-gray-700">Website</label>
              <Input value={(bizForm as any).website || ''} onChange={(e) => bc('website', e.target.value)} placeholder="https://example.com" /></div>
          </div>
          <div><label className="mb-1.5 block text-sm font-medium text-gray-700">Διεύθυνση</label>
            <Input value={(bizForm as any).address || ''} onChange={(e) => bc('address', e.target.value)} placeholder="π.χ. Λεωφ. Βασ. Σοφίας 12, Αθήνα" /></div>
        </CardContent></Card>

      {/* Working Conditions */}
      <Card className="mb-6"><CardHeader><h2 className="text-lg font-semibold text-gray-900">🏠 Συνθήκες Εργασίας</h2></CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-gray-500">Αυτές οι πληροφορίες βοηθούν τους εργαζομένους να αποφασίσουν γρήγορα.</p>
          <div className="grid gap-3 sm:grid-cols-3">
            {[
              { key: 'staff_housing', label: '🏠 Παρέχεται Διαμονή', desc: 'Στέγαση για εργαζομένους' },
              { key: 'meals_provided', label: '🍽️ Παρέχεται Σίτιση', desc: 'Γεύματα στον χώρο εργασίας' },
              { key: 'transportation_assistance', label: '🚌 Μεταφορά', desc: 'Βοήθεια μετακίνησης' },
            ].map((item) => {
              const on = !!(bizForm as any)[item.key];
              return (
                <div key={item.key} onClick={() => bc(item.key, on ? 0 : 1)}
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
        </CardContent></Card>

      {/* Salary Range */}
      <Card className="mb-6"><CardHeader><h2 className="text-lg font-semibold text-gray-900">💰 Εύρος Μισθού</h2></CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-gray-500">Διαφάνεια στους μισθούς αυξάνει τις αιτήσεις κατά 40%.</p>
          <div className="grid gap-4 sm:grid-cols-2">
            <div><label className="mb-1.5 block text-sm font-medium text-gray-700">Ελάχιστος μισθός (€/μήνα)</label>
              <Input type="number" min="0" value={(bizForm as any).salary_range_min || ''} onChange={(e) => bc('salary_range_min', e.target.value ? parseFloat(e.target.value) : null)} placeholder="π.χ. 1200" /></div>
            <div><label className="mb-1.5 block text-sm font-medium text-gray-700">Μέγιστος μισθός (€/μήνα)</label>
              <Input type="number" min="0" value={(bizForm as any).salary_range_max || ''} onChange={(e) => bc('salary_range_max', e.target.value ? parseFloat(e.target.value) : null)} placeholder="π.χ. 1800" /></div>
          </div>
        </CardContent></Card>

      {/* Save */}
      <div className="sticky bottom-0 bg-gray-50/95 backdrop-blur border-t border-gray-200 -mx-4 px-4 py-4 sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8">
        <Button onClick={saveBiz} disabled={saving} className="w-full sm:w-auto" size="lg">
          {saving ? 'Αποθήκευση...' : '💾 Αποθήκευση Αλλαγών'}
        </Button>
      </div>
    </div>
  );}

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
          {/* Avatar with upload */}
          <div className="relative flex-shrink-0">
            <label className="cursor-pointer group">
              <input type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFileUpload(f, 'avatar'); }} />
              {photoUrl ? (
                <img src={photoUrl} alt="Avatar" className="h-20 w-20 rounded-full object-cover border-2 border-gray-200 group-hover:border-blue-400 transition-colors" />
              ) : (
                <div className="flex h-20 w-20 items-center justify-center rounded-full bg-blue-100 text-2xl font-bold text-blue-600 group-hover:bg-blue-200 transition-colors">
                  {wf.fullName ? wf.fullName.split(' ').map((n) => n[0]).join('').substring(0, 2).toUpperCase() : '?'}
                </div>
              )}
              <div className="absolute -bottom-1 -right-1 flex h-7 w-7 items-center justify-center rounded-full bg-blue-600 text-white shadow-md group-hover:bg-blue-700">
                {uploading === 'avatar' ? (
                  <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                ) : (
                  <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z" /><path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0z" /></svg>
                )}
              </div>
            </label>
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

      {/* CV UPLOAD */}
      <Card className="mb-6"><CardHeader><h2 className="text-lg font-semibold text-gray-900">📄 Βιογραφικό (CV)</h2></CardHeader>
        <CardContent>
          {cvUrl ? (
            <div className="flex items-center justify-between rounded-lg border border-gray-200 bg-gray-50 p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-red-100 text-red-600">
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" /></svg>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900">Βιογραφικό ανεβασμένο</p>
                  <a href={cvUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-600 hover:underline">Προβολή PDF</a>
                </div>
              </div>
              <label className="cursor-pointer text-xs font-medium text-blue-600 hover:text-blue-700">
                <input type="file" accept="application/pdf" className="sr-only" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFileUpload(f, 'cv'); }} />
                Αντικατάσταση
              </label>
            </div>
          ) : (
            <label className="flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-gray-300 bg-gray-50 p-8 hover:border-blue-400 hover:bg-blue-50/50 transition-all">
              <input type="file" accept="application/pdf" className="sr-only" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFileUpload(f, 'cv'); }} />
              {uploading === 'cv' ? (
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
              ) : (
                <>
                  <svg className="h-10 w-10 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}><path strokeLinecap="round" strokeLinejoin="round" d="M12 16.5V9.75m0 0l3 3m-3-3l-3 3M6.75 19.5a4.5 4.5 0 01-1.41-8.775 5.25 5.25 0 0110.233-2.33 3 3 0 013.758 3.848A3.752 3.752 0 0118 19.5H6.75z" /></svg>
                  <p className="mt-3 text-sm font-medium text-gray-700">Ανέβασε το βιογραφικό σου</p>
                  <p className="mt-1 text-xs text-gray-400">PDF μέχρι 10MB</p>
                </>
              )}
            </label>
          )}
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
