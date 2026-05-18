'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { workers, businesses, uploads, ApiError } from '../../../_lib/api';
import { Avatar, FullPageSpinner, ScreenHeader, Spinner } from '../../../_lib/ui';
import { useUser } from '../../../_lib/use-user';
import { haptic } from '../../../_lib/haptics';

const WORKER_ROLES = [
  'waiter', 'chef', 'cook', 'bartender', 'receptionist',
  'housekeeper', 'barista', 'driver', 'sales', 'cleaner', 'hostess',
];
const LANGUAGES = ['Ελληνικά', 'Αγγλικά', 'Γερμανικά', 'Γαλλικά', 'Ιταλικά', 'Ισπανικά', 'Ρωσικά'];
const BUSINESS_TYPES = [
  ['hotel', 'Ξενοδοχείο'], ['restaurant', 'Εστιατόριο'], ['bar', 'Bar'],
  ['cafe', 'Καφέ'], ['beach_bar', 'Beach Bar'], ['catering', 'Catering'],
  ['retail', 'Λιανικό'], ['cleaning', 'Καθαρισμοί'], ['other', 'Άλλο'],
] as const;

export default function ProfileEditV6() {
  const router = useRouter();
  const { user, loading: loadingUser } = useUser();
  const isWorker = user?.role === 'worker';
  const fileRef = useRef<HTMLInputElement>(null);
  const [form, setForm] = useState<any>({});
  const [roles, setRoles] = useState<string[]>([]);
  const [langs, setLangs] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (!user) return;
    (async () => {
      try {
        if (isWorker) {
          const data = await workers.me();
          setForm(data.profile || {});
          setRoles(data.roles || []);
          setLangs(data.languages || []);
        } else {
          const data = await businesses.me();
          setForm(data.profile || {});
        }
      } catch (e) {
        // OK if profile doesn't exist yet — start empty
        setForm({});
      } finally {
        setLoading(false);
      }
    })();
  }, [user, isWorker]);

  const onPickPhoto = () => fileRef.current?.click();

  const onFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const res = await uploads.upload(file, isWorker ? 'worker_photo' : 'business_logo');
      setForm((f: any) => ({ ...f, [isWorker ? 'photo_url' : 'logo_url']: res.url }));
      haptic('light');
    } catch (e) {
      haptic('error');
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const save = async () => {
    if (saving) return;
    setSaving(true);
    setError(null);
    try {
      const payload = isWorker
        ? { ...form, roles, languages: langs }
        : form;
      if (isWorker) await workers.updateMe(payload);
      else await businesses.updateMe(payload);
      haptic('success');
      setSuccess(true);
      setTimeout(() => router.push('/app2/version6/dashboard/profile'), 600);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Σφάλμα αποθήκευσης');
      haptic('error');
    } finally {
      setSaving(false);
    }
  };

  if (loadingUser || loading || !user) return <FullPageSpinner />;

  const photo = isWorker ? form.photo_url : form.logo_url;

  return (
    <>
      <ScreenHeader
        title="Επεξεργασία προφίλ"
        back={() => router.push('/app2/version6/dashboard/profile')}
        right={
          <button
            onClick={save}
            disabled={saving}
            className="text-sm font-bold text-blue-600 disabled:opacity-50"
          >
            {saving ? 'Αποθήκευση…' : 'Αποθήκευση'}
          </button>
        }
      />

      <div className="px-4 py-5 space-y-6 pb-12">
        {/* Photo */}
        <section className="flex flex-col items-center">
          <button onClick={onPickPhoto} className="relative">
            <Avatar src={photo} name={form.full_name || form.company_name} size="xl" ring />
            <span className="absolute bottom-0 right-0 h-8 w-8 rounded-full bg-blue-600 text-white text-sm flex items-center justify-center shadow-lg ring-2 ring-white">
              {uploading ? <Spinner className="h-4 w-4 border-white border-t-transparent" /> : '📷'}
            </span>
          </button>
          <input ref={fileRef} type="file" accept="image/*" onChange={onFile} className="hidden" />
          <p className="mt-2 text-xs text-gray-500">{isWorker ? 'Φωτογραφία προφίλ' : 'Λογότυπο'}</p>
        </section>

        {success && (
          <div className="rounded-2xl bg-emerald-50 border border-emerald-200 px-4 py-3 text-sm font-semibold text-emerald-700">
            ✓ Αποθηκεύτηκε
          </div>
        )}
        {error && (
          <div className="rounded-2xl bg-rose-50 border border-rose-200 px-4 py-3 text-sm font-semibold text-rose-700">
            {error}
          </div>
        )}

        {isWorker ? (
          <WorkerForm form={form} setForm={setForm} roles={roles} setRoles={setRoles} langs={langs} setLangs={setLangs} />
        ) : (
          <BusinessForm form={form} setForm={setForm} />
        )}
      </div>
    </>
  );
}

