'use client';

import { useEffect, useState } from 'react';
import { AppBar, Body, FieldGroup, Row, Section } from '../../_lib/ui';
import { workers } from '../../_lib/api';

export default function WorkerSettings() {
  const [profile, setProfile] = useState<any>(null);
  const [pushEnabled, setPushEnabled] = useState(false);

  useEffect(() => {
    workers.me().then((w) => setProfile(w.profile)).catch(() => {});
  }, []);

  return (
    <>
      <AppBar back title="Ρυθμίσεις" />
      <Body>
        <Section title="Λογαριασμός">
          <FieldGroup>
            <Row icon="✉️" label="Email" right={<span className="text-[12px] text-gray-500">{profile?.email || '—'}</span>} />
            <Row icon="🔑" iconBg="bg-amber-50" iconColor="text-amber-600" label="Αλλαγή κωδικού" href="/app2/version7/worker/settings/password" last />
          </FieldGroup>
        </Section>

        <Section title="Ειδοποιήσεις">
          <FieldGroup>
            <Toggle label="Push notifications" hint="Νέα matches, μηνύματα, αγγελίες" value={pushEnabled} onChange={setPushEnabled} />
            <Toggle label="Email ειδοποιήσεις" hint="Καθημερινό συμβουλευτικό email" value={true} onChange={() => {}} last />
          </FieldGroup>
        </Section>

        <Section title="Απόρρητο">
          <FieldGroup>
            <Row icon="👁️" label="Ποιος βλέπει το προφίλ μου" hint="Μόνο επιχειρήσεις που έκαναν match" />
            <Row icon="🚫" iconBg="bg-rose-50" iconColor="text-rose-600" label="Αποκλεισμένοι χρήστες" href="/app2/version7/worker/settings/blocked" last />
          </FieldGroup>
        </Section>

        <Section title="Λογαριασμός">
          <FieldGroup>
            <Row icon="📥" label="Εξαγωγή δεδομένων μου" hint="Λήψη όλων των δεδομένων σε JSON" />
            <Row icon="🗑️" iconBg="bg-rose-50" iconColor="text-rose-600" label="Διαγραφή λογαριασμού" danger href="/app2/version7/worker/settings/delete" last />
          </FieldGroup>
        </Section>

        <p className="mt-6 text-center text-[10px] text-gray-400">StaffNow · v7</p>
      </Body>
    </>
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
        <span
          className={`absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-transform ${value ? 'translate-x-4' : ''}`}
        />
      </button>
    </div>
  );
}
