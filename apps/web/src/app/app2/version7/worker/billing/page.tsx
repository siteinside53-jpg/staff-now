'use client';

import { useState } from 'react';
import { AppBar, Body, Btn, Card, Section } from '../../_lib/ui';

export default function WorkerBilling() {
  const [active, setActive] = useState<'monthly' | 'yearly'>('monthly');
  const monthly = 4.99;
  const yearly = 44.99;

  return (
    <div className="fixed inset-0 flex flex-col bg-[#F5F7FB]">
      <AppBar back title="Premium Εργαζομένου" />
      <Body className="pb-32">
        <Card className="p-5 bg-gradient-to-br from-amber-400 to-orange-500 text-white text-center">
          <div className="text-5xl">⭐</div>
          <h2 className="mt-2 text-2xl font-extrabold">Worker Premium</h2>
          <p className="mt-1 text-sm text-white/90">Ξεχώρισε. Ταίριαξε γρηγορότερα.</p>
        </Card>

        <Section title="Τι περιλαμβάνεται">
          <Card className="p-4 space-y-2.5 text-[13px]">
            <Feat icon="⭐" text="Αστέρι Premium στο προφίλ σου" />
            <Feat icon="🚀" text="Προτεραιότητα στις αναζητήσεις" />
            <Feat icon="📈" text="3x περισσότερα profile views" />
            <Feat icon="📄" text="Επώνυμο CV PDF (χωρίς watermark)" />
            <Feat icon="🎯" text="Στόχευση σε premium αγγελίες" />
            <Feat icon="🛟" text="Priority support" />
          </Card>
        </Section>

        <Section title="Επίλεξε τιμολόγηση">
          <div className="grid grid-cols-2 gap-2">
            <PricePill active={active === 'monthly'} onClick={() => setActive('monthly')} title="Μηνιαία" price={`${monthly}€`} sub="/μήνα" />
            <PricePill active={active === 'yearly'} onClick={() => setActive('yearly')} title="Ετήσια" price={`${yearly}€`} sub="/χρόνο" badge="-25%" />
          </div>
        </Section>
      </Body>
      <div
        className="flex-shrink-0 bg-white border-t border-gray-100 px-4 py-3"
        style={{ paddingBottom: 'calc(12px + env(safe-area-inset-bottom))' }}
      >
        <Btn full size="lg">Συνδρομή · {active === 'monthly' ? `${monthly}€/μήνα` : `${yearly}€/χρόνο`}</Btn>
      </div>
    </div>
  );
}

function Feat({ icon, text }: { icon: string; text: string }) {
  return (
    <div className="flex items-center gap-3">
      <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-50">{icon}</span>
      <span className="font-semibold text-gray-800">{text}</span>
    </div>
  );
}

function PricePill({
  title, price, sub, active, onClick, badge,
}: { title: string; price: string; sub: string; active: boolean; onClick: () => void; badge?: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`relative rounded-2xl border-2 bg-white p-4 text-center transition-all ${
        active ? 'border-amber-500 ring-4 ring-amber-100 shadow-md' : 'border-gray-200'
      }`}
    >
      {badge && <span className="absolute -top-2 right-3 rounded-full bg-rose-500 px-2 py-0.5 text-[10px] font-extrabold text-white">{badge}</span>}
      <p className="text-[11px] font-bold uppercase tracking-wider text-gray-500">{title}</p>
      <p className="mt-1 text-2xl font-black text-gray-900">{price}</p>
      <p className="text-[11px] text-gray-500">{sub}</p>
    </button>
  );
}
