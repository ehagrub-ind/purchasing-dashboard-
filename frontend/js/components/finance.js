import { getKas, getOperasional } from '../modules/api.js';
import { rupiahFull, rupiah, date, num } from '../modules/format.js';
import { el, clear, showLoading, buildTable } from '../modules/dom.js';

const SVG_NS = 'http://www.w3.org/2000/svg';
let kasData = [], opData = [], kasSummary = [], opSummary = [];
let activeTab = 'ringkasan';
let globalWilayah = '';
let chart = null;
const notaStore = new Map();

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

// ── Helper Functions ──

function detectTransactionType(row) {
  const d = (row.deskripsi || '').toLowerCase();
  if (/terima|masuk|setoran|posisi kas/.test(d)) return 'masuk';
  if (/bayar|transfer|dp |pelunasan/.test(d)) return 'keluar';
  if (/operasional|bensin|makan|rokok|tol|parkir/.test(d)) return 'operasional';
  if (/koreksi|penyesuaian/.test(d)) return 'koreksi';
  if (row.masuk > 0 && row.keluar === 0) return 'masuk';
  if (row.keluar > 0 && row.masuk === 0) return 'keluar';
  return 'lainnya';
}

function detectSource(row) {
  const d = (row.deskripsi || '').toLowerCase();
  if (/agil/.test(d)) return 'Agil';
  if (/ucup/.test(d)) return 'Pak Ucup';
  if (/pak regen|regen/.test(d)) return 'Pak Regen';
  if (/posisi kas/.test(d)) return 'Kas Awal';
  return 'Lainnya';
}

function detectCategory(row) {
  const d = (row.deskripsi || '').toLowerCase();
  if (/dp /.test(d)) return 'DP Supplier';
  if (/pelunasan/.test(d)) return 'Pelunasan Supplier';
  if (/bahan baku/.test(d)) return 'Pembelian Bahan Baku';
  if (/operasional|bensin|makan|rokok|tol/.test(d)) return 'Operasional';
  if (/transfer.*kas/.test(d)) return 'Transfer Antar Kas';
  return 'Lainnya';
}

function detectIncompleteCashRow(row) {
  const issues = [];
  const tipe = detectTransactionType(row);
  if (tipe === 'masuk' && row.masuk === 0) issues.push('Tipe masuk tapi nominal masuk kosong');
  if (tipe === 'keluar' && row.keluar === 0) issues.push('Tipe keluar tapi nominal keluar kosong');
  if (!row.deskripsi || row.deskripsi.trim() === '') issues.push('Keterangan kosong');
  if (row.balance < 0) issues.push('Saldo minus setelah transaksi');
  if (row.masuk === 0 && row.keluar === 0 && !/posisi kas/i.test(row.deskripsi || '')) issues.push('Nominal masuk dan keluar kosong');
  return issues;
}

function getCashWarning(row) {
  const issues = detectIncompleteCashRow(row);
  if (issues.length === 0) return null;
  return issues[0];
}

function getSuggestion(issue) {
  if (/masuk kosong/.test(issue)) return 'Cek dan input nominal uang masuk';
  if (/keluar kosong/.test(issue)) return 'Cek dan input nominal uang keluar';
  if (/keterangan kosong/.test(issue)) return 'Tambahkan keterangan transaksi';
  if (/saldo minus/.test(issue)) return 'Cek uang masuk yang belum diinput';
  if (/nominal.*kosong/.test(issue)) return 'Verifikasi transaksi ini';
  return 'Cek ulang data transaksi';
}

function typeBadge(type) {
  const map = {
    masuk: { cls: 'fin-badge-masuk', label: 'Masuk' },
    keluar: { cls: 'fin-badge-keluar', label: 'Keluar' },
    operasional: { cls: 'fin-badge-operasional', label: 'Operasional' },
    koreksi: { cls: 'fin-badge-koreksi', label: 'Koreksi' },
    lainnya: { cls: 'fin-badge-lainnya', label: 'Lainnya' }
  };
  const m = map[type] || map.lainnya;
  return el('span', { className: `fin-badge ${m.cls}`, textContent: m.label });
}

function statusBadge(row) {
  const issues = detectIncompleteCashRow(row);
  if (issues.length === 0) return el('span', { className: 'fin-badge fin-badge-masuk', textContent: 'Lengkap' });
  if (issues.some(i => /kosong/.test(i))) return el('span', { className: 'fin-badge fin-badge-warning', textContent: 'Perlu Dicek' });
  return el('span', { className: 'fin-badge fin-badge-warning', textContent: 'Belum Ada Bukti' });
}

function detailBtn(row) {
  const btn = el('button', { className: 'btn-action', textContent: 'Detail' });
  btn.addEventListener('click', (e) => {
    e.stopPropagation();
    showDetail(row);
  });
  return btn;
}

function wilayahBadge(w) {
  return el('span', { className: `badge supplier-wilayah wilayah-${(w || '').toLowerCase()}`, textContent: w });
}

function filterRows(rows) {
  if (!globalWilayah) return rows;
  return rows.filter(r => r.wilayah === globalWilayah);
}

// ── Main Render ──

