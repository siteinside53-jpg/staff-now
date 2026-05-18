'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ProfilePanel } from '../_shared/profile-panel';

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

interface Job {
  id: string;
  title: string;
  description?: string;
  status: string;
  city?: string;
  region?: string;
  salaryMin?: number;
  salaryMax?: number;
  salaryType?: string;
  employmentType?: string;
  housing?: boolean;
  meals?: boolean;
  transport?: boolean;
  bonus?: boolean;
  insurance?: boolean;
  roles?: string[];
  createdAt?: string;
}

export default function JobsV5() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [editJob, setEditJob] = useState<Job | null>(null);
  const [viewApplicants, setViewApplicants] = useState<Job | null>(null);
  const [applicants, setApplicants] = useState<any[]>([]);
  const [loadingApplicants, setLoadingApplicants] = useState(false);
  const [viewWorkerId, setViewWorkerId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    try {
      const t = token();
      if (!t) return;
      const res = await fetch(`${API_BASE}/jobs`, { headers: { 'Authorization': `Bearer ${t}` } });
      const data = await res.json() as any;
      const items = (data?.data?.items || data?.data || []).map((j: any) => ({
        id: j.id,
        title: j.title,
        description: j.description,
        status: j.status,
        city: j.city,
        region: j.region,
        salaryMin: j.salary_min,
        salaryMax: j.salary_max,
        salaryType: j.salary_type,
        employmentType: j.employment_type,
        housing: j.housing_provided === 1,
        meals: j.meals_provided === 1,
        transport: j.transport_provided === 1,
        bonus: j.bonus_provided === 1,
        insurance: j.insurance_provided === 1,
        roles: j.roles || [],
        createdAt: j.created_at,
      }));
      setJobs(items);
    } catch {} finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const openApplicants = async (job: Job) => {
    setViewApplicants(job);
    setLoadingApplicants(true);
    try {
      const t = token();
      const res = await fetch(`${API_BASE}/interests/received`, { headers: { 'Authorization': `Bearer ${t}` } });
      const data = await res.json() as any;
      const raw = (data?.data || []).filter((i: any) => !i.job_id || i.job_id === job.id);
      setApplicants(raw);
    } catch {} finally { setLoadingApplicants(false); }
  };

  const saveJob = async (job: Partial<Job>) => {
    setSaving(true);
    try {
      const t = token();
      const body: any = {
        title: job.title,
        description: job.description,
        city: job.city,
        region: job.region,
        salary_min: job.salaryMin,
        salary_max: job.salaryMax,
        salary_type: job.salaryType || 'monthly',
        employment_type: job.employmentType || 'full_time',
        housing_provided: job.housing ? 1 : 0,
        meals_provided: job.meals ? 1 : 0,
        transport_provided: job.transport ? 1 : 0,
        bonus_provided: job.bonus ? 1 : 0,
        insurance_provided: job.insurance ? 1 : 0,
        roles: job.roles,
      };

      if (editJob?.id) {
        // Update
        await fetch(`${API_BASE}/jobs/${editJob.id}`, {
          method: 'PATCH',
          headers: { 'Authorization': `Bearer ${t}`, 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });
      } else {
        // Create
        body.status = 'published';
        await fetch(`${API_BASE}/jobs`, {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${t}`, 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });
      }
      setEditJob(null);
      await load();
    } catch {} finally { setSaving(false); }
  };

  const toggleStatus = async (job: Job) => {
    try {
      const t = token();
      const endpoint = job.status === 'published' ? `/jobs/${job.id}/pause` : `/jobs/${job.id}/resume`;
      await fetch(`${API_BASE}${endpoint}`, { method: 'POST', headers: { 'Authorization': `Bearer ${t}` } });
      await load();
    } catch {}
  };

  const deleteJob = async (job: Job) => {
    if (!confirm(`Διαγραφή "${job.title}";`)) return;
    try {
      const t = token();
      await fetch(`${API_BASE}/jobs/${job.id}`, { method: 'DELETE', headers: { 'Authorization': `Bearer ${t}` } });
      await load();
    } catch {}
  };

  const statusColors: Record<string, string> = {
    published: 'bg-emerald-100 text-emerald-700',
    paused: 'bg-amber-100 text-amber-700',
    draft: 'bg-gray-100 text-gray-700',
    archived: 'bg-gray-200 text-gray-500',
  };

  const statusLabels: Record<string, string> = {
    published: '✅ Ενεργή',
    paused: '⏸️ Παύση',
    draft: '📝 Draft',
    archived: 'Αρχείο',
  };

  if (loading) {
    return <div className="h-full flex items-center justify-center"><div className="h-8 w-8 border-4 border-gray-200 border-t-blue-600 rounded-full animate-spin" /></div>;
  }

  return (
    <div className="h-full flex flex-col bg-gray-50 overflow-y-auto">
      <div className="flex-shrink-0 px-4 pt-6 pb-4 bg-gradient-to-r from-blue-600 to-indigo-600">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-extrabold text-white">💼 Θέσεις</h1>
            <p className="mt-1 text-sm text-blue-100">{jobs.length} συνολικά · {jobs.filter(j => j.status === 'published').length} ενεργές</p>
          </div>
          <button
            onClick={() => setEditJob({ id: '', title: '', status: 'published' } as Job)}
            className="h-12 w-12 rounded-full bg-white text-blue-600 shadow-lg flex items-center justify-center text-2xl font-bold hover:scale-110 transition-transform"
          >+</button>
        </div>
      </div>

      <div className="flex-1 px-4 py-4 space-y-3">
        {jobs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <span className="text-5xl mb-3">📭</span>
            <p className="font-bold text-gray-900">Καμία αγγελία ακόμα</p>
            <button onClick={() => setEditJob({ id: '', title: '', status: 'published' } as Job)} className="mt-6 rounded-full bg-blue-600 px-6 py-2.5 text-sm font-bold text-white">
              + Νέα Αγγελία
            </button>
          </div>
        ) : (
          jobs.map((j) => (
            <div key={j.id} className="rounded-2xl bg-white p-4 shadow-sm border border-gray-100">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-gray-900 truncate">{j.title}</p>
                  {(j.city || j.region) && <p className="mt-0.5 text-xs text-gray-500">📍 {[j.city, j.region].filter(Boolean).join(', ')}</p>}
                  {j.salaryMin && j.salaryMax && (
                    <p className="mt-1 text-sm font-bold text-emerald-600">💰 {j.salaryMin}-{j.salaryMax}€</p>
                  )}
                  <div className="mt-2 flex flex-wrap gap-1">
                    {j.housing && <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">🏠 Διαμονή</span>}
                    {j.meals && <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">🍽️ Σίτιση</span>}
                    {j.transport && <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">🚗 Μεταφορά</span>}
                    {j.bonus && <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-700">💎 Bonus</span>}
                  </div>
                </div>
                <span className={`flex-shrink-0 rounded-full px-2.5 py-1 text-[10px] font-bold ${statusColors[j.status] || 'bg-gray-100 text-gray-600'}`}>
                  {statusLabels[j.status] || j.status}
                </span>
              </div>
              <div className="mt-3 grid grid-cols-3 gap-1.5">
                <button onClick={() => openApplicants(j)} className="rounded-lg bg-purple-50 border border-purple-200 py-2 text-[11px] font-bold text-purple-700 hover:bg-purple-100">
                  👥 Υποψήφιοι
                </button>
                <button onClick={() => setEditJob(j)} className="rounded-lg bg-blue-50 border border-blue-200 py-2 text-[11px] font-bold text-blue-700 hover:bg-blue-100">
                  ✏️ Επεξεργασία
                </button>
                <button onClick={() => toggleStatus(j)} className="rounded-lg bg-gray-50 border border-gray-200 py-2 text-[11px] font-bold text-gray-700 hover:bg-gray-100">
                  {j.status === 'published' ? '⏸️ Παύση' : '▶️ Ενεργή'}
                </button>
              </div>
              <button onClick={() => deleteJob(j)} className="mt-1.5 w-full rounded-lg bg-red-50 border border-red-100 py-1.5 text-[11px] font-semibold text-red-600">
                🗑️ Διαγραφή
              </button>
            </div>
          ))
        )}
      </div>

      {/* Edit/Create Modal */}
      {editJob && <JobFormModal job={editJob} saving={saving} onSave={saveJob} onClose={() => setEditJob(null)} />}

      {/* Applicants Modal */}
      {viewApplicants && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm" onClick={() => setViewApplicants(null)}>
          <div className="w-full max-w-md bg-white rounded-t-3xl sm:rounded-3xl max-h-[85vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-center py-2"><div className="h-1.5 w-10 rounded-full bg-gray-300" /></div>
            <div className="px-6 pb-4">
              <h2 className="text-lg font-extrabold text-gray-900">Υποψήφιοι</h2>
              <p className="text-xs text-gray-500 truncate">{viewApplicants.title}</p>
            </div>
            <div className="px-4 pb-6 space-y-2">
              {loadingApplicants ? (
                <div className="flex justify-center py-8"><div className="h-6 w-6 border-4 border-gray-200 border-t-blue-600 rounded-full animate-spin" /></div>
              ) : applicants.length === 0 ? (
                <p className="text-center py-8 text-sm text-gray-500">Κανείς δεν έχει κάνει αίτηση ακόμα</p>
              ) : (
                applicants.map((a) => (
                  <button
                    key={a.swipe_id}
                    onClick={() => { setViewWorkerId(a.swiper_id); }}
                    className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 text-left border border-gray-100"
                  >
                    <div className="h-12 w-12 rounded-full bg-gradient-to-br from-blue-100 to-purple-100 flex items-center justify-center font-bold text-purple-700 overflow-hidden flex-shrink-0">
                      {a.photo_url ? <img src={a.photo_url} alt="" className="h-full w-full object-cover" /> : (a.full_name || '?')[0]?.toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-gray-900 truncate">{a.full_name || 'Εργαζόμενος'}</p>
                      {a.city && <p className="text-xs text-gray-500 truncate">📍 {a.city}{a.region ? `, ${a.region}` : ''}</p>}
                      {a.years_of_experience != null && <p className="text-xs text-gray-400">⭐ {a.years_of_experience} χρόνια</p>}
                    </div>
                    {(a.is_matched || 0) > 0 ? (
                      <span className="flex-shrink-0 rounded-full bg-emerald-100 text-emerald-700 px-2.5 py-1 text-[10px] font-bold">✓ Match</span>
                    ) : (
                      <span className="flex-shrink-0 rounded-full bg-amber-100 text-amber-700 px-2.5 py-1 text-[10px] font-bold">Αναμονή</span>
                    )}
                  </button>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Worker profile (when tapping applicant) */}
      {viewWorkerId && (
        <ProfilePanel
          id={viewWorkerId}
          type="worker"
          onClose={() => setViewWorkerId(null)}
        />
      )}
    </div>
  );
}

function JobFormModal({ job, saving, onSave, onClose }: { job: Job; saving: boolean; onSave: (j: Partial<Job>) => void; onClose: () => void }) {
  const [form, setForm] = useState<Partial<Job>>({
    title: job.title || '',
    description: job.description || '',
    city: job.city || '',
    region: job.region || '',
    salaryMin: job.salaryMin,
    salaryMax: job.salaryMax,
    salaryType: job.salaryType || 'monthly',
    employmentType: job.employmentType || 'full_time',
    housing: job.housing || false,
    meals: job.meals || false,
    transport: job.transport || false,
    bonus: job.bonus || false,
    insurance: job.insurance || false,
    roles: job.roles || [],
  });

  const toggleRole = (r: string) => {
    setForm((f) => ({ ...f, roles: f.roles?.includes(r) ? f.roles.filter((x) => x !== r) : [...(f.roles || []), r] }));
  };

  const submit = () => {
    if (!form.title || !form.title.trim()) return;
    onSave(form);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm" onClick={() => !saving && onClose()}>
      <div className="w-full max-w-md bg-white rounded-t-3xl sm:rounded-3xl max-h-[92vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex justify-center py-2"><div className="h-1.5 w-10 rounded-full bg-gray-300" /></div>
        <div className="px-6 pb-6">
          <h2 className="text-xl font-extrabold text-gray-900">
            {job.id ? 'Επεξεργασία Αγγελίας' : 'Νέα Αγγελία'}
          </h2>

          <div className="mt-5 space-y-3">
            <input
              value={form.title || ''}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder="Τίτλος θέσης (π.χ. Σερβιτόρος/α)"
              className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm outline-none focus:border-blue-500"
            />
            <textarea
              value={form.description || ''}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="Περιγραφή θέσης — τι θέλεις από τον υποψήφιο..."
              rows={4}
              className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm outline-none focus:border-blue-500 resize-none"
            />
            <div className="grid grid-cols-2 gap-2">
              <input
                value={form.city || ''}
                onChange={(e) => setForm({ ...form, city: e.target.value })}
                placeholder="Πόλη"
                className="rounded-xl border border-gray-300 px-4 py-3 text-sm outline-none focus:border-blue-500"
              />
              <input
                value={form.region || ''}
                onChange={(e) => setForm({ ...form, region: e.target.value })}
                placeholder="Περιοχή"
                className="rounded-xl border border-gray-300 px-4 py-3 text-sm outline-none focus:border-blue-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <input
                type="number"
                value={form.salaryMin ?? ''}
                onChange={(e) => setForm({ ...form, salaryMin: e.target.value ? parseInt(e.target.value) : undefined })}
                placeholder="Μισθός από (€)"
                className="rounded-xl border border-gray-300 px-4 py-3 text-sm outline-none focus:border-blue-500"
              />
              <input
                type="number"
                value={form.salaryMax ?? ''}
                onChange={(e) => setForm({ ...form, salaryMax: e.target.value ? parseInt(e.target.value) : undefined })}
                placeholder="Έως (€)"
                className="rounded-xl border border-gray-300 px-4 py-3 text-sm outline-none focus:border-blue-500"
              />
            </div>

            <select
              value={form.salaryType || 'monthly'}
              onChange={(e) => setForm({ ...form, salaryType: e.target.value })}
              className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm outline-none focus:border-blue-500"
            >
              <option value="monthly">€ ανά μήνα</option>
              <option value="hourly">€ ανά ώρα</option>
              <option value="daily">€ ανά ημέρα</option>
            </select>

            <select
              value={form.employmentType || 'full_time'}
              onChange={(e) => setForm({ ...form, employmentType: e.target.value })}
              className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm outline-none focus:border-blue-500"
            >
              <option value="full_time">Πλήρης απασχόληση</option>
              <option value="part_time">Μερική απασχόληση</option>
              <option value="seasonal">Σεζόν</option>
              <option value="freelance">Freelance</option>
            </select>

            {/* Roles */}
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-gray-500 mb-2">Ρόλοι που χρειάζονται</label>
              <div className="flex flex-wrap gap-2">
                {WORKER_ROLES.map((r) => {
                  const on = form.roles?.includes(r.value) || false;
                  return (
                    <button
                      key={r.value}
                      type="button"
                      onClick={() => toggleRole(r.value)}
                      className={`rounded-full px-3 py-1.5 text-xs font-semibold ${on ? 'bg-blue-600 text-white' : 'bg-white border border-gray-300 text-gray-700'}`}
                    >
                      {on ? '✓ ' : ''}{r.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Benefits */}
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-gray-500 mb-2">Παροχές</label>
              <div className="space-y-2">
                <Toggle label="🏠 Διαμονή" value={form.housing || false} onChange={(v) => setForm({ ...form, housing: v })} />
                <Toggle label="🍽️ Σίτιση" value={form.meals || false} onChange={(v) => setForm({ ...form, meals: v })} />
                <Toggle label="🚗 Μεταφορά" value={form.transport || false} onChange={(v) => setForm({ ...form, transport: v })} />
                <Toggle label="💎 Bonus" value={form.bonus || false} onChange={(v) => setForm({ ...form, bonus: v })} />
                <Toggle label="🛡️ Ασφάλιση" value={form.insurance || false} onChange={(v) => setForm({ ...form, insurance: v })} />
              </div>
            </div>
          </div>

          <div className="mt-5 flex gap-2">
            <button onClick={onClose} disabled={saving} className="flex-1 rounded-xl border border-gray-300 py-3 text-sm font-bold text-gray-700">
              Άκυρο
            </button>
            <button
              onClick={submit}
              disabled={saving || !form.title?.trim()}
              className="flex-1 rounded-xl bg-blue-600 py-3 text-sm font-bold text-white disabled:opacity-50"
            >
              {saving ? '...' : (job.id ? '💾 Αποθήκευση' : '✅ Δημοσίευση')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function Toggle({ label, value, onChange }: { label: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!value)}
      className={`w-full flex items-center justify-between rounded-xl px-4 py-2.5 text-sm font-medium ${value ? 'bg-emerald-50 border border-emerald-200 text-emerald-900' : 'bg-gray-50 border border-gray-200 text-gray-700'}`}
    >
      <span>{label}</span>
      <span className={`relative h-6 w-10 rounded-full transition-colors ${value ? 'bg-emerald-600' : 'bg-gray-300'}`}>
        <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${value ? 'translate-x-4' : 'translate-x-0.5'}`} />
      </span>
    </button>
  );
}
