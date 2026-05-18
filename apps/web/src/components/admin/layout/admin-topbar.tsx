'use client';

interface Props {
  title: string;
  subtitle?: string;
  adminName?: string;
  adminEmail?: string;
  onMobileMenu?: () => void;
}

export function AdminTopbar({ title, subtitle, adminName, adminEmail, onMobileMenu }: Props) {
  return (
    <header className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b border-gray-200 bg-white/95 backdrop-blur-md px-4 sm:px-6">
      {/* Mobile menu */}
      {onMobileMenu && (
        <button
          onClick={onMobileMenu}
          className="rounded-lg p-2 text-gray-600 hover:bg-gray-100 lg:hidden"
          aria-label="Open menu"
        >
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
      )}

      {/* Title */}
      <div className="min-w-0 flex-1">
        <h1 className="text-base font-bold text-gray-900 sm:text-lg truncate">{title}</h1>
        {subtitle && <p className="text-xs text-gray-500 truncate">{subtitle}</p>}
      </div>

      {/* Global search (decorative) */}
      <div className="relative hidden md:block">
        <svg className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M17 10a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <input
          type="search"
          placeholder="Γρήγορη αναζήτηση..."
          className="w-64 rounded-lg border border-gray-200 bg-gray-50 py-2 pl-9 pr-3 text-sm focus:border-blue-500 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
      </div>

      {/* Admin user */}
      {adminEmail && (
        <div className="flex items-center gap-2.5 border-l border-gray-200 pl-3">
          <div className="hidden text-right sm:block">
            <p className="text-xs font-semibold text-gray-900 truncate max-w-[160px]">{adminName || adminEmail}</p>
            <p className="text-[10px] text-gray-500">Super Admin</p>
          </div>
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 text-sm font-bold text-white shadow-sm">
            {(adminName || adminEmail)?.[0]?.toUpperCase() || 'A'}
          </div>
        </div>
      )}
    </header>
  );
}
