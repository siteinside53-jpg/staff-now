'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'https://staffnow-api-production.siteinside53.workers.dev';
const token = () => typeof window !== 'undefined' ? localStorage.getItem('staffnow_token') : null;

export default function EditProfileV3() {
  const router = useRouter();
  const [role, setRole] = useState<'worker' | 'business' | null>(null);
  const [form, setForm] = useState<any>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savedMsg, setSavedMsg] = useState('');

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
          availability: p?.availability || '',
          businessType: p?.business_type || '',
        });
      } catch {} finally { setLoading(false); }
    })();
  }, []);

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
        availability: form.availability || undefined,
      } : {
        companyName: form.companyName,
        description: form.bio,
        city: form.city,
        region: form.region,
        phone: form.phone,
        businessType: form.businessType || undefined,
      };

      const res = await fetch(`${API_BASE}${endpoint}`, {
        method: 'PATCH',
        headers: { 'Authorization': `Bearer ${t}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (res.ok) {
        setSavedMsg('✅ Αποθηκεύτηκε!');
        setTimeout(() => setSavedMsg(''), 2500);
      } else {
        setSavedMsg('❌ Σφάλμα');
      }
    } catch {
      setSavedMsg('❌ Σφάλμα σύνδεσης');
    } finally { setSaving(false); }
  };

  if (loading) {
    return <div className="h-full flex items-center justify-center bg-white"><div className="h-8 w-8 border-4 border-gray-200 border-t-blue-600 rounded-full animate-spin" /></div>;
  }

  return (
    <div className="h-full flex flex-col bg-gray-50 overflow-y-auto">
      {/* Header */}
      <div className="flex-shrink-0 flex items-center gap-3 px-4 py-3 bg-white border-b border-gray-100 sticky top-0 z-10">
        <Link href="/app2/version4/dashboard/profile" className="p-1.5 -ml-1.5">
          <svg className="h-6 w-6 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" d="M15 19l-7-7 7-7" />
          </svg>
        </Link>
        <h1 className="text-lg font-bold text-gray-900">Επεξεργασία Προφίλ</h1>
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
            <div className="grid grid-cols-2 gap-3">
              <Field label="Χρόνια Εμπειρίας" value={form.yearsExperience} onChange={(v) => setForm({ ...form, yearsExperience: v })} type="number" />
              <Field label="Μισθός (€/μήνα)" value={form.expectedMonthlySalary} onChange={(v) => setForm({ ...form, expectedMonthlySalary: v })} type="number" />
            </div>
            <Select
              label="Διαθεσιμότητα"
              value={form.availability}
              onChange={(v) => setForm({ ...form, availability: v })}
              options={[
                { value: '', label: '— Επίλεξε —' },
                { value: 'immediate', label: 'Άμεσα' },
                { value: 'within_7_days', label: 'Εντός 7 ημερών' },
                { value: 'seasonal', label: 'Σεζόν' },
                { value: 'full_time', label: 'Πλήρης απασχόληση' },
                { value: 'part_time', label: 'Μερική απασχόληση' },
              ]}
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
              options={[
                { value: '', label: '— Επίλεξε —' },
                { value: 'hotel', label: 'Ξενοδοχείο' },
                { value: 'restaurant', label: 'Εστιατόριο' },
                { value: 'bar', label: 'Μπαρ' },
                { value: 'cafe', label: 'Καφετέρια' },
                { value: 'beach_bar', label: 'Beach Bar' },
                { value: 'other', label: 'Άλλο' },
              ]}
            />
          </>
        )}

        {savedMsg && <p className="text-center text-sm font-semibold py-2">{savedMsg}</p>}
      </div>

      <div className="flex-shrink-0 p-4 bg-white border-t border-gray-100" style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 1rem)' }}>
        <button
          onClick={save}
          disabled={saving}
          className="w-full rounded-xl bg-blue-600 py-3.5 text-sm font-bold text-white shadow-lg disabled:opacity-50"
        >
          {saving ? '💾 Αποθήκευση...' : '💾 Αποθήκευση Αλλαγών'}
        </button>
      </div>
    </div>
  );
}

function Field({ label, value, onChange, type = 'text' }: { label: string; value: string; onChange: (v: string) => void; type?: string }) {
  return (
    <div>
      <label className="block text-[11px] font-bold uppercase tracking-wider text-gray-500 mb-1.5">{label}</label>
      <input
        type={type}
        value={value || ''}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
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
        className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 resize-none"
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
