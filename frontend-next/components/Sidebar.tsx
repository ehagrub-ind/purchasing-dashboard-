'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard, Users, ShoppingBag, DollarSign,
  FileText, BarChart3, Settings, Database, ChevronRight, CreditCard, ArrowLeftRight, LogOut, TrendingUp, X,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/lib/auth';

const NAV_ITEMS = [
  { href: '/', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/master-data', label: 'Master Data', icon: Database },
  { href: '/pembelian', label: 'Pembelian', icon: ShoppingBag },
  { href: '/penjualan', label: 'Penjualan', icon: TrendingUp },
];

const FINANCE_ITEMS = [
  { href: '/keuangan', label: 'Keuangan', icon: DollarSign },
  { href: '/arus-kas', label: 'Arus Kas', icon: ArrowLeftRight },
  { href: '/supplier', label: 'Hutang Supplier', icon: Users },
  { href: '/hutang', label: 'Hutang', icon: CreditCard },
  { href: '/fee-report', label: 'Fee Report', icon: FileText },
];

const REPORT_ITEMS = [
  { href: '/analytics', label: 'Analytics', icon: BarChart3 },
  { href: '/pengaturan', label: 'Pengaturan', icon: Settings },
];

function NavLink({ item, pathname, onClick }: { item: typeof NAV_ITEMS[0]; pathname: string; onClick?: () => void }) {
  const active = item.href === '/' ? pathname === '/' : pathname.startsWith(item.href);
  return (
    <Link
      href={item.href}
      onClick={onClick}
      className={cn(
        'group flex items-center gap-3 rounded-xl px-3 py-2.5 text-[13px] font-medium transition-all duration-200',
        active
          ? 'bg-white/20 text-white shadow-lg shadow-black/10'
          : 'text-white/60 hover:bg-white/10 hover:text-white'
      )}
    >
      <item.icon className={cn('h-[18px] w-[18px] transition-colors', active ? 'text-white' : 'text-white/50 group-hover:text-white')} />
      <span className="flex-1">{item.label}</span>
      {active && <ChevronRight className="h-3.5 w-3.5 text-white/60" />}
    </Link>
  );
}

export default function Sidebar({ open, onClose }: { open?: boolean; onClose?: () => void }) {
  const pathname = usePathname();
  const { user, logout } = useAuth();

  return (
    <>
      {open && (
        <div className="fixed inset-0 z-40 bg-black/50 md:hidden" onClick={onClose} />
      )}

      <aside className={cn(
        'fixed left-0 top-0 z-50 flex h-screen w-[260px] flex-col transition-transform duration-300',
        'md:translate-x-0 md:z-40',
        open ? 'translate-x-0' : '-translate-x-full'
      )}
        style={{ background: 'linear-gradient(180deg, hsl(262 58% 22%) 0%, hsl(252 58% 18%) 100%)' }}>

        {/* Logo + Close */}
        <div className="flex h-[72px] items-center gap-3 px-6">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/20 backdrop-blur-sm">
            <span className="text-base font-extrabold text-white">IH</span>
          </div>
          <div className="flex-1">
            <p className="text-[15px] font-bold text-white tracking-tight">Indo Hair</p>
            <p className="text-[10px] font-medium text-white/50 uppercase tracking-widest">Purchasing</p>
          </div>
          <button onClick={onClose} className="md:hidden rounded-lg p-1.5 text-white/50 hover:bg-white/10 hover:text-white transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto px-3 pt-4 space-y-1">
          <p className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-[0.15em] text-white/40">Menu Utama</p>
          {NAV_ITEMS.map((item) => (
            <NavLink key={item.href} item={item} pathname={pathname} onClick={onClose} />
          ))}

          <p className="mb-2 mt-6 px-3 text-[10px] font-semibold uppercase tracking-[0.15em] text-white/40">Keuangan</p>
          {FINANCE_ITEMS.map((item) => (
            <NavLink key={item.href} item={item} pathname={pathname} onClick={onClose} />
          ))}

          <p className="mb-2 mt-6 px-3 text-[10px] font-semibold uppercase tracking-[0.15em] text-white/40">Laporan</p>
          {REPORT_ITEMS.map((item) => (
            <NavLink key={item.href} item={item} pathname={pathname} onClick={onClose} />
          ))}
        </nav>

        {/* Footer - User */}
        <div className="border-t border-white/10 p-4 space-y-2">
          <div className="flex items-center gap-3 rounded-xl bg-white/10 px-3 py-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-amber-400 to-orange-500 text-[11px] font-bold text-white shadow-md">
              {(user?.nama || 'U')[0].toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[13px] font-semibold text-white truncate">{user?.nama || 'User'}</p>
              <p className="text-[10px] text-white/50">{user?.role || '-'}</p>
            </div>
            <div className="h-2 w-2 rounded-full bg-emerald-400 shadow-sm shadow-emerald-400/50" />
          </div>
          <button
            onClick={logout}
            className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-[12px] font-medium text-white/50 hover:bg-white/10 hover:text-white transition-all"
          >
            <LogOut className="h-3.5 w-3.5" />
            Keluar
          </button>
        </div>
      </aside>
    </>
  );
}
