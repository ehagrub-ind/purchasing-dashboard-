// Data dari Excel dalam satuan ribuan — kalikan 1000 untuk nilai Rupiah sebenarnya
export function rupiah(val) {
  if (val == null || isNaN(val)) return 'Rp 0';
  const n = Number(val) * 1000;
  if (Math.abs(n) >= 1e12) return 'Rp ' + (n / 1e12).toFixed(1).replace('.', ',') + ' T';
  if (Math.abs(n) >= 1e9) return 'Rp ' + (n / 1e9).toFixed(1).replace('.', ',') + ' M';
  if (Math.abs(n) >= 1e6) return 'Rp ' + (n / 1e6).toFixed(1).replace('.', ',') + ' jt';
  if (Math.abs(n) >= 1e3) return 'Rp ' + (n / 1e3).toFixed(0) + ' rb';
  return 'Rp ' + n.toLocaleString('id-ID');
}

export function rupiahFull(val) {
  if (val == null || isNaN(val)) return 'Rp 0';
  return 'Rp ' + (Number(val) * 1000).toLocaleString('id-ID', { maximumFractionDigits: 0 });
}

export function rupiaShort(val) {
  if (val == null || isNaN(val)) return '0';
  const n = Number(val) * 1000;
  if (Math.abs(n) >= 1e9) return (n / 1e9).toFixed(1).replace('.', ',') + ' M';
  if (Math.abs(n) >= 1e6) return (n / 1e6).toFixed(1).replace('.', ',') + ' jt';
  if (Math.abs(n) >= 1e3) return (n / 1e3).toFixed(0) + ' rb';
  return n.toLocaleString('id-ID');
}

export function kg(val) {
  if (val == null || isNaN(val)) return '0 kg';
  return Number(val).toLocaleString('id-ID', { maximumFractionDigits: 1 }) + ' kg';
}

export function kgShort(val) {
  if (val == null || isNaN(val)) return '0';
  const n = Number(val);
  if (n >= 1000) return (n / 1000).toFixed(1).replace('.', ',') + 'k';
  return n.toLocaleString('id-ID', { maximumFractionDigits: 0 });
}

export function num(val) {
  if (val == null || isNaN(val)) return '0';
  return Number(val).toLocaleString('id-ID');
}

export function date(val) {
  if (!val) return '-';
  const d = new Date(val);
  return d.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
}

export function wilayahClass(w) {
  return 'wilayah-' + (w || '').toLowerCase().replace(/\s/g, '');
}
