import { getImport } from '../modules/api.js';
import { usd, idr, idrFull, kg, num, date } from '../modules/format.js';
import { el, clear, buildTable } from '../modules/dom.js';

let chart1 = null, chart2 = null, chart3 = null;
let importActiveTab = 'ringkasan';

export async function loadImportData() {
  return getImport();
}

export function renderImportContent(container, data) {
  clear(container);

  renderImportKPI(container, data);
  renderImportTabs(container, data);

  const content = el('div', { id: 'import-tab-content' });
  container.appendChild(content);
  renderImportTabContent(content, data);
}

function destroyCharts() {
  if (chart1) { chart1.destroy(); chart1 = null; }
  if (chart2) { chart2.destroy(); chart2 = null; }
  if (chart3) { chart3.destroy(); chart3 = null; }
}

function makeSvgIcon() {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('fill', 'none');
  svg.setAttribute('stroke', 'currentColor');
  svg.setAttribute('stroke-width', '2');
  const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
  circle.setAttribute('cx', '12');
  circle.setAttribute('cy', '12');
  circle.setAttribute('r', '10');
  svg.appendChild(circle);
  const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  path.setAttribute('d', 'M12 6v6l4 2');
  svg.appendChild(path);
  return svg;
}

function renderImportKPI(container, data) {
  const rm = data.raw_materials;
  const payments = data.payments;

  const totalKg = rm.reduce((s, r) => s + r.kg, 0);
  const totalRmUsd = rm.reduce((s, r) => s + r.usd, 0);
  const ucupPayments = payments.filter(p => p.desc.toLowerCase().includes('ucup'));
  const ucupTotalIdr = ucupPayments.reduce((s, p) => s + p.idr, 0);
  const ucupTotalUsd = ucupPayments.reduce((s, p) => s + p.usd, 0);
  const lastBal = data.balance_timeline[data.balance_timeline.length - 1].bal;

  const grid = el('div', { className: 'kpi-row' });
  const cards = [
    { label: 'Total Bahan Baku India', value: kg(totalKg), sub: rm.length + ' pengiriman' },
    { label: 'Nilai Raw Material', value: usd(totalRmUsd), sub: 'Avg ' + usd(totalRmUsd / totalKg) + '/Kg' },
    { label: 'Total Bayar Pak Ucup', value: idr(ucupTotalIdr), sub: ucupPayments.length + ' transaksi' },
    { label: 'Setara USD Dibayar', value: usd(ucupTotalUsd), sub: 'Kurs avg ~Rp ' + num(Math.round(ucupTotalIdr / ucupTotalUsd)) },
    { label: 'Balance Mr Islam', value: usd(lastBal), sub: 'Sisa hutang saat ini' },
    { label: 'Fee Pak Eka', value: usd(data.account.fee_pak_eka_usd), sub: '2x fee' },
  ];

  for (const c of cards) {
    const iconDiv = el('div', { className: 'kpi-icon green' });
    iconDiv.appendChild(makeSvgIcon());
    const numDiv = el('div', { className: 'kpi-numbers' }, [
      el('span', { className: 'kpi-number', textContent: c.value })
    ]);
    grid.appendChild(el('div', { className: 'kpi-card' }, [
      el('div', { className: 'kpi-card-top' }, [iconDiv, numDiv]),
      el('div', { className: 'kpi-title', textContent: c.label }),
      el('div', { className: 'kpi-updated', textContent: c.sub })
    ]));
  }
  container.appendChild(grid);
}

