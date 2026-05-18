'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { jobs as jobsApi, ApiError } from '../../_lib/api';
import { Avatar, EmptyState, ErrorState, FullPageSpinner, Pill, Spinner } from '../../_lib/ui';
import { useUser } from '../../_lib/use-user';
import { formatSalary, employmentLabel, timeAgo, roleLabel } from '../../_lib/format';
import { haptic } from '../../_lib/haptics';

interface JobRow {
  id: string;
  title: string;
  status: 'published' | 'draft' | 'archived' | string;
  city?: string;
  region?: string;
  salary_min?: number | null;
  salary_max?: number | null;
  salary_type?: string;
  employment_type?: string;
  created_at?: string;
  applicants_count?: number;
}

export default function JobsV6() {
  const router = useRouter();
  const { user, loading } = useUser();
  const [jobs, setJobs] = useState<JobRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<JobRow | null>(null);

  const load = async () => {
    setError(null);
    try {
      const res = await jobsApi.list({ limit: 50 });
      setJobs((res.items as JobRow[]) || []);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Σφάλμα');
    }
  };

  useEffect(() => {
    if (user) load();
  }, [user]);

  if (loading || !user) return <FullPageSpinner />;

  if (user.role !== 'business') {
    return (
      <EmptyState
        icon="🔒"
        title="Διαθέσιμο μόνο για επιχειρήσεις"
        description="Αυτή η ενότητα είναι για τη διαχείριση αγγελιών."
      />
    );
  }

  if (error) return <ErrorState message={error} onRetry={load} />;
  if (jobs === null) return <FullPageSpinner />;

  return (
    <>
      <div className="px-4 pt-4 pb-6 space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-black text-gray-900">Αγγελίες μου</h1>
          <button
            onClick={() => {
              setEditing(null);
              setShowForm(true);
              haptic('light');
            }}
            className="rounded-full bg-blue-600 px-4 py-2 text-sm font-bold text-white shadow active:scale-95"
          >
            + Νέα
          </button>
        </div>

        {jobs.length === 0 ? (
          <EmptyState
            icon="📝"
            title="Δεν έχεις αγγελίες"
            description="Δημιούργησε την πρώτη σου αγγελία και άρχισε να δέχεσαι αιτήσεις."
            action={
              <button
                onClick={() => {
                  setEditing(null);
                  setShowForm(true);
                }}
                className="rounded-full bg-blue-600 px-5 py-2.5 text-sm font-bold text-white"
              >
                Δημιουργία αγγελίας
              </button>
            }
          />
        ) : (
          <ul className="space-y-3">
            {jobs.map((j) => (
              <li key={j.id} className="rounded-2xl bg-white ring-1 ring-gray-100 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-bold text-gray-900 truncate">{j.title}</h3>
                    <p className="text-xs text-gray-500 truncate">
                      {[j.city, j.region].filter(Boolean).join(', ') || '—'}
                    </p>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      <Pill tone={j.status === 'published' ? 'green' : j.status === 'draft' ? 'amber' : 'gray'}>
                        {j.status === 'published'
                          ? 'Δημοσιευμένη'
                          : j.status === 'draft'
                            ? 'Προσχέδιο'
                            : j.status === 'archived'
                              ? 'Αρχειοθετημένη'
                              : j.status}
                      </Pill>
                      {(j.salary_min || j.salary_max) && (
                        <Pill tone="blue">{formatSalary(j.salary_min, j.salary_max, j.salary_type)}</Pill>
                      )}
                      {j.employment_type && <Pill>{employmentLabel(j.employment_type)}</Pill>}
                    </div>
                    <p className="mt-2 text-[11px] text-gray-400">
                      Δημιουργήθηκε {timeAgo(j.created_at)}
                    </p>
                  </div>
                </div>
                <div className="mt-3 flex gap-2">
                  <button
                    onClick={() => {
                      setEditing(j);
                      setShowForm(true);
                    }}
                    className="flex-1 rounded-full bg-gray-100 px-3 py-2 text-xs font-bold text-gray-700"
                  >
                    Επεξεργασία
                  </button>
                  {j.status === 'published' ? (
                    <button
                      onClick={async () => {
                        await jobsApi.archive(j.id).catch(() => null);
                        haptic('light');
                        load();
                      }}
                      className="flex-1 rounded-full bg-amber-100 px-3 py-2 text-xs font-bold text-amber-700"
                    >
                      Αρχειοθέτηση
                    </button>
                  ) : (
                    <button
                      onClick={async () => {
                        await jobsApi.publish(j.id).catch(() => null);
                        haptic('success');
                        load();
                      }}
                      className="flex-1 rounded-full bg-emerald-100 px-3 py-2 text-xs font-bold text-emerald-700"
                    >
                      Δημοσίευση
                    </button>
                  )}
                  <button
                    onClick={async () => {
                      if (!confirm('Σίγουρα να διαγραφεί η αγγελία;')) return;
                      await jobsApi.remove(j.id).catch(() => null);
                      haptic('warning');
                      load();
                    }}
                    aria-label="Διαγραφή"
                    className="rounded-full bg-rose-50 text-rose-600 px-3 py-2 text-xs font-bold"
                  >
                    🗑️
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {showForm && (
        <JobForm
          initial={editing}
          onClose={() => setShowForm(false)}
          onSaved={() => {
            setShowForm(false);
            load();
          }}
        />
      )}
    </>
  );
}

function JobForm({
  initial,
  onClose,
  onSaved,
}: {
  initial: JobRow | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState<any>(initial || { employment_type: 'full_time', salary_type: 'monthly' });
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null);
    if (!form.title || !form.title.trim()) return setErr('Βάλε τίτλο.');
    setSaving(true);
    try {
      const payload = {
        title: form.title,
        description: form.description || '',
        city: form.city || '',
        region: form.region || '',
        salary_min: form.salary_min ? Number(form.salary_min) : null,
        salary_max: form.salary_max ? Number(form.salary_max) : null,
        salary_type: form.salary_type || 'monthly',
        employment_type: form.employment_type || 'full_time',
        housing_provided: !!form.housing_provided,
        meals_provided: !!form.meals_provided,
        bonus_provided: !!form.bonus_provided,
      };
      if (initial?.id) {
        await jobsApi.update(initial.id, payload);
      } else {
        await jobsApi.create(payload);
      }
      haptic('success');
      onSaved();
    } catch (e) {
      setErr(e instanceof ApiError ? e.message : 'Σφάλμα αποθήκευσης');
      haptic('error');
    } finally {
      setSaving(false);
    }
  };

  const upd = (k: string) => (v: any) => setForm((f: any) => ({ ...f, [k]: v }));

  return (
    <div
      className="fixed inset-0 z-50 bg-black/50 flex items-end justify-center"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        className="w-full max-w-lg rounded-t-3xl bg-white max-h-[92vh] overflow-y-auto"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        <div className="sticky top-0 bg-white border-b border-gray-100 px-4 py-3 flex items-center justify-between">
          <button onClick={onClose} className="text-sm text-gray-500">
            Άκυρο
          </button>
          <h2 className="text-base font-bold">{initial ? 'Επεξεργασία' : 'Νέα αγγελία'}</h2>
          <button
            onClick={submit}
            disabled={saving}
            className="text-sm font-bold text-blue-600 disabled:opacity-50"
          >
            {saving ? 'Αποθ.…' : 'Αποθήκευση'}
          </button>
        </div>

        <form onSubmit={submit} className="p-4 space-y-3">
          <Field label="Τίτλος *" value={form.title || ''} onChange={upd('title')} placeholder="π.χ. Σερβιτόρος καλοκαιριού" />
          <FieldArea label="Περιγραφή" value={form.description || ''} onChange={upd('description')} />
          <div className="grid grid-cols-2 gap-3">
            <Field label="Πόλη" value={form.city || ''} onChange={upd('city')} />
            <Field label="Νομός" value={form.region || ''} onChange={upd('region')} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Min μισθός €" type="number" value={form.salary_min || ''} onChange={upd('salary_min')} />
            <Field label="Max μισθός €" type="number" value={form.salary_max || ''} onChange={upd('salary_max')} />
          </div>
          <SelectField
            label="Τύπος μισθού"
            value={form.salary_type || 'monthly'}
            onChange={upd('salary_type')}
            options={[
              ['monthly', 'Μηνιαίο'],
              ['daily', 'Ημερήσιο'],
              ['hourly', 'Ωριαίο'],
            ]}
          />
          <SelectField
            label="Τύπος απασχόλησης"
            value={form.employment_type || 'full_time'}
            onChange={upd('employment_type')}
            options={[
              ['full_time', 'Πλήρης'],
              ['part_time', 'Μερική'],
              ['seasonal', 'Σεζόν'],
              ['freelance', 'Freelance'],
            ]}
          />
          <Toggle label="🏠 Παρέχεται διαμονή" value={!!form.housing_provided} onChange={upd('housing_provided')} />
          <Toggle label="🍽️ Παρέχεται σίτιση" value={!!form.meals_provided} onChange={upd('meals_provided')} />
          <Toggle label="💎 Bonus" value={!!form.bonus_provided} onChange={upd('bonus_provided')} />

          {err && (
            <div className="rounded-xl bg-rose-50 border border-rose-200 px-4 py-2.5 text-sm font-semibold text-rose-700">
              {err}
            </div>
          )}
        </form>
      </div>
    </div>
  );
}

function Field({ label, value, onChange, type = 'text', placeholder }: any) {
  return (
    <label className="block">
      <span className="text-xs font-semibold text-gray-700">{label}</span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="mt-1 block w-full rounded-xl bg-gray-50 border border-gray-200 px-3 py-2.5 text-sm outline-none focus:bg-white focus:border-blue-400"
      />
    </label>
  );
}
function FieldArea({ label, value, onChange }: any) {
  return (
    <label className="block">
      <span className="text-xs font-semibold text-gray-700">{label}</span>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={4}
        className="mt-1 block w-full rounded-xl bg-gray-50 border border-gray-200 px-3 py-2.5 text-sm outline-none focus:bg-white focus:border-blue-400 resize-none"
      />
    </label>
  );
}
function SelectField({ label, value, onChange, options }: any) {
  return (
    <label className="block">
      <span className="text-xs font-semibold text-gray-700">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 block w-full rounded-xl bg-gray-50 border border-gray-200 px-3 py-2.5 text-sm outline-none focus:bg-white focus:border-blue-400"
      >
        {options.map(([v, l]: [string, string]) => (
          <option key={v} value={v}>
            {l}
          </option>
        ))}
      </select>
    </label>
  );
}
function Toggle({ label, value, onChange }: any) {
  return (
    <button
      type="button"
      onClick={() => onChange(!value)}
      className="w-full flex items-center justify-between text-left rounded-xl bg-gray-50 border border-gray-200 px-3 py-2.5"
    >
      <span className="text-sm font-medium text-gray-700">{label}</span>
      <span
        className={`relative inline-flex h-6 w-11 rounded-full transition-colors ${
          value ? 'bg-blue-600' : 'bg-gray-300'
        }`}
      >
        <span
          className={`inline-block h-5 w-5 mt-0.5 rounded-full bg-white shadow transition-transform ${
            value ? 'translate-x-5' : 'translate-x-0.5'
          }`}
        />
      </span>
    </button>
  );
}
