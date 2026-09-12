'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import { useAuth } from '@/lib/auth-context';
import { api } from '@/lib/api';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Spinner } from '@/components/ui/spinner';
import { WorkerVerification } from '@/components/dashboard/worker-verification';
import { PhoneVerification } from '@/components/dashboard/phone-verification';
import { EmailVerification } from '@/components/dashboard/email-verification';
import { API_URL } from '@/lib/config';
import { useT, useLocale } from '@/i18n/locale-provider';

type VerificationRequest = {
  id: string;
  status: 'pending' | 'approved' | 'rejected';
  rejection_reason: string | null;
  vat_number: string | null;
  registry_number: string | null;
  created_at: string;
};

const fmtDate = (s: string | null | undefined, locale: 'el' | 'en') =>
  s ? new Date(s.replace(' ', 'T') + (s.endsWith('Z') ? '' : 'Z')).toLocaleDateString(locale === 'en' ? 'en-GB' : 'el-GR') : '';

export default function VerificationPage() {
  const t = useT();
  const { locale } = useLocale();
  const elDate = (s?: string | null) => fmtDate(s, locale);
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [uploading, setUploading] = useState(false);

  const [verified, setVerified] = useState(false);
  const [request, setRequest] = useState<VerificationRequest | null>(null);

  const [vat, setVat] = useState('');
  const [registry, setRegistry] = useState('');
  const [notes, setNotes] = useState('');
  const [docUrl, setDocUrl] = useState('');
  const [docName, setDocName] = useState('');
  /* Η επαλήθευση κινητού ήταν εντελώς απούσα από την οθόνη της επιχείρησης. */
  const [phoneInfo, setPhoneInfo] = useState<{
    phone: string;
    phoneConfirmed: boolean;
    smsAvailable: boolean;
    email: string;
    emailConfirmed: boolean;
  } | null>(null);

  const load = useCallback(async () => {
    // Ο εργαζόμενος βλέπει το <WorkerVerification/> — μην χτυπάς business endpoint.
    if (user?.role === 'worker') return;
    try {
      const res = (await (api as any).businesses.getVerification()) as any;
      setVerified(!!res?.data?.verified);
      setRequest(res?.data?.request || null);
      if (res?.data?.request?.vat_number) setVat(res.data.request.vat_number);
      setPhoneInfo({
        phone: res?.data?.phone || '',
        phoneConfirmed: !!res?.data?.phoneConfirmed,
        smsAvailable: !!res?.data?.smsAvailable,
        email: res?.data?.email || '',
        emailConfirmed: !!res?.data?.emailConfirmed,
      });
    } catch {
      // Αν αποτύχει, δείχνουμε απλώς την κενή φόρμα.
    } finally {
      setLoading(false);
    }
  }, [user?.role]);

  useEffect(() => {
    load();
  }, [load]);

  const handleUpload = async (file: File) => {
    if (file.size > 10 * 1024 * 1024) {
      toast.error(t('verificationPage.fileTooBig'));
      return;
    }
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
        toast.success(t('verificationPage.docUploaded'));
      } else {
        toast.error(data?.error?.message || t('verificationPage.uploadFailed'));
      }
    } catch {
      toast.error(t('verificationPage.uploadFailed'));
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async () => {
    const cleanVat = vat.replace(/\s/g, '');
    if (!/^\d{9}$/.test(cleanVat)) return toast.error(t('verificationPage.vatDigits'));
    if (!docUrl) return toast.error(t('verificationPage.uploadDocFirst'));

    setSubmitting(true);
    try {
      await (api as any).businesses.submitVerification({
        vat_number: cleanVat,
        registry_number: registry.trim() || undefined,
        document_url: docUrl,
        notes: notes.trim() || undefined,
      });
      toast.success(t('verificationPage.submitted'));
      await load();
    } catch (err: any) {
      toast.error(err?.message || t('verificationPage.submitFailed'));
    } finally {
      setSubmitting(false);
    }
  };

  // Οι εργαζόμενοι έχουν διαφορετική ροή (email + ταυτότητα + κινητό).
  if (user?.role === 'worker') return <WorkerVerification />;

  if (loading)
    return (
      <div className="flex justify-center py-20">
        <Spinner className="h-8 w-8" />
      </div>
    );

  // ── Ήδη επαληθευμένη ────────────────────────────────────────────────
  if (verified)
    return (
      <div className="mx-auto max-w-2xl">
        <h1 className="mb-1 text-2xl font-bold text-gray-900">{t('verificationPage.verifiedTitle')}</h1>
        <Card className="mt-4 border-emerald-200 bg-emerald-50">
          <CardContent className="p-6 text-center">
            <div className="text-4xl">✅</div>
            <p className="mt-2 text-lg font-bold text-emerald-900">{t('verificationPage.businessVerified')}</p>
            <p className="mt-1 text-sm text-emerald-800">
              {t('verificationPage.badgeShown')}
            </p>
            <Link href="/dashboard/profile">
              <Button variant="outline" className="mt-4">{t('verificationPage.seeProfile')}</Button>
            </Link>
          </CardContent>
        </Card>

        {/* Η επιχείρηση μπορεί να είναι επαληθευμένη και να μην έχει δώσει
            κινητό. Εδώ κατέληγε το κουμπί του TaskNow και δεν έβρισκε τίποτα. */}
        {phoneInfo && (
          <div className="mt-4 space-y-4">
            <EmailVerification
              email={phoneInfo.email}
              emailConfirmed={phoneInfo.emailConfirmed}
              onConfirmed={load}
            />
            <PhoneVerification {...phoneInfo} onConfirmed={load} />
          </div>
        )}
      </div>
    );

  // ── Αίτημα σε αναμονή ───────────────────────────────────────────────
  if (request?.status === 'pending')
    return (
      <div className="mx-auto max-w-2xl">
        <h1 className="mb-1 text-2xl font-bold text-gray-900">{t('verificationPage.title')}</h1>
        <Card className="mt-4 border-amber-200 bg-amber-50">
          <CardContent className="p-6 text-center">
            <div className="text-4xl">📨</div>
            <p className="mt-2 text-lg font-bold text-amber-900">{t('verificationPage.underReview')}</p>
            <p className="mt-1 text-sm text-amber-800">
              {t('verificationPage.submittedOn', { date: elDate(request.created_at) })}
            </p>
            {request.vat_number && (
              <p className="mt-3 text-xs text-amber-700">{t('verificationPage.vatDeclared', { vat: request.vat_number })}</p>
            )}
          </CardContent>
        </Card>

        {phoneInfo && (
          <div className="mt-4 space-y-4">
            <EmailVerification
              email={phoneInfo.email}
              emailConfirmed={phoneInfo.emailConfirmed}
              onConfirmed={load}
            />
            <PhoneVerification {...phoneInfo} onConfirmed={load} />
          </div>
        )}
      </div>
    );

  // ── Φόρμα υποβολής (και επανυποβολή μετά από απόρριψη) ──────────────
  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="mb-1 text-2xl font-bold text-gray-900">{t('verificationPage.title')}</h1>
      <p className="mb-4 text-sm text-gray-600">
        {t('verificationPage.intro')}
      </p>

      {request?.status === 'rejected' && (
        <Card className="mb-4 border-red-200 bg-red-50">
          <CardContent className="p-4">
            <p className="text-sm font-bold text-red-900">{t('verificationPage.rejectedTitle')}</p>
            {request.rejection_reason && (
              <p className="mt-1 text-sm text-red-800">{request.rejection_reason}</p>
            )}
            <p className="mt-1 text-xs text-red-700">{t('verificationPage.resubmit')}</p>
          </CardContent>
        </Card>
      )}

      <Card className="mb-4 border-blue-200 bg-blue-50">
        <CardContent className="p-4">
          <p className="text-sm font-bold text-blue-900">{t('verificationPage.whyTitle')}</p>
          <ul className="mt-2 space-y-1 text-sm text-blue-800">
            <li>{t('verificationPage.why1')}</li>
            <li>{t('verificationPage.why2')}</li>
            <li>{t('verificationPage.why3')}</li>
          </ul>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="space-y-4 p-5">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">{t('verificationPage.vat')}</label>
            <Input
              inputMode="numeric"
              maxLength={9}
              placeholder="123456789"
              value={vat}
              onChange={(e) => setVat(e.target.value.replace(/\D/g, ''))}
            />
            <p className="mt-1 text-xs text-gray-500">{t('verificationPage.vatHint')}</p>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              {t('verificationPage.registry')} <span className="font-normal text-gray-400">{t('verificationPage.optional')}</span>
            </label>
            <Input
              inputMode="numeric"
              placeholder="987654321"
              value={registry}
              onChange={(e) => setRegistry(e.target.value.replace(/\D/g, ''))}
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">{t('verificationPage.document')}</label>
            <input
              type="file"
              accept="image/*,application/pdf"
              disabled={uploading}
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handleUpload(f);
              }}
              className="block w-full text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-blue-600 file:px-4 file:py-2 file:text-sm file:font-bold file:text-white disabled:opacity-50"
            />
            <p className="mt-1 text-xs text-gray-500">
              {t('verificationPage.documentHint')}
            </p>
            {uploading && <p className="mt-2 text-xs text-blue-600">{t('verificationPage.uploading')}</p>}
            {docUrl && !uploading && (
              <p className="mt-2 text-xs font-medium text-emerald-600">{t('verificationPage.uploaded', { name: docName })}</p>
            )}
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              {t('verificationPage.notes')} <span className="font-normal text-gray-400">{t('verificationPage.optional')}</span>
            </label>
            <Textarea
              rows={3}
              placeholder={t('verificationPage.notesPlaceholder')}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>

          <Button
            onClick={handleSubmit}
            disabled={submitting || uploading}
            size="lg"
            className="w-full"
          >
            {submitting ? t('verificationPage.submitting') : t('verificationPage.submit')}
          </Button>

          <p className="text-center text-xs text-gray-500">
            {t('verificationPage.privacy')}
          </p>
        </CardContent>
      </Card>

      {phoneInfo && (
        <div className="mt-4 space-y-4">
          <EmailVerification
            email={phoneInfo.email}
            emailConfirmed={phoneInfo.emailConfirmed}
            onConfirmed={load}
          />
          <PhoneVerification {...phoneInfo} onConfirmed={load} />
        </div>
      )}
    </div>
  );
}
