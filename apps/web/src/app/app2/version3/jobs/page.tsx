'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'https://staffnow-api-production.siteinside53.workers.dev';
const token = () => typeof window !== 'undefined' ? localStorage.getItem('staffnow_token') : null;

interface Job {
  id: string;
  title: string;
  status: string;
  city?: string;
  region?: string;
  salaryMin?: number;
  salaryMax?: number;
  employmentType?: string;
  createdAt?: string;
}

export default function JobsV3() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ title: '', description: '', city: '', salaryMin: '', salaryMax: '' });
  const [creating, setCreating] = useState(false);

  const load = async () => {
    try {
      const t = token();
      if (!t) return;
      const res = await fetch(`${API_BASE}/jobs`, { headers: { 'Authorization': `Bearer ${t}` } });
      const data = await res.json() as any;
      const items = (data?.data?.items || data?.data || []).map((j: any) => ({
        id: j.id,
        title: j.title,
        status: j.status,
        city: j.city,
        region: j.region,
        salaryMin: j.salary_min,
        salaryMax: j.salary_max,
        employmentType: j.employment_type,
        createdAt: j.created_at,
      }));
      setJobs(items);
    } catch {} finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const createJob = async () => {
    if (!form.title || !form.description) return;
    setCreating(true);
    try {
      const t = token();
      const res = await fetch(`${API_BASE}/jobs`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${t}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: form.title,
          description: form.description,
          city: form.city || undefined,
          salary_min: form.salaryMin ? parseInt(form.salaryMin) : undefined,
          salary_max: form.salaryMax ? parseInt(form.salaryMax) : undefined,
          employment_type: 'full_time',
          status: 'published',
        }),
      });
      if (res.ok) {
        setShowCreate(false);
        setForm({ title: '', description: '', city: '', salaryMin: '', salaryMax: '' });
        await load();
      }
    } catch {} finally { setCreating(false); }
  };

  const toggleStatus = async (job: Job) => {
    try {
      const t = token();
      const endpoint = job.status === 'published' ? `/jobs/${job.id}/pause` : `/jobs/${job.id}/resume`;
      await fetch(`${API_BASE}${endpoint}`, { method: 'POST', headers: { 'Authorization': `Bearer ${t}` } });
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
    archived: 'Αρχειοθέτηση',
  };

  if (loading) {
    return <div className="h-full flex items-center justify-center"><div className="h-8 w-8 border-4 border-gray-200 border-t-blue-600 rounded-full animate-spin" /></div>;
  }

  return (
    <div className="h-full flex flex-col bg-gray-50 overflow-y-auto">
      {/* Header */}
      <div className="flex-shrink-0 px-4 pt-6 pb-4 bg-gradient-to-r from-blue-600 to-indigo-600">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-extrabold text-white">💼 Θέσεις</h1>
            <p className="mt-1 text-sm text-blue-100">{jobs.length} συνολικά · {jobs.filter(j => j.status === 'published').length} ενεργές</p>
          </div>
          <button
            onClick={() => setShowCreate(true)}
            className="h-12 w-12 rounded-full bg-white text-blue-600 shadow-lg flex items-center justify-center text-2xl font-bold hover:scale-110 transition-transform"
          >
            +
          </button>
        </div>
      </div>

      <div className="flex-1 px-4 py-4 space-y-3">
        {jobs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <span className="text-5xl mb-3">📭</span>
            <p className="font-bold text-gray-900">Καμία αγγελία ακόμα</p>
            <p className="mt-1 text-sm text-gray-500">Δημιούργησε την πρώτη σου θέση</p>
            <button onClick={() => setShowCreate(true)} className="mt-6 rounded-full bg-blue-600 px-6 py-2.5 text-sm font-bold text-white">
              + Νέα Αγγελία
            </button>
          </div>
        ) : (
          jobs.map((j) => (
            <div key={j.id} className="rounded-2xl bg-white p-4 shadow-sm border border-gray-100">
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-gray-900 truncate">{j.title}</p>
                  {(j.city || j.region) && <p className="mt-0.5 text-xs text-gray-500">📍 {[j.city, j.region].filter(Boolean).join(', ')}</p>}
                  {j.salaryMin && j.salaryMax && (
                    <p className="mt-1 text-sm font-bold text-emerald-600">💰 {j.salaryMin}-{j.salaryMax}€</p>
                  )}
                </div>
                <span className={`flex-shrink-0 ml-3 rounded-full px-2.5 py-1 text-[10px] font-bold ${statusColors[j.status] || 'bg-gray-100 text-gray-600'}`}>
                  {statusLabels[j.status] || j.status}
                </span>
              </div>
              <div className="mt-3 flex gap-2 text-xs">
                <button
                  onClick={() => toggleStatus(j)}
                  className="flex-1 rounded-lg bg-gray-50 border border-gray-200 py-2 font-semibold text-gray-700 hover:bg-gray-100"
                >
                  {j.status === 'published' ? '⏸️ Παύση' : '▶️ Ενεργοποίηση'}
                </button>
                <Link
                  href="/dashboard/jobs"
                  className="flex-1 rounded-lg bg-blue-50 border border-blue-200 py-2 font-semibold text-blue-700 hover:bg-blue-100 text-center"
                >
                  ✏️ Επεξεργασία
                </Link>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Create Modal */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm" onClick={() => !creating && setShowCreate(false)}>
          <div className="w-full max-w-md bg-white rounded-t-3xl sm:rounded-3xl p-6 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-xl font-extrabold text-gray-900">Νέα Αγγελία</h2>
            <p className="text-xs text-gray-500 mt-1">Συμπλήρωσε τα βασικά για γρήγορη δημοσίευση</p>

            <div className="mt-5 space-y-3">
              <input
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="Τίτλος θέσης (π.χ. Σερβιτόρος/α)"
                className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm outline-none focus:border-blue-500"
              />
              <textarea
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="Περιγραφή θέσης..."
                rows={3}
                className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm outline-none focus:border-blue-500 resize-none"
              />
              <input
                value={form.city}
                onChange={(e) => setForm({ ...form, city: e.target.value })}
                placeholder="Πόλη (π.χ. Μύκονος)"
                className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm outline-none focus:border-blue-500"
              />
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="number"
                  value={form.salaryMin}
                  onChange={(e) => setForm({ ...form, salaryMin: e.target.value })}
                  placeholder="Από (€)"
                  className="rounded-xl border border-gray-300 px-4 py-3 text-sm outline-none focus:border-blue-500"
                />
                <input
                  type="number"
                  value={form.salaryMax}
                  onChange={(e) => setForm({ ...form, salaryMax: e.target.value })}
                  placeholder="Έως (€)"
                  className="rounded-xl border border-gray-300 px-4 py-3 text-sm outline-none focus:border-blue-500"
                />
              </div>
            </div>

            <div className="mt-5 flex gap-2">
              <button onClick={() => setShowCreate(false)} disabled={creating} className="flex-1 rounded-xl border border-gray-300 py-3 text-sm font-bold text-gray-700">
                Άκυρο
              </button>
              <button
                onClick={createJob}
                disabled={creating || !form.title || !form.description}
                className="flex-1 rounded-xl bg-blue-600 py-3 text-sm font-bold text-white disabled:opacity-50"
              >
                {creating ? '...' : '✅ Δημοσίευση'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
