'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Spinner } from '@/components/ui/spinner';
import { JobPreviewPanel } from './job-preview-panel';
import {
  EMPLOYMENT_TYPE_LABELS_EL,
  SALARY_TYPE_LABELS_EL,
} from '@staffnow/config';

interface Branch {
  id: string; name: string; business_type: string; description: string; region: string; city: string;
  address: string; phone: string; website: string; logo_url: string; cover_photo_url: string;
  staff_housing: number; meals_provided: number; transportation_assistance: number;
  bonus_provided: number; insurance_provided: number; no_benefits: number;
  google_business_url: string; operating_hours: string; postal_code: string; area: string;
}

const EMPTY_BRANCH: Partial<Branch> = {
  name: '', business_type: 'other', description: '', region: '', city: '', address: '', phone: '', website: '', logo_url: '', cover_photo_url: '', staff_housing: 0, meals_provided: 0, transportation_assistance: 0,
};

const BIZ_TYPES: Record<string, string> = {
  hotel: '🏨 Ξενοδοχείο', restaurant: '🍽️ Εστιατόριο', beach_bar: '🏖️ Beach Bar',
  bar: '🍸 Μπαρ', cafe: '☕ Καφετέρια', villa: '🏡 Βίλα',
  tourism_company: '✈️ Τουριστική Εταιρεία', resort: '🌴 Resort',
  technical: '🔧 Τεχνική Εταιρεία', other: '📋 Άλλο',
};

const BIZ_TYPES_PLAIN: Record<string, string> = {
  hotel: 'Ξενοδοχείο', restaurant: 'Εστιατόριο', beach_bar: 'Beach Bar',
  bar: 'Μπαρ', cafe: 'Καφετέρια', villa: 'Βίλα',
  tourism_company: 'Τουριστική', resort: 'Resort', technical: 'Τεχνική', other: 'Επιχείρηση',
};

type ViewMode = 'list' | 'edit' | 'preview';

const DAYS = [
  { key: 'mon', label: 'Δευτέρα' },
  { key: 'tue', label: 'Τρίτη' },
  { key: 'wed', label: 'Τετάρτη' },
  { key: 'thu', label: 'Πέμπτη' },
  { key: 'fri', label: 'Παρασκευή' },
  { key: 'sat', label: 'Σάββατο' },
  { key: 'sun', label: 'Κυριακή' },
];

interface DaySchedule {
  open: string;
  close: string;
  closed: boolean;
}

type WeekSchedule = Record<string, DaySchedule>;

const DEFAULT_SCHEDULE: WeekSchedule = Object.fromEntries(
  DAYS.map((d) => [d.key, { open: '09:00', close: '23:00', closed: false }])
);

function parseSchedule(json: string): WeekSchedule {
  try {
    const parsed = JSON.parse(json);
    return { ...DEFAULT_SCHEDULE, ...parsed };
  } catch { return { ...DEFAULT_SCHEDULE }; }
}