export async function render(container) {
  showLoading(container);
  try {
    const [kas, op] = await Promise.all([getKas(), getOperasional()]);
    kasData = kas.data;
    opData = op.data;
    kasSummary = kas.summary;
    opSummary = op.summary;
    activeTab = 'ringkasan';
    globalWilayah = '';
    renderPage(container);
  } catch (err) {
    clear(container);
    container.appendChild(el('div', { className: 'loading', textContent: 'Error: ' + err.message }));
  }
}

function renderPage(container) {
  clear(container);

  // Header
  const header = el('div', { className: 'page-header' }, [
    el('div', { className: 'page-header-left' }, [
      el('h2', { className: 'page-title', textContent: 'Keuangan' }),
      el('p', { className: 'page-subtitle', textContent: 'Pantau arus kas masuk, kas keluar, saldo wilayah, dan transaksi yang belum lengkap.' })
    ]),
    el('div', { className: 'page-header-actions' }, [
      makeBtn('+ Input Uang Masuk', true, () => showModal(container, 'masuk')),
      makeBtn('+ Input Pengeluaran', false, () => showModal(container, 'keluar')),
      makeBtn('Export', false, null)
    ])
  ]);
  container.appendChild(header);

  // Warning banner
  const incompleteCount = kasData.filter(r => detectIncompleteCashRow(r).length > 0).length;
  if (incompleteCount > 0) {
    container.appendChild(el('div', { className: 'fin-banner fin-banner-warning' }, [
      el('span', { className: 'fin-banner-icon', textContent: '!' }),
      el('span', { textContent: 'Jika saldo wilayah minus, cek tab Uang Masuk dan Belum Lengkap terlebih dahulu. ' }),
      el('strong', { textContent: incompleteCount + ' transaksi perlu dicek.' })
    ]));
  }

  // KPI cards
  renderKPI(container);

  // Quick filter pills
  renderQuickFilter(container);

  // Tabs
  renderTabs(container);

  // Tab content
  const content = el('div', { className: 'fin-tab-content', id: 'fin-tab-content' });
  container.appendChild(content);
  renderTabContent(content);
}

function makeBtn(label, primary, onClick) {
  const btn = el('button', { className: primary ? 'btn btn-primary' : 'btn' });
  btn.appendChild(document.createTextNode(label));
  if (onClick) btn.addEventListener('click', onClick);
  return btn;
}

function renderKPI(container) {
  let totalMasuk = 0, totalKeluar = 0;
  for (const s of kasSummary) {
    totalMasuk += Number(s.total_masuk);
    totalKeluar += Number(s.total_keluar);
  }
  const saldo = totalMasuk - totalKeluar;
  const selisih = Math.abs(saldo);
  const incomplete = kasData.filter(r => detectIncompleteCashRow(r).length > 0).length;

  const grid = el('div', { className: 'kpi-row' });
  const cards = [
    { label: 'Total Uang Masuk', value: rupiah(totalMasuk), color: 'green', icon: iconArrowDown() },
    { label: 'Total Uang Keluar', value: rupiah(totalKeluar), color: 'red', icon: iconArrowUp() },
    { label: 'Saldo Akhir', value: rupiah(saldo), color: saldo >= 0 ? 'green' : 'red', icon: iconWallet(), badge: saldo < 0 ? 'Minus' : 'Positif', badgeColor: saldo < 0 ? 'red' : 'green' },
    { label: 'Selisih Belum Jelas', value: rupiah(selisih), color: 'orange', icon: iconAlert(), badge: 'Review', badgeColor: 'orange' },
    { label: 'Transaksi Belum Lengkap', value: String(incomplete), color: incomplete > 0 ? 'orange' : 'green', icon: iconClipboard(), badge: incomplete > 0 ? 'Perlu Cek' : 'Aman', badgeColor: incomplete > 0 ? 'orange' : 'green' }
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
      el('div', { className: 'kpi-updated', textContent: 'Diperbarui baru saja' })
    ]));
  }
  container.appendChild(grid);
}

function renderQuickFilter(container) {
  const bar = el('div', { className: 'fin-quick-filter' });
  const pills = [
    { label: 'Semua', value: '' },
    { label: 'Jabar', value: 'Jabar' },
    { label: 'Jateng', value: 'Jateng' },
    { label: 'Jatim', value: 'Jatim' },
    { label: 'Saldo Minus', value: '__minus' },
    { label: 'Belum Lengkap', value: '__incomplete' }
  ];
  for (const p of pills) {
    const pill = el('button', {
      className: `fin-pill ${globalWilayah === p.value ? 'active' : ''}`,
      textContent: p.label,
      onClick: () => {
        globalWilayah = p.value;
        renderPage(container);
      }
    });
    bar.appendChild(pill);
  }
  container.appendChild(bar);
}

function renderTabs(container) {
  const tabs = el('div', { className: 'fin-tabs' });
  const items = [
    { id: 'ringkasan', label: 'Ringkasan' },
    { id: 'masuk', label: 'Uang Masuk' },
    { id: 'keluar', label: 'Uang Keluar' },
    { id: 'aruskas', label: 'Arus Kas' },
    { id: 'incomplete', label: 'Belum Lengkap' }
  ];
  for (const t of items) {
    const incCount = t.id === 'incomplete' ? kasData.filter(r => detectIncompleteCashRow(r).length > 0).length : 0;
    const tab = el('button', {
      className: `fin-tab ${activeTab === t.id ? 'active' : ''}`,
      textContent: t.label,
      onClick: () => {
        activeTab = t.id;
        document.querySelectorAll('.fin-tab').forEach(b => b.classList.remove('active'));
        tab.classList.add('active');
        const content = document.getElementById('fin-tab-content');
        if (content) renderTabContent(content);
      }
    });
    if (t.id === 'incomplete' && incCount > 0) {
      tab.appendChild(document.createTextNode(' '));
      tab.appendChild(el('span', { className: 'fin-tab-count', textContent: String(incCount) }));
    }
    tabs.appendChild(tab);
  }
  container.appendChild(tabs);
}