function renderImportTabs(container, data) {
  const tabs = el('div', { className: 'fin-tabs' });
  const items = [
    { id: 'ringkasan', label: 'Ringkasan' },
    { id: 'raw_material', label: 'Raw Material' },
    { id: 'pembayaran', label: 'Pembayaran Pak Ucup' },
    { id: 'semua', label: 'Semua Transaksi' }
  ];
  for (const t of items) {
    const tab = el('button', {
      className: `fin-tab ${importActiveTab === t.id ? 'active' : ''}`,
      textContent: t.label,
      onClick: () => {
        importActiveTab = t.id;
        tabs.querySelectorAll('.fin-tab').forEach(b => b.classList.remove('active'));
        tab.classList.add('active');
        const content = document.getElementById('import-tab-content');
        if (content) renderImportTabContent(content, data);
      }
    });
    tabs.appendChild(tab);
  }
  container.appendChild(tabs);
}

function renderImportTabContent(content, data) {
  clear(content);
  switch (importActiveTab) {
    case 'ringkasan': renderRingkasan(content, data); break;
    case 'raw_material': renderRawMaterial(content, data); break;
    case 'pembayaran': renderPembayaran(content, data); break;
    case 'semua': renderSemua(content, data); break;
  }
}

function renderRingkasan(container, data) {
  destroyCharts();

  const chartCard1 = el('div', { className: 'chart-card' });
  chartCard1.appendChild(el('div', { className: 'chart-title', textContent: 'Balance USD Mr Islam (Timeline)' }));
  const canvas1 = document.createElement('canvas');
  chartCard1.appendChild(canvas1);
  container.appendChild(chartCard1);

  const chartGrid = el('div', { className: 'stat-grid', style: 'grid-template-columns:1fr 1fr;gap:16px' });

  const chartCard2 = el('div', { className: 'chart-card' });
  chartCard2.appendChild(el('div', { className: 'chart-title', textContent: 'Raw Material Diterima per Bulan (Kg)' }));
  const canvas2 = document.createElement('canvas');
  chartCard2.appendChild(canvas2);
  chartGrid.appendChild(chartCard2);

  const chartCard3 = el('div', { className: 'chart-card' });
  chartCard3.appendChild(el('div', { className: 'chart-title', textContent: 'Pembayaran Pak Ucup per Bulan (IDR)' }));
  const canvas3 = document.createElement('canvas');
  chartCard3.appendChild(canvas3);
  chartGrid.appendChild(chartCard3);

  container.appendChild(chartGrid);

  requestAnimationFrame(() => {
    const timeline = data.balance_timeline;
    chart1 = new Chart(canvas1, {
      type: 'line',
      data: {
        labels: timeline.map(b => b.date.slice(2)),
        datasets: [{
          label: 'Balance USD',
          data: timeline.map(b => b.bal),
          borderColor: '#06B6D4',
          backgroundColor: 'rgba(6,182,212,.08)',
          fill: true, tension: 0.3,
          pointRadius: 3, pointBackgroundColor: '#06B6D4', borderWidth: 2
        }]
      },
      options: {
        responsive: true,
        plugins: { legend: { display: false }, tooltip: { callbacks: { label: c => 'Balance: ' + usd(c.raw) } } },
        scales: {
          x: { ticks: { maxRotation: 45, font: { size: 9 }, color: '#64748B' }, grid: { display: false } },
          y: { ticks: { callback: v => '$' + (v / 1000).toFixed(0) + 'k', color: '#64748B' }, grid: { color: '#E5E7EB' } }
        }
      }
    });

    const rmByMonth = {};
    data.raw_materials.forEach(r => {
      const m = r.date.slice(0, 7);
      rmByMonth[m] = (rmByMonth[m] || 0) + r.kg;
    });
    const rmMonths = Object.keys(rmByMonth).sort();

    chart2 = new Chart(canvas2, {
      type: 'bar',
      data: {
        labels: rmMonths.map(m => m.slice(2)),
        datasets: [{ label: 'Kg', data: rmMonths.map(m => rmByMonth[m]), backgroundColor: '#10B981', borderRadius: 6, borderSkipped: false }]
      },
      options: {
        responsive: true,
        plugins: { legend: { display: false }, tooltip: { callbacks: { label: c => num(c.raw) + ' Kg' } } },
        scales: {
          x: { ticks: { font: { size: 9 }, color: '#64748B' }, grid: { display: false } },
          y: { ticks: { color: '#64748B' }, grid: { color: '#E5E7EB' } }
        }
      }
    });

    const ucupByMonth = {};
    data.payments.filter(p => p.desc.toLowerCase().includes('ucup')).forEach(p => {
      const m = p.date.slice(0, 7);
      ucupByMonth[m] = (ucupByMonth[m] || 0) + p.idr;
    });
    const ucupMonths = Object.keys(ucupByMonth).sort();

    chart3 = new Chart(canvas3, {
      type: 'bar',
      data: {
        labels: ucupMonths.map(m => m.slice(2)),
        datasets: [{ label: 'IDR', data: ucupMonths.map(m => ucupByMonth[m]), backgroundColor: '#8B5CF6', borderRadius: 6, borderSkipped: false }]
      },
      options: {
        responsive: true,
        plugins: { legend: { display: false }, tooltip: { callbacks: { label: c => idr(c.raw) } } },
        scales: {
          x: { ticks: { font: { size: 9 }, color: '#64748B' }, grid: { display: false } },
          y: { ticks: { callback: v => 'Rp ' + (v / 1e9).toFixed(0) + 'M', color: '#64748B' }, grid: { color: '#E5E7EB' } }
        }
      }
    });
  });

  const recent = [...data.payments].reverse().slice(0, 10);
  const card = el('div', { className: 'table-card', style: 'margin-top:16px' });
  card.appendChild(el('div', { className: 'table-header' }, [
    el('div', { className: 'table-title', textContent: '10 Transaksi Terakhir' })
  ]));
  const scroll = el('div', { className: 'table-scroll' });
  scroll.appendChild(buildTable(
    [{ label: 'Tanggal' }, { label: 'Keterangan' }, { label: 'IDR', align: 'right' }, { label: 'Kurs', align: 'right' }, { label: 'USD', align: 'right' }, { label: 'Balance', align: 'right' }],
    recent.map(p => [
      date(p.date),
      p.desc,
      idrFull(p.idr),
      p.kurs > 0 ? num(p.kurs) : '-',
      usd(p.usd),
      el('span', { className: p.bal < 150000 ? 'fin-amount-out' : '', textContent: usd(p.bal) })
    ])
  ));
  card.appendChild(scroll);
  container.appendChild(card);
}

