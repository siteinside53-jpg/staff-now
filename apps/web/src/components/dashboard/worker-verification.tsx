'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Spinner } from '@/components/ui/spinner';
import { API_URL } from '@/lib/config';

type VerificationRequest = {
  id: string;
  status: 'pending' | 'approved' | 'rejected';
  rejection_reason: string | null;
  created_at: string;
};

const elDate = (s?: string | null) =>
  s ? new Date(s.replace(' ', 'T') + (s.endsWith('Z') ? '' : 'Z')).toLocaleDateString('el-GR') : '';

/** Κεφαλίδα βήματος με αριθμό ή ✓ όταν έχει ολοκληρωθεί. */
function StepHead({ n, done, title, desc }: { n: number; done: boolean; title: string; desc: string }) {
  return (
    <div className="flex items-start gap-3">
      <div
        className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full text-sm font-black ${
          done ? 'bg-emerald-500 text-white' : 'bg-gray-200 text-gray-600'
        }`}
      >
        {done ? '✓' : n}
      </div>
      <div className="min-w-0">
        <p className={`font-bold ${done ? 'text-emerald-700' : 'text-gray-900'}`}>{title}</p>
        <p className="mt-0.5 text-sm text-gray-600">{desc}</p>
      </div>
    </div>
  );
}

export function WorkerVerification() {
  const [loading, setLoading] = useState(true);
  const [verified, setVerified] = useState(false);
  const [request, setRequest] = useState<VerificationRequest | null>(null);

  // Βήμα 1 — email
  const [email, setEmail] = useState('');
  const [emailConfirmed, setEmailConfirmed] = useState(false);
  const [codeSent, setCodeSent] = useState(false);
  const [code, setCode] = useState('');
  const [sendingCode, setSendingCode] = useState(false);
  const [confirming, setConfirming] = useState(false);

  // Βήμα 2 — ταυτότητα + κινητό
  const [phone, setPhone] = useState('');
  const [docUrl, setDocUrl] = useState('');
  const [docName, setDocName] = useState('');
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = (await (api as any).workers.getVerification()) as any;
      const d = res?.data || {};
      setVerified(!!d.verified);
      setRequest(d.request || null);
      setEmail(d.email || '');
      setEmailConfirmed(!!d.emailConfirmed);
      if (d.phone) setPhone(d.phone);
    } catch {
      // Αν αποτύχει, δείχνουμε την κενή φόρμα.
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const sendCode = async () => {
    setSendingCode(true);
    try {
      await (api as any).auth.sendEmailCode();
      setCodeSent(true);
      toast.success(`Στείλαμε 6ψήφιο κωδικό στο ${email}.`);
    } catch (err: any) {
      toast.error(err?.message || 'Δεν στάλθηκε ο κωδικός.');
    } finally {
      setSendingCode(false);
    }
  };

  const confirmCode = async () => {
    if (code.length !== 6) return toast.error('Ο κωδικός είναι 6 ψηφία.');
    setConfirming(true);
    try {
      await (api as any).auth.confirmEmail({ code });
      setEmailConfirmed(true);
      setCode('');
      toast.success('Το email επιβεβαιώθηκε.');
    } catch (err: any) {
      toast.error(err?.message || 'Λάθος κωδικός.');
    } finally {
      setConfirming(false);
    }
  };

  const handleUpload = async (file: File) => {
    if (file.size > 10 * 1024 * 1024) return toast.error('Το αρχείο είναι πάνω από 10MB.');
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('category', 'verification');
      const token = localStorage.getItem('staffnow_token');
      const res = await fetch(`${API_URL}/uploads`, {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: fd,
      });
      const data = (await res.json()) as any;
      if (data?.success && data?.data?.url) {
        setDocUrl(data.data.url);
        setDocName(file.name);
        toast.success('Το έγγραφο ανέβηκε.');
      } else {
        toast.error(data?.error?.message || 'Αποτυχία μεταφόρτωσης.');
      }
    } catch {
      toast.error('Αποτυχία μεταφόρτωσης.');
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async () => {
    const cleanPhone = phone.replace(/[\s.-]/g, '').replace(/^\+30/, '');
    if (!/^69\d{8}$/.test(cleanPhone)) return toast.error('Δώσε έγκυρο κινητό (10 ψηφία, ξεκινά με 69).');
    if (!docUrl) return toast.error('Ανέβασε φωτογραφία ταυτότητας ή διαβατηρίου.');

    setSubmitting(true);
    try {
      await (api as any).workers.submitVerification({ document_url: docUrl, phone: cleanPhone });
      toast.success('Το αίτημα στάλθηκε για έλεγχο.');
      await load();
    } catch (err: any) {
      toast.error(err?.message || 'Αποτυχία υποβολής.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading)
    return (
      <div className="flex justify-center py-20">
        <Spinner className="h-8 w-8" />
      </div>
    );

  // ── Ήδη επαληθευμένος ───────────────────────────────────────────────
  if (verified)
    return (
      <div className="mx-auto max-w-2xl">
        <h1 className="mb-1 text-2xl font-bold text-gray-900">✓ Επαλήθευση</h1>
        <Card className="mt-4 border-emerald-200 bg-emerald-50">
          <CardContent className="p-6 text-center">
            <div className="text-4xl">✅</div>
            <p className="mt-2 text-lg font-bold text-emerald-900">Ο λογαριασμός σου είναι επαληθευμένος</p>
            <p className="mt-1 text-sm text-emerald-800">
              Το σήμα ✓ εμφανίζεται στο προφίλ σου και ανεβαίνεις ψηλότερα στην αναζήτηση των επιχειρήσεων.
            </p>
            <Link href="/dashboard/profile">
              <Button variant="outline" className="mt-4">Δες το προφίλ σου</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );

  const idPending = request?.status === 'pending';

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="mb-1 text-2xl font-bold text-gray-900">Επαλήθευση λογαριασμού</h1>
      <p className="mb-4 text-sm text-gray-600">
        Πάρε το σήμα ✓ — οι επιχειρήσεις εμπιστεύονται πολύ περισσότερο τα επαληθευμένα προφίλ.
      </p>

      {request?.status === 'rejected' && (
        <Card className="mb-4 border-red-200 bg-red-50">
          <CardContent className="p-4">
            <p className="text-sm font-bold text-red-900">Το προηγούμενο αίτημα απορρίφθηκε</p>
            {request.rejection_reason && <p className="mt-1 text-sm text-red-800">{request.rejection_reason}</p>}
            <p className="mt-1 text-xs text-red-700">Μπορείς να υποβάλεις ξανά με σωστά στοιχεία.</p>
          </CardContent>
        </Card>
      )}

      {/* ── Βήμα 1: email ─────────────────────────────────────────────── */}
      <Card className={`mb-4 ${emailConfirmed ? 'border-emerald-200 bg-emerald-50/50' : ''}`}>
        <CardContent className="space-y-4 p-5">
          <StepHead
            n={1}
            done={emailConfirmed}
            title="Επαλήθευση email"
            desc={emailConfirmed ? `Το ${email} επιβεβαιώθηκε.` : `Στέλνουμε 6ψήφιο κωδικό στο ${email}.`}
          />

          {!emailConfirmed && (
            <div className="pl-11">
              {!codeSent ? (
                <Button onClick={sendCode} disabled={sendingCode} variant="outline">
                  {sendingCode ? 'Αποστολή…' : 'Στείλε μου κωδικό'}
                </Button>
              ) : (
                <div className="flex flex-wrap items-center gap-2">
                  <Input
                    inputMode="numeric"
                    maxLength={6}
                    placeholder="000000"
                    value={code}
                    onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
                    className="w-32 text-center text-lg font-bold tracking-[0.3em]"
                  />
                  <Button onClick={confirmCode} disabled={confirming}>
                    {confirming ? 'Έλεγχος…' : 'Επιβεβαίωση'}
                  </Button>
                  <button
                    type="button"
                    onClick={sendCode}
                    disabled={sendingCode}
                    className="text-xs font-medium text-blue-600 hover:underline disabled:opacity-50"
                  >
                    Ξαναστείλε
                  </button>
                </div>
              )}
              <p className="mt-2 text-xs text-gray-500">Ο κωδικός ισχύει για 15 λεπτά.</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Βήμα 2: ταυτότητα + κινητό ────────────────────────────────── */}
      <Card className={idPending ? 'border-amber-200 bg-amber-50/60' : ''}>
        <CardContent className="space-y-4 p-5">
          <StepHead
            n={2}
            done={false}
            title="Ταυτότητα και κινητό"
            desc={
              idPending
                ? `Υποβλήθηκε στις ${elDate(request?.created_at)} — είναι υπό έλεγχο από την ομάδα μας.`
                : 'Η ομάδα μας ελέγχει το έγγραφο και το τηλέφωνο πριν δώσει το σήμα ✓.'
            }
          />

          {idPending ? (
            <div className="pl-11 text-sm text-amber-800">
              📨 Θα δεις το σήμα ✓ στο προφίλ σου μόλις εγκριθεί. Δεν χρειάζεται να κάνεις κάτι άλλο.
            </div>
          ) : (
            <div className="space-y-4 pl-11">
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Κινητό τηλέφωνο *</label>
                <Input
                  inputMode="tel"
                  maxLength={10}
                  placeholder="6912345678"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                />
                <p className="mt-1 text-xs text-gray-500">
                  Δεν εμφανίζεται δημόσια. Χρησιμοποιείται μόνο για τον έλεγχο και για επικοινωνία μετά από match.
                </p>
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Ταυτότητα ή διαβατήριο *</label>
                {/* Κρυφό input + label-κουμπί: το native file input δείχνει το
                    «Δεν επιλέχθηκε αρχείο» του browser, που κόβεται άσχημα στο κινητό. */}
                <label
                  className={`flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl border-2 border-dashed border-gray-300 bg-gray-50 px-4 py-4 text-sm font-bold text-gray-700 transition-colors hover:border-blue-400 hover:bg-blue-50 ${
                    uploading ? 'pointer-events-none opacity-50' : ''
                  }`}
                >
                  <span className="text-lg">📎</span>
                  <span>{docUrl ? 'Άλλαξε αρχείο' : 'Επιλογή αρχείου'}</span>
                  <input
                    type="file"
                    accept="image/*,application/pdf"
                    disabled={uploading}
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) handleUpload(f);
                    }}
                    className="hidden"
                  />
                </label>
                <p className="mt-1 text-xs text-gray-500">
                  Καθαρή φωτογραφία της μπροστινής όψης (PDF ή εικόνα, έως 10MB).
                </p>
                {uploading && <p className="mt-2 text-xs text-blue-600">Ανεβαίνει…</p>}
                {docUrl && !uploading && (
                  <p className="mt-2 text-xs font-medium text-emerald-600">✓ Ανέβηκε: {docName}</p>
                )}
              </div>

              <Button onClick={handleSubmit} disabled={submitting || uploading} size="lg" className="w-full">
                {submitting ? 'Υποβολή…' : 'Υποβολή για έλεγχο'}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <p className="mt-4 text-center text-xs text-gray-500">
        Τα έγγραφα χρησιμοποιούνται μόνο για τον έλεγχο ταυτοπροσωπίας και δεν εμφανίζονται ποτέ δημόσια.
      </p>
    </div>
  );
}
