import { getKas, getOperasional, getPurchases, getSuppliers } from '../modules/api.js';
import { rupiahFull, rupiah, kg, date, num } from '../modules/format.js';
import { el, clear, showLoading, buildTable } from '../modules/dom.js';

const SVG_NS = 'http://www.w3.org/2000/svg';

function svgEl(tag, attrs) {
  const e = document.createElementNS(SVG_NS, tag);
  for (const [k, v] of Object.entries(attrs || {})) e.setAttribute(k, v);
  return e;
}
function makeSvg(children) {
  const svg = svgEl('svg', { viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', 'stroke-width': '2', 'stroke-linecap': 'round', 'stroke-linejoin': 'round' });
  for (const c of children) svg.appendChild(c);
  return svg;
}

// ── Statistical helpers ──

function iqrOutliers(values) {
  if (values.length < 4) return { low: -Infinity, high: Infinity };
  const sorted = [...values].sort((a, b) => a - b);
  const q1 = sorted[Math.floor(sorted.length * 0.25)];
  const q3 = sorted[Math.floor(sorted.length * 0.75)];
  const iqr = q3 - q1;
  return { low: q1 - 1.5 * iqr, high: q3 + 1.5 * iqr, q1, q3, iqr };
}

function mean(values) {
  return values.reduce((s, v) => s + v, 0) / values.length;
}

function stddev(values) {
  const m = mean(values);
  return Math.sqrt(values.reduce((s, v) => s + (v - m) ** 2, 0) / values.length);
}

// ── Anomaly detection ──

function detectPriceAnomalies(purchases) {
  const byKategori = {};
  for (const p of purchases) {
    if (!p.qty || p.qty === 0) continue;
    const pricePerKg = Number(p.price);
    if (!pricePerKg || pricePerKg <= 0) continue;
    const kat = p.kategori || 'Lainnya';
    if (!byKategori[kat]) byKategori[kat] = [];
    byKategori[kat].push({ ...p, pricePerKg });
  }

  const anomalies = [];
  for (const [kat, items] of Object.entries(byKategori)) {
    if (items.length < 4) continue;
    const prices = items.map(i => i.pricePerKg);
    const bounds = iqrOutliers(prices);
    const avg = mean(prices);
    for (const item of items) {
      if (item.pricePerKg < bounds.low || item.pricePerKg > bounds.high) {
        const pct = ((item.pricePerKg - avg) / avg * 100).toFixed(0);
        anomalies.push({
          severity: Math.abs(Number(pct)) > 100 ? 'tinggi' : 'sedang',
          type: 'Harga Tidak Wajar',
          description: `${item.supplier?.name || '-'} — ${kat}: ${rupiah(item.price)}/kg (avg ${rupiah(avg)}/kg, ${pct > 0 ? '+' : ''}${pct}%)`,
          date: item.date,
          wilayah: item.wilayah,
          value: item.pricePerKg,
          avg
        });
      }
    }
  }
  return anomalies;
}

function detectAmountOutliers(purchases) {
  const totals = purchases.map(p => Number(p.total)).filter(v => v > 0);
  if (totals.length < 4) return [];
  const bounds = iqrOutliers(totals);
  const avg = mean(totals);

  return purchases
    .filter(p => Number(p.total) > bounds.high)
    .map(p => ({
      severity: Number(p.total) > bounds.high + bounds.iqr ? 'tinggi' : 'sedang',
      type: 'Nilai Transaksi Besar',
      description: `${p.supplier?.name || '-'}: ${rupiah(p.total)} (avg ${rupiah(avg)})`,
      date: p.date,
      wilayah: p.wilayah,
      value: Number(p.total),
      avg
    }));
}

function detectDuplicates(purchases) {
  const seen = {};
  const dupes = [];
  for (const p of purchases) {
    const key = `${p.date}_${p.supplierId}_${p.total}_${p.qty}`;
    if (seen[key]) {
      dupes.push({
        severity: 'sedang',
        type: 'Duplikasi Potensial',
        description: `${p.supplier?.name || '-'}: ${rupiah(p.total)}, ${kg(p.qty)} — tanggal & nilai sama`,
        date: p.date,
        wilayah: p.wilayah,
        value: Number(p.total),
        pair: seen[key]
      });
    }
    seen[key] = p;
  }
  return dupes;
}

function detectKasAnomalies(kasData) {
  const anomalies = [];
  const masukVals = kasData.filter(r => r.masuk > 0).map(r => Number(r.masuk));
  const keluarVals = kasData.filter(r => r.keluar > 0).map(r => Number(r.keluar));
  const masukBounds = iqrOutliers(masukVals);
  const keluarBounds = iqrOutliers(keluarVals);

  for (const r of kasData) {
    if (r.masuk > 0 && Number(r.masuk) > masukBounds.high) {
      anomalies.push({
        severity: 'sedang',
        type: 'Kas Masuk Besar',
        description: `${r.wilayah}: ${rupiah(r.masuk)} — ${r.deskripsi || 'tanpa keterangan'}`,
        date: r.date,
        wilayah: r.wilayah,
        value: Number(r.masuk)
      });
    }
    if (r.keluar > 0 && Number(r.keluar) > keluarBounds.high) {
      anomalies.push({
        severity: 'sedang',
        type: 'Kas Keluar Besar',
        description: `${r.wilayah}: ${rupiah(r.keluar)} — ${r.deskripsi || 'tanpa keterangan'}`,
        date: r.date,
        wilayah: r.wilayah,
        value: Number(r.keluar)
      });
    }
    if (Number(r.balance) < 0) {
      anomalies.push({
        severity: 'tinggi',
        type: 'Saldo Minus',
        description: `${r.wilayah}: saldo ${rupiah(r.balance)} setelah "${r.deskripsi || '-'}"`,
        date: r.date,
        wilayah: r.wilayah,
        value: Number(r.balance)
      });
    }
    if (!r.deskripsi || r.deskripsi.trim() === '') {
      anomalies.push({
        severity: 'rendah',
        type: 'Keterangan Kosong',
        description: `${r.wilayah}: transaksi tanpa keterangan (masuk: ${rupiah(r.masuk)}, keluar: ${rupiah(r.keluar)})`,
        date: r.date,
        wilayah: r.wilayah,
        value: 0
      });
    }
  }
  return anomalies;
}

function detectSupplierConcentration(suppliers) {
  const totalKg = suppliers.reduce((s, sup) => s + Number(sup.total_kg || 0), 0);
  if (totalKg === 0) return [];
  return suppliers
    .filter(sup => (Number(sup.total_kg) / totalKg) > 0.3)
    .map(sup => {
      const pct = ((Number(sup.total_kg) / totalKg) * 100).toFixed(1);
      return {
        severity: Number(pct) > 50 ? 'tinggi' : 'sedang',
        type: 'Konsentrasi Supplier',
        description: `${sup.name} (${sup.wilayah}): ${pct}% dari total volume (${kg(sup.total_kg)})`,
        date: null,
        wilayah: sup.wilayah,
        value: Number(pct)
      };
    });
}

function detectOperasionalAnomalies(opData) {
  const vals = opData.map(o => Number(o.jumlah)).filter(v => v > 0);
  if (vals.length < 4) return [];
  const bounds = iqrOutliers(vals);
  return opData
    .filter(o => Number(o.jumlah) > bounds.high)
    .map(o => ({
      severity: 'rendah',
      type: 'Operasional Besar',
      description: `${o.wilayah}: ${rupiah(o.jumlah)} — ${o.deskripsi}`,
      date: null,
      wilayah: o.wilayah,
      value: Number(o.jumlah)
    }));
}

// ── Severity helpers ──

function severityBadge(severity) {
  const map = {
    tinggi: { cls: 'anm-sev-tinggi', label: 'Tinggi' },
    sedang: { cls: 'anm-sev-sedang', label: 'Sedang' },
    rendah: { cls: 'anm-sev-rendah', label: 'Rendah' }
  };
  const m = map[severity] || map.rendah;
  return el('span', { className: `fin-badge ${m.cls}`, textContent: m.label });
}

function typeBadge(type) {
  return el('span', { className: 'fin-badge fin-badge-lainnya', textContent: type });
}

function wilayahBadge(w) {
  if (!w) return el('span', { className: 'fin-badge fin-badge-lainnya', textContent: '-' });
  return el('span', { className: `badge supplier-wilayah wilayah-${(w || '').toLowerCase()}`, textContent: w });
}

// ── Icons ──

function iconShield() {
  return makeSvg([
    svgEl('path', { d: 'M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z' })
  ]);
}
function iconTrendUp() {
  return makeSvg([
    svgEl('polyline', { points: '23,6 13.5,15.5 8.5,10.5 1,18' }),
    svgEl('polyline', { points: '17,6 23,6 23,12' })
  ]);
}
function iconAlertTriangle() {
  return makeSvg([
    svgEl('path', { d: 'M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z' }),
    svgEl('line', { x1: '12', y1: '9', x2: '12', y2: '13' }),
    svgEl('line', { x1: '12', y1: '17', x2: '12.01', y2: '17' })
  ]);
}
function iconUsers() {
  return makeSvg([
    svgEl('path', { d: 'M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2' }),
    svgEl('circle', { cx: '9', cy: '7', r: '4' }),
    svgEl('path', { d: 'M23 21v-2a4 4 0 00-3-3.87' }),
    svgEl('path', { d: '16 3.13a4 4 0 010 7.75' })
  ]);
}
function iconZap() {
  return makeSvg([
    svgEl('polygon', { points: '13,2 3,14 12,14 11,22 21,10 12,10' })
  ]);
}

// ── Main render ──

let allAnomalies = [];
let activeFilter = 'semua';
let activeSeverity = '';

export async function render(container) {
  showLoading(container);
  try {
    const [kas, op, purchData, suppliers] = await Promise.all([
      getKas(),
      getOperasional(),
      getPurchases({ limit: 1000 }),
      getSuppliers()
    ]);

    const purchases = purchData.data || [];
    const kasData = kas.data || [];
    const opData = op.data || [];
    const supplierList = suppliers || [];

    allAnomalies = [
      ...detectPriceAnomalies(purchases),
      ...detectAmountOutliers(purchases),
      ...detectDuplicates(purchases),
      ...detectKasAnomalies(kasData),
      ...detectSupplierConcentration(supplierList),
      ...detectOperasionalAnomalies(opData)
    ];

    allAnomalies.sort((a, b) => {
      const sev = { tinggi: 0, sedang: 1, rendah: 2 };
      return (sev[a.severity] ?? 2) - (sev[b.severity] ?? 2);
    });

    activeFilter = 'semua';
    activeSeverity = '';
    renderPage(container);
  } catch (err) {
    clear(container);
    container.appendChild(el('div', { className: 'loading', textContent: 'Error: ' + err.message }));
  }
}

function renderPage(container) {
  clear(container);

  // Header
  container.appendChild(el('div', { className: 'page-header' }, [
    el('div', { className: 'page-header-left' }, [
      el('h2', { className: 'page-title', textContent: 'Analytics — Deteksi Anomali' }),
      el('p', { className: 'page-subtitle', textContent: 'Analisis otomatis untuk mendeteksi transaksi tidak wajar, duplikasi, dan pola mencurigakan.' })
    ])
  ]));

  // KPI
  renderKPI(container);

  // Filters
  renderFilters(container);

  // Anomaly table
  const tableWrap = el('div', { id: 'anm-table-wrap' });
  container.appendChild(tableWrap);
  renderTable(tableWrap);
}

function renderKPI(container) {
  const tinggi = allAnomalies.filter(a => a.severity === 'tinggi').length;
  const sedang = allAnomalies.filter(a => a.severity === 'sedang').length;
  const rendah = allAnomalies.filter(a => a.severity === 'rendah').length;
  const types = new Set(allAnomalies.map(a => a.type));

  const grid = el('div', { className: 'kpi-row' });
  const cards = [
    { label: 'Total Anomali', value: String(allAnomalies.length), color: 'purple', icon: iconShield(), badge: types.size + ' Jenis', badgeColor: 'purple' },
    { label: 'Severity Tinggi', value: String(tinggi), color: tinggi > 0 ? 'red' : 'green', icon: iconAlertTriangle(), badge: tinggi > 0 ? 'Perlu Aksi' : 'Aman', badgeColor: tinggi > 0 ? 'red' : 'green' },
    { label: 'Severity Sedang', value: String(sedang), color: 'orange', icon: iconTrendUp(), badge: 'Review', badgeColor: 'orange' },
    { label: 'Severity Rendah', value: String(rendah), color: 'blue', icon: iconZap(), badge: 'Info', badgeColor: 'blue' },
    { label: 'Supplier Berisiko', value: String(allAnomalies.filter(a => a.type === 'Konsentrasi Supplier').length), color: 'teal', icon: iconUsers(), badge: 'Konsentrasi', badgeColor: 'teal' }
  ];

  for (const c of cards) {
    const iconWrap = el('div', { className: `kpi-icon ${c.color === 'red' ? 'pink' : c.color}` });
    iconWrap.appendChild(c.icon);
    const nums = el('div', { className: 'kpi-numbers' });
    nums.appendChild(el('span', { className: 'kpi-number', textContent: c.value, style: c.color === 'red' ? 'color:var(--red)' : '' }));
    if (c.badge) nums.appendChild(el('span', { className: `kpi-badge ${c.badgeColor}`, textContent: c.badge }));
    grid.appendChild(el('div', { className: 'kpi-card' }, [
      el('div', { className: 'kpi-card-top' }, [iconWrap, nums]),
      el('div', { className: 'kpi-title', textContent: c.label }),
      el('div', { className: 'kpi-updated', textContent: 'Analisis otomatis' })
    ]));
  }
  container.appendChild(grid);
}

function renderFilters(container) {
  const bar = el('div', { className: 'anm-filter-bar' });

  // Type filter
  const typeGroup = el('div', { className: 'fin-quick-filter' });
  const types = ['semua', ...new Set(allAnomalies.map(a => a.type))];
  for (const t of types) {
    typeGroup.appendChild(el('button', {
      className: `fin-pill ${activeFilter === t ? 'active' : ''}`,
      textContent: t === 'semua' ? 'Semua' : t,
      onClick: () => {
        activeFilter = t;
        renderPage(container);
      }
    }));
  }
  bar.appendChild(typeGroup);

  // Severity filter
  const sevGroup = el('div', { className: 'fin-quick-filter', style: 'margin-bottom:0' });
  const sevs = [
    { label: 'Semua Level', value: '' },
    { label: 'Tinggi', value: 'tinggi' },
    { label: 'Sedang', value: 'sedang' },
    { label: 'Rendah', value: 'rendah' }
  ];
  for (const s of sevs) {
    sevGroup.appendChild(el('button', {
      className: `fin-pill ${activeSeverity === s.value ? 'active' : ''}`,
      textContent: s.label,
      onClick: () => {
        activeSeverity = s.value;
        renderPage(container);
      }
    }));
  }
  bar.appendChild(sevGroup);
  container.appendChild(bar);
}

function renderTable(container) {
  clear(container);

  let filtered = allAnomalies;
  if (activeFilter !== 'semua') filtered = filtered.filter(a => a.type === activeFilter);
  if (activeSeverity) filtered = filtered.filter(a => a.severity === activeSeverity);

  if (filtered.length === 0) {
    container.appendChild(el('div', { className: 'supplier-empty', style: 'padding:48px 20px' }, [
      el('div', { className: 'supplier-empty-title', textContent: 'Tidak ada anomali ditemukan' }),
      el('div', { className: 'supplier-empty-sub', textContent: 'Semua data terlihat normal untuk filter ini.' })
    ]));
    return;
  }

  const card = el('div', { className: 'table-card' });
  card.appendChild(el('div', { className: 'table-header' }, [
    el('div', { className: 'table-title', textContent: 'Anomali Terdeteksi (' + filtered.length + ')' })
  ]));

  const scroll = el('div', { className: 'table-scroll', style: 'max-height:70vh' });
  scroll.appendChild(buildTable(
    [
      { label: 'Severity' },
      { label: 'Tipe' },
      { label: 'Wilayah' },
      { label: 'Tanggal' },
      { label: 'Deskripsi' }
    ],
    filtered.map(a => [
      severityBadge(a.severity),
      typeBadge(a.type),
      wilayahBadge(a.wilayah),
      a.date ? date(a.date) : '-',
      a.description
    ])
  ));
  card.appendChild(scroll);
  container.appendChild(card);

  // Summary by type
  const byType = {};
  for (const a of filtered) {
    byType[a.type] = (byType[a.type] || 0) + 1;
  }
  const summaryGrid = el('div', { className: 'fin-insight-grid', style: 'margin-top:20px' });
  const typeEntries = Object.entries(byType).sort((a, b) => b[1] - a[1]);
  for (const [type, count] of typeEntries.slice(0, 3)) {
    const sevCounts = {
      tinggi: allAnomalies.filter(a => a.type === type && a.severity === 'tinggi').length,
      sedang: allAnomalies.filter(a => a.type === type && a.severity === 'sedang').length,
      rendah: allAnomalies.filter(a => a.type === type && a.severity === 'rendah').length
    };
    const topSev = sevCounts.tinggi > 0 ? 'red' : sevCounts.sedang > 0 ? 'orange' : 'green';
    summaryGrid.appendChild(el('div', { className: 'fin-insight-card' }, [
      el('div', { className: `fin-insight-icon ${topSev}` }, [iconAlertTriangle()]),
      el('div', {}, [
        el('div', { className: 'fin-insight-label', textContent: type }),
        el('div', { className: 'fin-insight-value', textContent: count + ' anomali' }),
        el('div', { className: 'fin-insight-sub', textContent: `Tinggi: ${sevCounts.tinggi} | Sedang: ${sevCounts.sedang} | Rendah: ${sevCounts.rendah}` })
      ])
    ]));
  }
  container.appendChild(summaryGrid);
}
