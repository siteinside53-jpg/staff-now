'use client';

import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { useAuth } from '@/lib/auth-context';
import { api } from '@/lib/api';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Spinner } from '@/components/ui/spinner';
import { EmptyState } from '@/components/ui/empty-state';

interface Job {
  id: string;
  title: string;
  description: string;
  region?: string;
  city?: string;
  employment_type: string;
  salary_min?: number;
  salary_max?: number;
  status: string;
  created_at: string;
}

export default function JobsPage() {
  const { user } = useAuth();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);

  // Form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [city, setCity] = useState('');
  const [region, setRegion] = useState('');
  const [employmentType, setEmploymentType] = useState('seasonal');
  const [salaryMin, setSalaryMin] = useState('');
  const [salaryMax, setSalaryMax] = useState('');

  const fetchJobs = useCallback(async () => {
    try {
      const res = await api.jobs.list() as any;
      const items = res?.data?.items || res?.data || [];
      setJobs(Array.isArray(items) ? items : []);
    } catch {
      setJobs([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchJobs();
  }, [fetchJobs]);

  const resetForm = () => {
    setTitle(''); setDescription(''); setCity(''); setRegion('');
    setEmploymentType('seasonal'); setSalaryMin(''); setSalaryMax('');
  };

  const handleCreate = async () => {
    if (!title || !description) {
      toast.error('Συμπλήρωσε τίτλο και περιγραφή.');
      return;
    }
    setSaving(true);
    try {
      await api.jobs.create({
        title,
        description,
        city,
        region,
        employment_type: employmentType,
        salary_min: salaryMin ? parseFloat(salaryMin) : undefined,
        salary_max: salaryMax ? parseFloat(salaryMax) : undefined,
      });
      toast.success('Η αγγελία δημοσιεύτηκε!');
      setShowForm(false);
      resetForm();
      await fetchJobs();
    } catch {
      toast.error('Αποτυχία δημιουργίας. Δοκίμασε ξανά.');
    } finally {
      setSaving(false);
    }
  };

  if (user?.role === 'worker') {
    return (
      <div>
        <h1 className="mb-4 text-2xl font-bold text-gray-900">Αγγελίες</h1>
        <p className="text-gray-600">Αυτή η σελίδα είναι διαθέσιμη μόνο για επιχειρήσεις.</p>
      </div>
    );
  }

  if (loading) {
    return <div className="flex justify-center py-20"><Spinner className="h-8 w-8" /></div>;
  }

  const empTypeLabels: Record<string, string> = {
    full_time: 'Πλήρης', part_time: 'Μερική', seasonal: 'Εποχιακή', freelancer: 'Freelancer',
  };

  const statusLabels: Record<string, string> = {
    draft: 'Πρόχειρη', published: 'Ενεργή', archived: 'Αρχειοθετημένη', filled: 'Πληρώθηκε',
  };

  return (
    <div>
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Οι Αγγελίες μου</h1>
          <p className="mt-1 text-gray-600">
            {jobs.length > 0 ? `${jobs.length} αγγελίες` : 'Δεν έχεις αγγελίες ακόμα'}
          </p>
        </div>
        <Button onClick={() => { resetForm(); setShowForm(!showForm); }}>
          {showForm ? 'Ακύρωση' : '+ Νέα Αγγελία'}
        </Button>
      </div>

      {/* Create Form */}
      {showForm && (
        <Card className="mb-8">
          <CardContent className="p-6 space-y-4">
            <h2 className="text-lg font-semibold text-gray-900">Νέα Αγγελία</h2>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">Τίτλος *</label>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="π.χ. Σερβιτόρος/α Full Time" />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">Περιγραφή *</label>
              <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={4} placeholder="Περίγραψε τη θέση..." />
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
            <div className="grid gap-4 sm:grid-cols-3">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">Τύπος</label>
                <select value={employmentType} onChange={(e) => setEmploymentType(e.target.value)}
                  className="flex h-10 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm">
                  <option value="seasonal">☀️ Σεζόν</option>
                  <option value="full_time">📅 Πλήρης</option>
                  <option value="part_time">⏰ Μερική</option>
                  <option value="freelancer">💼 Freelancer</option>
                </select>
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">Μισθός από (€)</label>
                <Input type="number" value={salaryMin} onChange={(e) => setSalaryMin(e.target.value)} placeholder="1200" />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">Μισθός έως (€)</label>
                <Input type="number" value={salaryMax} onChange={(e) => setSalaryMax(e.target.value)} placeholder="1800" />
              </div>
            </div>
            <Button onClick={handleCreate} disabled={saving}>
              {saving ? 'Δημοσίευση...' : 'Δημοσίευση Αγγελίας'}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Job List */}
      {jobs.length === 0 ? (
        <EmptyState title="Δεν έχεις αγγελίες ακόμα" description="Δημιούργησε την πρώτη σου αγγελία για να βρεις προσωπικό." />
      ) : (
        <div className="space-y-4">
          {jobs.map((job) => (
            <Card key={job.id} className="transition-shadow hover:shadow-md">
              <CardContent className="p-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <h3 className="text-lg font-semibold text-gray-900">{job.title}</h3>
                      <Badge variant={job.status === 'published' ? 'default' : 'secondary'}>
                        {statusLabels[job.status] || job.status}
                      </Badge>
                    </div>
                    <p className="mt-1 text-sm text-gray-500 line-clamp-2">{job.description}</p>
                    <div className="mt-2 flex flex-wrap gap-3 text-sm text-gray-500">
                      {job.city && <span>📍 {job.city}{job.region ? `, ${job.region}` : ''}</span>}
                      <span>📋 {empTypeLabels[job.employment_type] || job.employment_type}</span>
                      {job.salary_min && job.salary_max && <span>💰 {job.salary_min}-{job.salary_max}€</span>}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