function OperatingHoursEditor({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [schedule, setSchedule] = useState<WeekSchedule>(() => parseSchedule(value));

  const update = (day: string, field: keyof DaySchedule, val: string | boolean) => {
    const updated = { ...schedule, [day]: { ...schedule[day], [field]: val } };
    setSchedule(updated);
    onChange(JSON.stringify(updated));
  };

  return (
    <div className="space-y-2">
      {DAYS.map((day) => {
        const s = schedule[day.key] || { open: '09:00', close: '23:00', closed: false };
        return (
          <div key={day.key} className={`flex items-center gap-3 rounded-lg p-3 ${s.closed ? 'bg-red-50' : 'bg-gray-50'}`}>
            <span className="w-24 text-sm font-medium text-gray-700">{day.label}</span>
            <label className="flex items-center gap-2 cursor-pointer flex-shrink-0">
              <input type="checkbox" checked={s.closed} onChange={(e) => update(day.key, 'closed', e.target.checked)}
                className="h-4 w-4 rounded border-gray-300 text-red-500" />
              <span className="text-xs text-red-600 font-medium">Κλειστά</span>
            </label>
            {!s.closed && (
              <div className="flex items-center gap-2 flex-1">
                <input type="time" value={s.open} onChange={(e) => update(day.key, 'open', e.target.value)}
                  className="h-8 rounded border border-gray-300 px-2 text-sm w-28" />
                <span className="text-gray-400 text-xs">-</span>
                <input type="time" value={s.close} onChange={(e) => update(day.key, 'close', e.target.value)}
                  className="h-8 rounded border border-gray-300 px-2 text-sm w-28" />
              </div>
            )}
            {s.closed && <span className="text-xs text-red-500 italic">Κλειστό</span>}
          </div>
        );
      })}
    </div>
  );
}

// Format schedule for display
function formatScheduleDisplay(json: string): string[] {
  try {
    const schedule = JSON.parse(json) as WeekSchedule;
    return DAYS.map((d) => {
      const s = schedule[d.key];
      if (!s) return `${d.label}: -`;
      if (s.closed) return `${d.label}: Κλειστά`;
      return `${d.label}: ${s.open} - ${s.close}`;
    });
  } catch { return []; }
}

export function BusinessProfile({ user, profile, refreshUser }: { user: any; profile: any; refreshUser: () => Promise<void> }) {
  const [branches, setBranches] = useState<Branch[]>([]);
  const [jobs, setJobs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [editingBranch, setEditingBranch] = useState<Partial<Branch> | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [previewBranch, setPreviewBranch] = useState<Branch | null>(null);
  const [viewingJobId, setViewingJobId] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const [brRes, jobsRes] = await Promise.all([
          (api as any).branches.list() as any,
          api.jobs.list() as any,
        ]);
        if (brRes.success) setBranches(brRes.data || []);
        setJobs(Array.isArray(jobsRes?.data) ? jobsRes.data : []);
      } catch {} finally { setLoading(false); }
    }
    load();
  }, []);

  // Upload handlers
  const [uploading, setUploading] = useState<string | null>(null);
  const handleUpload = async (file: File, category: 'logo' | 'cover') => {
    setUploading(category);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('category', category);
      const token = localStorage.getItem('staffnow_token');
      const res = await fetch('https://staffnow-api-production.siteinside53.workers.dev/uploads', {
        method: 'POST', headers: token ? { 'Authorization': `Bearer ${token}` } : {}, body: formData,
      });
      const data = await res.json() as any;
      if (data.success && data.data?.url) {
        if (category === 'logo') setEditingBranch((p) => p ? { ...p, logo_url: data.data.url } : p);
        else setEditingBranch((p) => p ? { ...p, cover_photo_url: data.data.url } : p);
        toast.success(category === 'logo' ? 'Λογότυπο ανέβηκε!' : 'Cover photo ανέβηκε!');
      } else toast.error(data.error?.message || 'Αποτυχία upload');
    } catch { toast.error('Σφάλμα σύνδεσης'); } finally { setUploading(null); }
  };

  const saveBranch = async () => {
    if (!editingBranch?.name) { toast.error('Συμπλήρωσε το όνομα'); return; }
    setSaving(true);
    try {
      if (editingId) {
        const res = await (api as any).branches.update(editingId, editingBranch) as any;
        if (res.success) { setBranches((prev) => prev.map((b) => b.id === editingId ? { ...b, ...res.data } : b)); toast.success('Ενημερώθηκε!'); }
      } else {
        const res = await (api as any).branches.create(editingBranch) as any;
        if (res.success) { setBranches((prev) => [...prev, res.data]); toast.success('Προστέθηκε!'); }
      }
      setEditingBranch(null); setEditingId(null); setViewMode('list');
    } catch { toast.error('Σφάλμα αποθήκευσης'); } finally { setSaving(false); }
  };

  const deleteBranch = async (id: string) => {
    if (!confirm('Σίγουρα θέλεις να διαγράψεις αυτή την επιχείρηση;')) return;
    try { await (api as any).branches.delete(id); setBranches((prev) => prev.filter((b) => b.id !== id)); toast.success('Διαγράφηκε'); } catch { toast.error('Σφάλμα'); }
  };

  const bc = (f: string, v: any) => setEditingBranch((p) => p ? { ...p, [f]: v } : p);
  const sel = "flex h-10 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-blue-500";

  if (loading) return <div className="flex justify-center py-20"><Spinner className="h-8 w-8" /></div>;

  // ====== PREVIEW MODE: Landing Page ======
  if (viewMode === 'preview' && previewBranch) {
    const b = previewBranch;
    const publishedJobs = jobs.filter((j: any) => j.status === 'published' || j.status === 'paused');

    return (
      <div className="max-w-4xl">
        {/* Back button */}
        <button onClick={() => { setPreviewBranch(null); setViewMode('list'); }}
          className="mb-4 flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700">
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" /></svg>
          Πίσω στις επιχειρήσεις
        </button>

        {/* Cover Photo + Logo wrapper */}
        <div className="relative">
          <div className="h-52 sm:h-64 rounded-t-2xl overflow-hidden">
            {b.cover_photo_url ? (
              <img src={b.cover_photo_url} alt="" className="h-full w-full object-cover" />
            ) : (
              <div className="h-full w-full bg-gradient-to-br from-cyan-500 via-blue-600 to-indigo-700">
                <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI2MCIgaGVpZ2h0PSI2MCI+PHJlY3Qgd2lkdGg9IjYwIiBoZWlnaHQ9IjYwIiBmaWxsPSJub25lIiBzdHJva2U9InJnYmEoMjU1LDI1NSwyNTUsMC4xKSIgc3Ryb2tlLXdpZHRoPSIxIi8+PC9zdmc+')] opacity-30" />
              </div>
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />

            {/* Edit button */}
            <button onClick={() => { setEditingBranch({ ...b }); setEditingId(b.id); setPreviewBranch(null); setViewMode('edit'); }}
              className="absolute top-4 right-4 z-10 flex items-center gap-2 rounded-full bg-white/90 backdrop-blur px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-white transition-colors">
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125" /></svg>
              Επεξεργασία
            </button>
          </div>

          {/* Logo - OUTSIDE overflow-hidden container */}
          <div className="absolute -bottom-14 left-6 z-10">
            {b.logo_url ? (
              <div className="h-28 w-28 rounded-2xl border-4 border-white bg-white shadow-xl overflow-hidden">
                <img src={b.logo_url} alt="" className="w-full h-full object-cover" />
              </div>
            ) : (
              <div className="flex h-28 w-28 items-center justify-center rounded-2xl border-4 border-white bg-white text-4xl font-bold text-blue-600 shadow-xl">
                {b.name?.[0]?.toUpperCase() || '🏢'}
              </div>
            )}
          </div>
        </div>

        {/* Header */}
        <div className="px-6 pt-16 pb-5 border-b border-gray-100 rounded-b-none bg-white">
          <h1 className="text-2xl font-bold text-gray-900">{b.name || 'Επιχείρηση'}</h1>
          <div className="mt-1 flex items-center gap-2">
            <div className="flex text-yellow-400 text-sm">★★★★★</div>
            <span className="font-bold text-gray-900 text-sm">4.8</span>
            <span className="text-sm text-gray-400">· 0 αξιολογήσεις</span>
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-4 text-sm text-gray-500">
            {(b.city || b.region) && (
              <span className="flex items-center gap-1.5">
                <svg className="h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" /></svg>
                {[b.city, b.region].filter(Boolean).join(', ')}
              </span>
            )}
            <span className="flex items-center gap-1.5">
              <svg className="h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 21h19.5M3.75 3v18m16.5-18v18" /></svg>
              {BIZ_TYPES_PLAIN[b.business_type] || 'Επιχείρηση'}
            </span>
          </div>
          {b.description && <p className="mt-3 text-gray-600 leading-relaxed">{b.description}</p>}
        </div>

        {/* 2-Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-2 divide-y lg:divide-y-0 lg:divide-x divide-gray-100 bg-white rounded-b-2xl">
          {/* LEFT: Open positions */}
          <div className="px-6 py-5">
            <h2 className="flex items-center gap-2 text-base font-bold text-gray-900 mb-4">
              <svg className="h-5 w-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M20.25 14.15v4.25c0 1.094-.787 2.036-1.872 2.18-2.087.277-4.216.42-6.378.42s-4.291-.143-6.378-.42c-1.085-.144-1.872-1.086-1.872-2.18v-4.25m16.5 0a2.18 2.18 0 00.75-1.661V8.706c0-1.081-.768-2.015-1.837-2.175a48.114 48.114 0 00-3.413-.387m4.5 8.006c-.194.165-.42.295-.673.38A23.978 23.978 0 0112 15.75c-2.648 0-5.195-.429-7.577-1.22a2.016 2.016 0 01-.673-.38m0 0A2.18 2.18 0 013 12.489V8.706c0-1.081.768-2.015 1.837-2.175a48.111 48.111 0 013.413-.387m7.5 0V5.25A2.25 2.25 0 0013.5 3h-3a2.25 2.25 0 00-2.25 2.25v.894m7.5 0a48.667 48.667 0 00-7.5 0" /></svg>
              Ανοιχτές θέσεις ({publishedJobs.length})
            </h2>
            {publishedJobs.length > 0 ? (
              <div className="space-y-3">
                {publishedJobs.map((job: any) => (
                  <button key={job.id} onClick={() => setViewingJobId(job.id)}
                    className="w-full text-left flex items-center justify-between rounded-xl bg-gray-50 hover:bg-blue-50 p-4 transition-colors group">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100 text-blue-600 group-hover:bg-blue-200">
                        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" /></svg>
                      </div>
                      <div>
                        <p className="font-semibold text-gray-900 text-sm group-hover:text-blue-700">{job.title}</p>
                        <p className="text-xs text-gray-500">{EMPLOYMENT_TYPE_LABELS_EL[job.employment_type] || job.employment_type}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {(job.salary_min || job.salary_max) && (
                        <div className="text-right">
                          <p className="font-bold text-emerald-600 text-sm">{job.salary_min && job.salary_max ? `${job.salary_min}-${job.salary_max}€` : `${job.salary_min || job.salary_max}€`}</p>
                          <p className="text-[10px] text-gray-400">{SALARY_TYPE_LABELS_EL[job.salary_type] || 'μήνα'}</p>
                        </div>
                      )}
                      <svg className="h-4 w-4 text-gray-300 group-hover:text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" /></svg>
                    </div>
                  </button>
                ))}
              </div>
            ) : (
              <div className="rounded-xl bg-gray-50 p-6 text-center text-sm text-gray-400">
                Δεν υπάρχουν ανοιχτές θέσεις
                <a href="/dashboard/jobs" className="block mt-2 text-blue-600 hover:underline font-medium">+ Δημιούργησε αγγελία</a>
              </div>
            )}
          </div>

          {/* RIGHT: Benefits + Info */}
          <div className="px-6 py-5 space-y-5">
            <div>
              <h2 className="flex items-center gap-2 text-base font-bold text-gray-900 mb-3">
                <svg className="h-5 w-5 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12c0 1.268-.63 2.39-1.593 3.068a3.745 3.745 0 01-1.043 3.296 3.745 3.745 0 01-3.296 1.043A3.745 3.745 0 0112 21c-1.268 0-2.39-.63-3.068-1.593a3.746 3.746 0 01-3.296-1.043 3.745 3.745 0 01-1.043-3.296A3.745 3.745 0 013 12c0-1.268.63-2.39 1.593-3.068a3.745 3.745 0 011.043-3.296 3.746 3.746 0 013.296-1.043A3.746 3.746 0 0112 3c1.268 0 2.39.63 3.068 1.593a3.746 3.746 0 013.296 1.043 3.746 3.746 0 011.043 3.296A3.745 3.745 0 0121 12z" /></svg>
                Παροχές
              </h2>
              <div className="flex flex-wrap gap-2">
                {b.staff_housing === 1 && <span className="flex items-center gap-1.5 rounded-lg bg-emerald-50 border border-emerald-200 px-3 py-2 text-xs font-semibold text-emerald-700">🏠 Διαμονή</span>}
                {b.meals_provided === 1 && <span className="flex items-center gap-1.5 rounded-lg bg-emerald-50 border border-emerald-200 px-3 py-2 text-xs font-semibold text-emerald-700">🍽️ Σίτιση</span>}
                {b.transportation_assistance === 1 && <span className="flex items-center gap-1.5 rounded-lg bg-emerald-50 border border-emerald-200 px-3 py-2 text-xs font-semibold text-emerald-700">🚌 Μεταφορά</span>}
                {b.bonus_provided === 1 && <span className="flex items-center gap-1.5 rounded-lg bg-emerald-50 border border-emerald-200 px-3 py-2 text-xs font-semibold text-emerald-700">💰 Bonus</span>}
                {b.insurance_provided === 1 && <span className="flex items-center gap-1.5 rounded-lg bg-emerald-50 border border-emerald-200 px-3 py-2 text-xs font-semibold text-emerald-700">⏰ Ευέλικτο ωράριο</span>}
                {b.no_benefits === 1 && <span className="flex items-center gap-1.5 rounded-lg bg-gray-50 border border-gray-200 px-3 py-2 text-xs font-semibold text-gray-600">❌ Χωρίς παροχές</span>}
                {!b.staff_housing && !b.meals_provided && !b.transportation_assistance && !b.bonus_provided && !b.insurance_provided && !b.no_benefits && <span className="text-sm text-gray-400">Δεν δηλώθηκαν</span>}
              </div>
            </div>
            <div>
              <h2 className="text-base font-bold text-gray-900 mb-3">Πληροφορίες</h2>
              <div className="space-y-3">
                {b.operating_hours && (() => {
                  const lines = formatScheduleDisplay(b.operating_hours);
                  return lines.length > 0 ? (
                    <div className="flex gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gray-100 flex-shrink-0 mt-0.5"><span className="text-sm">🕐</span></div>
                      <div>
                        <p className="text-sm font-medium text-gray-900 mb-1">Ωράριο Λειτουργίας</p>
                        <div className="space-y-0.5">
                          {lines.map((line, i) => (
                            <p key={i} className={`text-xs ${line.includes('Κλειστά') ? 'text-red-500' : 'text-gray-500'}`}>{line}</p>
                          ))}
                        </div>
                      </div>
                    </div>
                  ) : null;
                })()}
                {b.phone && <div className="flex items-center gap-3"><div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gray-100"><span className="text-sm">📞</span></div><div><p className="text-sm font-medium text-gray-900">Τηλέφωνο</p><p className="text-xs text-gray-500">{b.phone}</p></div></div>}
                {b.website && <div className="flex items-center gap-3"><div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gray-100"><span className="text-sm">🌐</span></div><div><p className="text-sm font-medium text-gray-900">Website</p><a href={b.website} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-600 hover:underline">{b.website}</a></div></div>}
                {b.google_business_url && <div className="flex items-center gap-3"><div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gray-100"><span className="text-sm">📍</span></div><div><p className="text-sm font-medium text-gray-900">Google Business</p><a href={b.google_business_url} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-600 hover:underline">Google Profile</a></div></div>}
                {(b.address || b.city) && <div className="flex items-center gap-3"><div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gray-100"><span className="text-sm">🏠</span></div><div><p className="text-sm font-medium text-gray-900">Τοποθεσία</p><p className="text-xs text-gray-500">{[b.address, b.area, b.city, b.postal_code, b.region].filter(Boolean).join(', ')}</p></div></div>}
              </div>
            </div>
          </div>
        </div>

        {viewingJobId && <JobPreviewPanel jobId={viewingJobId} onClose={() => setViewingJobId(null)} />}
      </div>
    );
  }

  // ====== EDIT MODE ======
  if (viewMode === 'edit' && editingBranch) {
    return (
      <div className="max-w-3xl">
        <div className="mb-8 flex items-center gap-4">
          <button onClick={() => { setEditingBranch(null); setEditingId(null); setViewMode('list'); }} className="rounded-lg border border-gray-300 p-2 hover:bg-gray-50">
            <svg className="h-5 w-5 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" /></svg>
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{editingId ? 'Επεξεργασία Επιχείρησης' : 'Νέα Επιχείρηση'}</h1>
            <p className="mt-1 text-gray-600">Συμπλήρωσε τα στοιχεία</p>
          </div>
        </div>

        {/* Cover Photo */}
        <Card className="mb-6"><CardContent className="p-6">
          <label className="cursor-pointer group block">
            <input type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleUpload(f, 'cover'); }} />
            {editingBranch?.cover_photo_url ? (
              <div className="relative h-40 sm:h-52 rounded-xl overflow-hidden border-2 border-gray-200 group-hover:border-blue-400">
                <img src={editingBranch.cover_photo_url} alt="" className="h-full w-full object-cover" />
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 flex items-center justify-center">
                  <span className="opacity-0 group-hover:opacity-100 text-white font-semibold text-sm bg-black/50 rounded-lg px-4 py-2">{uploading === 'cover' ? 'Ανέβασμα...' : 'Αλλαγή'}</span>
                </div>
              </div>
            ) : (
              <div className="flex h-40 sm:h-52 items-center justify-center rounded-xl border-2 border-dashed border-gray-300 bg-gray-50 group-hover:border-blue-400 group-hover:bg-blue-50">
                <div className="text-center">
                  <svg className="mx-auto h-10 w-10 text-gray-400 group-hover:text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M3.75 21h16.5A2.25 2.25 0 0022.5 18.75V5.25A2.25 2.25 0 0020.25 3H3.75A2.25 2.25 0 001.5 5.25v13.5A2.25 2.25 0 003.75 21z" /></svg>
                  <p className="mt-2 text-sm font-medium text-gray-600">Ανέβασε φωτογραφία εξωφύλλου</p>
                </div>
              </div>
            )}
          </label>
        </CardContent></Card>

        {/* Logo */}
        <Card className="mb-6"><CardContent className="p-6">
          <div className="flex items-center gap-5">
            <label className="cursor-pointer group relative flex-shrink-0">
              <input type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleUpload(f, 'logo'); }} />
              {editingBranch?.logo_url ? (
                <div className="h-20 w-20 rounded-xl border-2 border-gray-200 group-hover:border-blue-400 bg-white overflow-hidden">
                  <img src={editingBranch.logo_url} alt="" className="w-full h-full object-cover" />
                </div>
              ) : (
                <div className="flex h-20 w-20 items-center justify-center rounded-xl bg-blue-100 text-2xl font-bold text-blue-600 group-hover:bg-blue-200">
                  {editingBranch?.name?.[0]?.toUpperCase() || '🏢'}
                </div>
              )}
              <div className="absolute -bottom-1 -right-1 flex h-7 w-7 items-center justify-center rounded-full bg-blue-600 text-white shadow-md">
                {uploading === 'logo' ? <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" /> : <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z" /><path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0z" /></svg>}
              </div>
            </label>
            <div><p className="text-sm font-medium text-gray-700">Λογότυπο</p><p className="text-xs text-gray-400">JPG, PNG, WebP</p></div>
          </div>
        </CardContent></Card>

        {/* Details */}
        <Card className="mb-6"><CardHeader><h2 className="text-lg font-semibold text-gray-900">Στοιχεία</h2></CardHeader>
          <CardContent className="space-y-4">
            <div><label className="mb-1.5 block text-sm font-medium text-gray-700">Όνομα *</label><Input value={editingBranch.name || ''} onChange={(e) => bc('name', e.target.value)} /></div>
            <div><label className="mb-1.5 block text-sm font-medium text-gray-700">Περιγραφή</label><Textarea value={editingBranch.description || ''} onChange={(e) => bc('description', e.target.value)} rows={3} /></div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div><label className="mb-1.5 block text-sm font-medium text-gray-700">Τύπος</label>
                <select value={editingBranch.business_type || 'other'} onChange={(e) => bc('business_type', e.target.value)} className={sel}>{Object.entries(BIZ_TYPES).map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></div>
              <div><label className="mb-1.5 block text-sm font-medium text-gray-700">Περιοχή</label>
                <Input value={editingBranch.region || ''} onChange={(e) => bc('region', e.target.value)} placeholder="π.χ. Καλαμαριά" /></div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div><label className="mb-1.5 block text-sm font-medium text-gray-700">Πόλη</label><Input value={editingBranch.city || ''} onChange={(e) => bc('city', e.target.value)} /></div>
              <div><label className="mb-1.5 block text-sm font-medium text-gray-700">Τηλέφωνο</label><Input value={editingBranch.phone || ''} onChange={(e) => bc('phone', e.target.value)} /></div>
            </div>
            <div><label className="mb-1.5 block text-sm font-medium text-gray-700">Διεύθυνση</label><Input value={editingBranch.address || ''} onChange={(e) => bc('address', e.target.value)} /></div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div><label className="mb-1.5 block text-sm font-medium text-gray-700">Τ.Κ.</label><Input value={(editingBranch as any).postal_code || ''} onChange={(e) => bc('postal_code', e.target.value.replace(/\D/g, '').substring(0, 5))} maxLength={5} /></div>
            </div>
            <div><label className="mb-1.5 block text-sm font-medium text-gray-700">Website</label><Input value={editingBranch.website || ''} onChange={(e) => bc('website', e.target.value)} placeholder="https://" /></div>
            <div><label className="mb-1.5 block text-sm font-medium text-gray-700">Google Business Profile</label><Input value={(editingBranch as any).google_business_url || ''} onChange={(e) => bc('google_business_url', e.target.value)} placeholder="https://g.page/..." /></div>
          </CardContent></Card>

        {/* Operating Hours */}
        <Card className="mb-6"><CardHeader><h2 className="text-lg font-semibold text-gray-900">🕐 Ωράριο Λειτουργίας</h2></CardHeader>
          <CardContent>
            <OperatingHoursEditor
              value={(editingBranch as any).operating_hours || ''}
              onChange={(val) => bc('operating_hours', val)}
            />
          </CardContent></Card>

        {/* Conditions - same 6 as job form */}
        <Card className="mb-6"><CardHeader><h2 className="text-lg font-semibold text-gray-900">Παροχές</h2></CardHeader>
          <CardContent>
            <div className="grid gap-3 sm:grid-cols-3">
              {[
                { key: 'staff_housing', label: '🏠 Διαμονή', desc: 'Στέγαση εργαζομένων' },
                { key: 'meals_provided', label: '🍽️ Σίτιση', desc: 'Παρέχεται φαγητό' },
                { key: 'transportation_assistance', label: '🚌 Μεταφορά', desc: 'Βοήθεια μετακίνησης' },
                { key: 'bonus_provided', label: '💰 Bonus', desc: 'Πριμ απόδοσης' },
                { key: 'insurance_provided', label: '⏰ Ευέλικτο ωράριο', desc: 'Ευελιξία στις ώρες' },
                { key: 'no_benefits', label: '❌ Χωρίς παροχές', desc: 'Δεν παρέχονται' },
              ].map((item) => {
                const on = !!(editingBranch as any)[item.key];
                return (
                  <div key={item.key} onClick={() => {
                    if (item.key === 'no_benefits') {
                      bc('staff_housing', 0); bc('meals_provided', 0); bc('transportation_assistance', 0);
                      bc('bonus_provided', 0); bc('insurance_provided', 0); bc('no_benefits', on ? 0 : 1);
                    } else {
                      bc(item.key, on ? 0 : 1); bc('no_benefits', 0);
                    }
                  }}
                    className={`cursor-pointer rounded-xl border-2 p-4 text-center transition-all ${on ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'}`}>
                    <p className="text-sm font-semibold">{item.label}</p>
                    <p className="mt-1 text-xs text-gray-500">{item.desc}</p>
                    <div className={`mt-2 inline-block rounded-full px-3 py-0.5 text-xs font-medium ${on ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-500'}`}>{on ? 'Ναι' : 'Όχι'}</div>
                  </div>
                );
              })}
            </div>
          </CardContent></Card>

        <div className="flex gap-3">
          <Button onClick={saveBranch} disabled={saving} size="lg">{saving ? 'Αποθήκευση...' : editingId ? '💾 Ενημέρωση' : '➕ Προσθήκη'}</Button>
          <Button variant="outline" size="lg" onClick={() => { setEditingBranch(null); setEditingId(null); setViewMode('list'); }}>Ακύρωση</Button>
        </div>
      </div>
    );
  }

  // ====== MAIN VIEW: BRANCHES LIST ======
  return (
    <div className="max-w-3xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Οι Επιχειρήσεις μου</h1>
        <p className="mt-1 text-gray-600">Διαχειρίσου τις επιχειρήσεις σου και πρόσθεσε νέες.</p>
      </div>

      {branches.length === 0 ? (
        <Card className="mb-6"><CardContent className="p-10 text-center">
          <p className="text-4xl mb-4">🏢</p>
          <h3 className="text-lg font-bold text-gray-900">Δεν έχεις προσθέσει επιχείρηση ακόμα</h3>
          <p className="mt-2 text-gray-500">Πρόσθεσε την πρώτη σου επιχείρηση για να ξεκινήσεις.</p>
        </CardContent></Card>
      ) : (
        <div className="space-y-4 mb-6">
          {branches.map((b) => (
            <Card key={b.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-5">
                <div className="flex items-start gap-4">
                  {b.logo_url ? (
                    <div className="h-14 w-14 rounded-xl bg-white border border-gray-100 flex-shrink-0 overflow-hidden">
                      <img src={b.logo_url} alt="" className="w-full h-full object-cover" />
                    </div>
                  ) : (
                    <div className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-xl bg-blue-100 text-xl font-bold text-blue-600">
                      {b.name?.[0]?.toUpperCase() || '🏢'}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-gray-900 truncate">{b.name}</h3>
                      <Badge variant="secondary" className="text-xs">{BIZ_TYPES[b.business_type] || b.business_type}</Badge>
                    </div>
                    {b.description && <p className="mt-1 text-sm text-gray-500 line-clamp-1">{b.description}</p>}
                    <div className="mt-2 flex flex-wrap gap-3 text-xs text-gray-400">
                      {(b.address || b.city) && <span>📍 {[b.address, b.area, b.city, b.postal_code].filter(Boolean).join(', ')}</span>}
                      {b.staff_housing ? <span className="text-emerald-600">🏠 Διαμονή</span> : null}
                      {b.meals_provided ? <span className="text-emerald-600">🍽️ Γεύματα</span> : null}
                      {b.transportation_assistance ? <span className="text-emerald-600">🚌 Μεταφορά</span> : null}
                      {b.bonus_provided ? <span className="text-emerald-600">💰 Bonus</span> : null}
                      {b.insurance_provided ? <span className="text-emerald-600">⏰ Ευέλικτο ωράριο</span> : null}
                    </div>
                  </div>
                  <div className="flex gap-2 flex-shrink-0">
                    {/* Preview */}
                    <button onClick={() => { setPreviewBranch(b); setViewMode('preview'); }} title="Προεπισκόπηση"
                      className="rounded-lg border border-gray-200 p-2 hover:bg-gray-50 text-gray-500 hover:text-emerald-600">
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                    </button>
                    {/* Edit */}
                    <button onClick={() => { setEditingBranch({ ...b }); setEditingId(b.id); setViewMode('edit'); }} title="Επεξεργασία"
                      className="rounded-lg border border-gray-200 p-2 hover:bg-gray-50 text-gray-500 hover:text-blue-600">
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" /></svg>
                    </button>
                    {/* Delete */}
                    <button onClick={() => deleteBranch(b.id)} title="Διαγραφή"
                      className="rounded-lg border border-gray-200 p-2 hover:bg-red-50 text-gray-500 hover:text-red-600">
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" /></svg>
                    </button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Button onClick={() => { setEditingBranch({ ...EMPTY_BRANCH }); setEditingId(null); setViewMode('edit'); }} size="lg" className="w-full">
        ➕ Πρόσθεσε Επιχείρηση
      </Button>

      {branches.length > 0 && (
        <p className="mt-4 text-center text-xs text-gray-400">
          {branches.length}/10 επιχειρήσεις
        </p>
      )}
    </div>
  );
}