function renderTabContent(content) {
  clear(content);
  const filtered = getFilteredData();
  switch (activeTab) {
    case 'ringkasan': renderRingkasan(content, filtered); break;
    case 'masuk': renderMasuk(content, filtered); break;
    case 'keluar': renderKeluar(content, filtered); break;
    case 'aruskas': renderArusKas(content, filtered); break;
    case 'incomplete': renderIncomplete(content); break;
  }
}

function getFilteredData() {
  if (!globalWilayah || globalWilayah.startsWith('__')) return kasData;
  return kasData.filter(r => r.wilayah === globalWilayah);
}

// ── Tab: Ringkasan ──

function renderRingkasan(container, rows) {
  // Saldo per wilayah cards
  const grid = el('div', { className: 'stat-grid fin-wilayah-grid' });
  for (const s of kasSummary) {
    const saldo = Number(s.saldo);
    grid.appendChild(el('div', { className: 'stat-card' }, [
      el('div', { className: 'stat-card-row' }, [
        el('div', { className: `stat-icon ${saldo >= 0 ? 'green' : 'red'}` }, [iconWallet()]),
        el('div', {}, [
          el('div', { className: 'stat-label' }, [document.createTextNode('Kas '), wilayahBadge(s.wilayah)]),
          el('div', { className: `stat-value ${saldo >= 0 ? 'green' : 'red'}`, textContent: rupiah(saldo) }),
          el('div', { className: 'stat-sub', textContent: 'Masuk: ' + rupiah(s.total_masuk) + ' | Keluar: ' + rupiah(s.total_keluar) })
        ])
      ])
    ]));
  }
  container.appendChild(grid);

  // Chart: masuk vs keluar per wilayah
  const chartCard = el('div', { className: 'chart-card' });
  chartCard.appendChild(el('div', { className: 'chart-title', textContent: 'Arus Kas per Wilayah: Masuk vs Keluar' }));
  const canvas = document.createElement('canvas');
  canvas.id = 'chart-kas-wilayah';
  chartCard.appendChild(canvas);
  container.appendChild(chartCard);

  requestAnimationFrame(() => {
    if (chart) chart.destroy();
    chart = new Chart(canvas, {
      type: 'bar',
      data: {
        labels: kasSummary.map(s => s.wilayah),
        datasets: [
          { label: 'Masuk', data: kasSummary.map(s => Number(s.total_masuk)), backgroundColor: '#10B981', borderRadius: 8, borderSkipped: false },
          { label: 'Keluar', data: kasSummary.map(s => Number(s.total_keluar)), backgroundColor: '#EF4444', borderRadius: 8, borderSkipped: false }
        ]
      },
      options: {
        responsive: true,
        plugins: { legend: { labels: { color: '#64748B', font: { family: 'Inter' } } } },
        scales: {
          x: { ticks: { color: '#64748B', font: { family: 'Inter' } }, grid: { display: false } },
          y: { ticks: { color: '#64748B' }, grid: { color: '#E5E7EB' } }
        }
      }
    });
  });

  // Insight cards
  renderInsights(container);

  // Warning box
  const masukCount = rows.filter(r => r.masuk > 0).length;
  const keluarCount = rows.filter(r => r.keluar > 0).length;
  container.appendChild(el('div', { className: 'fin-banner fin-banner-info' }, [
    el('span', { className: 'fin-banner-icon', textContent: 'i' }),
    el('div', {}, [
      el('strong', { textContent: 'Banyak uang masuk belum diinput. ' }),
      el('span', { textContent: 'Saldo minus bisa terjadi karena pemasukan belum dicatat. ' }),
      el('span', { textContent: 'Saat ini: ' + masukCount + ' transaksi masuk vs ' + keluarCount + ' transaksi keluar.' })
    ])
  ]));

  // Operasional summary
  let totalOp = 0;
  for (const s of opSummary) totalOp += Number(s.total);
  const opCard = el('div', { className: 'section-card' });
  opCard.appendChild(el('div', { className: 'section-card-header' }, [
    el('div', {}, [
      el('div', { className: 'section-card-title', textContent: 'Biaya Operasional' }),
      el('div', { className: 'section-card-sub', textContent: 'Total: ' + rupiah(totalOp) + ' (' + opData.length + ' transaksi)' })
    ])
  ]));
  const opScroll = el('div', { className: 'table-scroll' });
  opScroll.appendChild(buildTable(
    [{ label: 'Wilayah' }, { label: 'Keterangan' }, { label: 'Jumlah', align: 'right' }],
    opData.map(o => [wilayahBadge(o.wilayah), o.deskripsi, rupiahFull(o.jumlah)])
  ));
  opCard.appendChild(opScroll);
  container.appendChild(opCard);
}

