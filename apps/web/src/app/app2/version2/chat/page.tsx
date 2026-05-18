'use client';

import { useState } from 'react';

const FALLBACK_CHATS = [
  { id: 'c1', name: 'Sunset Beach Bar', lastMsg: 'Μπορείς να έρθεις αύριο για συνέντευξη;', time: '2 λ', unread: 2, color: 'bg-amber-100 text-amber-700', initials: 'SB' },
  { id: 'c2', name: 'Hotel Poseidon', lastMsg: 'Ευχαριστούμε για το ενδιαφέρον!', time: '1ω', unread: 0, color: 'bg-blue-100 text-blue-700', initials: 'HP' },
  { id: 'c3', name: 'Fashion Store', lastMsg: 'Πότε ξεκινάς;', time: '3ω', unread: 5, color: 'bg-pink-100 text-pink-700', initials: 'FS' },
  { id: 'c4', name: 'Express Logistics', lastMsg: 'Ok, θα επικοινωνήσουμε σύντομα', time: '1μ', unread: 0, color: 'bg-emerald-100 text-emerald-700', initials: 'EL' },
];

export default function ChatPage() {
  const [search, setSearch] = useState('');
  const [open, setOpen] = useState<string | null>(null);

  const filtered = FALLBACK_CHATS.filter((c) =>
    c.name.toLowerCase().includes(search.toLowerCase())
  );

  if (open) {
    const chat = FALLBACK_CHATS.find((c) => c.id === open);
    return (
      <div className="h-full flex flex-col bg-white">
        {/* Header */}
        <div className="flex-shrink-0 flex items-center gap-3 px-4 py-3 border-b border-gray-100">
          <button onClick={() => setOpen(null)} className="p-1.5 -ml-1.5">
            <svg className="h-6 w-6 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <div className={`h-10 w-10 rounded-full ${chat?.color} flex items-center justify-center font-bold`}>
            {chat?.initials}
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-gray-900 truncate">{chat?.name}</p>
            <p className="text-[11px] text-emerald-500 flex items-center gap-1">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
              online
            </p>
          </div>
          <button className="p-2 rounded-full bg-emerald-50 text-emerald-600">
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
              <path strokeLinecap="round" d="M15.75 10.5l4.72-4.72a.75.75 0 011.28.53v11.38a.75.75 0 01-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 002.25-2.25v-9a2.25 2.25 0 00-2.25-2.25h-9A2.25 2.25 0 002.25 7.5v9a2.25 2.25 0 002.25 2.25z" />
            </svg>
          </button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50">
          <div className="flex justify-start">
            <div className="bg-white rounded-2xl rounded-bl-md px-4 py-2.5 shadow-sm max-w-[75%]">
              <p className="text-sm">Γεια σου! Είδα το προφίλ σου και μας ενδιαφέρει.</p>
              <p className="text-[10px] text-gray-400 mt-1 text-right">10:15</p>
            </div>
          </div>
          <div className="flex justify-end">
            <div className="bg-blue-600 text-white rounded-2xl rounded-br-md px-4 py-2.5 shadow-sm max-w-[75%]">
              <p className="text-sm">Ευχαριστώ! Είμαι άμεσα διαθέσιμος.</p>
              <p className="text-[10px] text-blue-100 mt-1 text-right">10:17</p>
            </div>
          </div>
          <div className="flex justify-start">
            <div className="bg-white rounded-2xl rounded-bl-md px-4 py-2.5 shadow-sm max-w-[75%]">
              <p className="text-sm">{chat?.lastMsg}</p>
              <p className="text-[10px] text-gray-400 mt-1 text-right">10:20</p>
            </div>
          </div>
        </div>

        {/* Input */}
        <div className="flex-shrink-0 flex items-center gap-2 px-3 py-2.5 border-t border-gray-100 bg-white">
          <button className="p-2 text-gray-500">
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
              <path strokeLinecap="round" d="M18.375 12.739l-7.693 7.693a4.5 4.5 0 01-6.364-6.364l10.94-10.94A3 3 0 1119.5 7.372L8.552 18.32m.009-.01l-.01.01m5.699-9.941l-7.81 7.81a1.5 1.5 0 002.122 2.122l7.81-7.81" />
            </svg>
          </button>
          <input
            type="text"
            placeholder="Μήνυμα..."
            className="flex-1 rounded-full bg-gray-100 px-4 py-2.5 text-sm outline-none focus:bg-white focus:ring-2 focus:ring-blue-500/30"
          />
          <button className="h-10 w-10 rounded-full bg-blue-600 text-white flex items-center justify-center">
            <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
            </svg>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-white">
      {/* Header */}
      <div className="flex-shrink-0 px-4 pt-6 pb-4">
        <h1 className="text-3xl font-extrabold text-gray-900">💬 Συνομιλίες</h1>
        <div className="mt-4 relative">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" d="M21 21l-5.2-5.2m2.2-5.3a7.5 7.5 0 11-15 0 7.5 7.5 0 0115 0z" />
          </svg>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Αναζήτηση..."
            className="w-full rounded-full bg-gray-100 pl-10 pr-4 py-2.5 text-sm outline-none"
          />
        </div>
      </div>

      {/* Chat list */}
      <div className="flex-1 overflow-y-auto">
        {filtered.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-gray-400 px-8 text-center">
            <span className="text-5xl mb-3">💬</span>
            <p className="font-semibold text-gray-600">Δεν βρέθηκαν συνομιλίες</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {filtered.map((c) => (
              <button
                key={c.id}
                onClick={() => setOpen(c.id)}
                className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors text-left"
              >
                <div className={`h-14 w-14 rounded-full ${c.color} flex items-center justify-center font-bold flex-shrink-0`}>
                  {c.initials}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <p className={`font-semibold truncate ${c.unread > 0 ? 'text-gray-900' : 'text-gray-700'}`}>{c.name}</p>
                    <span className="text-[11px] text-gray-400 ml-2 flex-shrink-0">{c.time}</span>
                  </div>
                  <div className="flex items-center justify-between mt-0.5">
                    <p className={`text-sm truncate ${c.unread > 0 ? 'text-gray-900 font-medium' : 'text-gray-500'}`}>{c.lastMsg}</p>
                    {c.unread > 0 && (
                      <span className="ml-2 h-5 min-w-[20px] px-1.5 rounded-full bg-blue-500 text-white text-[10px] font-bold flex items-center justify-center flex-shrink-0">
                        {c.unread}
                      </span>
                    )}
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
