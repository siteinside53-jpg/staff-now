'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { auth, clearToken } from '../../_lib/api';
import { ScreenHeader, FullPageSpinner } from '../../_lib/ui';
import { useUser } from '../../_lib/use-user';
import { haptic } from '../../_lib/haptics';

export default function SettingsV6() {
  const router = useRouter();
  const { user, loading } = useUser();
  const [pushEnabled, setPushEnabled] = useState(true);
  const [emailEnabled, setEmailEnabled] = useState(true);
  const [showInDiscover, setShowInDiscover] = useState(true);

  if (loading || !user) return <FullPageSpinner />;

  const logout = async () => {
    if (!confirm('Σίγουρα θέλεις να αποσυνδεθείς;')) return;
    haptic('warning');
    await auth.logout();
    clearToken();
    router.replace('/app2/version6/login');
  };

  return (
    <>
      <ScreenHeader
        title="Ρυθμίσεις"
        back={() => router.push('/app2/version6/dashboard/profile')}
      />

      <div className="p-4 space-y-5 pb-12">
        <Group title="Λογαριασμός">
          <Row label="Email" value={user.email} />
          <Row label="Ρόλος" value={user.role === 'worker' ? 'Εργαζόμενος' : 'Επιχείρηση'} />
          <Link href="/app2/version6/forgot-password" className="block">
            <Row label="Αλλαγή κωδικού" arrow />
          </Link>
        </Group>

        <Group title="Ειδοποιήσεις">
          <ToggleRow
            label="Push ειδοποιήσεις"
            value={pushEnabled}
            onChange={(v) => {
              setPushEnabled(v);
              haptic('light');
            }}
          />
          <ToggleRow
            label="Email ενημερώσεις"
            value={emailEnabled}
            onChange={(v) => {
              setEmailEnabled(v);
              haptic('light');
            }}
          />
        </Group>

        <Group title="Απόρρητο">
          <ToggleRow
            label="Εμφάνιση στο Discover"
            value={showInDiscover}
            onChange={(v) => {
              setShowInDiscover(v);
              haptic('light');
            }}
          />
        </Group>

        <Group title="Νομικά">
          <Link href="/terms" target="_blank" className="block">
            <Row label="Όροι Χρήσης" arrow />
          </Link>
          <Link href="/privacy" target="_blank" className="block">
            <Row label="Πολιτική Απορρήτου" arrow />
          </Link>
          <Link href="/cookies" target="_blank" className="block">
            <Row label="Cookies" arrow />
          </Link>
        </Group>

        <Group title="Υποστήριξη">
          <Link href="/contact" target="_blank" className="block">
            <Row label="Επικοινωνία" arrow />
          </Link>
          <Link href="/help" target="_blank" className="block">
            <Row label="Συχνές ερωτήσεις" arrow />
          </Link>
        </Group>

        <button
          onClick={logout}
          className="w-full rounded-2xl bg-rose-50 ring-1 ring-rose-200 text-rose-700 px-4 py-3 text-sm font-bold"
        >
          Αποσύνδεση
        </button>

        <p className="text-center text-[10px] text-gray-400">StaffNow v6 · Made in Greece</p>
      </div>
    </>
  );
}

function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-2 px-2">{title}</h3>
      <div className="rounded-2xl bg-white ring-1 ring-gray-100 divide-y divide-gray-100 overflow-hidden">
        {children}
      </div>
    </section>
  );
}

function Row({
  label,
  value,
  arrow,
}: {
  label: string;
  value?: string;
  arrow?: boolean;
}) {
  return (
    <div className="flex items-center px-4 py-3.5">
      <span className="flex-1 text-sm text-gray-900">{label}</span>
      {value && <span className="text-sm text-gray-500 truncate max-w-[60%]">{value}</span>}
      {arrow && <span className="ml-2 text-gray-300">›</span>}
    </div>
  );
}

function ToggleRow({
  label,
  value,
  onChange,
}: {
  label: string;
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!value)}
      className="w-full flex items-center px-4 py-3.5 text-left active:bg-gray-50"
    >
      <span className="flex-1 text-sm text-gray-900">{label}</span>
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
