'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { AppBar, Btn, Screen, Body } from '../_lib/ui';

type Role = 'worker' | 'business';

export default function V7RolePicker() {
  const router = useRouter();
  const [selected, setSelected] = useState<Role | null>(null);

  const onContinue = () => {
    if (!selected) return;
    sessionStorage.setItem('v7_role', selected);
    router.push(`/app2/version7/signup?role=${selected}`);
  };

  return (
    <Screen bg="bg-white">
      <AppBar back title="Επιλογή Ρόλου" />
      <Body>
        <p className="text-sm text-gray-600 mb-5 px-1">Διάλεξε πώς θες να χρησιμοποιήσεις την εφαρμογή.</p>

        <div className="space-y-3">
          <RoleCard
            active={selected === 'worker'}
            onClick={() => setSelected('worker')}
            icon="👤"
            title="Είμαι εργαζόμενος"
            desc="Ψάχνω δουλειά. Swipe σε αγγελίες & ταίριαξε με επιχειρήσεις."
            tag="Δωρεάν"
          />
          <RoleCard
            active={selected === 'business'}
            onClick={() => setSelected('business')}
            icon="🏢"
            title="Είμαι επιχείρηση"
            desc="Δημοσίευσε αγγελίες, πάρε προτάσεις και επικοινώνησε με υποψήφιους."
            tag="Premium"
          />
        </div>

        <div className="mt-8">
          <Btn full size="lg" disabled={!selected} onClick={onContinue}>
            Συνέχεια
          </Btn>
        </div>
      </Body>
    </Screen>
  );
}

function RoleCard({
  active,
  onClick,
  icon,
  title,
  desc,
  tag,
}: {
  active: boolean;
  onClick: () => void;
  icon: string;
  title: string;
  desc: string;
  tag: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`relative w-full rounded-2xl border-2 bg-white p-4 text-left transition-all active:scale-[0.99] ${
        active ? 'border-blue-500 ring-4 ring-blue-100 shadow-md' : 'border-gray-200'
      }`}
    >
      <div className="flex items-start gap-3">
        <span className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl bg-blue-50 text-2xl">
          {icon}
        </span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-extrabold text-gray-900">{title}</h3>
            <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-bold text-blue-700">{tag}</span>
          </div>
          <p className="mt-1 text-[12px] text-gray-600 leading-relaxed">{desc}</p>
        </div>
        {active && (
          <span className="absolute top-3 right-3 flex h-6 w-6 items-center justify-center rounded-full bg-blue-600 text-white">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3} className="h-3.5 w-3.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </span>
        )}
      </div>
    </button>
  );
}
