'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { adminApi } from '@/components/admin/lib/admin-api';
import { Spinner } from '@/components/ui/spinner';

interface Item {
  n: number;
  name: string;
  when: string;
  src: string;
  note: string | null;
  isNew: boolean;
  cooldown: string | null;
  subject: string;
  html: string;
}

interface Group {
  group: string;
  items: Item[];
}

export default function AdminEmailsPage() {
  const [groups, setGroups] = useState<Group[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  // Ποιο email είναι ανοιχτό σε μεγέθυνση. Αντικαθιστά το παλιό «άνοιγμα σε
  // δικό του παράθυρο», που στηριζόταν σε δημόσιο αρχείο — αρχεία δεν υπάρχουν
  // πια, οπότε η μεγέθυνση γίνεται εδώ μέσα.
  const [zoom, setZoom] = useState<Item | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const data = await adminApi.getEmailPreviews();
        setGroups(data.groups);
        setTotal(data.total);
      } catch (err: any) {
        toast.error(err?.message || 'Αποτυχία φόρτωσης');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // Το Escape κλείνει τη μεγέθυνση, όπως σε κάθε άλλο παράθυρο της σελίδας.
  useEffect(() => {
    if (!zoom) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setZoom(null);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [zoom]);

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Spinner className="h-7 w-7" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
        <p className="text-sm text-gray-700">
          <b>{total} διαφορετικά email.</b> Δεν είναι μακέτες: παράγονται από τον ίδιο κώδικα
          (<code className="rounded bg-gray-100 px-1 text-xs">lib/email.ts</code> +{' '}
          <code className="rounded bg-gray-100 px-1 text-xs">lib/notify.ts</code>) που στέλνει τα
          αληθινά. Ό,τι βλέπεις εδώ είναι ακριβώς αυτό που φτάνει στο inbox.
        </p>
        <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
          <b>Τα ονόματα είναι φανταστικά.</b> «Νίκος Παπαδόπουλος», «Καφέ Ακρογιάλι» και οι
          ημερομηνίες μπαίνουν μόνο για να φαίνεται πώς δείχνει το email γεμάτο. Κανένα αληθινό
          στοιχείο πελάτη.
        </div>
        <p className="mt-3 text-xs text-gray-500">
          🔒 Η σελίδα δεν είναι δημόσια: τα δείγματα κατεβαίνουν από τον server μόνο με
          λογαριασμό διαχειριστή.
        </p>
      </div>

      {groups.map((g) => (
        <section key={g.group}>
          <h2 className="mb-3 border-b-2 border-gray-200 pb-2 text-base font-bold text-gray-900">
            {g.group}
          </h2>
          <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
            {g.items.map((it) => (
              <article
                key={it.n}
                className="flex flex-col rounded-xl border border-gray-200 bg-white p-4 shadow-sm"
              >
                <header className="mb-2 flex items-start gap-3">
                  <span className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg bg-blue-600 text-xs font-extrabold text-white">
                    {it.n}
                  </span>
                  <div className="min-w-0">
                    <h3 className="text-sm font-semibold leading-snug text-gray-900">
                      {it.name}
                      {it.isNew && (
                        <span className="ml-1.5 rounded-full bg-emerald-100 px-1.5 py-0.5 text-[10px] font-bold text-emerald-800">
                          ΝΕΟ
                        </span>
                      )}
                    </h3>
                    <p className="mt-0.5 text-xs text-gray-500">{it.when}</p>
                  </div>
                </header>

                <p className="mb-2 break-words rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-xs text-gray-700">
                  <b>Θέμα:</b> {it.subject}
                </p>

                {it.note && (
                  <p className="mb-2 rounded-r-lg border-l-[3px] border-orange-300 bg-orange-50 px-3 py-2 text-xs text-orange-900">
                    {it.note}
                  </p>
                )}

                <div className="mb-3 flex flex-wrap gap-1.5">
                  {it.cooldown && (
                    <span className="rounded-full bg-indigo-50 px-2.5 py-0.5 font-mono text-[11px] text-indigo-800">
                      φρένο: {it.cooldown}
                    </span>
                  )}
                  <span className="rounded-full bg-indigo-50 px-2.5 py-0.5 font-mono text-[11px] text-indigo-800">
                    κώδικας: {it.src}
                  </span>
                </div>

                <div className="h-[420px] overflow-hidden rounded-lg border border-gray-200 bg-gray-100">
                  <iframe
                    srcDoc={it.html}
                    loading="lazy"
                    title={it.name}
                    className="h-full w-full border-0"
                  />
                </div>

                <button
                  onClick={() => setZoom(it)}
                  className="mt-2 self-start text-xs font-semibold text-blue-600 hover:underline"
                >
                  Άνοιγμα σε μεγέθυνση ↗
                </button>
              </article>
            ))}
          </div>
        </section>
      ))}

      <p className="pt-2 text-xs text-gray-400">
        Παράγεται από <code>apps/api/scripts/gen-email-preview.mjs</code> · Αποστολέας: StaffNow
        &lt;no-reply@staffnow.gr&gt; μέσω Resend · «φρένο» = πόση ώρα πρέπει να περάσει πριν σταλεί
        δεύτερο email της ίδιας κατηγορίας στο ίδιο άτομο.
      </p>

      {zoom && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
          onClick={() => setZoom(null)}
        >
          <div
            className="flex h-full max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-xl bg-white shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between gap-3 border-b border-gray-200 px-4 py-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-gray-900">{zoom.name}</p>
                <p className="truncate text-xs text-gray-500">{zoom.subject}</p>
              </div>
              <button
                onClick={() => setZoom(null)}
                className="flex-shrink-0 rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50"
              >
                Κλείσιμο
              </button>
            </div>
            <iframe
              srcDoc={zoom.html}
              title={zoom.name}
              className="w-full flex-1 border-0 bg-gray-100"
            />
          </div>
        </div>
      )}
    </div>
  );
}
