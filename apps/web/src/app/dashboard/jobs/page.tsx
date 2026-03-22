'use client';

import { useCallback, useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { useAuth } from '@/lib/auth-context';
import { api } from '@/lib/api';
import {
  REGIONS_GREECE,
  WORKER_JOB_ROLE_LABELS_EL,
} from '@staffnow/config';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Modal } from '@/components/ui/modal';
import { Spinner } from '@/components/ui/spinner';
import { EmptyState } from '@/components/ui/empty-state';

interface Job {
  id: string;
  title: string;
  role: string;
  location: string;
  description: string;
  salary?: string;
  employmentType: string;
  status: 'active' | 'paused' | 'closed';
  applicants: number;
  createdAt: string;
}

interface JobForm {
  title: string;
  role: string;
  location: string;
  description: string;
  salary: string;
  employmentType: string;
}

export default function JobsPage() {
  const { profile } = useAuth();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingJob, setEditingJob] = useState<Job | null>(null);
  const [saving, setSaving] = useState(false);

  const form = useForm<JobForm>();

  const fetchJobs = useCallback(async () => {
    try {
      const res = await api.jobs.list({ limit: 50 });
      setJobs(res.jobs || []);
    } catch {
      setJobs([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchJobs();
  }, [fetchJobs]);

  const openCreate = () => {
    form.reset({
      title: '',
      role: '',
      location: '',
      description: '',
      salary: '',
      employmentType: '',
    });
    setEditingJob(null);
    setShowCreateModal(true);
  };

  const openEdit = (job: Job) => {
    form.reset({
      title: job.title,
      role: job.role,
      location: job.location,
      description: job.description,
      salary: job.salary || '',
      employmentType: job.employmentType,
    });
    setEditingJob(job);
    setShowCreateModal(true);
  };

  const onSubmit = async (data: JobForm) => {
    setSaving(true);
    try {
      if (editingJob) {
        await api.jobs.update(editingJob.id, data);
        toast.success('Η αγγελία ενημερώθηκε!');
      } else {
        await api.jobs.create(data);
        toast.success('Η αγγελία δημοσιεύτηκε!');
      }
      setShowCreateModal(false);
      setEditingJob(null);
      await fetchJobs();
    } catch {
      toast.error('Κάτι πήγε στραβά. Δοκίμασε ξανά.');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleStatus = async (job: Job) => {
    try {
      const newStatus = job.status === 'active' ? 'paused' : 'active';
      await api.jobs.update(job.id, { status: newStatus });
      toast.success(
        newStatus === 'active'
          ? 'Η αγγελία ενεργοποιήθηκε!'
          : 'Η αγγελία παύθηκε.'
      );
      await fetchJobs();
    } catch {
      toast.error('Αποτυχία αλλαγής κατάστασης.');
    }
  };

  const handleDelete = async (jobId: string) => {
    if (!confirm('Είσαι σίγουρος ότι θέλεις να διαγράψεις αυτή την αγγελία;')) {
      return;
    }
    try {
      await api.jobs.delete(jobId);
      toast.success('Η αγγελία διαγράφηκε.');
      await fetchJobs();
    } catch {
      toast.error('Αποτυχία διαγραφής.');
    }
  };

  // Redirect workers away
  if (profile?.role === 'worker') {
    return (
      <div>
        <h1 className="mb-4 text-2xl font-bold text-gray-900">Αγγελίες</h1>
        <p className="text-gray-600">
          Αυτή η σελίδα είναι διαθέσιμη μόνο για επιχειρήσεις.
        </p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Spinner className="h-8 w-8" />
      </div>
    );
  }

  const statusLabels: Record<string, string> = {
    active: 'Ενεργή',
    paused: 'Σε παύση',
    closed: 'Κλειστή',
  };

  const statusColors: Record<string, string> = {
    active: 'default',
    paused: 'secondary',
    closed: 'secondary',
  };

  return (
    <div>
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Οι Αγγελίες μου</h1>
          <p className="mt-1 text-gray-600">
            {jobs.length > 0
              ? `${jobs.length} ${jobs.length === 1 ? 'αγγελία' : 'αγγελίες'}`
              : 'Δεν έχεις αγγελίες ακόμα'}
          </p>
        </div>
        <Button onClick={openCreate}>
          <svg className="mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          Νέα Αγγελία
        </Button>
      </div>

      {jobs.length === 0 ? (
        <EmptyState
          title="Δεν έχεις αγγελίες ακόμα"
          description="Δημιούργησε την πρώτη σου αγγελία για να βρεις προσωπικό."
        />
      ) : (
        <div className="space-y-4">
          {jobs.map((job) => (
            <Card key={job.id} className="transition-shadow hover:shadow-md">
              <CardContent className="p-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <h3 className="text-lg font-semibold text-gray-900">
                        {job.title}
                      </h3>
                      <Badge
                        variant={
                          statusColors[job.status] as
                            | 'default'
                            | 'secondary'
                        }
                      >
                        {statusLabels[job.status] || job.status}
                      </Badge>
                    </div>
                    <div className="mt-2 flex flex-wrap gap-3 text-sm text-gray-500">
                      <span className="flex items-center gap-1">
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 14.15v4.25c0 1.094-.787 2.036-1.872 2.18-2.087.277-4.216.42-6.378.42s-4.291-.143-6.378-.42c-1.085-.144-1.872-1.086-1.872-2.18v-4.25" />
                        </svg>
                        {WORKER_JOB_ROLE_LABELS_EL[
                          job.role as keyof typeof WORKER_JOB_ROLE_LABELS_EL
                        ] || job.role}
                      </span>
                      <span className="flex items-center gap-1">
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
                          <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1 1 15 0Z" />
                        </svg>
                        {job.location}
                      </span>
                      {job.salary && (
                        <span className="flex items-center gap-1">
                          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M14.25 7.756a4.5 4.5 0 1 0 0 8.488M7.5 10.5h5.25m-5.25 3h5.25M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                          </svg>
                          {job.salary}
                        </span>
                      )}
                      <span>{job.applicants} υποψήφιοι</span>
                    </div>
                    <p className="mt-2 text-sm text-gray-600 line-clamp-2">
                      {job.description}
                    </p>
                    <p className="mt-2 text-xs text-gray-400">
                      Δημιουργήθηκε:{' '}
                      {new Date(job.createdAt).toLocaleDateString('el-GR', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </p>
                  </div>
                  <div className="flex flex-shrink-0 flex-col gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => openEdit(job)}
                    >
                      Επεξεργασία
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleToggleStatus(job)}
                    >
                      {job.status === 'active' ? 'Παύση' : 'Ενεργοποίηση'}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="border-red-200 text-red-600 hover:bg-red-50"
                      onClick={() => handleDelete(job.id)}
                    >
                      Διαγραφή
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create/Edit Modal */}
      <Modal
        open={showCreateModal}
        onClose={() => {
          setShowCreateModal(false);
          setEditingJob(null);
        }}
      >
        <div className="p-6">
          <h2 className="text-lg font-bold text-gray-900">
            {editingJob ? 'Επεξεργασία Αγγελίας' : 'Νέα Αγγελία'}
          </h2>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="mt-6 space-y-4"
          >
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">
                Τίτλος Αγγελίας
              </label>
              <Input
                placeholder="π.χ. Σερβιτόρος/α πλήρους απασχόλησης"
                {...form.register('title', { required: true })}
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">
                  Ρόλος
                </label>
                <Select {...form.register('role', { required: true })}>
                  <option value="">Επέλεξε ρόλο</option>
                  {Object.entries(WORKER_JOB_ROLE_LABELS_EL).map(
                    ([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    )
                  )}
                </Select>
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">
                  Τοποθεσία
                </label>
                <Select {...form.register('location', { required: true })}>
                  <option value="">Επέλεξε τοποθεσία</option>
                  {REGIONS_GREECE.map((region) => (
                    <option key={region} value={region}>
                      {region}
                    </option>
                  ))}
                </Select>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">
                  Μισθός
                </label>
                <Input
                  placeholder="π.χ. 900-1200€/μήνα"
                  {...form.register('salary')}
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">
                  Τύπος Απασχόλησης
                </label>
                <Select {...form.register('employmentType', { required: true })}>
                  <option value="">Επέλεξε τύπο</option>
                  <option value="full-time">Πλήρης Απασχόληση</option>
                  <option value="part-time">Μερική Απασχόληση</option>
                  <option value="seasonal">Εποχιακή</option>
                  <option value="temporary">Προσωρινή</option>
                </Select>
              </div>
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">
                Περιγραφή Θέσης
              </label>
              <Textarea
                rows={5}
                placeholder="Περίγραψε τα καθήκοντα, τις απαιτήσεις και τα προσόντα..."
                {...form.register('description', { required: true })}
              />
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setShowCreateModal(false);
                  setEditingJob(null);
                }}
              >
                Ακύρωση
              </Button>
              <Button type="submit" disabled={saving}>
                {saving
                  ? 'Αποθήκευση...'
                  : editingJob
                    ? 'Ενημέρωση'
                    : 'Δημοσίευση'}
              </Button>
            </div>
          </form>
        </div>
      </Modal>
    </div>
  );
}
