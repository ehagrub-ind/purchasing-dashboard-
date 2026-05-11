import './globals.css';
import type { Metadata } from 'next';
import Sidebar from '@/components/Sidebar';
import Topbar from '@/components/Topbar';

export const metadata: Metadata = {
  title: 'Purchasing Dashboard - Pak Regen',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id">
      <body>
        <Sidebar />
        <div className="main-wrapper">
          <Topbar />
          <main className="main" id="app-content">
            {children}
          </main>
        </div>
      </body>
    </html>
  );
}