function renderInsights(container) {
  const mostMinus = [...kasSummary].sort((a, b) => Number(a.saldo) - Number(b.saldo))[0];
  const mostMasuk = [...kasSummary].sort((a, b) => Number(b.total_masuk) - Number(a.total_masuk))[0];

  const incByWilayah = {};
  for (const r of kasData) {
    if (detectIncompleteCashRow(r).length > 0) {
      incByWilayah[r.wilayah] = (incByWilayah[r.wilayah] || 0) + 1;
    }
  }
  const mostInc = Object.entries(incByWilayah).sort((a, b) => b[1] - a[1])[0];

  const grid = el('div', { className: 'fin-insight-grid' });

  grid.appendChild(el('div', { className: 'fin-insight-card' }, [
    el('div', { className: 'fin-insight-icon red' }, [iconAlert()]),
    el('div', {}, [
      el('div', { className: 'fin-insight-label', textContent: 'Wilayah Paling Minus' }),
      el('div', { className: 'fin-insight-value red', textContent: mostMinus ? mostMinus.wilayah : '-' }),
      el('div', { className: 'fin-insight-sub', textContent: mostMinus ? 'Saldo: ' + rupiah(mostMinus.saldo) : '-' })
    ])
  ]));

  grid.appendChild(el('div', { className: 'fin-insight-card' }, [
    el('div', { className: 'fin-insight-icon green' }, [iconArrowDown()]),
    el('div', {}, [
      el('div', { className: 'fin-insight-label', textContent: 'Pemasukan Terbesar' }),
      el('div', { className: 'fin-insight-value green', textContent: mostMasuk ? mostMasuk.wilayah : '-' }),
      el('div', { className: 'fin-insight-sub', textContent: mostMasuk ? 'Total: ' + rupiah(mostMasuk.total_masuk) : '-' })
    ])
  ]));

  grid.appendChild(el('div', { className: 'fin-insight-card' }, [
    el('div', { className: 'fin-insight-icon orange' }, [iconClipboard()]),
    el('div', {}, [
      el('div', { className: 'fin-insight-label', textContent: 'Belum Lengkap Terbanyak' }),
      el('div', { className: 'fin-insight-value', textContent: mostInc ? mostInc[0] : 'Tidak ada' }),
      el('div', { className: 'fin-insight-sub', textContent: mostInc ? mostInc[1] + ' transaksi perlu dicek' : 'Semua lengkap' })
    ])
  ]));

  container.appendChild(grid);
}

// ── Tab: Uang Masuk ──

function renderMasuk(container, rows) {
  const masukRows = rows.filter(r => r.masuk > 0);

  // Toolbar
  const bar = el('div', { className: 'supplier-toolbar' });
  const searchEl = el('input', { className: 'search-input', type: 'text', placeholder: 'Cari transaksi masuk...' });
  searchEl.addEventListener('input', () => {
    const q = searchEl.value.toLowerCase();
    const filtered = masukRows.filter(r => (r.deskripsi || '').toLowerCase().includes(q));
    renderMasukTable(tableContainer, filtered);
  });
  bar.appendChild(searchEl);
  container.appendChild(bar);

  const tableContainer = el('div');
  container.appendChild(tableContainer);
  renderMasukTable(tableContainer, masukRows);
}

function renderMasukTable(container, rows) {
  clear(container);
  const card = el('div', { className: 'table-card' });
  card.appendChild(el('div', { className: 'table-header' }, [
    el('div', { className: 'table-title', textContent: 'Uang Masuk (' + rows.length + ' transaksi)' })
  ]));
  const scroll = el('div', { className: 'table-scroll', style: 'max-height:70vh' });
  scroll.appendChild(buildTable(
    [
      { label: 'Tanggal' }, { label: 'Wilayah' }, { label: 'Sumber Dana' },
      { label: 'Keterangan' }, { label: 'Nominal Masuk', align: 'right' },
      { label: 'Status' }, { label: 'Aksi' }
    ],
    rows.map(r => [
      date(r.date), wilayahBadge(r.wilayah), detectSource(r),
      r.deskripsi, el('span', { className: 'fin-amount-in', textContent: rupiahFull(r.masuk) }),
      statusBadge(r), detailBtn(r)
    ])
  ));
  card.appendChild(scroll);
  container.appendChild(card);
}

// ── Tab: Uang Keluar ──

function renderKeluar(container, rows) {
  const keluarRows = rows.filter(r => r.keluar > 0);

  const bar = el('div', { className: 'supplier-toolbar' });
  const searchEl = el('input', { className: 'search-input', type: 'text', placeholder: 'Cari transaksi keluar...' });
  searchEl.addEventListener('input', () => {
    const q = searchEl.value.toLowerCase();
    const filtered = keluarRows.filter(r => (r.deskripsi || '').toLowerCase().includes(q));
    renderKeluarTable(tableContainer, filtered);
  });
  bar.appendChild(searchEl);
  container.appendChild(bar);

  const tableContainer = el('div');
  container.appendChild(tableContainer);
  renderKeluarTable(tableContainer, keluarRows);
}

