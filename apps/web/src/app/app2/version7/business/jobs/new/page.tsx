'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  AppBar,
  Body,
  Btn,
  Card,
  Chip,
  Screen,
  Section,
  Select,
  TextArea,
  TextField,
} from '../../../_lib/ui';
import { jobs as jobsApi } from '../../../_lib/api';

export default function NewJob() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  // Form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [city, setCity] = useState('');
  const [region, setRegion] = useState('Αττική');
  const [employmentType, setEmploymentType] = useState('full_time');
  const [salaryMin, setSalaryMin] = useState('');
  const [salaryMax, setSalaryMax] = useState('');
  const [salaryType, setSalaryType] = useState('monthly');
  const [shiftType, setShiftType] = useState('flexible');
  const [housing, setHousing] = useState(false);
  const [meals, setMeals] = useState(false);
  const [transport, setTransport] = useState(false);

  const total = 3;
  const next = () => setStep((s) => Math.min(s + 1, total - 1));
  const prev = () => setStep((s) => Math.max(s - 1, 0));

  const onSubmit = async () => {
    setErr(null);
    setSubmitting(true);
    try {
      const job = await jobsApi.create({
        title,
        description,
        city,
        region,
        employment_type: employmentType,
        salary_min: salaryMin ? Number(salaryMin) : null,
        salary_max: salaryMax ? Number(salaryMax) : null,
        salary_type: salaryType,
        shift_type: shiftType,
        housing_provided: housing ? 1 : 0,
        meals_provided: meals ? 1 : 0,
        transport_provided: transport ? 1 : 0,
        status: 'published',
      });
      router.replace(`/app2/version7/business/jobs/detail?id=${job.id || job.job?.id}`);
    } catch (e: any) {
      setErr(e?.message || 'Σφάλμα δημοσίευσης');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Screen>
      <AppBar back title="Νέα αγγελία" subtitle={`Βήμα ${step + 1} από ${total}`} />

      {/* Progress bar */}
      <div className="flex-shrink-0 bg-white px-4 pb-3">
        <div className="h-1.5 rounded-full bg-gray-100 overflow-hidden">
          <div
            className="h-full bg-blue-600 transition-all"
            style={{ width: `${((step + 1) / total) * 100}%` }}
          />
        </div>
      </div>

      <Body>
        {step === 0 && (
          <div className="space-y-3">
            <Section title="Βασικά">
              <Card className="p-4 space-y-3">
                <TextField
                  label="Τίτλος αγγελίας"
                  placeholder="π.χ. Σερβιτόρος για beach bar"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required
                />
                <TextArea
                  label="Περιγραφή"
                  placeholder="Τι αναζητάτε; Καθήκοντα, εμπειρία..."
                  rows={6}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </Card>
            </Section>
            <Section title="Τοποθεσία">
              <Card className="p-4 space-y-3">
                <Select
                  label="Περιφέρεια"
                  options={['Αττική', 'Θεσσαλονίκη', 'Κρήτη', 'Δωδεκάνησα', 'Κυκλάδες', 'Χαλκιδική', 'Πελοπόννησος'].map((r) => ({ value: r, label: r }))}
                  value={region}
                  onChange={(e) => setRegion(e.target.value)}
                />
                <TextField
                  label="Πόλη"
                  placeholder="π.χ. Ηράκλειο"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                />
              </Card>
            </Section>
          </div>
        )}

        {step === 1 && (
          <div className="space-y-3">
            <Section title="Τύπος απασχόλησης">
              <Card className="p-3">
                <div className="flex flex-wrap gap-2">
                  {[
                    { v: 'full_time', l: 'Πλήρης' },
                    { v: 'part_time', l: 'Μερική' },
                    { v: 'seasonal', l: 'Σεζόν' },
                  ].map((t) => (
                    <Chip key={t.v} active={employmentType === t.v} onClick={() => setEmploymentType(t.v)}>
                      {t.l}
                    </Chip>
                  ))}
                </div>
              </Card>
            </Section>

            <Section title="Ωράριο">
              <Card className="p-3">
                <div className="flex flex-wrap gap-2">
                  {[
                    { v: 'morning', l: '🌅 Πρωί' },
                    { v: 'evening', l: '🌃 Βράδυ' },
                    { v: 'split', l: '⏱️ Σπαστό' },
                    { v: 'flexible', l: '⚡ Ευέλικτο' },
                  ].map((t) => (
                    <Chip key={t.v} active={shiftType === t.v} onClick={() => setShiftType(t.v)}>
                      {t.l}
                    </Chip>
                  ))}
                </div>
              </Card>
            </Section>

            <Section title="Μισθός">
              <Card className="p-4 space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <TextField
                    type="number"
                    label="Από (€)"
                    placeholder="900"
                    value={salaryMin}
                    onChange={(e) => setSalaryMin(e.target.value)}
                  />
                  <TextField
                    type="number"
                    label="Έως (€)"
                    placeholder="1200"
                    value={salaryMax}
                    onChange={(e) => setSalaryMax(e.target.value)}
                  />
                </div>
                <Select
                  label="Συχνότητα"
                  options={[
                    { value: 'monthly', label: 'Ανά μήνα' },
                    { value: 'hourly', label: 'Ανά ώρα' },
                    { value: 'daily', label: 'Ανά μέρα' },
                    { value: 'negotiable', label: 'Συζητήσιμο' },
                  ]}
                  value={salaryType}
                  onChange={(e) => setSalaryType(e.target.value)}
                />
              </Card>
            </Section>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-3">
            <Section title="Παροχές">
              <Card>
                <Toggle label="🏠 Διαμονή" hint="Παρέχεται στέγαση" value={housing} onChange={setHousing} />
                <Toggle label="🍽️ Σίτιση" hint="Παρέχονται γεύματα" value={meals} onChange={setMeals} />
                <Toggle label="🚌 Μεταφορά" hint="Βοήθεια μετακίνησης" value={transport} onChange={setTransport} last />
              </Card>
            </Section>

            <Section title="Σύνοψη">
              <Card className="p-4 space-y-2 text-sm">
                <Row k="Τίτλος" v={title || '—'} />
                <Row k="Τοποθεσία" v={`${city || '—'}, ${region}`} />
                <Row k="Απασχόληση" v={({ full_time: 'Πλήρης', part_time: 'Μερική', seasonal: 'Σεζόν' } as any)[employmentType]} />
                <Row k="Μισθός" v={salaryMin || salaryMax ? `${salaryMin || '—'}-${salaryMax || '—'} ${({ monthly: '€/μήνα', hourly: '€/ώρα', daily: '€/μέρα', negotiable: 'συζητήσιμα' } as any)[salaryType]}` : 'Συζητήσιμα'} />
              </Card>
            </Section>

            {err && (
              <div className="rounded-2xl bg-rose-50 px-3 py-2.5 text-[12px] font-semibold text-rose-700">
                {err}
              </div>
            )}
          </div>
        )}
      </Body>

      <div
        className="flex-shrink-0 bg-white border-t border-gray-100 px-4 py-3 flex gap-2"
        style={{ paddingBottom: 'calc(12px + env(safe-area-inset-bottom))' }}
      >
        {step > 0 && <Btn variant="secondary" onClick={prev}>Πίσω</Btn>}
        {step < total - 1 ? (
          <Btn full onClick={next} disabled={step === 0 && !title}>
            Επόμενο
          </Btn>
        ) : (
          <Btn full loading={submitting} onClick={onSubmit}>
            🚀 Δημοσίευση
          </Btn>
        )}
      </div>
    </Screen>
  );
}

function Toggle({
  label,
  hint,
  value,
  onChange,
  last,
}: {
  label: string;
  hint?: string;
  value: boolean;
  onChange: (v: boolean) => void;
  last?: boolean;
}) {
  return (
    <div className={`flex items-center gap-3 px-4 py-3 ${last ? '' : 'border-b border-gray-100'}`}>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-bold text-gray-900">{label}</p>
        {hint && <p className="text-[11px] text-gray-500">{hint}</p>}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={value}
        onClick={() => onChange(!value)}
        className={`relative h-6 w-10 flex-shrink-0 rounded-full transition-colors ${value ? 'bg-blue-600' : 'bg-gray-300'}`}
      >
        <span className={`absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-transform ${value ? 'translate-x-4' : ''}`} />
      </button>
    </div>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex items-start justify-between gap-3 text-[13px]">
      <span className="text-gray-500">{k}</span>
      <span className="font-bold text-gray-900 text-right">{v}</span>
    </div>
  );
}
