export function rupiah(val: number | null | undefined): string {
  if (val == null || isNaN(val)) return 'Rp 0';
  const n = Number(val) * 1000;
  if (Math.abs(n) >= 1e12) return 'Rp ' + (n / 1e12).toFixed(1).replace('.', ',') + ' T';
  if (Math.abs(n) >= 1e9) return 'Rp ' + (n / 1e9).toFixed(1).replace('.', ',') + ' M';
  if (Math.abs(n) >= 1e6) return 'Rp ' + (n / 1e6).toFixed(1).replace('.', ',') + ' jt';
  if (Math.abs(n) >= 1e3) return 'Rp ' + (n / 1e3).toFixed(0) + ' rb';
  return 'Rp ' + n.toLocaleString('id-ID');
}

export function rupiahFull(val: number | null | undefined): string {
  if (val == null || isNaN(val)) return 'Rp 0';
  return 'Rp ' + (Number(val) * 1000).toLocaleString('id-ID', { maximumFractionDigits: 0 });
}

export function kg(val: number | null | undefined): string {
  if (val == null || isNaN(val)) return '0 kg';
  return Number(val).toLocaleString('id-ID', { maximumFractionDigits: 1 }) + ' kg';
}

export function num(val: number | null | undefined): string {
  if (val == null || isNaN(val)) return '0';
  return Number(val).toLocaleString('id-ID');
}

export function fmtDate(val: string | null | undefined): string {
  if (!val) return '-';
  const d = new Date(val);
  return d.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
}

export function usd(val: number | null | undefined): string {
  if (val == null || isNaN(val)) return '$0';
  return '$' + Number(val).toLocaleString('en-US', { maximumFractionDigits: 2 });
}

export function usdShort(val: number | null | undefined): string {
  if (val == null || isNaN(val)) return '$0';
  const n = Number(val);
  if (Math.abs(n) >= 1e6) return '$' + (n / 1e6).toFixed(1) + 'M';
  if (Math.abs(n) >= 1e3) return '$' + (n / 1e3).toFixed(1) + 'k';
  return '$' + n.toLocaleString('en-US', { maximumFractionDigits: 0 });
}

export function idr(val: number | null | undefined): string {
  if (val == null || isNaN(val)) return 'Rp 0';
  const n = Number(val);
  if (Math.abs(n) >= 1e12) return 'Rp ' + (n / 1e12).toFixed(1).replace('.', ',') + ' T';
  if (Math.abs(n) >= 1e9) return 'Rp ' + (n / 1e9).toFixed(1).replace('.', ',') + ' M';
  if (Math.abs(n) >= 1e6) return 'Rp ' + (n / 1e6).toFixed(0) + ' jt';
  return 'Rp ' + n.toLocaleString('id-ID', { maximumFractionDigits: 0 });
}

export function idrFull(val: number | null | undefined): string {
  if (val == null || isNaN(val)) return 'Rp 0';
  return 'Rp ' + Number(val).toLocaleString('id-ID', { maximumFractionDigits: 0 });
}