function renderKeluarTable(container, rows) {
  clear(container);
  const card = el('div', { className: 'table-card' });
  card.appendChild(el('div', { className: 'table-header' }, [
    el('div', { className: 'table-title', textContent: 'Uang Keluar (' + rows.length + ' transaksi)' })
  ]));
  const scroll = el('div', { className: 'table-scroll', style: 'max-height:70vh' });
  scroll.appendChild(buildTable(
    [
      { label: 'Tanggal' }, { label: 'Wilayah' }, { label: 'Supplier/Tujuan' },
      { label: 'Keterangan' }, { label: 'Nominal Keluar', align: 'right' },
      { label: 'Kategori' }, { label: 'Status' }, { label: 'Aksi' }
    ],
    rows.map(r => [
      date(r.date), wilayahBadge(r.wilayah), detectSupplier(r),
      r.deskripsi, el('span', { className: 'fin-amount-out', textContent: rupiahFull(r.keluar) }),
      detectCategory(r), statusBadge(r), detailBtn(r)
    ])
  ));
  card.appendChild(scroll);
  container.appendChild(card);
}

function detectSupplier(row) {
  const d = (row.deskripsi || '');
  const match = d.match(/bahan baku\s+(\w+)/i) || d.match(/ke\s+(\w+)/i);
  return match ? match[1] : '-';
}

// ── Tab: Arus Kas (combined) ──

function renderArusKas(container, rows) {
  const card = el('div', { className: 'table-card' });
  card.appendChild(el('div', { className: 'table-header' }, [
    el('div', { className: 'table-title', textContent: 'Arus Kas (' + rows.length + ' entri)' })
  ]));
  const scroll = el('div', { className: 'table-scroll', style: 'max-height:70vh' });
  const headers = [
    { label: 'Tanggal' }, { label: 'Wilayah' }, { label: 'Keterangan' },
    { label: 'Masuk', align: 'right' }, { label: 'Keluar', align: 'right' },
    { label: 'Saldo', align: 'right' }, { label: 'Tipe' }
  ];
  const tableRows = rows.map(r => {
    const tipe = detectTransactionType(r);
    const saldoVal = Number(r.balance);
    return [
      date(r.date),
      wilayahBadge(r.wilayah),
      r.deskripsi,
      r.masuk > 0 ? el('span', { className: 'fin-amount-in', textContent: rupiahFull(r.masuk) }) : el('span', { className: 'fin-amount-dim', textContent: '-' }),
      r.keluar > 0 ? el('span', { className: 'fin-amount-out', textContent: rupiahFull(r.keluar) }) : el('span', { className: 'fin-amount-dim', textContent: '-' }),
      el('span', { className: saldoVal < 0 ? 'fin-amount-out' : '', textContent: rupiahFull(r.balance) }),
      typeBadge(tipe)
    ];
  });
  scroll.appendChild(buildTable(headers, tableRows));
  card.appendChild(scroll);
  container.appendChild(card);
}

// ── Tab: Belum Lengkap ──

function renderIncomplete(container) {
  let issues = [];
  for (const r of kasData) {
    const problems = detectIncompleteCashRow(r);
    if (globalWilayah === '__incomplete' || globalWilayah === '__minus') {
      if (globalWilayah === '__minus' && r.balance >= 0) continue;
    } else if (globalWilayah && !globalWilayah.startsWith('__') && r.wilayah !== globalWilayah) {
      continue;
    }
    for (const p of problems) {
      issues.push({ row: r, issue: p, suggestion: getSuggestion(p) });
    }
  }

  if (issues.length === 0) {
    container.appendChild(el('div', { className: 'supplier-empty' }, [
      el('div', { className: 'supplier-empty-title', textContent: 'Semua transaksi lengkap' }),
      el('div', { className: 'supplier-empty-sub', textContent: 'Tidak ada transaksi yang perlu dicek saat ini.' })
    ]));
    return;
  }

  const card = el('div', { className: 'table-card' });
  card.appendChild(el('div', { className: 'table-header' }, [
    el('div', { className: 'table-title', textContent: 'Transaksi Belum Lengkap (' + issues.length + ')' })
  ]));
  const scroll = el('div', { className: 'table-scroll', style: 'max-height:70vh' });
  scroll.appendChild(buildTable(
    [
      { label: 'Tanggal' }, { label: 'Wilayah' }, { label: 'Masalah' },
      { label: 'Keterangan' }, { label: 'Nominal', align: 'right' },
      { label: 'Saran Perbaikan' }, { label: 'Aksi' }
    ],
    issues.map(i => [
      date(i.row.date),
      wilayahBadge(i.row.wilayah),
      el('span', { className: 'fin-badge fin-badge-warning', textContent: i.issue }),
      i.row.deskripsi || '-',
      rupiahFull(i.row.masuk > 0 ? i.row.masuk : i.row.keluar),
      i.suggestion,
      detailBtn(i.row)
    ])
  ));
  card.appendChild(scroll);
  container.appendChild(card);
}

// ── Detail Modal ──

