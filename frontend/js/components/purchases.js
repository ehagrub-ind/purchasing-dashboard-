import { getPurchases } from '../modules/api.js';
import { rupiahFull, kg, date } from '../modules/format.js';
import { el, clear, showLoading, buildTable, buildPagination } from '../modules/dom.js';
import { loadImportData, renderImportContent } from './import.js';

let mainTab = 'semua';
let localFilters = { page: 1 };
let localData = null;
let importData = null;
let loading = false;

export async function render(container) {
  showLoading(container);

  try {
    const [local, imp] = await Promise.all([
      getPurchases(localFilters),
      importData ? Promise.resolve(importData) : loadImportData()
    ]);
    localData = local;
    importData = imp;

    clear(container);

    const header = el('div', { className: 'page-header' }, [
      el('h2', { className: 'page-title', textContent: 'Pembelian Bahan Baku' }),
      el('p', { className: 'page-subtitle', textContent: 'Pembelian lokal (Jatim, Jateng, Jabar) dan impor (India via Mr Islam & Pak Ucup)' })
    ]);
    container.appendChild(header);

    renderMainTabs(container);

    const content = el('div', { id: 'purchase-main-content' });
    container.appendChild(content);
    renderMainContent(content, container);
  } catch (err) {
    clear(container);
    container.appendChild(el('div', { className: 'loading', textContent: 'Error: ' + err.message }));
  }
}

function renderMainTabs(container) {
  const tabs = el('div', { className: 'fin-tabs' });
  const items = [
    { id: 'semua', label: 'Semua Pembelian' },
    { id: 'lokal', label: 'Lokal (Jatim/Jateng/Jabar)' },
    { id: 'impor', label: 'Impor (India)' }
  ];
  for (const t of items) {
    const tab = el('button', {
      className: `fin-tab ${mainTab === t.id ? 'active' : ''}`,
      textContent: t.label,
      onClick: () => {
        mainTab = t.id;
        tabs.querySelectorAll('.fin-tab').forEach(b => b.classList.remove('active'));
        tab.classList.add('active');
        const content = document.getElementById('purchase-main-content');
        const outer = content.parentElement;
        if (content) renderMainContent(content, outer);
      }
    });
    tabs.appendChild(tab);
  }
  container.appendChild(tabs);
}

function renderMainContent(content, outerContainer) {
  clear(content);
  switch (mainTab) {
    case 'semua': renderSemuaTab(content, outerContainer); break;
    case 'lokal': renderLokalTab(content, outerContainer); break;
    case 'impor': renderImporTab(content); break;
  }
}

function renderSemuaTab(container, outerContainer) {
  const summaryGrid = el('div', { className: 'stat-grid', style: 'grid-template-columns:repeat(4,1fr);gap:12px;margin-bottom:20px' });

  const localTotal = localData.stats ? localData.stats.totalAmount || 0 : 0;
  const localCount = localData.pagination ? localData.pagination.total : localData.data.length;
  const importRm = importData.raw_materials;
  const importTotalKg = importRm.reduce((s, r) => s + r.kg, 0);
  const importCount = importRm.length;

  summaryGrid.appendChild(el('div', { className: 'stat-card' }, [
    el('div', { className: 'stat-label', textContent: 'Pembelian Lokal' }),
    el('div', { className: 'stat-value', textContent: localCount + ' transaksi' })
  ]));
  summaryGrid.appendChild(el('div', { className: 'stat-card' }, [
    el('div', { className: 'stat-label', textContent: 'Pembelian Impor' }),
    el('div', { className: 'stat-value', textContent: importCount + ' pengiriman' })
  ]));
  summaryGrid.appendChild(el('div', { className: 'stat-card' }, [
    el('div', { className: 'stat-label', textContent: 'Total Impor (Kg)' }),
    el('div', { className: 'stat-value green', textContent: kg(importTotalKg) })
  ]));

  const ucupPayments = importData.payments.filter(p => p.desc.toLowerCase().includes('ucup'));
  const ucupTotalIdr = ucupPayments.reduce((s, p) => s + p.idr, 0);
  summaryGrid.appendChild(el('div', { className: 'stat-card' }, [
    el('div', { className: 'stat-label', textContent: 'Total Bayar Impor (IDR)' }),
    el('div', { className: 'stat-value', style: 'color:#EF4444', textContent: formatIdr(ucupTotalIdr) })
  ]));

  container.appendChild(summaryGrid);

  const sectionLabel1 = el('div', { className: 'table-header', style: 'margin-bottom:8px' }, [
    el('div', { className: 'table-title', textContent: 'Pembelian Lokal Terbaru' }),
    el('button', {
      className: 'btn btn-outline',
      textContent: 'Lihat Semua Lokal',
      style: 'font-size:12px;padding:4px 12px',
      onClick: () => {
        mainTab = 'lokal';
        const tabs = document.querySelectorAll('.fin-tabs')[0];
        if (tabs) {
          tabs.querySelectorAll('.fin-tab').forEach(b => b.classList.remove('active'));
          const lokalTab = tabs.querySelectorAll('.fin-tab')[1];
          if (lokalTab) lokalTab.classList.add('active');
        }
        const content = document.getElementById('purchase-main-content');
        if (content) renderMainContent(content, outerContainer);
      }
    })
  ]);
  container.appendChild(sectionLabel1);

  renderLocalTable(container, localData, outerContainer, false);

  const sectionLabel2 = el('div', { className: 'table-header', style: 'margin-top:24px;margin-bottom:8px' }, [
    el('div', { className: 'table-title', textContent: 'Raw Material Impor India Terbaru' }),
    el('button', {
      className: 'btn btn-outline',
      textContent: 'Lihat Semua Impor',
      style: 'font-size:12px;padding:4px 12px',
      onClick: () => {
        mainTab = 'impor';
        const tabs = document.querySelectorAll('.fin-tabs')[0];
        if (tabs) {
          tabs.querySelectorAll('.fin-tab').forEach(b => b.classList.remove('active'));
          const imporTab = tabs.querySelectorAll('.fin-tab')[2];
          if (imporTab) imporTab.classList.add('active');
        }
        const content = document.getElementById('purchase-main-content');
        if (content) renderMainContent(content, outerContainer);
      }
    })
  ]);
  container.appendChild(sectionLabel2);

  renderImportPreview(container);
}

