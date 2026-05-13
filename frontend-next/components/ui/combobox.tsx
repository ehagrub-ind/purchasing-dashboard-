'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { ChevronDown, Search, X } from 'lucide-react';

export interface ComboboxOption {
  value: string;
  label: string;
  group?: string;
}

interface ComboboxProps {
  options: ComboboxOption[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

export function Combobox({ options, value, onChange, placeholder = 'Pilih...', disabled, className }: ComboboxProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [highlightIdx, setHighlightIdx] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const selected = options.find(o => o.value === value);

  const filtered = query
    ? options.filter(o => o.label.toLowerCase().includes(query.toLowerCase()))
    : options;

  const groups = Array.from(new Set(filtered.map(o => o.group).filter(Boolean)));
  const ungrouped = filtered.filter(o => !o.group);

  const flatFiltered = [
    ...ungrouped,
    ...groups.flatMap(g => filtered.filter(o => o.group === g)),
  ];

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
        setQuery('');
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    setHighlightIdx(-1);
  }, [query, open]);

  useEffect(() => {
    if (highlightIdx >= 0 && listRef.current) {
      const el = listRef.current.querySelector(`[data-idx="${highlightIdx}"]`);
      el?.scrollIntoView({ block: 'nearest' });
    }
  }, [highlightIdx]);

  const select = useCallback((val: string) => {
    onChange(val);
    setOpen(false);
    setQuery('');
  }, [onChange]);

  function handleKeyDown(e: React.KeyboardEvent) {
    if (!open) {
      if (e.key === 'ArrowDown' || e.key === 'Enter') { setOpen(true); e.preventDefault(); }
      return;
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightIdx(i => Math.min(i + 1, flatFiltered.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightIdx(i => Math.max(i - 1, 0));
    } else if (e.key === 'Enter' && highlightIdx >= 0) {
      e.preventDefault();
      select(flatFiltered[highlightIdx].value);
    } else if (e.key === 'Escape') {
      setOpen(false);
      setQuery('');
    }
  }

  function renderList() {
    if (flatFiltered.length === 0) {
      return <div className="px-3 py-2 text-sm text-muted-foreground">Tidak ditemukan</div>;
    }

    let idx = -1;
    const items: React.ReactNode[] = [];

    if (ungrouped.length > 0) {
      ungrouped.forEach(o => {
        idx++;
        const i = idx;
        items.push(
          <div
            key={o.value}
            data-idx={i}
            onClick={() => select(o.value)}
            className={cn(
              'px-3 py-2 text-sm cursor-pointer transition-colors',
              i === highlightIdx && 'bg-accent',
              o.value === value && 'font-semibold text-primary',
            )}
          >
            {o.label}
          </div>
        );
      });
    }

    groups.forEach(g => {
      const groupItems = filtered.filter(o => o.group === g);
      items.push(
        <div key={`g-${g}`} className="px-3 pt-2 pb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          {g}
        </div>
      );
      groupItems.forEach(o => {
        idx++;
        const i = idx;
        items.push(
          <div
            key={o.value}
            data-idx={i}
            onClick={() => select(o.value)}
            className={cn(
              'px-3 py-2 pl-5 text-sm cursor-pointer transition-colors',
              i === highlightIdx && 'bg-accent',
              o.value === value && 'font-semibold text-primary',
            )}
          >
            {o.label}
          </div>
        );
      });
    });

    return items;
  }

  return (
    <div ref={containerRef} className={cn('relative', className)}>
      <div
        className={cn(
          'flex items-center gap-2 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background transition-colors',
          open && 'ring-2 ring-ring ring-offset-2',
          disabled && 'opacity-50 cursor-not-allowed',
        )}
        onClick={() => { if (!disabled) { setOpen(true); setTimeout(() => inputRef.current?.focus(), 0); } }}
      >
        <Search className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
        {open ? (
          <input
            ref={inputRef}
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            className="flex-1 bg-transparent outline-none placeholder:text-muted-foreground"
            placeholder={placeholder}
            autoFocus
          />
        ) : (
          <span className={cn('flex-1 truncate', !selected && 'text-muted-foreground')}>
            {selected ? selected.label : placeholder}
          </span>
        )}
        {value && !open ? (
          <X
            className="h-3.5 w-3.5 shrink-0 text-muted-foreground hover:text-foreground cursor-pointer"
            onClick={e => { e.stopPropagation(); onChange(''); }}
          />
        ) : (
          <ChevronDown className={cn('h-3.5 w-3.5 shrink-0 text-muted-foreground transition-transform', open && 'rotate-180')} />
        )}
      </div>

      {open && (
        <div
          ref={listRef}
          className="absolute z-50 mt-1 w-full max-h-60 overflow-auto rounded-md border bg-popover shadow-md"
        >
          {renderList()}
        </div>
      )}
    </div>
  );
}