function renderRawMaterial(container, data) {
  destroyCharts();
  const rm = data.raw_materials;

  const bar = el('div', { className: 'supplier-toolbar' });
  const searchEl = el('input', { className: 'search-input', type: 'text', placeholder: 'Cari pengiriman...' });
  const tableContainer = el('div');
  searchEl.addEventListener('input', () => {
    const q = searchEl.value.toLowerCase();
    const filtered = rm.filter(r => r.desc.toLowerCase().includes(q) || r.date.includes(q));
    renderRmTable(tableContainer, filtered);
  });
  bar.appendChild(searchEl);
  container.appendChild(bar);
  container.appendChild(tableContainer);
  renderRmTable(tableContainer, rm);
}

function renderRmTable(container, rows) {
  clear(container);
  let totalKg = 0, totalUsd = 0;
  rows.forEach(r => { totalKg += r.kg; totalUsd += r.usd; });

  const summary = el('div', { className: 'stat-grid', style: 'grid-template-columns:repeat(3,1fr);gap:12px;margin-bottom:16px' });
  summary.appendChild(el('div', { className: 'stat-card' }, [
    el('div', { className: 'stat-label', textContent: 'Total Pengiriman' }),
    el('div', { className: 'stat-value', textContent: rows.length + ' shipment' })
  ]));
  summary.appendChild(el('div', { className: 'stat-card' }, [
    el('div', { className: 'stat-label', textContent: 'Total Kg' }),
    el('div', { className: 'stat-value green', textContent: kg(totalKg) })
  ]));
  summary.appendChild(el('div', { className: 'stat-card' }, [
    el('div', { className: 'stat-label', textContent: 'Total Nilai' }),
    el('div', { className: 'stat-value', textContent: usd(totalUsd) })
  ]));
  container.appendChild(summary);

  const card = el('div', { className: 'table-card' });
  card.appendChild(el('div', { className: 'table-header' }, [
    el('div', { className: 'table-title', textContent: 'Detail Penerimaan Raw Material India (' + rows.length + ')' })
  ]));
  const scroll = el('div', { className: 'table-scroll', style: 'max-height:70vh' });
  const tableRows = rows.map(r => [
    date(r.date),
    r.desc,
    el('span', { style: 'font-weight:600', textContent: kg(r.kg) }),
    usd(r.usd),
    usd(r.kg > 0 ? r.usd / r.kg : 0)
  ]);
  tableRows.push([
    el('strong', { textContent: 'TOTAL' }),
    el('strong', { textContent: rows.length + ' pengiriman' }),
    el('strong', { style: 'color:#10B981', textContent: kg(totalKg) }),
    el('strong', { textContent: usd(totalUsd) }),
    el('strong', { textContent: usd(totalUsd / totalKg) })
  ]);
  scroll.appendChild(buildTable(
    [{ label: 'Tanggal' }, { label: 'Keterangan' }, { label: 'Kg', align: 'right' }, { label: 'Nilai USD', align: 'right' }, { label: 'Harga/Kg', align: 'right' }],
    tableRows
  ));
  card.appendChild(scroll);
  container.appendChild(card);
}

