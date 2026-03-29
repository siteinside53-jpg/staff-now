'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { api } from '@/lib/api';
import { toast } from 'sonner';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Spinner } from '@/components/ui/spinner';
import { WORKER_JOB_ROLE_LABELS_EL } from '@staffnow/config';

function EditJobInner() {
  const { user } = useAuth();
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
        }
      } catch {} finally { setLoading(false); }
    }
    load();
  }, [jobId]);

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
            <span className="text-xs text-gray-400">ID: {jobId?.substring(0, 12)}...</span>
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
              <Input value={city} onChange={(e) => setCity(e.target.value)} placeholder="π.χ. Μύκονος" />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">Περιοχή</label>
              <Input value={region} onChange={(e) => setRegion(e.target.value)} placeholder="π.χ. Κυκλάδες" />
            </div>
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700">Τύπος Εργασίας</label>
            <select value={employmentType} onChange={(e) => setEmploymentType(e.target.value)}
              className="flex h-10 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm">
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
