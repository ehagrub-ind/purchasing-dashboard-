import { getPurchases } from '../modules/api.js';
import { rupiahFull, kg, date } from '../modules/format.js';
import { el, clear, showLoading, buildTable, buildPagination } from '../modules/dom.js';

let filters = { page: 1 };

export async function render(container) {
  showLoading(container);

  try {
    const data = await getPurchases(filters);
    clear(container);

    const header = el('div', { className: 'page-header' });
    header.appendChild(el('h2', { className: 'page-title', textContent: 'Daftar Pembelian' }));

    const filterBar = el('div', { className: 'filter-bar' });

    const wilayahSelect = el('select', { onChange: (e) => { filters.wilayah = e.target.value || undefined; filters.page = 1; render(container); } });
    wilayahSelect.appendChild(el('option', { value: '', textContent: 'Semua Wilayah' }));
    ['Jatim', 'Jateng', 'Jabar'].forEach(w => {
      const opt = el('option', { value: w, textContent: w });
      if (filters.wilayah === w) opt.selected = true;
      wilayahSelect.appendChild(opt);
    });

    const katSelect = el('select', { onChange: (e) => { filters.kategori = e.target.value || undefined; filters.page = 1; render(container); } });
    katSelect.appendChild(el('option', { value: '', textContent: 'Semua Kategori' }));
    ['R Salon', 'Uk 6-8 / Retul', 'Remy', 'Lus', 'Brangkas', 'Lainnya'].forEach(k => {
      const opt = el('option', { value: k, textContent: k });
      if (filters.kategori === k) opt.selected = true;
      katSelect.appendChild(opt);
    });

    filterBar.appendChild(wilayahSelect);
    filterBar.appendChild(katSelect);
    header.appendChild(filterBar);
    container.appendChild(header);

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
    const rows = data.data.map(p => [
      date(p.date),
      p.supplier ? p.supplier.name : '-',
      el('span', { className: `badge supplier-wilayah wilayah-${p.wilayah.toLowerCase()}`, textContent: p.wilayah }),
      p.jenis,
      p.kategori,
      kg(p.qty),
      rupiahFull(p.price),
      rupiahFull(p.total)
    ]);
    scroll.appendChild(buildTable(headers, rows));
    card.appendChild(scroll);
    card.appendChild(buildPagination(data.pagination, (page) => { filters.page = page; render(container); }));
    container.appendChild(card);
  } catch (err) {
    clear(container);
    container.appendChild(el('div', { className: 'loading', textContent: 'Error: ' + err.message }));
  }
}