function renderPembayaran(container, data) {
  destroyCharts();
  const ucup = data.payments.filter(p => p.desc.toLowerCase().includes('ucup'));

  const bar = el('div', { className: 'supplier-toolbar' });
  const searchEl = el('input', { className: 'search-input', type: 'text', placeholder: 'Cari pembayaran...' });
  const tableContainer = el('div');
  searchEl.addEventListener('input', () => {
    const q = searchEl.value.toLowerCase();
    const filtered = ucup.filter(p => p.desc.toLowerCase().includes(q) || p.date.includes(q));
    renderUcupTable(tableContainer, filtered);
  });
  bar.appendChild(searchEl);
  container.appendChild(bar);
  container.appendChild(tableContainer);
  renderUcupTable(tableContainer, ucup);
}

function renderUcupTable(container, rows) {
  clear(container);
  let totalIdr = 0, totalUsd = 0;
  rows.forEach(p => { totalIdr += p.idr; totalUsd += p.usd; });

  const summary = el('div', { className: 'stat-grid', style: 'grid-template-columns:repeat(4,1fr);gap:12px;margin-bottom:16px' });
  summary.appendChild(el('div', { className: 'stat-card' }, [
    el('div', { className: 'stat-label', textContent: 'Total Transaksi' }),
    el('div', { className: 'stat-value', textContent: rows.length + 'x' })
  ]));
  summary.appendChild(el('div', { className: 'stat-card' }, [
    el('div', { className: 'stat-label', textContent: 'Total IDR' }),
    el('div', { className: 'stat-value', style: 'color:#EF4444', textContent: idr(totalIdr) })
  ]));
  summary.appendChild(el('div', { className: 'stat-card' }, [
    el('div', { className: 'stat-label', textContent: 'Total USD' }),
    el('div', { className: 'stat-value', textContent: usd(totalUsd) })
  ]));
  summary.appendChild(el('div', { className: 'stat-card' }, [
    el('div', { className: 'stat-label', textContent: 'Kurs Rata-rata' }),
    el('div', { className: 'stat-value', textContent: 'Rp ' + num(Math.round(totalIdr / totalUsd)) })
  ]));
  container.appendChild(summary);

  const card = el('div', { className: 'table-card' });
  card.appendChild(el('div', { className: 'table-header' }, [
    el('div', { className: 'table-title', textContent: 'Detail Pembayaran Pak Ucup (' + rows.length + ')' })
  ]));
  const scroll = el('div', { className: 'table-scroll', style: 'max-height:70vh' });
  const tableRows = rows.map(p => {
    const isTax = p.desc.toLowerCase().includes('tax');
    return [
      date(p.date),
      p.desc,
      el('span', { className: 'fin-amount-out', textContent: idrFull(p.idr) }),
      p.kurs > 0 ? num(p.kurs) : '-',
      usd(p.usd),
      el('span', { className: p.bal < 150000 ? 'fin-amount-out' : '', textContent: usd(p.bal) }),
      isTax ? el('span', { className: 'fin-badge fin-badge-warning', textContent: 'Tax' })
             : el('span', { className: 'fin-badge fin-badge-masuk', textContent: 'Payment' })
    ];
  });
  scroll.appendChild(buildTable(
    [{ label: 'Tanggal' }, { label: 'Keterangan' }, { label: 'IDR', align: 'right' }, { label: 'Kurs', align: 'right' }, { label: 'USD', align: 'right' }, { label: 'Balance', align: 'right' }, { label: 'Tipe' }],
    tableRows
  ));
  card.appendChild(scroll);
  container.appendChild(card);
}

