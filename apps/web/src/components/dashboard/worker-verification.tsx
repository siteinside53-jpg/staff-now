'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
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

type DocKind = 'id' | 'passport' | 'license';

const DOC_KINDS: { id: DocKind; label: string; icon: string }[] = [
  { id: 'id', label: 'Ταυτότητα', icon: '🪪' },
  { id: 'passport', label: 'Διαβατήριο', icon: '📘' },
  { id: 'license', label: 'Δίπλωμα οδήγησης', icon: '🚗' },
];

/** Στο διαβατήριο όλα τα στοιχεία είναι στη σελίδα με τη φωτογραφία. */
const backRequired = (kind: DocKind) => kind !== 'passport';

const frontLabel = (kind: DocKind) =>
  kind === 'passport' ? 'Σελίδα με τη φωτογραφία *' : 'Μπροστινή όψη *';

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

/**
 * Κουτί ανεβάσματος μιας όψης. Δείχνει μικρογραφία μόλις ανέβει η εικόνα, ώστε
 * ο χρήστης να βλέπει με τα μάτια του ότι δεν ανέβασε λάθος ή θολή φωτογραφία.
 */
function UploadBox({
  label,
  hint,
  url,
  name,
  busy,
  onPick,
}: {
  label: string;
  hint: string;
  url: string;
  name: string;
  busy: boolean;
  onPick: (file: File) => void;
}) {
  const isImage = !!url && !/\.pdf(\?|$)/i.test(url);
  return (
    <div>
      <label className="mb-1 block text-sm font-medium text-gray-700">{label}</label>
      {/* Κρυφό input + label-κουμπί: το native file input δείχνει το
          «Δεν επιλέχθηκε αρχείο» του browser, που κόβεται άσχημα στο κινητό. */}
      <label
        className={`flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl border-2 border-dashed px-4 py-4 text-sm font-bold transition-colors ${
          url
            ? 'border-emerald-300 bg-emerald-50 text-emerald-700 hover:border-emerald-400'
            : 'border-gray-300 bg-gray-50 text-gray-700 hover:border-blue-400 hover:bg-blue-50'
        } ${busy ? 'pointer-events-none opacity-50' : ''}`}
      >
        <span className="text-lg">{url ? '✓' : '📎'}</span>
        <span>{url ? 'Άλλαξε αρχείο' : 'Επιλογή αρχείου'}</span>
        <input
          type="file"
          accept="image/*,application/pdf"
          disabled={busy}
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) onPick(f);
            e.target.value = '';
          }}
          className="hidden"
        />
      </label>
      <p className="mt-1 text-xs text-gray-500">{hint}</p>
      {busy && <p className="mt-2 text-xs text-blue-600">Ανεβαίνει…</p>}
      {url && !busy && (
        <div className="mt-2 flex items-center gap-2">
          {isImage ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={url} alt="" className="h-14 w-20 rounded-lg border border-gray-200 object-cover" />
          ) : (
            <span className="text-2xl">📄</span>
          )}
          <span className="truncate text-xs font-medium text-emerald-600">{name}</span>
        </div>
      )}
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

  // Βήμα 2 — κινητό
  const [phone, setPhone] = useState('');
  const [phoneConfirmed, setPhoneConfirmed] = useState(false);
  const [phoneSaved, setPhoneSaved] = useState(false);
  const [smsAvailable, setSmsAvailable] = useState(false);
  const [phoneCodeSent, setPhoneCodeSent] = useState(false);
  const [phoneCode, setPhoneCode] = useState('');
  const [sendingPhoneCode, setSendingPhoneCode] = useState(false);
  const [confirmingPhone, setConfirmingPhone] = useState(false);
  const [resendIn, setResendIn] = useState(0);

  // Βήμα 3 — έγγραφο ταυτοποίησης
  const [docKind, setDocKind] = useState<DocKind | ''>('');
  const [frontUrl, setFrontUrl] = useState('');
  const [frontName, setFrontName] = useState('');
  const [backUrl, setBackUrl] = useState('');
  const [backName, setBackName] = useState('');
  const [uploading, setUploading] = useState<'front' | 'back' | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const load = useCallback(async () => {
    try {
      const res = (await (api as any).workers.getVerification()) as any;
      const d = res?.data || {};
      setVerified(!!d.verified);
      setRequest(d.request || null);
      setEmail(d.email || '');
      setEmailConfirmed(!!d.emailConfirmed);
      setSmsAvailable(!!d.smsAvailable);
      setPhoneConfirmed(!!d.phoneConfirmed);
      if (d.phone) {
        setPhone(d.phone);
        setPhoneSaved(true);
      }
    } catch {
      // Αν αποτύχει, δείχνουμε την κενή φόρμα.
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // Αντίστροφη μέτρηση για το «Ξαναστείλε», ώστε να μη ζητάει κανείς SMS στη
  // σειρά — κάθε αποστολή κοστίζει πραγματικά χρήματα.
  useEffect(() => {
    if (resendIn <= 0) return;
    timerRef.current = setInterval(() => setResendIn((s) => (s <= 1 ? 0 : s - 1)), 1000);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [resendIn]);

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

  const sendPhoneCode = async () => {
    if (!/^69\d{8}$/.test(phone)) return toast.error('Δώσε έγκυρο κινητό (10 ψηφία, ξεκινά με 69).');
    setSendingPhoneCode(true);
    try {
      const res = (await (api as any).auth.sendPhoneCode({ phone })) as any;
      const d = res?.data || {};
      setPhoneSaved(true);
      if (d.smsAvailable === false) {
        // Ο πάροχος SMS δεν είναι ρυθμισμένος: το νούμερο αποθηκεύτηκε και θα
        // επιβεβαιωθεί τηλεφωνικά. Δεν προσποιούμαστε ότι στείλαμε κωδικό.
        setSmsAvailable(false);
        toast.success('Το κινητό αποθηκεύτηκε.');
      } else {
        setSmsAvailable(true);
        setPhoneCodeSent(true);
        setResendIn(60);
        toast.success(`Στείλαμε 6ψήφιο κωδικό στο ${phone}.`);
      }
    } catch (err: any) {
      toast.error(err?.message || 'Δεν στάλθηκε ο κωδικός.');
    } finally {
      setSendingPhoneCode(false);
    }
  };

  const confirmPhoneCode = async () => {
    if (phoneCode.length !== 6) return toast.error('Ο κωδικός είναι 6 ψηφία.');
    setConfirmingPhone(true);
    try {
      await (api as any).auth.confirmPhone({ code: phoneCode });
      setPhoneConfirmed(true);
      setPhoneCode('');
      toast.success('Το κινητό επιβεβαιώθηκε.');
    } catch (err: any) {
      toast.error(err?.message || 'Λάθος κωδικός.');
    } finally {
      setConfirmingPhone(false);
    }
  };

  const handleUpload = async (file: File, side: 'front' | 'back') => {
    if (file.size > 10 * 1024 * 1024) return toast.error('Το αρχείο είναι πάνω από 10MB.');
    setUploading(side);
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
        if (side === 'front') {
          setFrontUrl(data.data.url);
          setFrontName(file.name);
        } else {
          setBackUrl(data.data.url);
          setBackName(file.name);
        }
        toast.success('Η φωτογραφία ανέβηκε.');
      } else {
        toast.error(data?.error?.message || 'Αποτυχία μεταφόρτωσης.');
      }
    } catch {
      toast.error('Αποτυχία μεταφόρτωσης.');
    } finally {
      setUploading(null);
    }
  };

  const handleSubmit = async () => {
    if (!docKind) return toast.error('Διάλεξε τύπο εγγράφου.');
    if (!frontUrl) return toast.error('Ανέβασε τη μπροστινή όψη.');
    if (backRequired(docKind) && !backUrl) return toast.error('Ανέβασε και την πίσω όψη.');

    setSubmitting(true);
    try {
      await (api as any).workers.submitVerification({
        document_kind: docKind,
        document_url: frontUrl,
        document_back_url: backUrl || undefined,
      });
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
  // Χωρίς πάροχο SMS το βήμα θεωρείται ολοκληρωμένο μόλις δοθεί το νούμερο:
  // την επιβεβαίωση την κάνουμε εμείς τηλεφωνικά.
  const phoneStepDone = smsAvailable ? phoneConfirmed : phoneSaved && /^69\d{8}$/.test(phone);
  const docsReady = !!docKind && !!frontUrl && (!backRequired(docKind) || !!backUrl);

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

      {/* ── Βήμα 2: κινητό ────────────────────────────────────────────── */}
      <Card className={`mb-4 ${phoneStepDone ? 'border-emerald-200 bg-emerald-50/50' : ''}`}>
        <CardContent className="space-y-4 p-5">
          <StepHead
            n={2}
            done={phoneStepDone}
            title="Κινητό τηλέφωνο (προαιρετικό)"
            desc={
              phoneConfirmed
                ? `Το ${phone} επιβεβαιώθηκε με SMS.`
                : phoneStepDone
                  ? `Το ${phone} καταχωρήθηκε.`
                  : smsAvailable
                    ? 'Στέλνουμε 6ψήφιο κωδικό με SMS στο κινητό σου.'
                    : 'Βοηθάει να σε βρουν πιο γρήγορα οι επιχειρήσεις. Δεν χρειάζεται για την επαλήθευση.'
            }
          />

          {!phoneConfirmed && (
            <div className="space-y-3 pl-11">
              <div className="flex flex-wrap items-end gap-2">
                <div className="min-w-[10rem] flex-1">
                  <label className="mb-1 block text-sm font-medium text-gray-700">Κινητό τηλέφωνο</label>
                  <Input
                    inputMode="tel"
                    maxLength={10}
                    placeholder="6912345678"
                    value={phone}
                    disabled={phoneCodeSent}
                    onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                  />
                </div>
                {!phoneCodeSent && (
                  <Button onClick={sendPhoneCode} disabled={sendingPhoneCode} variant="outline">
                    {sendingPhoneCode ? 'Αποστολή…' : smsAvailable ? 'Στείλε μου κωδικό' : 'Αποθήκευση'}
                  </Button>
                )}
              </div>

              {phoneCodeSent && (
                <>
                  <div className="flex flex-wrap items-center gap-2">
                    <Input
                      inputMode="numeric"
                      maxLength={6}
                      placeholder="000000"
                      value={phoneCode}
                      onChange={(e) => setPhoneCode(e.target.value.replace(/\D/g, ''))}
                      className="w-32 text-center text-lg font-bold tracking-[0.3em]"
                    />
                    <Button onClick={confirmPhoneCode} disabled={confirmingPhone}>
                      {confirmingPhone ? 'Έλεγχος…' : 'Επιβεβαίωση'}
                    </Button>
                    <button
                      type="button"
                      onClick={sendPhoneCode}
                      disabled={sendingPhoneCode || resendIn > 0}
                      className="text-xs font-medium text-blue-600 hover:underline disabled:opacity-50"
                    >
                      {resendIn > 0 ? `Ξαναστείλε σε ${resendIn}″` : 'Ξαναστείλε'}
                    </button>
                  </div>
                  <p className="text-xs text-gray-500">Ο κωδικός ισχύει για 15 λεπτά.</p>
                </>
              )}

              {!smsAvailable && phoneSaved && (
                <p className="text-xs text-gray-600">
                  📞 Μπορεί να σε καλέσουμε για επιβεβαίωση. Δεν καθυστερεί την έγκριση της αίτησής σου.
                </p>
              )}

              <p className="text-xs text-gray-500">
                Δεν εμφανίζεται δημόσια. Χρησιμοποιείται μόνο για τον έλεγχο και για επικοινωνία μετά από match.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Βήμα 3: έγγραφο ταυτοποίησης ──────────────────────────────── */}
      <Card className={idPending ? 'border-amber-200 bg-amber-50/60' : ''}>
        <CardContent className="space-y-4 p-5">
          <StepHead
            n={3}
            done={false}
            title="Έγγραφο ταυτοποίησης"
            desc={
              idPending
                ? `Υποβλήθηκε στις ${elDate(request?.created_at)} — είναι υπό έλεγχο από την ομάδα μας.`
                : 'Διάλεξε τι θα ανεβάσεις και βγάλε καθαρές φωτογραφίες.'
            }
          />

          {idPending ? (
            <div className="pl-11 text-sm text-amber-800">
              📨 Θα δεις το σήμα ✓ στο προφίλ σου μόλις εγκριθεί. Δεν χρειάζεται να κάνεις κάτι άλλο.
            </div>
          ) : (
            <div className="space-y-4 pl-11">
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">Τύπος εγγράφου *</label>
                <div className="grid grid-cols-3 gap-2">
                  {DOC_KINDS.map((k) => (
                    <button
                      key={k.id}
                      type="button"
                      onClick={() => setDocKind(k.id)}
                      className={`rounded-xl border-2 px-2 py-3 text-center transition-colors ${
                        docKind === k.id
                          ? 'border-blue-500 bg-blue-50 text-blue-700'
                          : 'border-gray-200 bg-white text-gray-700 hover:border-blue-300'
                      }`}
                    >
                      <span className="block text-xl">{k.icon}</span>
                      <span className="mt-1 block text-xs font-bold leading-tight">{k.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {docKind && (
                <>
                  <UploadBox
                    label={frontLabel(docKind)}
                    hint="Καθαρή φωτογραφία, να διαβάζονται όλα τα στοιχεία (εικόνα ή PDF, έως 10MB)."
                    url={frontUrl}
                    name={frontName}
                    busy={uploading === 'front'}
                    onPick={(f) => handleUpload(f, 'front')}
                  />
                  <UploadBox
                    label={backRequired(docKind) ? 'Πίσω όψη *' : 'Πίσω όψη (προαιρετικό)'}
                    hint={
                      backRequired(docKind)
                        ? 'Η πίσω όψη έχει στοιχεία που χρειαζόμαστε για τον έλεγχο.'
                        : 'Το διαβατήριο δεν τη χρειάζεται — ανέβασέ την μόνο αν θέλεις.'
                    }
                    url={backUrl}
                    name={backName}
                    busy={uploading === 'back'}
                    onPick={(f) => handleUpload(f, 'back')}
                  />
                </>
              )}

              {/* Το κινητό δεν κλειδώνει την υποβολή: η επαλήθευση κρίνεται από
                  το έγγραφο. */}
              <Button
                onClick={handleSubmit}
                disabled={submitting || !!uploading || !docsReady}
                size="lg"
                className="w-full"
              >
                {submitting ? 'Υποβολή…' : 'Υποβολή για έλεγχο'}
              </Button>
              {/* Χωρίς εξήγηση ο χρήστης βλέπει σκέτο γκρι κουμπί και δεν ξέρει
                  τι του λείπει. */}
              {!docsReady && (
                <p className="text-center text-xs text-amber-700">
                  {!docKind
                    ? 'Διάλεξε πρώτα τι έγγραφο θα ανεβάσεις.'
                    : backRequired(docKind)
                      ? 'Ανέβασε και τις δύο όψεις για να συνεχίσεις.'
                      : 'Ανέβασε τη σελίδα με τη φωτογραφία για να συνεχίσεις.'}
                </p>
              )}
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