function showDetail(row) {
  const existing = document.getElementById('fin-modal-overlay');
  if (existing) existing.remove();

  const overlay = el('div', { className: 'fin-modal-overlay', id: 'fin-modal-overlay' });
  overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.remove(); });

  const modal = el('div', { className: 'fin-modal', style: 'max-width:580px' });

  modal.appendChild(el('div', { className: 'fin-modal-header' }, [
    el('div', { className: 'fin-modal-title', textContent: 'Detail Transaksi' }),
    el('button', { className: 'fin-modal-close', textContent: '×', onClick: () => overlay.remove() })
  ]));

  const body = el('div', { className: 'fin-modal-body', style: 'gap:20px' });

  const tipe = detectTransactionType(row);
  const isIn = row.masuk > 0;
  const issues = detectIncompleteCashRow(row);

  // Section: Info Transaksi
  const infoSection = el('div', { className: 'fin-detail-section' });
  infoSection.appendChild(el('div', { className: 'fin-detail-section-title', textContent: 'Informasi Transaksi' }));

  const infoGrid = el('div', { className: 'fin-detail-grid' });
  const addRow = (label, value) => {
    infoGrid.appendChild(el('div', { className: 'fin-detail-label', textContent: label }));
    if (value instanceof HTMLElement) {
      const valWrap = el('div', { className: 'fin-detail-value' });
      valWrap.appendChild(value);
      infoGrid.appendChild(valWrap);
    } else {
      infoGrid.appendChild(el('div', { className: 'fin-detail-value', textContent: value || '-' }));
    }
  };

  addRow('Tanggal', date(row.date));
  addRow('Wilayah', wilayahBadge(row.wilayah));
  addRow('Tipe', typeBadge(tipe));
  addRow('Keterangan', row.deskripsi || '-');
  if (isIn) {
    addRow('Sumber Dana', detectSource(row));
  } else {
    addRow('Kategori', detectCategory(row));
    addRow('Tujuan', detectSupplier(row));
  }
  addRow('Uang Masuk', row.masuk > 0
    ? el('span', { className: 'fin-amount-in', textContent: rupiahFull(row.masuk) })
    : el('span', { className: 'fin-amount-dim', textContent: '-' }));
  addRow('Uang Keluar', row.keluar > 0
    ? el('span', { className: 'fin-amount-out', textContent: rupiahFull(row.keluar) })
    : el('span', { className: 'fin-amount-dim', textContent: '-' }));
  addRow('Saldo Setelah', el('span', {
    className: Number(row.balance) < 0 ? 'fin-amount-out' : '',
    textContent: rupiahFull(row.balance)
  }));
  addRow('Status', statusBadge(row));

  if (issues.length > 0) {
    const issueList = el('div', { style: 'display:flex;flex-direction:column;gap:4px' });
    for (const iss of issues) {
      issueList.appendChild(el('span', { className: 'fin-badge fin-badge-warning', textContent: iss, style: 'display:inline-block;margin-bottom:2px' }));
    }
    addRow('Masalah', issueList);
  }

  infoSection.appendChild(infoGrid);
  body.appendChild(infoSection);

  // Section: Nota & Bukti
  const hasNota = notaStore.has(row.id);
  const notaSection = el('div', { className: 'fin-detail-section' });
  notaSection.appendChild(el('div', { className: 'fin-detail-section-title', textContent: 'Nota & Bukti Transaksi' }));

  const notaStatus = el('div', { className: 'fin-nota-status' });
  if (hasNota) {
    const notaInfo = notaStore.get(row.id);
    notaStatus.appendChild(el('div', { className: 'fin-nota-indicator uploaded' }, [
      iconCheckCircle(),
      el('span', { textContent: 'Nota tersedia' })
    ]));
    notaStatus.appendChild(el('div', { className: 'fin-nota-filename', textContent: notaInfo.name }));
    notaStatus.appendChild(el('div', { className: 'fin-nota-meta', textContent: 'Diupload: ' + notaInfo.time }));
  } else {
    notaStatus.appendChild(el('div', { className: 'fin-nota-indicator empty' }, [
      iconFileX(),
      el('span', { textContent: 'Belum ada nota / bukti' })
    ]));
  }
  notaSection.appendChild(notaStatus);

  const notaActions = el('div', { className: 'fin-nota-actions' });

  const uploadBtn = el('button', { className: 'fin-nota-btn primary' }, [
    iconUpload(), el('span', { textContent: 'Upload Nota' })
  ]);
  const fileInput = document.createElement('input');
  fileInput.type = 'file';
  fileInput.accept = 'image/*,.pdf';
  fileInput.style.display = 'none';
  fileInput.addEventListener('change', () => {
    if (fileInput.files.length > 0) {
      const f = fileInput.files[0];
      const now = new Date();
      notaStore.set(row.id, {
        name: f.name,
        size: f.size,
        time: now.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }) + ' ' + now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
      });
      overlay.remove();
      showDetail(row);
    }
  });
  uploadBtn.addEventListener('click', () => fileInput.click());
  uploadBtn.appendChild(fileInput);
  notaActions.appendChild(uploadBtn);

  if (hasNota) {
    notaActions.appendChild(el('button', { className: 'fin-nota-btn', onClick: () => alert('Fitur lihat nota akan tersedia setelah integrasi backend.') }, [
      iconEye(), el('span', { textContent: 'Lihat' })
    ]));
  }

  notaActions.appendChild(el('button', { className: 'fin-nota-btn', onClick: () => printNota(row) }, [
    iconPrinter(), el('span', { textContent: 'Cetak' })
  ]));

  if (hasNota) {
    notaActions.appendChild(el('button', { className: 'fin-nota-btn danger', onClick: () => {
      notaStore.delete(row.id);
      overlay.remove();
      showDetail(row);
    } }, [
      iconTrash(), el('span', { textContent: 'Hapus' })
    ]));
  }

  notaSection.appendChild(notaActions);
  body.appendChild(notaSection);

  modal.appendChild(body);

  modal.appendChild(el('div', { className: 'fin-modal-footer' }, [
    el('button', { className: 'btn', textContent: 'Tutup', onClick: () => overlay.remove() })
  ]));

  overlay.appendChild(modal);
  document.body.appendChild(overlay);
}