function renderSemua(container, data) {
  destroyCharts();
  const all = data.payments;

  const bar = el('div', { className: 'supplier-toolbar' });
  const searchEl = el('input', { className: 'search-input', type: 'text', placeholder: 'Cari transaksi...' });
  const tableContainer = el('div');
  searchEl.addEventListener('input', () => {
    const q = searchEl.value.toLowerCase();
    const filtered = all.filter(p => p.desc.toLowerCase().includes(q) || p.date.includes(q));
    renderAllTable(tableContainer, filtered);
  });
  bar.appendChild(searchEl);
  container.appendChild(bar);
  container.appendChild(tableContainer);
  renderAllTable(tableContainer, all);
}

function renderAllTable(container, rows) {
  clear(container);
  const card = el('div', { className: 'table-card' });
  card.appendChild(el('div', { className: 'table-header' }, [
    el('div', { className: 'table-title', textContent: 'Semua Transaksi Account Mr Islam (' + rows.length + ')' })
  ]));
  const scroll = el('div', { className: 'table-scroll', style: 'max-height:70vh' });

  const tableRows = rows.map(p => {
    const isUcup = p.desc.toLowerCase().includes('ucup');
    const isTax = p.desc.toLowerCase().includes('tax');
    const isTransfer = p.desc.toLowerCase().includes('transfer') && !isUcup;
    let badge;
    if (isTax) badge = el('span', { className: 'fin-badge fin-badge-warning', textContent: 'Tax' });
    else if (isUcup) badge = el('span', { className: 'fin-badge fin-badge-masuk', textContent: 'Pak Ucup' });
    else if (isTransfer) badge = el('span', { className: 'fin-badge fin-badge-keluar', textContent: 'Transfer' });
    else badge = el('span', { className: 'fin-badge fin-badge-lainnya', textContent: 'Lainnya' });

    return [
      date(p.date),
      p.desc,
      idrFull(p.idr),
      p.kurs > 0 ? num(p.kurs) : '-',
      usd(p.usd),
      el('span', { className: p.bal < 150000 ? 'fin-amount-out' : '', textContent: usd(p.bal) }),
      badge
    ];
  });
  scroll.appendChild(buildTable(
    [{ label: 'Tanggal' }, { label: 'Keterangan' }, { label: 'IDR', align: 'right' }, { label: 'Kurs', align: 'right' }, { label: 'USD', align: 'right' }, { label: 'Balance', align: 'right' }, { label: 'Tipe' }],
    tableRows
  ));
  card.appendChild(scroll);
  container.appendChild(card);
}
