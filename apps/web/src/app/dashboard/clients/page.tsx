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
import { useT } from '@/i18n/locale-provider';
import { useLabels } from '@/i18n/labels';

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
  const t = useT();
  const labels = useLabels();
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
      // Χωρίς `agency` μέσα στην απάντηση δεν είναι γραφείο — δεν ζωγραφίζουμε
      // τίποτα που θα έσκαγε διαβάζοντας agency.agency_name.
      if (res?.success && res.data?.agency) {
        setData(res.data);
        setNotAgency(false);
      } else if (res?.success) {
        setNotAgency(true);
      }
    } catch (err: any) {
      if (String(err?.message || '').includes('γραφείο')) setNotAgency(true);
      else toast.error(err?.message || t('clientsPage.loadFailed'));
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => { load(); }, [load]);

  if (user && user.role !== 'business') {
    return <p className="text-sm text-gray-500">{t('clientsPage.agenciesOnly')}</p>;
  }

  if (loading && !data) return <div className="flex justify-center py-12"><Spinner className="h-8 w-8" /></div>;

  if (notAgency) {
    return (
      <div className="rounded-2xl border border-indigo-200 bg-indigo-50 p-6">
        <h1 className="text-xl font-bold text-gray-900">{t('clientsPage.areYouAgency')}</h1>
        <p className="mt-2 text-sm text-gray-600">
          {t('clientsPage.enableDesc')}
        </p>
        <button
          onClick={async () => {
            try {
              await api.agency.enable({ agencyName: (profile as any)?.company_name || undefined });
              await refreshUser();
              await load();
              toast.success(t('clientsPage.enabled'));
            } catch (err: any) {
              toast.error(err?.message || t('clientsPage.error'));
            }
          }}
          className="mt-4 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700"
        >
          {t('clientsPage.enable')}
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
          <h1 className="text-2xl font-bold text-gray-900">{t('clientsPage.title')}</h1>
          <p className="text-sm text-gray-500">
            {agency.agency_name || (profile as any)?.company_name || t('clientsPage.yourAgency')}
            {agency.license_no ? t('clientsPage.licence', { no: agency.license_no }) : ''}
            {' · '}
            <button onClick={() => setShowAgencyForm((v) => !v)} className="text-blue-600 hover:underline">
              {t('clientsPage.agencyDetails')}
            </button>
          </p>
        </div>
        <button onClick={() => setShowAdd(true)} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700">
          {t('clientsPage.newClient')}
        </button>
      </div>

      {showAgencyForm && <AgencyForm agency={agency} onSaved={() => { setShowAgencyForm(false); load(); refreshUser(); }} />}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        <Stat label={t('clientsPage.statClients')} value={totals.clients} />
        <Stat label={t('clientsPage.statOpenJobs')} value={totals.jobsOpen} />
        <Stat label={t('clientsPage.statApplicants')} value={totals.applicants} hint={t('clientsPage.statApplicantsHint')} />
        <Stat label={t('clientsPage.statMatches')} value={totals.matches} />
        <Stat label={t('clientsPage.statHires')} value={totals.hires} hint={t('clientsPage.statHiresHint')} />
      </div>

      {totals.jobsUnassigned > 0 && (
        <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
          {totals.jobsUnassigned === 1
            ? t('clientsPage.unassignedOne', { count: totals.jobsUnassigned })
            : t('clientsPage.unassignedMany', { count: totals.jobsUnassigned })}{' '}
          <Link href="/dashboard/jobs" className="underline">{t('clientsPage.jobsLink')}</Link> {t('clientsPage.unassignedSuffix')}
        </p>
      )}

      {clients.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-gray-300 p-8 text-center">
          <p className="text-3xl">🏢</p>
          <p className="mt-2 font-semibold text-gray-900">{t('clientsPage.emptyTitle')}</p>
          <p className="text-sm text-gray-500">{t('clientsPage.emptyDesc')}</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-gray-200 bg-white shadow-sm">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                <th className="px-4 py-3">{t('clientsPage.thClient')}</th>
                <th className="px-4 py-3">{t('clientsPage.thJobs')}</th>
                <th className="px-4 py-3">{t('clientsPage.thApplicants')}</th>
                <th className="px-4 py-3">{t('clientsPage.thMatches')}</th>
                <th className="px-4 py-3">{t('clientsPage.thHires')}</th>
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
                          {labels.businessType(cl.business_type)}
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
                        {t('clientsPage.addJob')}
                      </Link>
                      <Link href="/dashboard/profile" className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50">
                        {t('clientsPage.edit')}
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
        {t('clientsPage.footnote')}
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
  const t = useT();
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
      <h2 className="font-bold text-gray-900">{t('clientsPage.agencyFormTitle')}</h2>
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <label className="text-xs font-semibold text-gray-600">{t('clientsPage.agencyName')}<input className={input} value={form.agencyName} onChange={(e) => setForm({ ...form, agencyName: e.target.value })} /></label>
        <label className="text-xs font-semibold text-gray-600">{t('clientsPage.licenceNo')}<input className={input} value={form.licenseNo} onChange={(e) => setForm({ ...form, licenseNo: e.target.value })} /></label>
        <label className="text-xs font-semibold text-gray-600">{t('clientsPage.website')}<input className={input} value={form.website} onChange={(e) => setForm({ ...form, website: e.target.value })} /></label>
        <label className="text-xs font-semibold text-gray-600">{t('clientsPage.contactPerson')}<input className={input} value={form.contactPerson} onChange={(e) => setForm({ ...form, contactPerson: e.target.value })} /></label>
      </div>
      <div className="mt-3 flex justify-end">
        <button
          disabled={saving}
          onClick={async () => {
            setSaving(true);
            try {
              await api.agency.updateProfile(form);
              toast.success(t('clientsPage.saved'));
              onSaved();
            } catch (err: any) {
              toast.error(err?.message || t('clientsPage.error'));
            } finally {
              setSaving(false);
            }
          }}
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
        >
          {saving ? t('clientsPage.saving') : t('clientsPage.save')}
        </button>
      </div>
    </div>
  );
}

function AddClientModal({ onClose, onAdded }: { onClose: () => void; onAdded: () => void }) {
  const t = useT();
  const labels = useLabels();
  const [form, setForm] = useState({ name: '', business_type: 'other', city: '', region: '', website: '' });
  const [saving, setSaving] = useState(false);
  const input = 'w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-blue-400 focus:outline-none';
  const submit = async () => {
    if (!form.name.trim()) {
      toast.error(t('clientsPage.nameRequired'));
      return;
    }
    setSaving(true);
    try {
      const res = (await api.branches.create(form)) as any;
      if (!res?.success) throw new Error(res?.error?.message || t('clientsPage.notSaved'));
      toast.success(t('clientsPage.clientAdded'));
      onAdded();
    } catch (err: any) {
      toast.error(err?.message || t('clientsPage.error'));
    } finally {
      setSaving(false);
    }
  };
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center" onClick={onClose}>
      <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-2xl" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
        <h2 className="text-lg font-bold text-gray-900">{t('clientsPage.newClientTitle')}</h2>
        <p className="mt-1 text-xs text-gray-500">{t('clientsPage.newClientHint')}</p>
        <div className="mt-4 space-y-3">
          <label className="block text-xs font-semibold text-gray-600">{t('clientsPage.company')}<input className={input} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder={t('clientsPage.companyPlaceholder')} autoFocus /></label>
          <label className="block text-xs font-semibold text-gray-600">
            {t('clientsPage.type')}
            <select className={input} value={form.business_type} onChange={(e) => setForm({ ...form, business_type: e.target.value })}>
              {Object.keys(BUSINESS_TYPE_LABELS_EL).map((v) => (
                <option key={v} value={v}>{labels.businessType(v)}</option>
              ))}
            </select>
          </label>
          <div className="grid grid-cols-2 gap-3">
            <label className="block text-xs font-semibold text-gray-600">{t('clientsPage.city')}<input className={input} value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} /></label>
            <label className="block text-xs font-semibold text-gray-600">{t('clientsPage.region')}<input className={input} value={form.region} onChange={(e) => setForm({ ...form, region: e.target.value })} /></label>
          </div>
          <label className="block text-xs font-semibold text-gray-600">{t('clientsPage.websiteOptional')}<input className={input} value={form.website} onChange={(e) => setForm({ ...form, website: e.target.value })} /></label>
        </div>
        <div className="mt-4 flex justify-end gap-2">
          <button onClick={onClose} className="rounded-lg px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100">{t('clientsPage.cancel')}</button>
          <button onClick={submit} disabled={saving} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50">
            {saving ? t('clientsPage.saving') : t('clientsPage.add')}
          </button>
        </div>
      </div>
    </div>
  );
}
