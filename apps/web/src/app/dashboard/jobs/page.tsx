'use client';

import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { useAuth } from '@/lib/auth-context';
import { api } from '@/lib/api';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Spinner } from '@/components/ui/spinner';
import { EmptyState } from '@/components/ui/empty-state';
import { WORKER_JOB_ROLE_LABELS_EL } from '@staffnow/config';

interface Position {
  role: string;
  description: string;
  salary_min: string;
  salary_max: string;
  salary_type: string;
  positions_count: string;
}

const EMPTY_POS: Position = { role: '', description: '', salary_min: '', salary_max: '', salary_type: 'monthly', positions_count: '1' };

export default function JobsPage() {
  const { user } = useAuth();
  const [jobs, setJobs] = useState<any[]>([]);
  const [branches, setBranches] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);

  // Form state
  const [selectedBranch, setSelectedBranch] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [employmentType, setEmploymentType] = useState('seasonal');
  const [positions, setPositions] = useState<Position[]>([{ ...EMPTY_POS }]);

  const fetchData = useCallback(async () => {
    try {
      const [jobsRes, branchesRes] = await Promise.all([
        api.jobs.list() as any,
        (api as any).branches.list() as any,
      ]);
      setJobs(Array.isArray(jobsRes?.data) ? jobsRes.data : []);
      setBranches(Array.isArray(branchesRes?.data) ? branchesRes.data : []);
    } catch {} finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const resetForm = () => {
    setTitle(''); setDescription(''); setEmploymentType('seasonal');
    setSelectedBranch(''); setPositions([{ ...EMPTY_POS }]);
  };

  const updatePosition = (idx: number, field: keyof Position, value: string) => {
    setPositions((prev) => prev.map((p, i) => i === idx ? { ...p, [field]: value } : p));
  };

  const addPosition = () => {
    if (positions.length >= 10) { toast.error('Μέχρι 10 ειδικότητες'); return; }
    setPositions((prev) => [...prev, { ...EMPTY_POS }]);
  };

  const removePosition = (idx: number) => {
    if (positions.length <= 1) return;
    setPositions((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleCreate = async () => {
    if (!title) { toast.error('Συμπλήρωσε τίτλο αγγελίας'); return; }
    if (!selectedBranch && branches.length > 0) { toast.error('Επέλεξε επιχείρηση'); return; }
    if (!positions[0].role) { toast.error('Επέλεξε τουλάχιστον μία ειδικότητα'); return; }

    setSaving(true);
    try {
      await api.jobs.create({
        title,
        description: description || positions.map((p) => `${WORKER_JOB_ROLE_LABELS_EL[p.role] || p.role}: ${p.description || ''}`).join('. '),
        employment_type: employmentType,
        branch_id: selectedBranch || undefined,
        salary_min: positions[0].salary_min ? parseFloat(positions[0].salary_min) : undefined,
        salary_max: positions[0].salary_max ? parseFloat(positions[0].salary_max) : undefined,
        roles: positions.map((p) => p.role).filter(Boolean),
      });
      toast.success('Η αγγελία δημοσιεύτηκε!');
      setShowForm(false);
      resetForm();
      await fetchData();
    } catch { toast.error('Αποτυχία δημιουργίας.'); } finally { setSaving(false); }
  };

  if (user?.role === 'worker') return (
    <div><h1 className="mb-4 text-2xl font-bold text-gray-900">Αγγελίες</h1><p className="text-gray-600">Σελίδα μόνο για επιχειρήσεις.</p></div>
  );

  if (loading) return <div className="flex justify-center py-20"><Spinner className="h-8 w-8" /></div>;

  const empLabels: Record<string, string> = { full_time: 'Πλήρης', part_time: 'Μερική', seasonal: 'Εποχιακή', freelancer: 'Freelancer' };
  const statusLabels: Record<string, string> = { draft: 'Πρόχειρη', published: 'Ενεργή', archived: 'Αρχείο', filled: 'Πληρώθηκε' };

  return (
    <div>
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Αγγελίες</h1>
          <p className="mt-1 text-gray-600">{jobs.length > 0 ? `${jobs.length} αγγελίες` : 'Δεν έχεις αγγελίες'}</p>
        </div>
        <Button onClick={() => { resetForm(); setShowForm(!showForm); }}>
          {showForm ? 'Ακύρωση' : '+ Νέα Αγγελία'}
        </Button>
      </div>

      {/* ====== CREATE FORM ====== */}
      {showForm && (
        <Card className="mb-8 border-blue-200">
          <CardContent className="p-6 space-y-5">
            <h2 className="text-lg font-bold text-gray-900">📝 Νέα Αγγελία</h2>

            {/* Branch selection */}
            {branches.length > 0 && (
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">Για ποια επιχείρηση; *</label>
                <select value={selectedBranch} onChange={(e) => setSelectedBranch(e.target.value)}
                  className="flex h-10 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm">
                  <option value="">Επέλεξε επιχείρηση</option>
                  {branches.map((b: any) => <option key={b.id} value={b.id}>{b.name} {b.city ? `(${b.city})` : ''}</option>)}
                </select>
              </div>
            )}

            {branches.length === 0 && (
              <div className="rounded-lg bg-amber-50 border border-amber-200 p-4 text-sm text-amber-800">
                ⚠️ Πρόσθεσε πρώτα μια επιχείρηση στο <a href="/dashboard/profile" className="font-semibold underline">Προφίλ</a> για να δημοσιεύσεις αγγελία.
              </div>
            )}

            <div><label className="mb-1.5 block text-sm font-medium text-gray-700">Τίτλος Αγγελίας *</label>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="π.χ. Ζητείται Προσωπικό για Σεζόν 2026" /></div>

            <div><label className="mb-1.5 block text-sm font-medium text-gray-700">Γενική Περιγραφή</label>
              <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} placeholder="Περίγραψε τη γενική ανάγκη..." /></div>

            <div><label className="mb-1.5 block text-sm font-medium text-gray-700">Τύπος Εργασίας</label>
              <select value={employmentType} onChange={(e) => setEmploymentType(e.target.value)}
                className="flex h-10 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm">
                <option value="seasonal">☀️ Σεζόν</option><option value="full_time">📅 Πλήρης</option>
                <option value="part_time">⏰ Μερική</option><option value="freelancer">💼 Freelancer</option>
              </select></div>

            {/* ====== POSITIONS ====== */}
            <div>
              <label className="mb-3 block text-sm font-medium text-gray-700">Ειδικότητες που ψάχνεις *</label>
              <div className="space-y-4">
                {positions.map((pos, idx) => (
                  <div key={idx} className="rounded-xl border border-gray-200 bg-gray-50 p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-semibold text-gray-700">Ειδικότητα #{idx + 1}</span>
                      {positions.length > 1 && (
                        <button onClick={() => removePosition(idx)} className="text-xs text-red-500 hover:text-red-700">✕ Αφαίρεση</button>
                      )}
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div><label className="mb-1 block text-xs font-medium text-gray-600">Ρόλος *</label>
                        <select value={pos.role} onChange={(e) => updatePosition(idx, 'role', e.target.value)}
                          className="flex h-9 w-full rounded-lg border border-gray-300 bg-white px-2 py-1.5 text-sm">
                          <option value="">Επέλεξε</option>
                          {Object.entries(WORKER_JOB_ROLE_LABELS_EL).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                        </select></div>
                      <div><label className="mb-1 block text-xs font-medium text-gray-600">Άτομα</label>
                        <Input type="number" min="1" max="50" value={pos.positions_count} onChange={(e) => updatePosition(idx, 'positions_count', e.target.value)} className="h-9" /></div>
                    </div>
                    <div><label className="mb-1 block text-xs font-medium text-gray-600">Χαρακτηριστικά / Απαιτήσεις</label>
                      <Textarea value={pos.description} onChange={(e) => updatePosition(idx, 'description', e.target.value)} rows={2} placeholder="π.χ. Εμπειρία 2+ χρόνια, Αγγλικά..." className="text-sm" /></div>
                    <div className="grid gap-3 sm:grid-cols-3">
                      <div><label className="mb-1 block text-xs font-medium text-gray-600">Μισθός από (€)</label>
                        <Input type="number" min="0" value={pos.salary_min} onChange={(e) => updatePosition(idx, 'salary_min', e.target.value)} className="h-9" placeholder="1200" /></div>
                      <div><label className="mb-1 block text-xs font-medium text-gray-600">Μισθός έως (€)</label>
                        <Input type="number" min="0" value={pos.salary_max} onChange={(e) => updatePosition(idx, 'salary_max', e.target.value)} className="h-9" placeholder="1800" /></div>
                      <div><label className="mb-1 block text-xs font-medium text-gray-600">Τύπος</label>
                        <select value={pos.salary_type} onChange={(e) => updatePosition(idx, 'salary_type', e.target.value)}
                          className="flex h-9 w-full rounded-lg border border-gray-300 bg-white px-2 py-1.5 text-sm">
                          <option value="monthly">€/μήνα</option><option value="hourly">€/ώρα</option><option value="negotiable">Συζητήσιμο</option>
                        </select></div>
                    </div>
                  </div>
                ))}
              </div>
              <button onClick={addPosition} className="mt-3 flex w-full items-center justify-center gap-2 rounded-lg border-2 border-dashed border-gray-300 py-3 text-sm font-medium text-gray-500 hover:border-blue-400 hover:text-blue-600 transition-colors">
                ➕ Πρόσθεσε κι άλλη ειδικότητα
              </button>
            </div>

            <Button onClick={handleCreate} disabled={saving} size="lg" className="w-full">
              {saving ? 'Δημοσίευση...' : '🚀 Δημοσίευση Αγγελίας'}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* ====== JOB LIST ====== */}
      {jobs.length === 0 && !showForm ? (
        <EmptyState title="Δεν έχεις αγγελίες" description="Δημιούργησε την πρώτη σου αγγελία." />
      ) : (
        <div className="space-y-4">
          {jobs.map((job: any) => (
            <Card key={job.id} className="hover:shadow-md transition-shadow">
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
                    <div className="mt-2 flex flex-wrap gap-3 text-sm text-gray-400">
                      {job.city && <span>📍 {job.city}{job.region ? `, ${job.region}` : ''}</span>}
                      <span>📋 {empLabels[job.employment_type] || job.employment_type}</span>
                      {job.salary_min && job.salary_max && <span>💰 {job.salary_min}-{job.salary_max}€</span>}
                      {job.roles?.length > 0 && <span>👥 {job.roles.map((r: string) => WORKER_JOB_ROLE_LABELS_EL[r] || r).join(', ')}</span>}
                    </div>
                  </div>
                  {/* Edit button */}
                  <a href={`/dashboard/jobs/edit?id=${job.id}`} className="flex-shrink-0 rounded-lg border border-gray-200 p-2 hover:bg-gray-50 text-gray-400 hover:text-blue-600 transition-colors" title="Επεξεργασία">
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" /></svg>
                  </a>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