function printNota(row) {
  const tipe = detectTransactionType(row);
  const w = window.open('', '_blank', 'width=400,height=600');
  const doc = w.document;
  const head = doc.createElement('head');
  const meta = doc.createElement('meta');
  meta.setAttribute('charset', 'UTF-8');
  head.appendChild(meta);
  const title = doc.createElement('title');
  title.textContent = 'Nota Transaksi';
  head.appendChild(title);
  const style = doc.createElement('style');
  style.textContent = [
    '*{margin:0;padding:0;box-sizing:border-box}',
    "body{font-family:'Segoe UI',sans-serif;padding:24px;color:#1E293B;font-size:13px}",
    'h2{font-size:16px;margin-bottom:4px}',
    '.sub{color:#94A3B8;font-size:11px;margin-bottom:20px}',
    '.line{border-top:1px dashed #E5E7EB;margin:14px 0}',
    '.row{display:flex;justify-content:space-between;margin-bottom:8px}',
    '.label{color:#64748B}',
    '.val{font-weight:600;text-align:right}',
    '.total{font-size:16px;font-weight:700}',
    '.total.green{color:#10B981}',
    '.total.red{color:#EF4444}',
    '.footer{margin-top:24px;text-align:center;color:#94A3B8;font-size:10px}',
    '@media print{body{padding:16px}}'
  ].join('\n');
  head.appendChild(style);
  doc.documentElement.appendChild(head);

  const body = doc.createElement('body');
  const h2 = doc.createElement('h2');
  h2.textContent = 'Nota Transaksi';
  body.appendChild(h2);
  const sub = doc.createElement('div');
  sub.className = 'sub';
  sub.textContent = 'Purchasing Dashboard - Pak Regen';
  body.appendChild(sub);

  const addLine = () => { const d = doc.createElement('div'); d.className = 'line'; body.appendChild(d); };
  const addPrintRow = (lbl, val) => {
    const r = doc.createElement('div');
    r.className = 'row';
    const l = doc.createElement('span');
    l.className = 'label';
    l.textContent = lbl;
    r.appendChild(l);
    const v = doc.createElement('span');
    v.className = 'val';
    v.textContent = val;
    r.appendChild(v);
    body.appendChild(r);
  };

  addLine();
  addPrintRow('Tanggal', row.date ? new Date(row.date).toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' }) : '-');
  addPrintRow('Wilayah', row.wilayah || '-');
  addPrintRow('Tipe', tipe.charAt(0).toUpperCase() + tipe.slice(1));
  addPrintRow('Keterangan', row.deskripsi || '-');
  addLine();
  addPrintRow('Uang Masuk', row.masuk > 0 ? 'Rp ' + (Number(row.masuk) * 1000).toLocaleString('id-ID') : '-');
  addPrintRow('Uang Keluar', row.keluar > 0 ? 'Rp ' + (Number(row.keluar) * 1000).toLocaleString('id-ID') : '-');
  addLine();

  const totalRow = doc.createElement('div');
  totalRow.className = 'row';
  const tl = doc.createElement('span');
  tl.className = 'label';
  tl.textContent = 'Saldo Setelah';
  totalRow.appendChild(tl);
  const tv = doc.createElement('span');
  tv.className = 'val total ' + (Number(row.balance) < 0 ? 'red' : 'green');
  tv.textContent = 'Rp ' + (Number(row.balance) * 1000).toLocaleString('id-ID');
  totalRow.appendChild(tv);
  body.appendChild(totalRow);
  addLine();

  const footer = doc.createElement('div');
  footer.className = 'footer';
  const now = new Date();
  footer.textContent = 'Dicetak dari Purchasing Dashboard — ' + now.toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' }) + ' ' + now.toLocaleTimeString('id-ID');
  body.appendChild(footer);

  doc.documentElement.appendChild(body);
  w.onload = () => w.print();
}

// ── Input Modal ──

function showModal(pageContainer, type) {
  const existing = document.getElementById('fin-modal-overlay');
  if (existing) existing.remove();

  const overlay = el('div', { className: 'fin-modal-overlay', id: 'fin-modal-overlay' });
  overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.remove(); });

  const modal = el('div', { className: 'fin-modal' });
  const title = type === 'masuk' ? 'Input Uang Masuk' : 'Input Pengeluaran';
  modal.appendChild(el('div', { className: 'fin-modal-header' }, [
    el('div', { className: 'fin-modal-title', textContent: title }),
    el('button', { className: 'fin-modal-close', textContent: 'x', onClick: () => overlay.remove() })
  ]));

  const form = el('div', { className: 'fin-modal-body' });

  form.appendChild(formField('Tanggal', el('input', { type: 'date', className: 'fin-input' })));

  const wilayahSel = el('select', { className: 'fin-input' });
  ['Jatim', 'Jateng', 'Jabar'].forEach(w => wilayahSel.appendChild(el('option', { value: w, textContent: w })));
  form.appendChild(formField('Wilayah', wilayahSel));

  if (type === 'masuk') {
    const sumberSel = el('select', { className: 'fin-input' });
    ['Agil', 'Pak Regen', 'Pak Ucup', 'Kas Awal', 'Lainnya'].forEach(s => sumberSel.appendChild(el('option', { value: s, textContent: s })));
    form.appendChild(formField('Sumber Dana', sumberSel));
  } else {
    form.appendChild(formField('Tujuan / Supplier', el('input', { type: 'text', className: 'fin-input', placeholder: 'Nama supplier atau tujuan' })));
    const katSel = el('select', { className: 'fin-input' });
    ['Pembelian Bahan Baku', 'DP Supplier', 'Pelunasan Supplier', 'Operasional', 'Transfer Antar Kas', 'Lainnya'].forEach(k => katSel.appendChild(el('option', { value: k, textContent: k })));
    form.appendChild(formField('Kategori', katSel));
  }

  form.appendChild(formField('Keterangan', el('input', { type: 'text', className: 'fin-input', placeholder: 'Keterangan transaksi' })));
  form.appendChild(formField('Nominal', el('input', { type: 'number', className: 'fin-input', placeholder: 'Nominal dalam Rupiah' })));
  form.appendChild(formField('Bukti / Catatan (opsional)', el('input', { type: 'text', className: 'fin-input', placeholder: 'Catatan tambahan' })));

  modal.appendChild(form);

  const footer = el('div', { className: 'fin-modal-footer' }, [
    el('button', { className: 'btn', textContent: 'Batal', onClick: () => overlay.remove() }),
    el('button', { className: 'btn btn-primary', textContent: 'Simpan' })
  ]);
  modal.appendChild(footer);

  overlay.appendChild(modal);
  document.body.appendChild(overlay);
}

