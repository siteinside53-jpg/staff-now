'use client';

import Link from 'next/link';

const FALLBACK_MATCHES = [
  { id: 'm1', name: 'Sunset Beach Bar', role: 'Σερβιτόρος/α', city: 'Μύκονος', color: 'bg-amber-100 text-amber-700', initials: 'SB', newCount: 2 },
  { id: 'm2', name: 'Hotel Poseidon', role: 'Bartender', city: 'Ρόδος', color: 'bg-blue-100 text-blue-700', initials: 'HP', newCount: 0 },
  { id: 'm3', name: 'Fashion Store', role: 'Πωλητής Retail', city: 'Αθήνα', color: 'bg-pink-100 text-pink-700', initials: 'FS', newCount: 5 },
  { id: 'm4', name: 'Express Logistics', role: 'Αποθηκάριος', city: 'Θεσ/νίκη', color: 'bg-emerald-100 text-emerald-700', initials: 'EL', newCount: 0 },
];

export default function MatchesPage() {
  return (
    <div className="h-full flex flex-col bg-white overflow-y-auto">
      {/* Header */}
      <div className="px-4 pt-6 pb-4 bg-gradient-to-r from-pink-500 to-red-500">
        <h1 className="text-3xl font-extrabold text-white">💖 Matches</h1>
        <p className="mt-1 text-sm text-pink-100">{FALLBACK_MATCHES.length} επιχειρήσεις θέλουν να σε γνωρίσουν</p>
      </div>

      {/* New matches horizontal scroll */}
      <div className="px-4 py-5 border-b border-gray-100">
        <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-3">Νέα Matches</h3>
        <div className="flex gap-3 overflow-x-auto -mx-4 px-4 pb-2">
          {FALLBACK_MATCHES.slice(0, 4).map((m) => (
            <Link key={m.id} href="/app2/version2/chat" className="flex-shrink-0 text-center">
              <div className={`relative h-20 w-20 rounded-full ${m.color} flex items-center justify-center text-xl font-bold ring-4 ring-white shadow-md`}>
                {m.initials}
                {m.newCount > 0 && (
                  <span className="absolute -top-1 -right-1 h-6 w-6 rounded-full bg-red-500 text-white text-xs font-bold flex items-center justify-center ring-2 ring-white">
                    {m.newCount}
                  </span>
                )}
              </div>
              <p className="mt-2 text-[11px] font-semibold text-gray-700 w-20 truncate">{m.name}</p>
            </Link>
          ))}
        </div>
      </div>

      {/* Match list */}
      <div className="flex-1 px-4 py-4">
        <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-3">Όλα τα Matches</h3>
        <div className="space-y-2">
          {FALLBACK_MATCHES.map((m) => (
            <Link key={m.id} href="/app2/version2/chat" className="flex items-center gap-3 p-3 rounded-2xl hover:bg-gray-50 transition-colors">
              <div className={`h-14 w-14 rounded-full ${m.color} flex items-center justify-center text-base font-bold`}>
                {m.initials}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-gray-900 truncate">{m.name}</p>
                <p className="text-sm text-gray-500 truncate">{m.role} · {m.city}</p>
              </div>
              {m.newCount > 0 && (
                <span className="h-2.5 w-2.5 rounded-full bg-blue-500" />
              )}
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
