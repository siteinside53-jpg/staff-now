'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { api } from '@/lib/api';
import { toast } from 'sonner';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Spinner } from '@/components/ui/spinner';
import { WORKER_JOB_ROLE_LABELS_EL, REGIONS_GREECE } from '@staffnow/config';

function EditJobInner() {
  const searchParams = useSearchParams();
  const jobId = searchParams.get('id');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [city, setCity] = useState('');
  const [region, setRegion] = useState('');
  const [employmentType, setEmploymentType] = useState('seasonal');
  const [salaryMin, setSalaryMin] = useState('');
  const [salaryMax, setSalaryMax] = useState('');
  const [status, setStatus] = useState('published');
  const [roles, setRoles] = useState<string[]>([]);

  useEffect(() => {
    if (!jobId) return;
    async function load() {
      try {
        const res = await api.jobs.getById(jobId!) as any;
        if (res.success && res.data) {
          const j = res.data?.job || res.data;
          setTitle(j.title || '');
          setDescription(j.description || '');
          setCity(j.city || '');
          setRegion(j.region || '');
          setEmploymentType(j.employment_type || 'seasonal');
          setSalaryMin(j.salary_min?.toString() || '');
          setSalaryMax(j.salary_max?.toString() || '');
          setStatus(j.status || 'published');
          // Load roles from job data
          if (j.roles && Array.isArray(j.roles)) setRoles(j.roles);
        }
      } catch {} finally { setLoading(false); }
    }
    load();
  }, [jobId]);

  const toggleRole = (role: string) => {
    setRoles((prev) => prev.includes(role) ? prev.filter((r) => r !== role) : prev.length >= 10 ? (toast.error('Μέχρι 10 ειδικότητες'), prev) : [...prev, role]);
  };

  const handleSave = async () => {
    if (!title) { toast.error('Συμπλήρωσε τον τίτλο'); return; }
    setSaving(true);
    try {
      await api.jobs.update(jobId!, {
        title,
        description,
        city: city || undefined,
        region: region || undefined,
        employment_type: employmentType,
        salary_min: salaryMin ? parseFloat(salaryMin) : undefined,
        salary_max: salaryMax ? parseFloat(salaryMax) : undefined,
      });
      toast.success('Η αγγελία ενημερώθηκε!');
    } catch { toast.error('Αποτυχία αποθήκευσης'); } finally { setSaving(false); }
  };

  const handleStatusChange = async (newStatus: string) => {
    try {
      if (newStatus === 'published') {
        await api.jobs.publish(jobId!);
        setStatus('published');
        toast.success('Η αγγελία δημοσιεύτηκε!');
      } else if (newStatus === 'archived') {
        await api.jobs.archive(jobId!);
        setStatus('archived');
        toast.success('Η αγγελία αρχειοθετήθηκε');
      }
    } catch { toast.error('Αποτυχία αλλαγής κατάστασης'); }
  };

  if (loading) return <div className="flex justify-center py-20"><Spinner className="h-8 w-8" /></div>;

  const statusLabels: Record<string, string> = { draft: 'Πρόχειρη', published: 'Ενεργή', archived: 'Αρχείο', filled: 'Πληρώθηκε' };
  const statusColors: Record<string, string> = { draft: 'bg-gray-100 text-gray-700', published: 'bg-emerald-100 text-emerald-700', archived: 'bg-amber-100 text-amber-700', filled: 'bg-blue-100 text-blue-700' };
  const sel = "flex h-10 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-blue-500";

  return (
    <div className="max-w-2xl">
      <div className="mb-6 flex items-center gap-4">
        <a href="/dashboard/jobs" className="rounded-lg border border-gray-300 p-2 hover:bg-gray-50">
          <svg className="h-5 w-5 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" /></svg>
        </a>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-gray-900">Επεξεργασία Αγγελίας</h1>
          <div className="mt-1 flex items-center gap-2">
            <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${statusColors[status] || 'bg-gray-100 text-gray-700'}`}>
              {statusLabels[status] || status}
            </span>
          </div>
        </div>
      </div>

      <Card className="mb-6">
        <CardContent className="p-6 space-y-4">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700">Τίτλος *</label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="π.χ. Σερβιτόρος/α Full Time" />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700">Περιγραφή</label>
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={5} placeholder="Περίγραψε τη θέση..." />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">Πόλη</label>
              <Input value={city} onChange={(e) => setCity(e.target.value)} placeholder="π.χ. Θεσσαλονίκη" />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">Περιοχή</label>
              <select value={region} onChange={(e) => setRegion(e.target.value)} className={sel}>
                <option value="">Επέλεξε</option>
                {REGIONS_GREECE.map((r) => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700">Τύπος Εργασίας</label>
            <select value={employmentType} onChange={(e) => setEmploymentType(e.target.value)} className={sel}>
              <option value="seasonal">☀️ Σεζόν</option>
              <option value="full_time">📅 Πλήρης</option>
              <option value="part_time">⏰ Μερική</option>
              <option value="freelancer">💼 Freelancer</option>
            </select>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">Μισθός από (€)</label>
              <Input type="number" min="0" value={salaryMin} onChange={(e) => setSalaryMin(e.target.value)} placeholder="1200" />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">Μισθός έως (€)</label>
              <Input type="number" min="0" value={salaryMax} onChange={(e) => setSalaryMax(e.target.value)} placeholder="1800" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Ειδικότητες */}
      <Card className="mb-6">
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-3">
            <label className="text-sm font-medium text-gray-700">Ειδικότητες</label>
            <span className="text-xs text-gray-400">{roles.length} επιλεγμένες</span>
          </div>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {Object.entries(WORKER_JOB_ROLE_LABELS_EL).map(([value, label]) => {
              const on = roles.includes(value);
              return (
                <label key={value} className={`flex items-center gap-2 rounded-lg border p-2.5 cursor-pointer transition-all text-sm ${on ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-gray-200 hover:border-gray-300 text-gray-700'}`}>
                  <input type="checkbox" checked={on} onChange={() => toggleRole(value)} className="sr-only" />
                  <div className={`flex h-4 w-4 items-center justify-center rounded border flex-shrink-0 ${on ? 'border-blue-500 bg-blue-500 text-white' : 'border-gray-300'}`}>
                    {on && <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>}
                  </div>
                  {label}
                </label>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex flex-wrap gap-3">
        <Button onClick={handleSave} disabled={saving} size="lg">
          {saving ? 'Αποθήκευση...' : '💾 Αποθήκευση'}
        </Button>
        {status === 'draft' && (
          <Button onClick={() => handleStatusChange('published')} variant="outline" size="lg" className="text-emerald-600 border-emerald-300 hover:bg-emerald-50">
            🚀 Δημοσίευση
          </Button>
        )}
        {status === 'published' && (
          <Button onClick={() => handleStatusChange('archived')} variant="outline" size="lg" className="text-amber-600 border-amber-300 hover:bg-amber-50">
            📦 Αρχειοθέτηση
          </Button>
        )}
        {status === 'archived' && (
          <Button onClick={() => handleStatusChange('published')} variant="outline" size="lg" className="text-emerald-600 border-emerald-300 hover:bg-emerald-50">
            🚀 Επαναδημοσίευση
          </Button>
        )}
        <a href="/dashboard/jobs" className="inline-flex items-center justify-center rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50">
          ← Πίσω
        </a>
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