function formField(label, input) {
  return el('div', { className: 'fin-field' }, [
    el('label', { className: 'fin-field-label', textContent: label }),
    input
  ]);
}

// ── SVG Icons ──

function iconArrowDown() {
  return makeSvg([
    svgEl('line', { x1: '12', y1: '5', x2: '12', y2: '19' }),
    svgEl('polyline', { points: '19,12 12,19 5,12' })
  ]);
}
function iconArrowUp() {
  return makeSvg([
    svgEl('line', { x1: '12', y1: '19', x2: '12', y2: '5' }),
    svgEl('polyline', { points: '5,12 12,5 19,12' })
  ]);
}
function iconWallet() {
  return makeSvg([
    svgEl('rect', { x: '1', y: '4', width: '22', height: '16', rx: '2' }),
    svgEl('line', { x1: '1', y1: '10', x2: '23', y2: '10' })
  ]);
}
function iconAlert() {
  return makeSvg([
    svgEl('path', { d: 'M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z' }),
    svgEl('line', { x1: '12', y1: '9', x2: '12', y2: '13' }),
    svgEl('line', { x1: '12', y1: '17', x2: '12.01', y2: '17' })
  ]);
}
function iconClipboard() {
  return makeSvg([
    svgEl('path', { d: 'M16 4h2a2 2 0 012 2v14a2 2 0 01-2 2H6a2 2 0 01-2-2V6a2 2 0 012-2h2' }),
    svgEl('rect', { x: '8', y: '2', width: '8', height: '4', rx: '1' })
  ]);
}
function iconUpload() {
  return makeSvg([
    svgEl('path', { d: 'M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4' }),
    svgEl('polyline', { points: '17,8 12,3 7,8' }),
    svgEl('line', { x1: '12', y1: '3', x2: '12', y2: '15' })
  ]);
}
function iconEye() {
  return makeSvg([
    svgEl('path', { d: 'M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z' }),
    svgEl('circle', { cx: '12', cy: '12', r: '3' })
  ]);
}
function iconPrinter() {
  return makeSvg([
    svgEl('polyline', { points: '6,9 6,2 18,2 18,9' }),
    svgEl('path', { d: 'M6 18H4a2 2 0 01-2-2v-5a2 2 0 012-2h16a2 2 0 012 2v5a2 2 0 01-2 2h-2' }),
    svgEl('rect', { x: '6', y: '14', width: '12', height: '8' })
  ]);
}
function iconTrash() {
  return makeSvg([
    svgEl('polyline', { points: '3,6 5,6 21,6' }),
    svgEl('path', { d: 'M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2' })
  ]);
}
function iconCheckCircle() {
  return makeSvg([
    svgEl('path', { d: 'M22 11.08V12a10 10 0 11-5.93-9.14' }),
    svgEl('polyline', { points: '22,4 12,14.01 9,11.01' })
  ]);
}
function iconFileX() {
  return makeSvg([
    svgEl('path', { d: 'M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z' }),
    svgEl('polyline', { points: '14,2 14,8 20,8' }),
    svgEl('line', { x1: '9.5', y1: '12.5', x2: '14.5', y2: '17.5' }),
    svgEl('line', { x1: '14.5', y1: '12.5', x2: '9.5', y2: '17.5' })
  ]);
}
