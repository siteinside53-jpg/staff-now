'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'https://staffnow-api-production.siteinside53.workers.dev';
const token = () => typeof window !== 'undefined' ? localStorage.getItem('staffnow_token') : null;

const WORKER_ROLES = [
  { value: 'waiter', label: 'Σερβιτόρος/α' },
  { value: 'chef', label: 'Σεφ' },
  { value: 'cook', label: 'Μάγειρας' },
  { value: 'bartender', label: 'Bartender' },
  { value: 'barista', label: 'Barista' },
  { value: 'receptionist', label: 'Ρεσεψιονίστ' },
  { value: 'housekeeper', label: 'Καμαριέρα' },
  { value: 'cleaner', label: 'Καθαριστής' },
  { value: 'driver', label: 'Οδηγός' },
  { value: 'sales', label: 'Πωλητής/τρια' },
  { value: 'warehouse', label: 'Αποθηκάριος' },
];

const LANGUAGES = [
  { value: 'el', label: 'Ελληνικά' },
  { value: 'en', label: 'Αγγλικά' },
  { value: 'de', label: 'Γερμανικά' },
  { value: 'fr', label: 'Γαλλικά' },
  { value: 'it', label: 'Ιταλικά' },
  { value: 'es', label: 'Ισπανικά' },
];

const BIZ_TYPES = [
  { value: 'hotel', label: 'Ξενοδοχείο' },
  { value: 'restaurant', label: 'Εστιατόριο' },
  { value: 'bar', label: 'Μπαρ' },
  { value: 'cafe', label: 'Καφετέρια' },
  { value: 'beach_bar', label: 'Beach Bar' },
  { value: 'resort', label: 'Resort' },
  { value: 'villa', label: 'Βίλα' },
  { value: 'tourism_company', label: 'Τουριστική' },
  { value: 'other', label: 'Άλλο' },
];

