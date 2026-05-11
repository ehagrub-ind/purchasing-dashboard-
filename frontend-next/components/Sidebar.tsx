'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard, Users, ShoppingBag, DollarSign,
  FileText, BarChart3, Settings, Database
} from 'lucide-react';
import { cn } from '@/lib/utils';

const NAV_ITEMS = [
  { href: '/', label: 'Overview', icon: LayoutDashboard },
  { href: '/supplier', label: 'Supplier', icon: Users },
  { href: '/master-data', label: 'Master Data', icon: Database },
  { href: '/pembelian', label: 'Pembelian', icon: ShoppingBag },
  { href: '/keuangan', label: 'Keuangan', icon: DollarSign },
  { href: '/fee-report', label: 'Fee Report', icon: FileText },
];

const ANALYTICS_ITEMS = [
  { href: '/analytics', label: 'Analytics', icon: BarChart3 },
  { href: '/pengaturan', label: 'Pengaturan', icon: Settings },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="fixed left-0 top-0 z-40 flex h-screen w-[250px] flex-col border-r bg-card">
      <div className="flex h-16 items-center gap-2 border-b px-6">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground text-sm font-bold">P</div>
        <span className="text-lg font-bold">Purchasing</span>
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto p-3">
        <p className="mb-2 px-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Main</p>
        {NAV_ITEMS.map((item) => {
          const active = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                active
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
              )}
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </Link>
          );
        })}

        <p className="mb-2 mt-6 px-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Reports</p>
        {ANALYTICS_ITEMS.map((item) => {
          const active = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                active
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
              )}
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="border-t p-4">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">PR</div>
          <div>
            <p className="text-sm font-medium">Pak Regen</p>
            <p className="text-xs text-muted-foreground">Administrator</p>
          </div>
        </div>
      </div>
    </aside>
  );
}
