'use client';

import { useEffect, useRef, useState } from 'react';

interface JitsiCallProps {
  roomName: string;
  displayName: string;
  onClose: () => void;
}

declare global {
  interface Window {
    JitsiMeetExternalAPI: any;
  }
}

export function JitsiCall({ roomName, displayName, onClose }: JitsiCallProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const apiRef = useRef<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let disposed = false;

    const initJitsi = () => {
      if (disposed || !containerRef.current || apiRef.current) return;

      try {
        apiRef.current = new window.JitsiMeetExternalAPI('meet.jit.si', {
          roomName,
          parentNode: containerRef.current,
          width: '100%',
          height: 400,
          userInfo: { displayName },
          configOverwrite: {
            prejoinConfig: { enabled: false },
            prejoinPageEnabled: false,
            startWithAudioMuted: false,
            startWithVideoMuted: false,
            disableDeepLinking: true,
            enableClosePage: false,
            hideConferenceSubject: true,
            hideConferenceTimer: true,
            disableProfile: true,
            requireDisplayName: false,
            toolbarButtons: ['microphone', 'camera', 'hangup', 'fullscreen', 'tileview'],
            notifications: [],
            disableInviteFunctions: true,
          },
          interfaceConfigOverwrite: {
            SHOW_JITSI_WATERMARK: false,
            SHOW_BRAND_WATERMARK: false,
            SHOW_WATERMARK_FOR_GUESTS: false,
            DISABLE_JOIN_LEAVE_NOTIFICATIONS: true,
            MOBILE_APP_PROMO: false,
            HIDE_INVITE_MORE_HEADER: true,
            TOOLBAR_ALWAYS_VISIBLE: true,
          },
        });

        apiRef.current.addListener('videoConferenceJoined', () => setLoading(false));
        apiRef.current.addListener('readyToClose', onClose);
        apiRef.current.addListener('videoConferenceLeft', onClose);

        // Fallback: hide loading after 5s
        setTimeout(() => setLoading(false), 5000);
      } catch (err) {
        console.error('Jitsi init error:', err);
        setLoading(false);
      }
    };

    // Check if script already loaded
    if (window.JitsiMeetExternalAPI) {
      initJitsi();
    } else {
      const script = document.createElement('script');
      script.src = 'https://meet.jit.si/external_api.js';
      script.async = true;
      script.onload = initJitsi;
      script.onerror = () => { setLoading(false); };
      document.head.appendChild(script);
    }

    return () => {
      disposed = true;
      if (apiRef.current) {
        try { apiRef.current.dispose(); } catch {}
        apiRef.current = null;
      }
    };
  }, [roomName, displayName, onClose]);

  return (
    <div className="relative bg-gray-900 min-h-[400px]">
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center z-20 bg-gray-900">
          <div className="text-center text-white">
            <div className="h-10 w-10 mx-auto mb-3 border-4 border-white/20 border-t-white rounded-full animate-spin" />
            <p className="text-sm">Σύνδεση κάμερας...</p>
          </div>
        </div>
      )}
      <div ref={containerRef} />
      <button
        onClick={() => {
          if (apiRef.current) try { apiRef.current.dispose(); } catch {}
          onClose();
        }}
        className="absolute top-2 right-2 flex items-center gap-1.5 rounded-full bg-red-600 px-4 py-2 text-sm font-bold text-white hover:bg-red-700 shadow-lg z-30"
      >
        📞 Τέλος κλήσης
      </button>
    </div>
  );
}
