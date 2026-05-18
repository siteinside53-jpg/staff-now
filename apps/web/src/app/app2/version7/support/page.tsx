'use client';

import Link from 'next/link';
import { useState } from 'react';
import {
  AppBar,
  Body,
  Btn,
  Card,
  FieldGroup,
  Row,
  Section,
  TextArea,
  TextField,
} from '../_lib/ui';
import { API_BASE, getToken } from '../_lib/api';

export default function SupportPage() {
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  const onSubmit = async () => {
    if (!subject.trim() || !message.trim()) return;
    setSubmitting(true);
    try {
      await fetch(`${API_BASE}/support/tickets`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(getToken() ? { Authorization: `Bearer ${getToken()}` } : {}),
        },
        body: JSON.stringify({ subject, message }),
      });
      setDone(true);
      setSubject('');
      setMessage('');
    } catch {} finally { setSubmitting(false); }
  };

  return (
    <div className="fixed inset-0 flex flex-col bg-[#F5F7FB]">
      <AppBar back title="Υποστήριξη" />
      <Body>
        <Section title="Επικοινωνία">
          <FieldGroup>
            <Row icon="📧" label="info@staffnow.gr" hint="Email υποστήριξης" />
            <Row icon="📞" iconBg="bg-emerald-50" iconColor="text-emerald-600" label="+30 697 155 3942" hint="Δευ-Παρ 09:00-18:00" />
            <Row icon="💬" iconBg="bg-cyan-50" iconColor="text-cyan-600" label="WhatsApp" hint="Άμεσα μηνύματα" last />
          </FieldGroup>
        </Section>

        <Section title="FAQ">
          <FieldGroup>
            <Row icon="❓" iconBg="bg-amber-50" iconColor="text-amber-600" label="Συχνές ερωτήσεις" href="/faq" />
            <Row icon="📚" iconBg="bg-blue-50" iconColor="text-blue-600" label="Οδηγός χρήσης" href="/help" last />
          </FieldGroup>
        </Section>

        <Section title="Στείλε μήνυμα">
          {done ? (
            <Card className="p-5 text-center bg-emerald-50">
              <div className="text-4xl">✅</div>
              <p className="mt-2 text-sm font-extrabold text-emerald-900">Λάβαμε το μήνυμά σου!</p>
              <p className="mt-1 text-[12px] text-emerald-700">Θα σου απαντήσουμε εντός 24 ωρών.</p>
            </Card>
          ) : (
            <Card className="p-4 space-y-3">
              <TextField
                label="Θέμα"
                placeholder="Σύντομη περιγραφή..."
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
              />
              <TextArea
                label="Μήνυμα"
                placeholder="Πες μας τι συμβαίνει..."
                rows={5}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
              />
              <Btn full loading={submitting} onClick={onSubmit} disabled={!subject.trim() || !message.trim()}>
                Αποστολή
              </Btn>
            </Card>
          )}
        </Section>
      </Body>
    </div>
  );
}
