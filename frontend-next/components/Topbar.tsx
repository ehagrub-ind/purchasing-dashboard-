'use client';

import { Bell, Search, MessageSquare, Menu } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

export default function Topbar({ onMenuToggle }: { onMenuToggle?: () => void }) {
  return (
    <header className="sticky top-0 z-30 flex h-[60px] md:h-[72px] items-center justify-between border-b bg-white/80 backdrop-blur-md px-4 md:px-8">
      {/* Left: Hamburger + Search */}
      <div className="flex items-center gap-3 flex-1">
        <button onClick={onMenuToggle} className="md:hidden rounded-lg p-2 hover:bg-muted/80 transition-colors">
          <Menu className="h-5 w-5 text-muted-foreground" />
        </button>
        <div className="relative hidden sm:block w-full max-w-sm">
          <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground/60" />
          <Input
            placeholder="Cari transaksi, supplier, barang..."
            className="pl-10 h-10 bg-muted/50 border-0 rounded-xl text-sm placeholder:text-muted-foreground/50 focus-visible:ring-primary/20 focus-visible:bg-white"
          />
        </div>
      </div>

      {/* Right: Actions */}
      <div className="flex items-center gap-1.5">
        <Button variant="ghost" size="icon" className="sm:hidden relative h-9 w-9 rounded-xl hover:bg-muted/80">
          <Search className="h-[18px] w-[18px] text-muted-foreground" />
        </Button>
        <Button variant="ghost" size="icon" className="relative h-9 w-9 md:h-10 md:w-10 rounded-xl hover:bg-muted/80">
          <MessageSquare className="h-[18px] w-[18px] text-muted-foreground" />
        </Button>
        <Button variant="ghost" size="icon" className="relative h-9 w-9 md:h-10 md:w-10 rounded-xl hover:bg-muted/80">
          <Bell className="h-[18px] w-[18px] text-muted-foreground" />
          <span className="absolute right-2 top-2 flex h-2 w-2 rounded-full bg-red-500">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-75" />
          </span>
        </Button>

        <div className="ml-2 md:ml-3 h-8 w-px bg-border" />

        <div className="flex items-center gap-2 md:gap-3 ml-2 md:ml-3">
          <div className="text-right hidden sm:block">
            <p className="text-[13px] font-semibold leading-tight">David</p>
            <p className="text-[11px] text-muted-foreground">Owner</p>
          </div>
          <div className="flex h-9 w-9 md:h-10 md:w-10 items-center justify-center rounded-xl bg-gradient-to-br from-purple-500 to-indigo-600 text-sm font-bold text-white shadow-md shadow-purple-500/20">
            D
          </div>
        </div>
      </div>
    </header>
  );
}
