'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'https://staffnow-api-production.siteinside53.workers.dev';

export default function SettingsV3() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [notifEnabled, setNotifEnabled] = useState(true);
  const [darkMode, setDarkMode] = useState(false);
  const [confirmLogout, setConfirmLogout] = useState(false);

  useEffect(() => {
    const t = localStorage.getItem('staffnow_token');
    if (!t) return;
    fetch(`${API_BASE}/auth/me`, { headers: { 'Authorization': `Bearer ${t}` } })
      .then((r) => r.json()).then((data) => setUser(data?.data?.user))
      .catch(() => {});
  }, []);

  const logout = async () => {
    try {
      const t = localStorage.getItem('staffnow_token');
      await fetch(`${API_BASE}/auth/logout`, { method: 'POST', headers: { 'Authorization': `Bearer ${t}` } });
    } catch {}
    localStorage.removeItem('staffnow_token');
    router.replace('/app2/version3/login');
  };

  return (
    <div className="h-full flex flex-col bg-gray-50 overflow-y-auto">
      {/* Header */}
      <div className="flex-shrink-0 flex items-center gap-3 px-4 py-3 bg-white border-b border-gray-100 sticky top-0 z-10">
        <Link href="/app2/version3/profile" className="p-1.5 -ml-1.5">
          <svg className="h-6 w-6 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" d="M15 19l-7-7 7-7" />
          </svg>
        </Link>
        <h1 className="text-lg font-bold text-gray-900">Ρυθμίσεις</h1>
      </div>

      <div className="flex-1 p-4 space-y-4">
        {/* Account */}
        <Section title="Λογαριασμός">
          <InfoRow label="Email" value={user?.email || '—'} />
          <InfoRow label="Ρόλος" value={user?.role === 'worker' ? 'Εργαζόμενος' : user?.role === 'business' ? 'Επιχείρηση' : '—'} />
          <MenuItem icon="🔒" label="Αλλαγή κωδικού" href="/auth/forgot-password" />
        </Section>

        {/* Notifications */}
        <Section title="Ειδοποιήσεις">
          <ToggleRow
            label="Push Notifications"
            desc="Νέα matches και μηνύματα"
            value={notifEnabled}
            onChange={setNotifEnabled}
          />
          <ToggleRow
            label="Email Updates"
            desc="Εβδομαδιαία newsletter"
            value={false}
            onChange={() => {}}
          />
        </Section>

        {/* Privacy */}
        <Section title="Απόρρητο">
          <MenuItem icon="👁️" label="Ποιος βλέπει το προφίλ μου" href="#" />
          <MenuItem icon="🚫" label="Αποκλεισμένοι χρήστες" href="#" />
          <ToggleRow
            label="Εμφάνιση προφίλ σε αναζήτηση"
            desc="Άλλοι μπορούν να σε βρουν"
            value={true}
            onChange={() => {}}
          />
        </Section>

        {/* Appearance */}
        <Section title="Εμφάνιση">
          <ToggleRow
            label="Σκοτεινή λειτουργία"
            desc="Μείον κούραση στα μάτια"
            value={darkMode}
            onChange={setDarkMode}
          />
        </Section>

        {/* Legal */}
        <Section title="Νομικά">
          <MenuItem icon="📄" label="Όροι Χρήσης" href="/terms" />
          <MenuItem icon="🔐" label="Πολιτική Απορρήτου" href="/privacy" />
          <MenuItem icon="🍪" label="Cookies" href="/cookies" />
        </Section>

        {/* Support */}
        <Section title="Βοήθεια">
          <MenuItem icon="💬" label="Επικοινωνία" href="/contact" />
          <MenuItem icon="❓" label="Συχνές Ερωτήσεις" href="/faq" />
          <MenuItem icon="🆘" label="Αναφορά Προβλήματος" href="/help" />
        </Section>

        {/* Danger */}
        <div className="pt-4 space-y-2">
          <button
            onClick={() => setConfirmLogout(true)}
            className="w-full rounded-2xl bg-white border border-red-200 py-4 text-sm font-bold text-red-600 hover:bg-red-50"
          >
            🚪 Αποσύνδεση
          </button>
          <Link
            href="#"
            className="block text-center text-xs text-gray-400 underline py-2"
          >
            Διαγραφή Λογαριασμού
          </Link>
        </div>

        <p className="text-center text-[10px] text-gray-400 pt-4">
          StaffNow v3.0 · © 2026
        </p>
      </div>

      {/* Logout confirm */}
      {confirmLogout && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4" onClick={() => setConfirmLogout(false)}>
          <div className="w-full max-w-sm bg-white rounded-3xl p-6 text-center" onClick={(e) => e.stopPropagation()}>
            <div className="text-4xl mb-3">🚪</div>
            <h3 className="text-lg font-bold text-gray-900">Αποσύνδεση;</h3>
            <p className="mt-1 text-sm text-gray-500">Θα χρειαστεί να κάνεις ξανά login</p>
            <div className="mt-5 flex gap-2">
              <button onClick={() => setConfirmLogout(false)} className="flex-1 rounded-xl border border-gray-300 py-3 text-sm font-bold text-gray-700">
                Άκυρο
              </button>
              <button onClick={logout} className="flex-1 rounded-xl bg-red-600 py-3 text-sm font-bold text-white">
                Αποσύνδεση
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h2 className="text-[11px] font-bold uppercase tracking-wider text-gray-500 mb-2 px-1">{title}</h2>
      <div className="rounded-2xl bg-white shadow-sm overflow-hidden divide-y divide-gray-100">
        {children}
      </div>
    </div>
  );
}

function MenuItem({ icon, label, href }: { icon: string; label: string; href: string }) {
  return (
    <Link href={href} className="flex items-center gap-3 px-5 py-3.5 hover:bg-gray-50">
      <span className="text-lg w-6 text-center">{icon}</span>
      <span className="flex-1 text-sm font-medium text-gray-900">{label}</span>
      <svg className="h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" d="M9 5l7 7-7 7" />
      </svg>
    </Link>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between px-5 py-3.5">
      <span className="text-sm text-gray-600">{label}</span>
      <span className="text-sm font-medium text-gray-900 truncate ml-3">{value}</span>
    </div>
  );
}

function ToggleRow({ label, desc, value, onChange }: { label: string; desc: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-center justify-between gap-3 px-5 py-3.5">
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-900">{label}</p>
        <p className="text-xs text-gray-500 mt-0.5">{desc}</p>
      </div>
      <button
        onClick={() => onChange(!value)}
        className={`relative h-7 w-12 rounded-full transition-colors ${value ? 'bg-blue-600' : 'bg-gray-300'}`}
      >
        <span className={`absolute top-0.5 h-6 w-6 rounded-full bg-white shadow transition-transform ${value ? 'translate-x-5' : 'translate-x-0.5'}`} />
      </button>
    </div>
  );
}
