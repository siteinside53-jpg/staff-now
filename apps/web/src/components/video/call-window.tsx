'use client';

import { useEffect, useRef, useState } from 'react';
import { Avatar } from '@/components/ui/avatar';
import type { CallEngine, CallStatus } from '@/lib/call-engine';

/**
 * Το παράθυρο της κλήσης — δικό μας, στα χρώματα του StaffNow.
 *
 * Πριν, εδώ άνοιγε δημόσιο Jitsi μέσα σε πλαίσιο και έδειχνε τα δικά του
 * μηνύματα, λογότυπα και προτροπές. Τώρα ό,τι βλέπει ο χρήστης το γράφουμε
 * εμείς, στα ελληνικά.
 */

interface CallWindowProps {
  engine: CallEngine;
  status: CallStatus;
  peerName: string;
  peerAvatar?: string | null;
  localStream: MediaStream | null;
  remoteStream: MediaStream | null;
  onHangup: () => void;
}

const STATUS_TEXT: Record<CallStatus, string> = {
  idle: '',
  preparing: 'Άνοιγμα κάμερας…',
  calling: 'Κλήση…',
  connecting: 'Σύνδεση…',
  connected: '',
  ended: 'Η κλήση τερματίστηκε',
};

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

export function CallWindow({
  engine,
  status,
  peerName,
  peerAvatar,
  localStream,
  remoteStream,
  onHangup,
}: CallWindowProps) {
  const localRef = useRef<HTMLVideoElement>(null);
  const remoteRef = useRef<HTMLVideoElement>(null);
  const [micOn, setMicOn] = useState(true);
  const [camOn, setCamOn] = useState(true);
  const [seconds, setSeconds] = useState(0);

  useEffect(() => {
    if (localRef.current && localStream) localRef.current.srcObject = localStream;
  }, [localStream]);

  useEffect(() => {
    if (remoteRef.current && remoteStream) remoteRef.current.srcObject = remoteStream;
  }, [remoteStream]);

  // Το χρονόμετρο ξεκινά μόνο όταν συνδεθούν πραγματικά — όχι όσο χτυπάει.
  useEffect(() => {
    if (status !== 'connected') return;
    const t = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(t);
  }, [status]);

  const hasVideo = engine.hasVideo();
  const waiting = status !== 'connected';

  return (
    <div className="fixed inset-0 z-[60] flex flex-col bg-gray-950">
      {/* Η εικόνα του άλλου γεμίζει την οθόνη */}
      <div className="relative flex-1 overflow-hidden">
        {/*
          object-CONTAIN, όχι cover.

          Με «cover» η εικόνα μεγεθύνεται μέχρι να γεμίσει την οθόνη και ό,τι
          περισσεύει κόβεται. Όταν ο άλλος καλεί από κινητό (όρθιο κάδρο) και
          εμείς βλέπουμε σε υπολογιστή (φαρδιά οθόνη), κοβόταν σχεδόν όλο: έμενε
          ένα ζουμαρισμένο κομμάτι προσώπου.

          Με «contain» φαίνεται ΟΛΟ το κάδρο του κινητού, με μαύρο δεξιά κι
          αριστερά — όπως κάνει κάθε εφαρμογή βιντεοκλήσης.
        */}
        <video
          ref={remoteRef}
          autoPlay
          playsInline
          className={`h-full w-full object-contain ${waiting ? 'opacity-0' : 'opacity-100'}`}
        />

        {/* Όσο δεν έχει έρθει εικόνα, δείχνουμε ποιον καλούμε και τι γίνεται */}
        {waiting && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-gradient-to-b from-blue-600 to-blue-800 text-white">
            <Avatar src={peerAvatar} name={peerName} size="xl" className="ring-4 ring-white/30" />
            <p className="text-2xl font-bold">{peerName}</p>
            <p className="flex items-center gap-2 text-sm text-white/80">
              <span className="h-2 w-2 animate-pulse rounded-full bg-white" />
              {STATUS_TEXT[status]}
            </p>
          </div>
        )}

        {/* Η δική μου εικόνα, μικρή στη γωνία. Καθρέφτης, όπως την περιμένει
            ο καθένας όταν βλέπει τον εαυτό του. */}
        {hasVideo && (
          <video
            ref={localRef}
            autoPlay
            playsInline
            muted
            className="absolute bottom-4 right-4 h-32 w-24 scale-x-[-1] rounded-2xl border-2 border-white/40 object-cover shadow-xl sm:h-44 sm:w-32"
          />
        )}

        {/* Όνομα και διάρκεια πάνω-πάνω, όσο μιλάνε */}
        {status === 'connected' && (
          <div className="absolute left-4 top-4 flex items-center gap-2 rounded-full bg-black/50 px-4 py-2 text-white backdrop-blur">
            <span className="text-sm font-semibold">{peerName}</span>
            <span className="text-xs text-white/70">{formatDuration(seconds)}</span>
          </div>
        )}
      </div>

      {/* Χειριστήρια */}
      <div className="flex items-center justify-center gap-4 bg-gray-950 px-4 py-6">
        <button
          type="button"
          onClick={() => setMicOn(engine.toggleMic())}
          aria-label={micOn ? 'Κλείσε το μικρόφωνο' : 'Άνοιξε το μικρόφωνο'}
          className={`flex h-14 w-14 items-center justify-center rounded-full text-2xl transition-colors ${
            micOn ? 'bg-white/15 text-white hover:bg-white/25' : 'bg-white text-gray-900'
          }`}
        >
          {micOn ? '🎤' : '🔇'}
        </button>

        {hasVideo && (
          <button
            type="button"
            onClick={() => setCamOn(engine.toggleCamera())}
            aria-label={camOn ? 'Κλείσε την κάμερα' : 'Άνοιξε την κάμερα'}
            className={`flex h-14 w-14 items-center justify-center rounded-full text-2xl transition-colors ${
              camOn ? 'bg-white/15 text-white hover:bg-white/25' : 'bg-white text-gray-900'
            }`}
          >
            {camOn ? '📹' : '🚫'}
          </button>
        )}

        <button
          type="button"
          onClick={onHangup}
          className="flex h-16 w-16 items-center justify-center rounded-full bg-red-600 text-2xl text-white shadow-lg transition-colors hover:bg-red-700"
          aria-label="Τέλος κλήσης"
        >
          📞
        </button>
      </div>
    </div>
  );
}