function WorkerForm({
  form,
  setForm,
  roles,
  setRoles,
  langs,
  setLangs,
}: {
  form: any;
  setForm: (fn: any) => void;
  roles: string[];
  setRoles: (r: string[]) => void;
  langs: string[];
  setLangs: (l: string[]) => void;
}) {
  const upd = (k: string) => (v: any) => setForm((f: any) => ({ ...f, [k]: v }));

  const toggle = (arr: string[], setter: (v: string[]) => void, val: string) => {
    setter(arr.includes(val) ? arr.filter((x) => x !== val) : [...arr, val]);
  };

  return (
    <>
      <Section title="Βασικά">
        <Input label="Ονοματεπώνυμο" value={form.full_name || ''} onChange={upd('full_name')} placeholder="π.χ. Γιώργος Παπαδόπουλος" />
        <Textarea label="Βιογραφικό" value={form.bio || ''} onChange={upd('bio')} placeholder="Λίγα λόγια για σένα…" />
      </Section>

      <Section title="Τοποθεσία & επικοινωνία">
        <Input label="Πόλη" value={form.city || ''} onChange={upd('city')} placeholder="Αθήνα" />
        <Input label="Νομός / Περιφέρεια" value={form.region || ''} onChange={upd('region')} placeholder="Αττική" />
        <Input label="Τηλέφωνο" value={form.phone || ''} onChange={upd('phone')} placeholder="69…" type="tel" />
      </Section>

      <Section title="Επαγγελματικά">
        <Input label="Έτη εμπειρίας" type="number" value={form.years_of_experience || ''} onChange={upd('years_of_experience')} />
        <Input label="Αναμενόμενος μηνιαίος μισθός (€)" type="number" value={form.expected_monthly_salary || ''} onChange={upd('expected_monthly_salary')} />
        <Select
          label="Διαθεσιμότητα"
          value={form.availability || ''}
          onChange={upd('availability')}
          options={[
            ['', '— Επίλεξε —'],
            ['immediate', 'Άμεσα'],
            ['within_7_days', 'Σε 7 ημέρες'],
            ['within_month', 'Εντός μήνα'],
            ['seasonal', 'Σεζόν'],
          ]}
        />
        <ToggleRow label="Διατεθειμένος για μετακίνηση" value={!!form.willing_to_relocate} onChange={upd('willing_to_relocate')} />
      </Section>

      <Section title="Ρόλοι">
        <div className="flex flex-wrap gap-2">
          {WORKER_ROLES.map((r) => (
            <Chip key={r} active={roles.includes(r)} onClick={() => toggle(roles, setRoles, r)}>
              {r}
            </Chip>
          ))}
        </div>
      </Section>

      <Section title="Γλώσσες">
        <div className="flex flex-wrap gap-2">
          {LANGUAGES.map((l) => (
            <Chip key={l} active={langs.includes(l)} onClick={() => toggle(langs, setLangs, l)}>
              {l}
            </Chip>
          ))}
        </div>
      </Section>
    </>
  );
}

function BusinessForm({ form, setForm }: { form: any; setForm: (fn: any) => void }) {
  const upd = (k: string) => (v: any) => setForm((f: any) => ({ ...f, [k]: v }));
  return (
    <>
      <Section title="Βασικά">
        <Input label="Όνομα επιχείρησης" value={form.company_name || ''} onChange={upd('company_name')} />
        <Textarea label="Περιγραφή" value={form.description || ''} onChange={upd('description')} placeholder="Τι κάνει η επιχείρηση…" />
      </Section>

      <Section title="Τύπος">
        <Select
          label="Κατηγορία"
          value={form.business_type || ''}
          onChange={upd('business_type')}
          options={[['', '— Επίλεξε —'], ...BUSINESS_TYPES.map(([v, l]) => [v, l] as [string, string])]}
        />
      </Section>

      <Section title="Στοιχεία">
        <Input label="Πόλη" value={form.city || ''} onChange={upd('city')} />
        <Input label="Νομός" value={form.region || ''} onChange={upd('region')} />
        <Input label="Τηλέφωνο" value={form.phone || ''} onChange={upd('phone')} type="tel" />
        <Input label="Website" value={form.website || ''} onChange={upd('website')} placeholder="https://…" type="url" />
      </Section>
    </>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-2">{title}</h3>
      <div className="rounded-2xl bg-white ring-1 ring-gray-100 p-4 space-y-3">{children}</div>
    </section>
  );
}

function Input({
  label,
  value,
  onChange,
  type = 'text',
  placeholder,
}: {
  label: string;
  value: string | number;
  onChange: (v: string) => void;
  type?: string;
  placeholder?: string;
}) {
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

function Textarea({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <label className="block">
      <span className="text-xs font-semibold text-gray-700">{label}</span>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        rows={3}
        className="mt-1 block w-full rounded-xl bg-gray-50 border border-gray-200 px-3 py-2.5 text-sm outline-none focus:bg-white focus:border-blue-400 resize-none"
      />
    </label>
  );
}

function Select({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: Array<[string, string]>;
}) {
  return (
    <label className="block">
      <span className="text-xs font-semibold text-gray-700">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 block w-full rounded-xl bg-gray-50 border border-gray-200 px-3 py-2.5 text-sm outline-none focus:bg-white focus:border-blue-400"
      >
        {options.map(([v, l]) => (
          <option key={v} value={v}>
            {l}
          </option>
        ))}
      </select>
    </label>
  );
}

function ToggleRow({ label, value, onChange }: { label: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!value)}
      className="w-full flex items-center justify-between text-left"
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

function Chip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${
        active ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700'
      }`}
    >
      {children}
    </button>
  );
}
