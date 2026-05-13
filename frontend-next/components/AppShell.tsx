'use client';

import { usePathname } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import Sidebar from '@/components/Sidebar';
import Topbar from '@/components/Topbar';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

export default function AppShell({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const isLogin = pathname === '/login';
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    setSidebarOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!loading && !user && !isLogin) {
      router.replace('/login');
    }
    if (!loading && user && isLogin) {
      router.replace('/');
    }
  }, [loading, user, isLogin, router]);

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl" style={{ background: 'hsl(262 58% 22%)' }}>
            <span className="text-lg font-extrabold text-white">IH</span>
          </div>
          <div className="h-1 w-24 overflow-hidden rounded-full bg-muted">
            <div className="h-full w-1/2 animate-pulse rounded-full bg-primary" />
          </div>
        </div>
      </div>
    );
  }

  if (isLogin) {
    return <>{children}</>;
  }

  if (!user) return null;

  return (
    <>
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="md:ml-[260px] min-h-screen">
        <Topbar onMenuToggle={() => setSidebarOpen(true)} />
        <main className="px-4 py-4 md:px-8 md:py-6">{children}</main>
      </div>
    </>
  );
}
