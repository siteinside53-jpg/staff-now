'use client';

import { useState } from 'react';

const businessSteps = [
  { num: '01', title: 'Δημοσίευσε αγγελία', desc: 'Περιέγραψε τη θέση σε λιγότερο από 1 λεπτό. Ρόλος, τοποθεσία, αμοιβή — τέλος.', icon: '📝' },
  { num: '02', title: 'Δες προτάσεις σε λεπτά', desc: 'Το AI σου προτείνει τους πιο κατάλληλους υποψηφίους κοντά σου — αξιολογημένους.', icon: '⚡' },
  { num: '03', title: 'Επέλεξε & Ξεκίνα', desc: 'Στείλε μήνυμα, συμφώνησε και ξεκίνα συνεργασία. Χωρίς γραφειοκρατία.', icon: '🤝' },
];

const workerSteps = [
  { num: '01', title: 'Φτιάξε το προφίλ σου', desc: 'Πρόσθεσε εμπειρία, δεξιότητες και τοποθεσία. Γίνε ορατός σε χιλιάδες επιχειρήσεις.', icon: '👤' },
  { num: '02', title: 'Swipe σε θέσεις', desc: 'Δες θέσεις κοντά σου, κάνε swipe δεξιά στις αγαπημένες. Σαν Tinder — για δουλειά.', icon: '📱' },
  { num: '03', title: 'Λάβε πρόταση', desc: 'Οι επιχειρήσεις σου στέλνουν μήνυμα. Συμφώνησε και ξεκίνα εργασία.', icon: '🎉' },
];

export function HowItWorksTabs() {
  const [tab, setTab] = useState<'business' | 'worker'>('business');
  const steps = tab === 'business' ? businessSteps : workerSteps;

  return (
    <section id="how-it-works" className="bg-white py-20 sm:py-28">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="text-center">
          <p className="text-sm font-semibold uppercase tracking-wider text-blue-600">Απλά &amp; Γρήγορα</p>
          <h2 className="mt-3 text-3xl font-bold text-gray-900 sm:text-4xl">Πώς λειτουργεί</h2>
        </div>

        {/* Tabs */}
        <div className="mt-10 flex justify-center">
          <div className="inline-flex rounded-xl bg-gray-100 p-1">
            <button
              onClick={() => setTab('business')}
              className={`rounded-lg px-6 py-2.5 text-sm font-semibold transition-all ${
                tab === 'business'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Για Επιχειρήσεις
            </button>
            <button
              onClick={() => setTab('worker')}
              className={`rounded-lg px-6 py-2.5 text-sm font-semibold transition-all ${
                tab === 'worker'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Για Εργαζόμενους
            </button>
          </div>
        </div>

        {/* Steps */}
        <div className="mt-14 grid gap-8 md:grid-cols-3">
          {steps.map((step, i) => (
            <div key={`${tab}-${step.num}`} className="relative text-center group">
              <div className="mx-auto mb-6 relative w-16 h-16">
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-50 text-2xl group-hover:bg-blue-100 transition-colors">
                  {step.icon}
                </div>
                <span className="absolute -top-2 -right-2 flex h-7 w-7 items-center justify-center rounded-full bg-blue-600 text-xs font-bold text-white shadow-md">
                  {step.num}
                </span>
              </div>
              {i < steps.length - 1 && (
                <div className="hidden md:block absolute top-8 left-[calc(50%+40px)] w-[calc(100%-80px)] border-t-2 border-dashed border-gray-200" />
              )}
              <h3 className="text-xl font-bold text-gray-900">{step.title}</h3>
              <p className="mt-3 text-gray-600 leading-relaxed">{step.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