export default function EditProfileV5() {
  const [role, setRole] = useState<'worker' | 'business' | null>(null);
  const [form, setForm] = useState<any>({});
  const [roles, setRoles] = useState<string[]>([]);
  const [languages, setLanguages] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [msg, setMsg] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    (async () => {
      try {
        const t = token();
        if (!t) return;
        const res = await fetch(`${API_BASE}/auth/me`, { headers: { 'Authorization': `Bearer ${t}` } });
        const data = await res.json() as any;
        const u = data?.data?.user;
        const p = data?.data?.profile;
        setRole(u?.role);
        setForm({
          fullName: p?.full_name || '',
          companyName: p?.company_name || '',
          bio: p?.bio || p?.description || '',
          city: p?.city || '',
          region: p?.region || '',
          phone: p?.phone || '',
          yearsExperience: p?.years_of_experience || '',
          expectedMonthlySalary: p?.expected_monthly_salary || '',
          expectedHourlyRate: p?.expected_hourly_rate || '',
          availability: p?.availability || '',
          willingToRelocate: p?.willing_to_relocate === 1,
          businessType: p?.business_type || '',
          photoUrl: p?.photo_url || p?.logo_url || '',
        });

        if (u?.role === 'worker') {
          const wRes = await fetch(`${API_BASE}/workers/me`, { headers: { 'Authorization': `Bearer ${t}` } });
          const wData = await wRes.json() as any;
          setRoles(wData?.data?.roles || []);
          setLanguages((wData?.data?.languages || []).map((l: any) => l.language || l));
        }
      } catch {} finally { setLoading(false); }
    })();
  }, []);

  const uploadPhoto = async (file: File) => {
    setUploading(true);
    try {
      const t = token();
      const fd = new FormData();
      fd.append('file', file);
      fd.append('category', role === 'worker' ? 'worker_photo' : 'business_logo');
      const res = await fetch(`${API_BASE}/uploads`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${t}` },
        body: fd,
      });
      const data = await res.json() as any;
      if (data?.data?.url) {
        setForm((f: any) => ({ ...f, photoUrl: data.data.url }));
        setMsg('✅ Φωτό ανέβηκε!');
        setTimeout(() => setMsg(''), 2500);
      } else {
        setMsg('❌ Αποτυχία upload');
      }
    } catch {
      setMsg('❌ Σφάλμα upload');
    } finally { setUploading(false); }
  };

  const toggleRole = (r: string) => {
    setRoles((rs) => rs.includes(r) ? rs.filter((x) => x !== r) : [...rs, r]);
  };

  const toggleLang = (l: string) => {
    setLanguages((ls) => ls.includes(l) ? ls.filter((x) => x !== l) : [...ls, l]);
  };

  const save = async () => {
    setSaving(true);
    try {
      const t = token();
      const endpoint = role === 'worker' ? '/workers/me' : '/businesses/me';
      const body: any = role === 'worker' ? {
        fullName: form.fullName,
        bio: form.bio,
        city: form.city,
        region: form.region,
        phone: form.phone,
        yearsOfExperience: form.yearsExperience ? parseInt(form.yearsExperience) : undefined,
        expectedMonthlySalary: form.expectedMonthlySalary ? parseInt(form.expectedMonthlySalary) : undefined,
        expectedHourlyRate: form.expectedHourlyRate ? parseInt(form.expectedHourlyRate) : undefined,
        availability: form.availability || undefined,
        willingToRelocate: form.willingToRelocate,
        photoUrl: form.photoUrl || undefined,
        roles: roles.length > 0 ? roles : undefined,
        languages: languages.length > 0 ? languages : undefined,
      } : {
        companyName: form.companyName,
        description: form.bio,
        city: form.city,
        region: form.region,
        phone: form.phone,
        businessType: form.businessType || undefined,
        logoUrl: form.photoUrl || undefined,
      };

      const res = await fetch(`${API_BASE}${endpoint}`, {
        method: 'PATCH',
        headers: { 'Authorization': `Bearer ${t}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (res.ok) {
        setMsg('✅ Αποθηκεύτηκε!');
      } else {
        const err = await res.json() as any;
        setMsg(`❌ ${err?.error?.message || 'Σφάλμα'}`);
      }
      setTimeout(() => setMsg(''), 3000);
    } catch {
      setMsg('❌ Σφάλμα σύνδεσης');
    } finally { setSaving(false); }
  };

  if (loading) {
    return <div className="h-full flex items-center justify-center bg-white"><div className="h-8 w-8 border-4 border-gray-200 border-t-blue-600 rounded-full animate-spin" /></div>;
  }

  return (
    <div className="h-full flex flex-col bg-gray-50 overflow-y-auto">
      <div className="flex-shrink-0 flex items-center gap-3 px-4 py-3 bg-white border-b border-gray-100 sticky top-0 z-10">
        <Link href="/app2/version5/dashboard/profile" className="p-1.5 -ml-1.5">
          <svg className="h-6 w-6 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" d="M15 19l-7-7 7-7" />
          </svg>
        </Link>
        <h1 className="flex-1 text-lg font-bold text-gray-900">Επεξεργασία Προφίλ</h1>
        {msg && <span className="text-xs font-semibold">{msg}</span>}
      </div>

      <div className="flex-shrink-0 py-6 bg-white border-b border-gray-100 text-center">
        <div className="relative mx-auto h-28 w-28 rounded-full bg-gradient-to-br from-blue-100 to-purple-100 flex items-center justify-center text-3xl font-extrabold text-purple-700 overflow-hidden">
          {form.photoUrl ? <img src={form.photoUrl} alt="" className="h-full w-full object-cover" /> : (form.fullName || form.companyName || '?')[0]?.toUpperCase()}
          {uploading && (
            <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
              <div className="h-6 w-6 border-4 border-white/30 border-t-white rounded-full animate-spin" />
            </div>
          )}
        </div>
        <input
          ref={fileRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) uploadPhoto(f);
          }}
        />
        <button
          onClick={() => fileRef.current?.click()}
          disabled={uploading}
          className="mt-3 rounded-full bg-blue-50 border border-blue-200 px-4 py-1.5 text-xs font-bold text-blue-700 disabled:opacity-50"
        >
          📷 {form.photoUrl ? 'Αλλαγή φωτό' : 'Ανέβασμα φωτό'}
        </button>
      </div>

      <div className="flex-1 p-4 space-y-4">
        {role === 'worker' ? (
          <>
            <Field label="Ονοματεπώνυμο" value={form.fullName} onChange={(v) => setForm({ ...form, fullName: v })} />
            <Textarea label="Βιογραφικό / Bio" value={form.bio} onChange={(v) => setForm({ ...form, bio: v })} placeholder="Πες λίγα λόγια για σένα..." />
            <div className="grid grid-cols-2 gap-3">
              <Field label="Πόλη" value={form.city} onChange={(v) => setForm({ ...form, city: v })} />
              <Field label="Περιοχή" value={form.region} onChange={(v) => setForm({ ...form, region: v })} />
            </div>
            <Field label="Τηλέφωνο" value={form.phone} onChange={(v) => setForm({ ...form, phone: v })} type="tel" />

            <ChipsGroup label="Ρόλοι (επίλεξε όσους ταιριάζουν)" options={WORKER_ROLES} selected={roles} onToggle={toggleRole} />

            <div className="grid grid-cols-3 gap-2">
              <Field label="Χρόνια εμπ." value={form.yearsExperience} onChange={(v) => setForm({ ...form, yearsExperience: v })} type="number" small />
              <Field label="€/μήνα" value={form.expectedMonthlySalary} onChange={(v) => setForm({ ...form, expectedMonthlySalary: v })} type="number" small />
              <Field label="€/ώρα" value={form.expectedHourlyRate} onChange={(v) => setForm({ ...form, expectedHourlyRate: v })} type="number" small />
            </div>

            <Select
              label="Διαθεσιμότητα"
              value={form.availability}
              onChange={(v) => setForm({ ...form, availability: v })}
              options={[
                { value: '', label: '— Επίλεξε —' },
                { value: 'immediate', label: '⚡ Άμεσα' },
                { value: 'within_7_days', label: 'Εντός 7 ημερών' },
                { value: 'seasonal', label: 'Σεζόν' },
                { value: 'full_time', label: 'Πλήρης απασχόληση' },
                { value: 'part_time', label: 'Μερική' },
              ]}
            />

            <ChipsGroup label="Γλώσσες" options={LANGUAGES} selected={languages} onToggle={toggleLang} />

            <ToggleField
              label="Διαθέσιμος για μετακόμιση"
              desc="Μπορώ να δουλέψω σε άλλη πόλη/νησί"
              value={form.willingToRelocate}
              onChange={(v) => setForm({ ...form, willingToRelocate: v })}
            />
          </>
        ) : (
          <>
            <Field label="Όνομα Επιχείρησης" value={form.companyName} onChange={(v) => setForm({ ...form, companyName: v })} />
            <Textarea label="Περιγραφή" value={form.bio} onChange={(v) => setForm({ ...form, bio: v })} placeholder="Περίγραψε την επιχείρησή σου..." />
            <div className="grid grid-cols-2 gap-3">
              <Field label="Πόλη" value={form.city} onChange={(v) => setForm({ ...form, city: v })} />
              <Field label="Περιοχή" value={form.region} onChange={(v) => setForm({ ...form, region: v })} />
            </div>
            <Field label="Τηλέφωνο" value={form.phone} onChange={(v) => setForm({ ...form, phone: v })} type="tel" />
            <Select
              label="Τύπος Επιχείρησης"
              value={form.businessType}
              onChange={(v) => setForm({ ...form, businessType: v })}
              options={[{ value: '', label: '— Επίλεξε —' }, ...BIZ_TYPES]}
            />
          </>
        )}
      </div>

      <div className="flex-shrink-0 p-4 bg-white border-t border-gray-100" style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 1rem)' }}>
        <button
          onClick={save}
          disabled={saving}
          className="w-full rounded-xl bg-gradient-to-r from-blue-600 to-indigo-700 py-3.5 text-sm font-bold text-white shadow-lg disabled:opacity-50"
        >
          {saving ? '💾 Αποθήκευση...' : '💾 Αποθήκευση Αλλαγών'}
        </button>
      </div>
    </div>
  );
}

