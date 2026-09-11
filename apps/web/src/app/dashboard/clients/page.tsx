'use client';

/**
 * «Πελάτες» — ο πίνακας ελέγχου του γραφείου εύρεσης εργασίας.
 *
 * Κάθε πελάτης είναι μια εταιρεία για την οποία το γραφείο βγάζει αγγελίες.
 * Εδώ φαίνονται όλοι μαζί με αριθμούς: ανοιχτές θέσεις, υποψήφιοι που έδειξαν
 * ενδιαφέρον, matches, προσλήψεις. Από εδώ ανοίγει και νέα αγγελία «για
 * λογαριασμό» πελάτη. Οι πελάτες είναι τεχνικά τα «υποκαταστήματα» του
 * λογαριασμού — ίδιος μηχανισμός, άλλο όνομα.
 */

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import { useAuth } from '@/lib/auth-context';
import { api } from '@/lib/api';
import { Spinner } from '@/components/ui/spinner';
import { BUSINESS_TYPE_LABELS_EL } from '@staffnow/config';

interface Client {
  id: string;
  name: string;
  business_type: string;
  city: string | null;
  region: string | null;
  logo_url: string | null;
  jobs_total: number;
  jobs_open: number;
  applicants: number;
  matches: number;
  hires: number;
}

interface Overview {
  agency: { agency_name: string | null; license_no: string | null; website: string | null; contact_person: string | null };
  clients: Client[];
  totals: { clients: number; jobsOpen: number; jobsUnassigned: number; applicants: number; matches: number; hires: number };
}