function renderLokalTab(container, outerContainer) {
  const filterBar = el('div', { className: 'filter-bar' });

  const wilayahSelect = el('select', { onChange: (e) => { localFilters.wilayah = e.target.value || undefined; localFilters.page = 1; reloadLocal(outerContainer); } });
  wilayahSelect.appendChild(el('option', { value: '', textContent: 'Semua Wilayah' }));
  ['Jatim', 'Jateng', 'Jabar'].forEach(w => {
    const opt = el('option', { value: w, textContent: w });
    if (localFilters.wilayah === w) opt.selected = true;
    wilayahSelect.appendChild(opt);
  });

  const katSelect = el('select', { onChange: (e) => { localFilters.kategori = e.target.value || undefined; localFilters.page = 1; reloadLocal(outerContainer); } });
  katSelect.appendChild(el('option', { value: '', textContent: 'Semua Kategori' }));
  ['R Salon', 'Uk 6-8 / Retul', 'Remy', 'Lus', 'Brangkas', 'Lainnya'].forEach(k => {
    const opt = el('option', { value: k, textContent: k });
    if (localFilters.kategori === k) opt.selected = true;
    katSelect.appendChild(opt);
  });

  filterBar.appendChild(wilayahSelect);
  filterBar.appendChild(katSelect);
  container.appendChild(filterBar);

  renderLocalTable(container, localData, outerContainer, true);
}

function renderLocalTable(container, data, outerContainer, showPagination) {
  const card = el('div', { className: 'table-card' });
  const scroll = el('div', { className: 'table-scroll' });
  const headers = [
    { label: 'Tanggal' },
    { label: 'Supplier' },
    { label: 'Wilayah' },
    { label: 'Jenis' },
    { label: 'Kategori' },
    { label: 'Qty', align: 'right' },
    { label: 'Harga', align: 'right' },
    { label: 'Total', align: 'right' }
  ];

  const displayData = showPagination ? data.data : data.data.slice(0, 10);
  const rows = displayData.map(p => [
    date(p.date),
    p.supplier ? p.supplier.name : '-',
    el('span', { className: `badge supplier-wilayah wilayah-${(p.wilayah || '').toLowerCase()}`, textContent: p.wilayah }),
    p.jenis,
    p.kategori,
    kg(p.qty),
    rupiahFull(p.price),
    rupiahFull(p.total)
  ]);
  scroll.appendChild(buildTable(headers, rows));
  card.appendChild(scroll);

  if (showPagination && data.pagination) {
    card.appendChild(buildPagination(data.pagination, (page) => {
      localFilters.page = page;
      reloadLocal(outerContainer);
    }));
  }

  container.appendChild(card);
}

function renderImportPreview(container) {
  const rm = importData.raw_materials;
  const recent = rm.slice(-10).reverse();

  const card = el('div', { className: 'table-card' });
  const scroll = el('div', { className: 'table-scroll' });

  const { usd: fmtUsd, kg: fmtKg, date: fmtDate } = getImportFormatters();

  const rows = recent.map(r => [
    fmtDate(r.date),
    r.desc,
    el('span', { style: 'font-weight:600', textContent: fmtKg(r.kg) }),
    fmtUsd(r.usd),
    fmtUsd(r.kg > 0 ? r.usd / r.kg : 0)
  ]);
  scroll.appendChild(buildTable(
    [{ label: 'Tanggal' }, { label: 'Keterangan' }, { label: 'Kg', align: 'right' }, { label: 'Nilai USD', align: 'right' }, { label: 'Harga/Kg', align: 'right' }],
    rows
  ));
  card.appendChild(scroll);
  container.appendChild(card);
}

function renderImporTab(container) {
  renderImportContent(container, importData);
}

async function reloadLocal(outerContainer) {
  try {
    localData = await getPurchases(localFilters);
    const content = document.getElementById('purchase-main-content');
    if (content) renderMainContent(content, outerContainer);
  } catch (err) {
    // keep showing current data
  }
}

function formatIdr(val) {
  if (val == null || isNaN(val)) return 'Rp 0';
  const n = Number(val);
  if (Math.abs(n) >= 1e12) return 'Rp ' + (n / 1e12).toFixed(1).replace('.', ',') + ' T';
  if (Math.abs(n) >= 1e9) return 'Rp ' + (n / 1e9).toFixed(1).replace('.', ',') + ' M';
  if (Math.abs(n) >= 1e6) return 'Rp ' + (n / 1e6).toFixed(0) + ' jt';
  return 'Rp ' + n.toLocaleString('id-ID', { maximumFractionDigits: 0 });
}

function getImportFormatters() {
  return {
    usd: (val) => {
      if (val == null || isNaN(val)) return '$0';
      return '$' + Number(val).toLocaleString('en-US', { maximumFractionDigits: 2 });
    },
    kg: (val) => {
      if (val == null || isNaN(val)) return '0 kg';
      return Number(val).toLocaleString('id-ID', { maximumFractionDigits: 1 }) + ' kg';
    },
    date: (val) => {
      if (!val) return '-';
      const d = new Date(val);
      return d.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
    }
  };
}
