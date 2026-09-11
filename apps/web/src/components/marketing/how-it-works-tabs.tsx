'use client';

import { useState } from 'react';
import { useT } from '@/i18n/locale-provider';

// Τα κείμενα ζουν στο i18n: howItWorksTabs.{business|worker}.s{1..3}{Title|Desc}
const businessSteps = [
  { num: '01', key: 's1', icon: '📝' },
  { num: '02', key: 's2', icon: '⚡' },
  { num: '03', key: 's3', icon: '🤝' },
];

const workerSteps = [
  { num: '01', key: 's1', icon: '👤' },
  { num: '02', key: 's2', icon: '📱' },
  { num: '03', key: 's3', icon: '🎉' },
];

export function HowItWorksTabs() {
  const t = useT();
  const [tab, setTab] = useState<'business' | 'worker'>('business');
  const steps = tab === 'business' ? businessSteps : workerSteps;

  return (
    <section id="how-it-works" className="bg-white py-20 sm:py-28">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="text-center">
          <p className="text-sm font-semibold uppercase tracking-wider text-blue-600">{t('howItWorksTabs.eyebrow')}</p>
          <h2 className="mt-3 text-3xl font-extrabold tracking-tight text-gray-900 sm:text-4xl">
            {t('howItWorksTabs.title')}
          </h2>
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
              {t('howItWorksTabs.tabBusiness')}
            </button>
            <button
              onClick={() => setTab('worker')}
              className={`rounded-lg px-6 py-2.5 text-sm font-semibold transition-all ${
                tab === 'worker'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {t('howItWorksTabs.tabWorker')}
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
              <h3 className="text-xl font-bold text-gray-900">{t(`howItWorksTabs.${tab}.${step.key}Title`)}</h3>
              <p className="mt-3 text-gray-600 leading-relaxed">{t(`howItWorksTabs.${tab}.${step.key}Desc`)}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
