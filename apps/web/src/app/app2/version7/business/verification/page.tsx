'use client';

import { useEffect, useState } from 'react';
import {
  AppBar,
  Body,
  Btn,
  Card,
  EmptyState,
  Section,
  Spinner,
  TextArea,
  TextField,
} from '../../_lib/ui';
import { businesses, uploads, API_BASE, getToken } from '../../_lib/api';

export default function VerificationPage() {
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [vatNumber, setVatNumber] = useState('');
  const [registryNumber, setRegistryNumber] = useState('');
  const [docFile, setDocFile] = useState<File | null>(null);
  const [notes, setNotes] = useState('');
  const [done, setDone] = useState(false);

  useEffect(() => {
    let cancelled = false;
    businesses.me().then((b) => {
      if (cancelled) return;
      setProfile(b.profile);
      setVatNumber(b.profile?.vat_number || '');
    }).catch(() => {}).finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  const onSubmit = async () => {
    setSubmitting(true);
    try {
      let docUrl: string | undefined;
      if (docFile) {
        const r = await uploads.upload(docFile, 'verification_doc');
        docUrl = r.url;
      }
      const headers: HeadersInit = {
        'Content-Type': 'application/json',
        ...(getToken() ? { Authorization: `Bearer ${getToken()}` } : {}),
      };
      await fetch(`${API_BASE}/businesses/me/verify`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          vat_number: vatNumber,
          registry_number: registryNumber,
          document_url: docUrl,
          notes,
        }),
      });
      setDone(true);
    } catch {} finally { setSubmitting(false); }
  };

  if (loading) return <div className="fixed inset-0 flex items-center justify-center bg-white"><Spinner /></div>;

  if (profile?.verified) {
    return (
      <div className="fixed inset-0 flex flex-col bg-white">
        <AppBar back title="Επαλήθευση" />
        <Body>
          <EmptyState
            icon="✅"
            title="Επιχείρηση επαληθευμένη"
            description="Έχεις πιστοποιημένο badge στο προφίλ σου. Οι εργαζόμενοι σε εμπιστεύονται περισσότερο."
          />
        </Body>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 flex flex-col bg-[#F5F7FB]">
      <AppBar back title="Επαλήθευση επιχείρησης" />
      <Body>
        {done ? (
          <EmptyState
            icon="📨"
            title="Στάλθηκε προς έλεγχο"
            description="Θα δείς πιστοποιημένο badge μόλις εγκριθεί."
          />
        ) : (
          <>
            <Card className="p-4 bg-blue-50 mb-4">
              <p className="text-[12px] font-bold text-blue-900">✓ Γιατί επαλήθευση;</p>
              <ul className="mt-2 space-y-1 text-[12px] text-blue-800">
                <li>• Πιστοποιημένο badge στο προφίλ σου</li>
                <li>• Προτεραιότητα στις αναζητήσεις εργαζομένων</li>
                <li>• Αυξημένο ποσοστό response από υποψήφιους</li>
              </ul>
            </Card>

            <Section title="Στοιχεία">
              <Card className="p-4 space-y-3">
                <TextField
                  label="ΑΦΜ"
                  placeholder="123456789"
                  value={vatNumber}
                  onChange={(e) => setVatNumber(e.target.value)}
                />
                <TextField
                  label="Αριθμός ΓΕΜΗ (προαιρετικά)"
                  placeholder="987654321"
                  value={registryNumber}
                  onChange={(e) => setRegistryNumber(e.target.value)}
                />
              </Card>
            </Section>

            <Section title="Δικαιολογητικά">
              <Card className="p-4">
                <label className="block">
                  <input
                    type="file"
                    accept="image/*,application/pdf"
                    onChange={(e) => setDocFile(e.target.files?.[0] || null)}
                    className="block w-full text-[12px] file:mr-3 file:rounded-full file:border-0 file:bg-blue-600 file:px-4 file:py-2 file:text-sm file:font-bold file:text-white"
                  />
                </label>
                <p className="mt-2 text-[11px] text-gray-500">
                  Ανέβασε αποδεικτικό από το TaxisNet ή ΓΕΜΗ (PDF/JPG, έως 5MB).
                </p>
              </Card>
            </Section>

            <Section title="Σημειώσεις">
              <Card className="p-4">
                <TextArea
                  placeholder="Κάτι επιπλέον που θες να ξέρουμε..."
                  rows={3}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />
              </Card>
            </Section>

            <div className="mt-5">
              <Btn full size="lg" loading={submitting} onClick={onSubmit} disabled={!vatNumber}>
                Υποβολή για έλεγχο
              </Btn>
            </div>
          </>
        )}
      </Body>
    </div>
  );
}
