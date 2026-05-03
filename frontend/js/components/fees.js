import { getFees } from '../modules/api.js';
import { rupiahFull, rupiah, kg, num } from '../modules/format.js';
import { el, clear, showLoading, buildTable } from '../modules/dom.js';

let chart = null;

export async function render(container) {
  showLoading(container);

  try {
    const data = await getFees();
    clear(container);

    container.appendChild(el('h2', { className: 'page-title', textContent: 'Fee Pak Regen' }));
    container.appendChild(el('div', { className: 'stat-sub', textContent: 'Fee Rp 50.000/kg untuk bahan Brangkas & Retul 9up', style: 'margin-bottom:20px' }));

    // Summary
    let totalKg = 0, totalFee = 0;
    for (const f of data.data) { totalKg += Number(f.qty); totalFee += Number(f.total); }

    const statGrid = el('div', { className: 'stat-grid' });
    statGrid.appendChild(el('div', { className: 'stat-card' }, [
      el('div', { className: 'stat-label', textContent: 'Total Qty Fee' }),
      el('div', { className: 'stat-value blue', textContent: kg(totalKg) })
    ]));
    statGrid.appendChild(el('div', { className: 'stat-card' }, [
      el('div', { className: 'stat-label', textContent: 'Total Nominal Fee' }),
      el('div', { className: 'stat-value purple', textContent: rupiah(totalFee) })
    ]));
    statGrid.appendChild(el('div', { className: 'stat-card' }, [
      el('div', { className: 'stat-label', textContent: 'Fee Rate' }),
      el('div', { className: 'stat-value green', textContent: 'Rp 50.000/kg' })
    ]));
    statGrid.appendChild(el('div', { className: 'stat-card' }, [
      el('div', { className: 'stat-label', textContent: 'Partai Aktif' }),
      el('div', { className: 'stat-value blue', textContent: data.data.length + ' partai' })
    ]));
    container.appendChild(statGrid);

    // Chart
    const chartCard = el('div', { className: 'chart-card' });
    chartCard.appendChild(el('div', { className: 'chart-title', textContent: 'Fee per Partai' }));
    const canvas = el('canvas', { id: 'chart-fee' });
    chartCard.appendChild(canvas);
    container.appendChild(chartCard);

    // Table
    const card = el('div', { className: 'table-card' });
    card.appendChild(el('div', { className: 'table-header' }, [
      el('div', { className: 'table-title', textContent: 'Detail Fee per Partai' })
    ]));
    const headers = [
      { label: 'Partai' },
      { label: 'Qty (kg)', align: 'right' },
      { label: 'Fee/kg', align: 'right' },
      { label: 'Total Fee', align: 'right' }
    ];
    const rows = data.by_partai.map(p => [
      `Part ${p.partai}`,
      kg(p.total_kg),
      'Rp 50.000',
      rupiahFull(p.total_fee)
    ]);
    rows.push(['TOTAL', kg(totalKg), '-', rupiahFull(totalFee)]);
    card.appendChild(buildTable(headers, rows));
    container.appendChild(card);

    requestAnimationFrame(() => {
      if (chart) chart.destroy();
      chart = new Chart(canvas, {
        type: 'bar',
        data: {
          labels: data.by_partai.map(p => `Part ${p.partai}`),
          datasets: [{
            label: 'Fee (Rp)',
            data: data.by_partai.map(p => Number(p.total_fee)),
            backgroundColor: '#8B5CF6',
            borderRadius: 8,
            borderSkipped: false
          }]
        },
        options: {
          responsive: true,
          plugins: { legend: { display: false } },
          scales: {
            x: { ticks: { color: '#64748B', font: { family: 'Inter', size: 11 } }, grid: { display: false } },
            y: { ticks: { color: '#64748B' }, grid: { color: '#E5E7EB' } }
          }
        }
      });
    });
  } catch (err) {
    clear(container);
    container.appendChild(el('div', { className: 'loading', textContent: 'Error: ' + err.message }));
  }
}
