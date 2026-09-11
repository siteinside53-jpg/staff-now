'use client';

import { useT } from '@/i18n/locale-provider';

/**
 * Τα «Σύντομα» σήματα App Store / Google Play και η promo εικόνα της ενότητας
 * «Κατέβασε το App». Ζουν σε client component μόνο και μόνο επειδή τα
 * aria-label / alt πρέπει να αλλάζουν γλώσσα — η αρχική σελίδα μένει server
 * component.
 */
export function DownloadAppBadges() {
  const t = useT();
  return (
    <div className="mt-8 flex flex-wrap items-center gap-3">
      {/* App Store — σύντομα */}
      <div
        className="relative inline-flex items-center gap-3 rounded-2xl bg-black/90 px-5 py-3 text-left shadow-lg shadow-black/10"
        aria-label={t('home.app.appStoreAria')}
      >
        <span className="absolute -top-2 -right-2 rounded-full bg-blue-600 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-white shadow">
          {t('home.app.soon')}
        </span>
        <svg className="h-8 w-8 text-white/80" viewBox="0 0 24 24" fill="currentColor">
          <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z" />
        </svg>
        <div>
          <p className="text-[10px] uppercase tracking-wider text-white/70 leading-none">{t('home.app.downloadOn')}</p>
          <p className="text-base font-bold text-white leading-tight">App Store</p>
        </div>
      </div>

      {/* Google Play — σύντομα */}
      <div
        className="relative inline-flex items-center gap-3 rounded-2xl bg-black/90 px-5 py-3 text-left shadow-lg shadow-black/10"
        aria-label={t('home.app.googlePlayAria')}
      >
        <span className="absolute -top-2 -right-2 rounded-full bg-blue-600 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-white shadow">
          {t('home.app.soon')}
        </span>
        <svg className="h-8 w-8 opacity-80" viewBox="0 0 24 24">
          <path d="M3.609 1.814L13.792 12 3.61 22.186a.996.996 0 01-.61-.92V2.734a1 1 0 01.609-.92z" fill="#4285F4" />
          <path d="M14.5 11.293l2.302-2.302-10.937-6.333 8.635 8.635z" fill="#FBBC04" />
          <path d="M14.5 12.707l-8.635 8.634 10.937-6.332-2.302-2.302z" fill="#EA4335" />
          <path d="M16.798 9l2.807 1.626a1 1 0 010 1.73l-2.808 1.626L14.5 12.707V11.293L16.798 9z" fill="#34A853" />
        </svg>
        <div>
          <p className="text-[10px] uppercase tracking-wider text-white/70 leading-none">{t('home.app.getItOn')}</p>
          <p className="text-base font-bold text-white leading-tight">Google Play</p>
        </div>
      </div>
    </div>
  );
}

export function AppPromoImage() {
  const t = useT();
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src="/app-promo.png?v=3"
      alt={t('home.app.promoAlt')}
      className="block h-auto w-full max-w-none lg:scale-110 lg:origin-left"
      loading="lazy"
    />
  );
}