function Field({ label, value, onChange, type = 'text', small }: { label: string; value: string; onChange: (v: string) => void; type?: string; small?: boolean }) {
  return (
    <div>
      <label className={`block font-bold uppercase tracking-wider text-gray-500 mb-1.5 ${small ? 'text-[9px]' : 'text-[11px]'}`}>{label}</label>
      <input
        type={type}
        value={value || ''}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm outline-none focus:border-blue-500"
      />
    </div>
  );
}

function Textarea({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <div>
      <label className="block text-[11px] font-bold uppercase tracking-wider text-gray-500 mb-1.5">{label}</label>
      <textarea
        value={value || ''}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        rows={4}
        className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm outline-none focus:border-blue-500 resize-none"
      />
    </div>
  );
}

function Select({ label, value, onChange, options }: { label: string; value: string; onChange: (v: string) => void; options: { value: string; label: string }[] }) {
  return (
    <div>
      <label className="block text-[11px] font-bold uppercase tracking-wider text-gray-500 mb-1.5">{label}</label>
      <select
        value={value || ''}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm outline-none focus:border-blue-500"
      >
        {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </div>
  );
}

function ChipsGroup({ label, options, selected, onToggle }: { label: string; options: { value: string; label: string }[]; selected: string[]; onToggle: (v: string) => void }) {
  return (
    <div>
      <label className="block text-[11px] font-bold uppercase tracking-wider text-gray-500 mb-2">{label}</label>
      <div className="flex flex-wrap gap-2">
        {options.map((o) => {
          const on = selected.includes(o.value);
          return (
            <button
              key={o.value}
              type="button"
              onClick={() => onToggle(o.value)}
              className={`rounded-full px-3.5 py-1.5 text-xs font-semibold transition-all ${
                on ? 'bg-blue-600 text-white' : 'bg-white border border-gray-300 text-gray-700'
              }`}
            >
              {on ? '✓ ' : ''}{o.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function ToggleField({ label, desc, value, onChange }: { label: string; desc: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-xl bg-white border border-gray-200 px-4 py-3">
      <div className="flex-1">
        <p className="text-sm font-bold text-gray-900">{label}</p>
        <p className="text-[11px] text-gray-500">{desc}</p>
      </div>
      <button
        type="button"
        onClick={() => onChange(!value)}
        className={`relative h-7 w-12 rounded-full transition-colors ${value ? 'bg-blue-600' : 'bg-gray-300'}`}
      >
        <span className={`absolute top-0.5 h-6 w-6 rounded-full bg-white shadow transition-transform ${value ? 'translate-x-5' : 'translate-x-0.5'}`} />
      </button>
    </div>
  );
}
