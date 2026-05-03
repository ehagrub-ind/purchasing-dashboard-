import { getOverview } from '../modules/api.js';
import { rupiah, kg, num, kgShort } from '../modules/format.js';
import { el, clear, showLoading } from '../modules/dom.js';

const SVG_NS = 'http://www.w3.org/2000/svg';
let charts = {};

function svgEl(tag, attrs) {
  const e = document.createElementNS(SVG_NS, tag);
  for (const [k, v] of Object.entries(attrs || {})) e.setAttribute(k, v);
  return e;
}

function makeSvg(children, size) {
  const svg = svgEl('svg', { viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', 'stroke-width': '2', 'stroke-linecap': 'round', 'stroke-linejoin': 'round' });
  if (size) { svg.setAttribute('width', size); svg.setAttribute('height', size); }
  for (const c of children) svg.appendChild(c);
  return svg;
}

function iconCalendar() {
  return makeSvg([
    svgEl('rect', { x: '3', y: '4', width: '18', height: '18', rx: '2', ry: '2' }),
    svgEl('line', { x1: '16', y1: '2', x2: '16', y2: '6' }),
    svgEl('line', { x1: '8', y1: '2', x2: '8', y2: '6' }),
    svgEl('line', { x1: '3', y1: '10', x2: '21', y2: '10' })
  ]);
}

function iconClock() {
  return makeSvg([
    svgEl('circle', { cx: '12', cy: '12', r: '10' }),
    svgEl('polyline', { points: '12,6 12,12 16,14' })
  ]);
}

function iconCheck() {
  return makeSvg([
    svgEl('path', { d: 'M22 11.08V12a10 10 0 11-5.93-9.14' }),
    svgEl('polyline', { points: '22,4 12,14.01 9,11.01' })
  ]);
}

function iconBarChart() {
  return makeSvg([
    svgEl('line', { x1: '18', y1: '20', x2: '18', y2: '10' }),
    svgEl('line', { x1: '12', y1: '20', x2: '12', y2: '4' }),
    svgEl('line', { x1: '6', y1: '20', x2: '6', y2: '14' })
  ]);
}

function iconTarget() {
  return makeSvg([
    svgEl('circle', { cx: '12', cy: '12', r: '10' }),
    svgEl('circle', { cx: '12', cy: '12', r: '6' }),
    svgEl('circle', { cx: '12', cy: '12', r: '2' })
  ]);
}

function iconFilter() {
  return makeSvg([
    svgEl('polygon', { points: '22,3 2,3 10,12.46 10,19 14,21 14,12.46' })
  ]);
}

function iconDownload() {
  return makeSvg([
    svgEl('path', { d: 'M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4' }),
    svgEl('polyline', { points: '7,10 12,15 17,10' }),
    svgEl('line', { x1: '12', y1: '15', x2: '12', y2: '3' })
  ]);
}

function iconCalendarSmall() {
  return makeSvg([
    svgEl('rect', { x: '3', y: '4', width: '18', height: '18', rx: '2' }),
    svgEl('line', { x1: '16', y1: '2', x2: '16', y2: '6' }),
    svgEl('line', { x1: '8', y1: '2', x2: '8', y2: '6' }),
    svgEl('line', { x1: '3', y1: '10', x2: '21', y2: '10' })
  ], '16');
}

export async function render(container) {
  showLoading(container);

  try {
    const data = await getOverview();
    clear(container);

    const s = data.summary;

    // Welcome bar
    const welcome = el('div', { className: 'welcome-bar' });
    welcome.appendChild(document.createTextNode('Welcome back, '));
    welcome.appendChild(el('strong', { textContent: 'Pak Regen' }));
    welcome.appendChild(document.createTextNode('. Ringkasan purchasing dan aktivitas terbaru.'));
    container.appendChild(welcome);

    // KPI Row (5 cards like screenshot)
    const kpiRow = el('div', { className: 'kpi-row' });

    const kpis = [
      { icon: iconCalendar, color: 'blue',   number: num(s.total_transaksi), badge: 'All Time',   badgeColor: 'blue',   title: 'Total Transaksi',    updated: 'Diperbarui baru saja' },
      { icon: iconClock,    color: 'orange', number: String(s.total_supplier), badge: 'Active',   badgeColor: 'orange', title: 'Active Supplier',     updated: 'Diperbarui baru saja' },
      { icon: iconCheck,    color: 'green',  number: kgShort(s.total_kg),    badge: '3 Wilayah', badgeColor: 'green',  title: 'Total Pembelian',     updated: 'Diperbarui baru saja' },
      { icon: iconBarChart, color: 'purple', number: rupiah(s.total_nilai).replace('Rp ', ''), badge: 'Period', badgeColor: 'purple', title: 'Total Nilai',  updated: 'Diperbarui baru saja' },
      { icon: iconTarget,   color: 'pink',   number: rupiah(s.total_fee).replace('Rp ', ''),  badge: '7 Partai', badgeColor: 'pink',   title: 'Total Fee',    updated: 'Diperbarui baru saja' }
    ];

    for (const k of kpis) {
      const iconWrap = el('div', { className: `kpi-icon ${k.color}` });
      iconWrap.appendChild(k.icon());

      kpiRow.appendChild(el('div', { className: 'kpi-card' }, [
        el('div', { className: 'kpi-card-top' }, [
          iconWrap,
          el('div', { className: 'kpi-numbers' }, [
            el('span', { className: 'kpi-number', textContent: k.number }),
            el('span', { className: `kpi-badge ${k.badgeColor}`, textContent: k.badge })
          ])
        ]),
        el('div', { className: 'kpi-title', textContent: k.title }),
        el('div', { className: 'kpi-updated', textContent: k.updated })
      ]));
    }
    container.appendChild(kpiRow);

    // Quick Actions
    const qa = el('div', { className: 'quick-actions' }, [
      el('div', { className: 'quick-actions-info' }, [
        el('div', { className: 'quick-actions-title', textContent: 'Quick Actions' }),
        el('div', { className: 'quick-actions-sub', textContent: 'Tools purchasing yang sering digunakan' })
      ]),
      el('div', { className: 'quick-actions-btns' }, [
        el('button', { className: 'btn btn-primary', textContent: 'Lihat Supplier', onClick: () => navigateTo('suppliers') }),
        el('button', { className: 'btn btn-warning', textContent: 'Cek Pembelian', onClick: () => navigateTo('purchases') }),
        el('button', { className: 'btn btn-outline', textContent: 'Export Report' })
      ])
    ]);
    container.appendChild(qa);

    // Purchasing Management section
    const mgmtCard = el('div', { className: 'section-card' });
    const mgmtHeader = el('div', { className: 'section-card-header' });

    const mgmtLeft = el('div');
    mgmtLeft.appendChild(el('div', { className: 'section-card-title', textContent: 'Purchasing Management' }));
    mgmtLeft.appendChild(el('div', { className: 'section-card-sub', textContent: 'Kelola pembelian bahan baku di semua wilayah' }));
    mgmtHeader.appendChild(mgmtLeft);

    const dateRange = el('div', { style: 'display:flex;align-items:center;gap:8px;color:var(--text-muted);font-size:13px' });
    dateRange.appendChild(iconCalendarSmall());
    dateRange.appendChild(document.createTextNode('Date Range: '));
    const dateBadge = el('span', { textContent: 'Aug 2025 - Mar 2026', style: 'border:1px solid var(--border);padding:6px 14px;border-radius:8px;color:var(--text);font-weight:500' });
    dateRange.appendChild(dateBadge);
    mgmtHeader.appendChild(dateRange);
    mgmtCard.appendChild(mgmtHeader);

    // Charts inside section card
    const chartGrid = el('div', { className: 'chart-grid', style: 'margin-bottom:0' });

    const wilayahCanvas = document.createElement('canvas');
    wilayahCanvas.id = 'chart-wilayah';
    const kategoriCanvas = document.createElement('canvas');
    kategoriCanvas.id = 'chart-kategori';
    const trendCanvas = document.createElement('canvas');
    trendCanvas.id = 'chart-trend';

    chartGrid.appendChild(el('div', { className: 'chart-card' }, [
      el('div', { className: 'chart-title', textContent: 'Pembelian per Wilayah (kg)' }),
      wilayahCanvas
    ]));

    chartGrid.appendChild(el('div', { className: 'chart-card' }, [
      el('div', { className: 'chart-title', textContent: 'Pembelian per Kategori (kg)' }),
      kategoriCanvas
    ]));

    chartGrid.appendChild(el('div', { className: 'chart-card full' }, [
      el('div', { className: 'chart-title', textContent: 'Trend Pembelian Bulanan' }),
      trendCanvas
    ]));

    mgmtCard.appendChild(chartGrid);
    container.appendChild(mgmtCard);

    // Wilayah summary table
    renderWilayahTable(container, data.by_wilayah);

    requestAnimationFrame(() => {
      renderCharts(data, wilayahCanvas, kategoriCanvas, trendCanvas);
    });
  } catch (err) {
    clear(container);
    container.appendChild(el('div', { className: 'loading', textContent: 'Error: ' + err.message }));
  }
}

function navigateTo(page) {
  const navItem = document.querySelector(`.nav-item[data-page="${page}"]`);
  if (navItem) navItem.click();
}

function renderWilayahTable(container, byWilayah) {
  const card = el('div', { className: 'table-card' });
  card.appendChild(el('div', { className: 'table-header' }, [
    el('div', { className: 'table-title', textContent: 'Ringkasan per Wilayah' })
  ]));

  const table = document.createElement('table');
  const thead = document.createElement('thead');
  const headerRow = document.createElement('tr');
  ['Wilayah', 'Transaksi', 'Total Kg', 'Total Nilai'].forEach((h, i) => {
    headerRow.appendChild(el('th', { textContent: h, className: i > 0 ? 'num-right' : '' }));
  });
  thead.appendChild(headerRow);
  table.appendChild(thead);

  const tbody = document.createElement('tbody');
  for (const w of byWilayah) {
    const tr = document.createElement('tr');
    const td0 = document.createElement('td');
    td0.appendChild(el('span', { className: `badge supplier-wilayah wilayah-${w.wilayah.toLowerCase()}`, textContent: w.wilayah }));
    tr.appendChild(td0);
    tr.appendChild(el('td', { className: 'num-right', textContent: num(w.total_transaksi) }));
    tr.appendChild(el('td', { className: 'num-right', textContent: kg(w.total_kg) }));
    tr.appendChild(el('td', { className: 'num-right', textContent: rupiah(w.total_nilai) }));
    tbody.appendChild(tr);
  }
  table.appendChild(tbody);
  card.appendChild(table);
  container.appendChild(card);
}

function renderCharts(data, wilayahCanvas, kategoriCanvas, trendCanvas) {
  Object.values(charts).forEach(c => c.destroy());
  charts = {};

  const colors = ['#3B82F6', '#8B5CF6', '#10B981', '#F59E0B', '#EF4444', '#EC4899'];
  const labelColor = '#64748B';
  const gridColor = '#E5E7EB';

  charts.wilayah = new Chart(wilayahCanvas, {
    type: 'doughnut',
    data: {
      labels: data.by_wilayah.map(w => w.wilayah),
      datasets: [{
        data: data.by_wilayah.map(w => Number(w.total_kg)),
        backgroundColor: colors,
        borderWidth: 0
      }]
    },
    options: {
      responsive: true,
      plugins: {
        legend: { position: 'bottom', labels: { color: labelColor, padding: 16, font: { family: 'Inter' } } }
      }
    }
  });

  charts.kategori = new Chart(kategoriCanvas, {
    type: 'bar',
    data: {
      labels: data.by_kategori.map(k => k.kategori),
      datasets: [{
        label: 'Kg',
        data: data.by_kategori.map(k => Number(k.total_kg)),
        backgroundColor: colors,
        borderRadius: 8,
        borderSkipped: false
      }]
    },
    options: {
      responsive: true,
      plugins: { legend: { display: false } },
      scales: {
        x: { ticks: { color: labelColor, font: { family: 'Inter', size: 11 } }, grid: { display: false } },
        y: { ticks: { color: labelColor }, grid: { color: gridColor } }
      }
    }
  });

  charts.trend = new Chart(trendCanvas, {
    type: 'line',
    data: {
      labels: data.monthly_trend.map(m => m.bulan),
      datasets: [
        {
          label: 'Total Kg',
          data: data.monthly_trend.map(m => Number(m.total_kg)),
          borderColor: '#3B82F6',
          backgroundColor: 'rgba(59,130,246,0.08)',
          fill: true,
          tension: 0.3,
          yAxisID: 'y'
        },
        {
          label: 'Transaksi',
          data: data.monthly_trend.map(m => m.transaksi),
          borderColor: '#10B981',
          borderDash: [5, 5],
          tension: 0.3,
          yAxisID: 'y1'
        }
      ]
    },
    options: {
      responsive: true,
      interaction: { mode: 'index', intersect: false },
      plugins: { legend: { labels: { color: labelColor, font: { family: 'Inter' } } } },
      scales: {
        x: { ticks: { color: labelColor, font: { family: 'Inter', size: 11 } }, grid: { display: false } },
        y: { type: 'linear', position: 'left', ticks: { color: '#3B82F6' }, grid: { color: gridColor } },
        y1: { type: 'linear', position: 'right', ticks: { color: '#10B981' }, grid: { drawOnChartArea: false } }
      }
    }
  });
}
