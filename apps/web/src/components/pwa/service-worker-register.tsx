'use client';

import { useEffect } from 'react';

/**
 * Registers the StaffNow service worker on app load.
 * Only runs in production (avoids stale cache during development).
 */
export function ServiceWorkerRegister() {
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!('serviceWorker' in navigator)) return;

    // Only register in production (same as next-pwa default behavior)
    const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    if (isLocalhost && process.env.NODE_ENV !== 'production') {
      return;
    }

    // Register on load (not DOMContentLoaded) to avoid blocking initial paint
    const register = async () => {
      try {
        const registration = await navigator.serviceWorker.register('/sw.js', { scope: '/' });

        // Listen for updates: when a new SW is waiting, prompt it to take over
        if (registration.waiting) {
          registration.waiting.postMessage({ type: 'SKIP_WAITING' });
        }

        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing;
          if (!newWorker) return;
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              // New version ready — activate it
              newWorker.postMessage({ type: 'SKIP_WAITING' });
            }
          });
        });

        // Reload the page when the active SW changes (new version activated)
        let refreshing = false;
        navigator.serviceWorker.addEventListener('controllerchange', () => {
          if (refreshing) return;
          refreshing = true;
          // Don't auto-reload — just log. User will see fresh content on next navigation.
          // window.location.reload();
        });
      } catch (err) {
        // Silent fail — PWA is a progressive enhancement
        console.warn('[SW] registration failed:', err);
      }
    };

    if (document.readyState === 'complete') {
      register();
    } else {
      window.addEventListener('load', register, { once: true });
    }
  }, []);

  return null;
}
