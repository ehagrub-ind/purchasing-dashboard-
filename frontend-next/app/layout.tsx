import './globals.css';
import type { Metadata } from 'next';
import Sidebar from '@/components/Sidebar';
import Topbar from '@/components/Topbar';
import { ToastProvider } from '@/components/Toast';

export const metadata: Metadata = {
  title: 'IHC Purchasing Dashboard',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id">
      <body>
        <ToastProvider>
          <Sidebar />
          <div className="ml-[260px] min-h-screen">
            <Topbar />
            <main className="px-8 py-6">
              {children}
            </main>
          </div>
        </ToastProvider>
      </body>
    </html>
  );
}