export default function ClientsPage() {
  const { user, profile, refreshUser } = useAuth();
  const [data, setData] = useState<Overview | null>(null);
  const [loading, setLoading] = useState(true);
  const [notAgency, setNotAgency] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [showAgencyForm, setShowAgencyForm] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = (await api.agency.overview()) as any;
      if (res?.success) {
        setData(res.data);
        setNotAgency(false);
      }
    } catch (err: any) {
      if (String(err?.message || '').includes('γραφείο')) setNotAgency(true);
      else toast.error(err?.message || 'Δεν φορτώθηκαν οι πελάτες');
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => { load(); }, [load]);

  if (user && user.role !== 'business') {
    return <p className="text-sm text-gray-500">Η σελίδα αφορά γραφεία εύρεσης εργασίας.</p>;
  }

  if (loading && !data) return <div className="flex justify-center py-12"><Spinner className="h-8 w-8" /></div>;

  if (notAgency) {
    return (
      <div className="rounded-2xl border border-indigo-200 bg-indigo-50 p-6">
        <h1 className="text-xl font-bold text-gray-900">Είσαι γραφείο εύρεσης εργασίας;</h1>
        <p className="mt-2 text-sm text-gray-600">
          Ενεργοποίησε τη λειτουργία «Πελάτες»: θα μπορείς να καταχωρείς τις εταιρείες για τις οποίες ψάχνεις προσωπικό,
          να βγάζεις αγγελίες στο όνομά τους και να βλέπεις υποψηφίους, matches και προσλήψεις ανά πελάτη.
        </p>
        <button
          onClick={async () => {
            try {
              await api.agency.enable({ agencyName: (profile as any)?.company_name || undefined });
              await refreshUser();
              await load();
              toast.success('Έτοιμο! Ο λογαριασμός σου είναι πλέον γραφείο εύρεσης εργασίας.');
            } catch (err: any) {
              toast.error(err?.message || 'Σφάλμα');
            }
          }}
          className="mt-4 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700"
        >
          Ενεργοποίηση
        </button>
      </div>
    );
  }

  if (!data) return null;
  const { totals, clients, agency } = data;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Πελάτες</h1>
          <p className="text-sm text-gray-500">
            {agency.agency_name || (profile as any)?.company_name || 'Το γραφείο σου'}
            {agency.license_no ? ` · άδεια ${agency.license_no}` : ''}
            {' · '}
            <button onClick={() => setShowAgencyForm((v) => !v)} className="text-blue-600 hover:underline">
              στοιχεία γραφείου
            </button>
          </p>
        </div>
        <button onClick={() => setShowAdd(true)} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700">
          + Νέος πελάτης
        </button>
      </div>

      {showAgencyForm && <AgencyForm agency={agency} onSaved={() => { setShowAgencyForm(false); load(); refreshUser(); }} />}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        <Stat label="Πελάτες" value={totals.clients} />
        <Stat label="Ανοιχτές θέσεις" value={totals.jobsOpen} />
        <Stat label="Υποψήφιοι" value={totals.applicants} hint="δήλωσαν ενδιαφέρον" />
        <Stat label="Matches" value={totals.matches} />
        <Stat label="Προσλήψεις" value={totals.hires} hint="επιβεβαιωμένες" />
      </div>

      {totals.jobsUnassigned > 0 && (
        <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
          {totals.jobsUnassigned} {totals.jobsUnassigned === 1 ? 'αγγελία δεν είναι' : 'αγγελίες δεν είναι'} συνδεδεμένη με πελάτη. Άνοιξέ τες από τις{' '}
          <Link href="/dashboard/jobs" className="underline">Αγγελίες</Link> και διάλεξε επιχείρηση.
        </p>
      )}

      {clients.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-gray-300 p-8 text-center">
          <p className="text-3xl">🏢</p>
          <p className="mt-2 font-semibold text-gray-900">Κανένας πελάτης ακόμη</p>
          <p className="text-sm text-gray-500">Πρόσθεσε την πρώτη εταιρεία για την οποία ψάχνεις προσωπικό.</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-gray-200 bg-white shadow-sm">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                <th className="px-4 py-3">Πελάτης</th>
                <th className="px-4 py-3">Θέσεις</th>
                <th className="px-4 py-3">Υποψήφιοι</th>
                <th className="px-4 py-3">Matches</th>
                <th className="px-4 py-3">Προσλήψεις</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {clients.map((cl) => (
                <tr key={cl.id} className="border-b border-gray-50">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      {cl.logo_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={cl.logo_url} alt="" className="h-10 w-10 rounded-lg object-cover ring-1 ring-gray-100" />
                      ) : (
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-100 font-bold text-indigo-700">{cl.name?.[0]?.toUpperCase() || '?'}</div>
                      )}
                      <div className="min-w-0">
                        <p className="truncate font-semibold text-gray-900">{cl.name}</p>
                        <p className="truncate text-xs text-gray-500">
                          {BUSINESS_TYPE_LABELS_EL[cl.business_type] || cl.business_type}
                          {cl.city || cl.region ? ` · ${[cl.city, cl.region].filter(Boolean).join(', ')}` : ''}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 tabular-nums">
                    <span className="font-semibold text-gray-900">{cl.jobs_open}</span>
                    <span className="text-xs text-gray-400"> / {cl.jobs_total}</span>
                  </td>
                  <td className="px-4 py-3 tabular-nums">{cl.applicants}</td>
                  <td className="px-4 py-3 tabular-nums">{cl.matches}</td>
                  <td className="px-4 py-3 tabular-nums">{cl.hires}</td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap justify-end gap-2">
                      <Link href={`/dashboard/jobs?branch=${encodeURIComponent(cl.id)}`} className="rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-700">
                        + Αγγελία
                      </Link>
                      <Link href="/dashboard/profile" className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50">
                        Επεξεργασία
                      </Link>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <p className="text-xs text-gray-400">
        Οι υποψήφιοι βλέπουν την αγγελία με το όνομα και το λογότυπο του πελάτη. Η επικοινωνία, τα matches και οι προσλήψεις γίνονται από τον δικό σου λογαριασμό.
      </p>

      {showAdd && <AddClientModal onClose={() => setShowAdd(false)} onAdded={() => { setShowAdd(false); load(); }} />}
    </div>
  );
}

function Stat({ label, value, hint }: { label: string; value: number; hint?: string }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">{label}</p>
      <p className="mt-1 text-2xl font-extrabold text-gray-900">{value}</p>
      {hint && <p className="text-[11px] text-gray-400">{hint}</p>}
    </div>
  );
}

