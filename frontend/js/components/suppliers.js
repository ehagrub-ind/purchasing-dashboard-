import { getSuppliers, getSupplier } from '../modules/api.js';
import { rupiah, rupiahFull, kg, num, date } from '../modules/format.js';
import { el, clear, buildTable } from '../modules/dom.js';

let allSuppliers = [];
let maxKg = 0;

const SVG_NS = 'http://www.w3.org/2000/svg';

function svgEl(tag, attrs) {
  const e = document.createElementNS(SVG_NS, tag);
  for (const [k, v] of Object.entries(attrs || {})) e.setAttribute(k, v);
  return e;
}

function makeSvg(children) {
  const svg = svgEl('svg', { viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', 'stroke-width': '2' });
  for (const c of children) svg.appendChild(c);
  return svg;
}

function iconUsers() {
  return makeSvg([
    svgEl('path', { d: 'M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2' }),
    svgEl('circle', { cx: '9', cy: '7', r: '4' }),
    svgEl('path', { d: 'M23 21v-2a4 4 0 00-3-3.87' }),
    svgEl('path', { d: 'M16 3.13a4 4 0 010 7.75' })
  ]);
}

function iconBox() {
  return makeSvg([
    svgEl('path', { d: 'M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z' })
  ]);
}

function iconDollar() {
  return makeSvg([
    svgEl('line', { x1: '12', y1: '1', x2: '12', y2: '23' }),
    svgEl('path', { d: 'M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6' })
  ]);
}

function iconWallet() {
  return makeSvg([
    svgEl('rect', { x: '1', y: '4', width: '22', height: '16', rx: '2', ry: '2' }),
    svgEl('line', { x1: '1', y1: '10', x2: '23', y2: '10' })
  ]);
}

function iconExport() {
  return makeSvg([
    svgEl('path', { d: 'M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4' }),
    svgEl('polyline', { points: '7,10 12,15 17,10' }),
    svgEl('line', { x1: '12', y1: '15', x2: '12', y2: '3' })
  ]);
}

function iconRefresh() {
  return makeSvg([
    svgEl('polyline', { points: '23,4 23,10 17,10' }),
    svgEl('path', { d: 'M20.49 15a9 9 0 11-2.12-9.36L23 10' })
  ]);
}

function iconBack() {
  return makeSvg([svgEl('polyline', { points: '15,18 9,12 15,6' })]);
}

function iconSearch() {
  return makeSvg([
    svgEl('circle', { cx: '11', cy: '11', r: '8' }),
    svgEl('line', { x1: '21', y1: '21', x2: '16.65', y2: '16.65' }),
    svgEl('line', { x1: '8', y1: '11', x2: '14', y2: '11' })
  ]);
}

function showSkeleton(container) {
  clear(container);
  const grid = el('div', { className: 'skeleton-grid' });
  for (let i = 0; i < 6; i++) {
    grid.appendChild(el('div', { className: 'skeleton-card' }, [
      el('div', { style: 'display:flex;gap:14px;margin-bottom:16px' }, [
        el('div', { className: 'skeleton-line circle' }),
        el('div', { style: 'flex:1' }, [
          el('div', { className: 'skeleton-line thick w60' }),
          el('div', { className: 'skeleton-line w40' })
        ])
      ]),
      el('div', { style: 'display:grid;grid-template-columns:1fr 1fr;gap:12px' }, [
        el('div', {}, [el('div', { className: 'skeleton-line w60' }), el('div', { className: 'skeleton-line thick w80' })]),
        el('div', {}, [el('div', { className: 'skeleton-line w60' }), el('div', { className: 'skeleton-line thick w80' })]),
        el('div', {}, [el('div', { className: 'skeleton-line w60' }), el('div', { className: 'skeleton-line thick w80' })]),
        el('div', {}, [el('div', { className: 'skeleton-line w60' }), el('div', { className: 'skeleton-line thick w80' })]),
      ]),
      el('div', { className: 'skeleton-line w100', style: 'height:4px;margin-top:14px' })
    ]));
  }
  container.appendChild(grid);
}

function buildKPI(suppliers) {
  const totals = suppliers.reduce((a, s) => {
    a.kg += Number(s.total_kg);
    a.masuk += Number(s.total_masuk);
    a.saldo += Number(s.saldo);
    return a;
  }, { kg: 0, masuk: 0, saldo: 0 });

  const grid = el('div', { className: 'stat-grid' });
  const cards = [
    { label: 'Total Supplier', value: String(suppliers.length), color: 'blue', icon: iconUsers() },
    { label: 'Total Kg', value: kg(totals.kg), color: 'purple', icon: iconBox() },
    { label: 'Total Dana Masuk', value: rupiah(totals.masuk), color: 'green', icon: iconDollar() },
    { label: 'Total Saldo', value: rupiah(totals.saldo), color: totals.saldo >= 0 ? 'green' : 'yellow', icon: iconWallet() }
  ];

  for (const c of cards) {
    const iconWrap = el('div', { className: `stat-icon ${c.color}` });
    iconWrap.appendChild(c.icon);

    grid.appendChild(el('div', { className: 'stat-card' }, [
      el('div', { className: 'stat-card-row' }, [
        iconWrap,
        el('div', {}, [
          el('div', { className: 'stat-label', textContent: c.label }),
          el('div', { className: `stat-value ${c.color}`, textContent: c.value })
        ])
      ])
    ]));
  }

  return grid;
}

function buildToolbar(container) {
  const bar = el('div', { className: 'supplier-toolbar' });

  const search = el('input', {
    className: 'search-input',
    type: 'text',
    placeholder: 'Cari supplier...',
    onInput: () => applyFilters(container)
  });
  search.id = 'supplier-search';

  const wilayahSel = el('select', { onChange: () => applyFilters(container) });
  wilayahSel.id = 'supplier-wilayah';
  wilayahSel.appendChild(el('option', { value: '', textContent: 'Semua Wilayah' }));
  ['Jatim', 'Jateng', 'Jabar'].forEach(w =>
    wilayahSel.appendChild(el('option', { value: w, textContent: w }))
  );

  const sortSel = el('select', { onChange: () => applyFilters(container) });
  sortSel.id = 'supplier-sort';
  [
    { value: 'kg', label: 'Total Kg' },
    { value: 'transaksi', label: 'Transaksi' },
    { value: 'masuk', label: 'Dana Masuk' },
    { value: 'saldo', label: 'Saldo' }
  ].forEach(o => sortSel.appendChild(el('option', { value: o.value, textContent: o.label })));

  bar.appendChild(search);
  bar.appendChild(wilayahSel);
  bar.appendChild(sortSel);
  return bar;
}

function applyFilters(container) {
  const q = (document.getElementById('supplier-search')?.value || '').toLowerCase();
  const w = document.getElementById('supplier-wilayah')?.value || '';
  const sort = document.getElementById('supplier-sort')?.value || 'kg';

  let filtered = allSuppliers.filter(s => {
    if (q && !s.name.toLowerCase().includes(q)) return false;
    if (w && s.wilayah !== w) return false;
    return true;
  });

  const sortKey = { kg: 'total_kg', transaksi: 'total_transaksi', masuk: 'total_masuk', saldo: 'saldo' }[sort] || 'total_kg';
  filtered.sort((a, b) => Number(b[sortKey]) - Number(a[sortKey]));

  const grid = document.getElementById('supplier-card-grid');
  if (!grid) return;
  clear(grid);

  if (filtered.length === 0) {
    grid.appendChild(buildEmptyState());
  } else {
    for (const s of filtered) grid.appendChild(buildSupplierCard(s, container));
  }
}

function buildEmptyState() {
  const wrap = el('div', { className: 'supplier-empty' });
  wrap.appendChild(iconSearch());
  wrap.appendChild(el('div', { className: 'supplier-empty-title', textContent: 'Supplier tidak ditemukan' }));
  wrap.appendChild(el('div', { className: 'supplier-empty-sub', textContent: 'Coba ubah kata pencarian atau filter wilayah.' }));
  return wrap;
}

function buildSupplierCard(s, container) {
  const wLower = s.wilayah.toLowerCase();
  const initials = s.name.slice(0, 2).toUpperCase();
  const pct = maxKg > 0 ? Math.max(4, (Number(s.total_kg) / maxKg) * 100) : 4;
  const saldoNum = Number(s.saldo);
  const saldoColor = saldoNum >= 0 ? 'green' : 'yellow';

  const progressBar = el('div', { className: 'supplier-progress-bar' });
  progressBar.style.width = '0%';

  const card = el('div', { className: 'supplier-card', onClick: () => renderDetail(container, s.id) }, [
    el('div', { className: 'supplier-card-top' }, [
      el('div', { className: `supplier-avatar ${wLower}`, textContent: initials }),
      el('div', { className: 'supplier-card-info' }, [
        el('div', { className: 'supplier-name', textContent: s.name }),
        el('span', { className: `supplier-wilayah wilayah-${wLower}`, textContent: s.wilayah })
      ])
    ]),
    el('div', { className: 'supplier-card-body' }, [
      el('div', {}, [
        el('div', { className: 'supplier-stat-label', textContent: 'Total Kg' }),
        el('div', { className: 'supplier-stat-value', textContent: kg(s.total_kg) })
      ]),
      el('div', {}, [
        el('div', { className: 'supplier-stat-label', textContent: 'Transaksi' }),
        el('div', { className: 'supplier-stat-value', textContent: num(s.total_transaksi) })
      ]),
      el('div', {}, [
        el('div', { className: 'supplier-stat-label', textContent: 'Dana Masuk' }),
        el('div', { className: 'supplier-stat-value green', textContent: rupiah(s.total_masuk) })
      ]),
      el('div', {}, [
        el('div', { className: 'supplier-stat-label', textContent: 'Saldo' }),
        el('div', { className: `supplier-stat-value ${saldoColor}`, textContent: rupiah(s.saldo) })
      ])
    ]),
    el('div', { className: 'supplier-progress' }, [progressBar]),
    el('div', { className: 'supplier-card-footer' }, [
      el('span', { className: 'supplier-detail-link', textContent: 'Detail →' })
    ])
  ]);

  requestAnimationFrame(() => { progressBar.style.width = pct + '%'; });

  return card;
}

function buildBtn(label, primary, iconFn) {
  const btn = el('button', { className: primary ? 'btn btn-primary' : 'btn' });
  if (iconFn) btn.appendChild(iconFn());
  btn.appendChild(document.createTextNode(label));
  return btn;
}

export async function render(container) {
  showSkeleton(container);

  try {
    allSuppliers = await getSuppliers();
    maxKg = Math.max(...allSuppliers.map(s => Number(s.total_kg)), 1);
    clear(container);

    const header = el('div', { className: 'page-header' }, [
      el('div', { className: 'page-header-left' }, [
        el('h2', { className: 'page-title', textContent: 'Supplier' }),
        el('p', { className: 'page-subtitle', textContent: 'Ringkasan supplier, total pembelian, dana masuk, dan saldo.' })
      ]),
      el('div', { className: 'page-header-actions' }, [
        buildBtn('+ Tambah Supplier', true, null),
        buildBtn('Export', false, iconExport),
        buildBtn('Refresh', false, iconRefresh)
      ])
    ]);
    container.appendChild(header);

    container.appendChild(buildKPI(allSuppliers));
    container.appendChild(buildToolbar(container));

    const grid = el('div', { className: 'supplier-grid', id: 'supplier-card-grid' });
    const sorted = [...allSuppliers].sort((a, b) => Number(b.total_kg) - Number(a.total_kg));
    for (const s of sorted) grid.appendChild(buildSupplierCard(s, container));
    container.appendChild(grid);
  } catch (err) {
    clear(container);
    container.appendChild(el('div', { className: 'loading', textContent: 'Error: ' + err.message }));
  }
}

async function renderDetail(container, id) {
  showSkeleton(container);

  try {
    const s = await getSupplier(id);
    clear(container);

    const backBtn = el('button', { className: 'btn-back', onClick: () => render(container) });
    backBtn.appendChild(iconBack());
    backBtn.appendChild(document.createTextNode('Kembali ke Daftar Supplier'));
    container.appendChild(backBtn);

    const wLower = s.wilayah.toLowerCase();
    const initials = s.name.slice(0, 2).toUpperCase();
    const avatarEl = el('div', { className: `supplier-avatar ${wLower}`, textContent: initials });
    avatarEl.style.cssText = 'width:52px;height:52px;font-size:20px';

    container.appendChild(el('div', { style: 'display:flex;align-items:center;gap:16px;margin-bottom:24px' }, [
      avatarEl,
      el('div', {}, [
        el('h2', { className: 'page-title', textContent: s.name }),
        el('span', { className: `supplier-wilayah wilayah-${wLower}`, textContent: s.wilayah })
      ])
    ]));

    if (s.by_kategori && s.by_kategori.length) {
      const card = el('div', { className: 'table-card' });
      card.appendChild(el('div', { className: 'table-header' }, [
        el('div', { className: 'table-title', textContent: 'Breakdown Kategori' })
      ]));
      const headers = [
        { label: 'Kategori' },
        { label: 'Transaksi', align: 'right' },
        { label: 'Total Kg', align: 'right' },
        { label: 'Total Nilai', align: 'right' }
      ];
      const rows = s.by_kategori.map(k => [k.kategori, num(k.count), kg(k.total_kg), rupiahFull(k.total_nilai)]);
      card.appendChild(buildTable(headers, rows));
      container.appendChild(card);
    }

    if (s.purchases && s.purchases.length) {
      const card = el('div', { className: 'table-card' });
      card.appendChild(el('div', { className: 'table-header' }, [
        el('div', { className: 'table-title', textContent: 'Pembelian (' + s.purchases.length + ')' })
      ]));
      const scroll = el('div', { className: 'table-scroll' });
      const headers = [
        { label: 'Tanggal' },
        { label: 'Jenis' },
        { label: 'Kategori' },
        { label: 'Qty (kg)', align: 'right' },
        { label: 'Harga', align: 'right' },
        { label: 'Total', align: 'right' }
      ];
      const rows = s.purchases.map(p => [
        date(p.date), p.jenis, p.kategori, kg(p.qty), rupiahFull(p.price), rupiahFull(p.total)
      ]);
      scroll.appendChild(buildTable(headers, rows));
      card.appendChild(scroll);
      container.appendChild(card);
    }

    if (s.payments && s.payments.length) {
      const card = el('div', { className: 'table-card' });
      card.appendChild(el('div', { className: 'table-header' }, [
        el('div', { className: 'table-title', textContent: 'Pembayaran (' + s.payments.length + ')' })
      ]));
      const scroll = el('div', { className: 'table-scroll' });
      const headers = [
        { label: 'Tanggal' },
        { label: 'Keterangan' },
        { label: 'Tipe' },
        { label: 'Jumlah', align: 'right' }
      ];
      const rows = s.payments.map(p => [
        date(p.date),
        p.deskripsi,
        el('span', { className: 'badge badge-' + p.type.toLowerCase(), textContent: p.type }),
        rupiahFull(p.amount)
      ]);
      scroll.appendChild(buildTable(headers, rows));
      card.appendChild(scroll);
      container.appendChild(card);
    }
  } catch (err) {
    clear(container);
    container.appendChild(el('div', { className: 'loading', textContent: 'Error: ' + err.message }));
  }
}
