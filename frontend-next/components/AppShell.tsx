'use client';

import { usePathname } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import Sidebar from '@/components/Sidebar';
import Topbar from '@/components/Topbar';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function AppShell({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const isLogin = pathname === '/login';

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
      <Sidebar />
      <div className="ml-[260px] min-h-screen">
        <Topbar />
        <main className="px-8 py-6">{children}</main>
      </div>
    </>
  );
}