function AgencyForm({ agency, onSaved }: { agency: Overview['agency']; onSaved: () => void }) {
  const [form, setForm] = useState({
    agencyName: agency.agency_name || '',
    licenseNo: agency.license_no || '',
    website: agency.website || '',
    contactPerson: agency.contact_person || '',
  });
  const [saving, setSaving] = useState(false);
  const input = 'w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-blue-400 focus:outline-none';
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
      <h2 className="font-bold text-gray-900">Στοιχεία γραφείου</h2>
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <label className="text-xs font-semibold text-gray-600">Επωνυμία<input className={input} value={form.agencyName} onChange={(e) => setForm({ ...form, agencyName: e.target.value })} /></label>
        <label className="text-xs font-semibold text-gray-600">Αριθμός άδειας (προαιρετικό)<input className={input} value={form.licenseNo} onChange={(e) => setForm({ ...form, licenseNo: e.target.value })} /></label>
        <label className="text-xs font-semibold text-gray-600">Ιστοσελίδα<input className={input} value={form.website} onChange={(e) => setForm({ ...form, website: e.target.value })} /></label>
        <label className="text-xs font-semibold text-gray-600">Υπεύθυνος επικοινωνίας<input className={input} value={form.contactPerson} onChange={(e) => setForm({ ...form, contactPerson: e.target.value })} /></label>
      </div>
      <div className="mt-3 flex justify-end">
        <button
          disabled={saving}
          onClick={async () => {
            setSaving(true);
            try {
              await api.agency.updateProfile(form);
              toast.success('Αποθηκεύτηκε');
              onSaved();
            } catch (err: any) {
              toast.error(err?.message || 'Σφάλμα');
            } finally {
              setSaving(false);
            }
          }}
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
        >
          {saving ? 'Αποθήκευση…' : 'Αποθήκευση'}
        </button>
      </div>
    </div>
  );
}

function AddClientModal({ onClose, onAdded }: { onClose: () => void; onAdded: () => void }) {
  const [form, setForm] = useState({ name: '', business_type: 'other', city: '', region: '', website: '' });
  const [saving, setSaving] = useState(false);
  const input = 'w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-blue-400 focus:outline-none';
  const submit = async () => {
    if (!form.name.trim()) {
      toast.error('Γράψε το όνομα της εταιρείας.');
      return;
    }
    setSaving(true);
    try {
      const res = (await api.branches.create(form)) as any;
      if (!res?.success) throw new Error(res?.error?.message || 'Δεν αποθηκεύτηκε');
      toast.success('Ο πελάτης προστέθηκε');
      onAdded();
    } catch (err: any) {
      toast.error(err?.message || 'Σφάλμα');
    } finally {
      setSaving(false);
    }
  };
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center" onClick={onClose}>
      <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-2xl" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
        <h2 className="text-lg font-bold text-gray-900">Νέος πελάτης</h2>
        <p className="mt-1 text-xs text-gray-500">Λογότυπο, περιγραφή και παροχές μπορείς να προσθέσεις μετά από το Προφίλ › Επιχειρήσεις.</p>
        <div className="mt-4 space-y-3">
          <label className="block text-xs font-semibold text-gray-600">Εταιρεία<input className={input} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="π.χ. Ξενοδοχείο Ακτή" autoFocus /></label>
          <label className="block text-xs font-semibold text-gray-600">
            Είδος
            <select className={input} value={form.business_type} onChange={(e) => setForm({ ...form, business_type: e.target.value })}>
              {Object.entries(BUSINESS_TYPE_LABELS_EL).map(([v, l]) => (
                <option key={v} value={v}>{l}</option>
              ))}
            </select>
          </label>
          <div className="grid grid-cols-2 gap-3">
            <label className="block text-xs font-semibold text-gray-600">Πόλη<input className={input} value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} /></label>
            <label className="block text-xs font-semibold text-gray-600">Περιοχή<input className={input} value={form.region} onChange={(e) => setForm({ ...form, region: e.target.value })} /></label>
          </div>
          <label className="block text-xs font-semibold text-gray-600">Ιστοσελίδα (προαιρετικό)<input className={input} value={form.website} onChange={(e) => setForm({ ...form, website: e.target.value })} /></label>
        </div>
        <div className="mt-4 flex justify-end gap-2">
          <button onClick={onClose} className="rounded-lg px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100">Άκυρο</button>
          <button onClick={submit} disabled={saving} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50">
            {saving ? 'Αποθήκευση…' : 'Προσθήκη'}
          </button>
        </div>
      </div>
    </div>
  );
}
