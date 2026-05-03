import { getSuppliers, createPurchase } from '../modules/api.js';
import { el } from '../modules/dom.js';

function field(label, input) {
  const wrap = el('div', { className: 'fin-field' });
  wrap.appendChild(el('label', { className: 'fin-field-label', textContent: label }));
  wrap.appendChild(input);
  return wrap;
}

function row(...children) {
  const r = el('div', { className: 'fin-form-row' });
  children.forEach(c => r.appendChild(c));
  return r;
}

export async function showNewPurchaseModal(onSuccess) {
  let suppliers = [];
  try {
    const res = await getSuppliers();
    suppliers = res.data || res;
  } catch (_) {}

  const overlay = el('div', { className: 'fin-modal-overlay' });

  const modal = el('div', { className: 'fin-modal' });
  modal.style.maxWidth = '560px';

  const header = el('div', { className: 'fin-modal-header' });
  header.appendChild(el('div', { className: 'fin-modal-title', textContent: 'Pembelian Baru' }));
  const closeBtn = el('button', { className: 'fin-modal-close', textContent: '×', onClick: () => overlay.remove() });
  header.appendChild(closeBtn);

  const body = el('div', { className: 'fin-modal-body' });

  const dateInput = el('input', { className: 'fin-input', type: 'date' });
  dateInput.value = new Date().toISOString().slice(0, 10);

  const supplierSelect = el('select', { className: 'fin-input' });
  supplierSelect.appendChild(el('option', { value: '', textContent: '— Pilih Supplier —' }));
  suppliers.forEach(s => {
    supplierSelect.appendChild(el('option', { value: String(s.id), textContent: `${s.name} — ${s.wilayah}` }));
  });

  const wilayahSelect = el('select', { className: 'fin-input' });
  wilayahSelect.appendChild(el('option', { value: '', textContent: '— Pilih Wilayah —' }));
  ['Jatim', 'Jateng', 'Jabar'].forEach(w => {
    wilayahSelect.appendChild(el('option', { value: w, textContent: w }));
  });

  supplierSelect.addEventListener('change', () => {
    const sup = suppliers.find(s => String(s.id) === supplierSelect.value);
    if (sup && sup.wilayah) wilayahSelect.value = sup.wilayah;
  });

  const jenisSelect = el('select', { className: 'fin-input' });
  ['Sortiran', 'Cabutan', 'Campuran', 'Potongan', 'Lainnya'].forEach(j => {
    jenisSelect.appendChild(el('option', { value: j, textContent: j }));
  });

  const kategoriSelect = el('select', { className: 'fin-input' });
  ['R Salon', 'Uk 6-8 / Retul', 'Remy', 'Lus', 'Brangkas', 'Lainnya'].forEach(k => {
    kategoriSelect.appendChild(el('option', { value: k, textContent: k }));
  });

  const qtyInput = el('input', { className: 'fin-input', type: 'number', placeholder: 'Qty (kg)', step: '0.1', min: '0' });
  const priceInput = el('input', { className: 'fin-input', type: 'number', placeholder: 'Harga per kg (ribuan)', step: '1', min: '0' });
  const deskripsiInput = el('input', { className: 'fin-input', type: 'text', placeholder: 'Deskripsi (opsional)' });

  const totalDisplay = el('div', { className: 'fin-total-display', textContent: 'Total: Rp 0' });

  function updateTotal() {
    const q = parseFloat(qtyInput.value) || 0;
    const p = (parseFloat(priceInput.value) || 0) * 1000;
    const t = q * p;
    totalDisplay.textContent = 'Total: Rp ' + t.toLocaleString('id-ID');
  }
  qtyInput.addEventListener('input', updateTotal);
  priceInput.addEventListener('input', updateTotal);

  body.appendChild(row(field('Tanggal', dateInput), field('Wilayah', wilayahSelect)));
  body.appendChild(field('Supplier', supplierSelect));
  body.appendChild(row(field('Jenis', jenisSelect), field('Kategori', kategoriSelect)));
  body.appendChild(row(field('Qty (kg)', qtyInput), field('Harga /kg (ribuan)', priceInput)));
  body.appendChild(field('Deskripsi', deskripsiInput));
  body.appendChild(totalDisplay);

  const footer = el('div', { className: 'fin-modal-footer' });
  const cancelBtn = el('button', { className: 'btn btn-outline', textContent: 'Batal', onClick: () => overlay.remove() });

  const errMsg = el('div', { className: 'fin-error-msg' });
  errMsg.style.display = 'none';

  const submitBtn = el('button', { className: 'btn btn-primary', textContent: 'Simpan', onClick: async () => {
    errMsg.style.display = 'none';

    if (!dateInput.value || !supplierSelect.value || !wilayahSelect.value || !qtyInput.value || !priceInput.value) {
      errMsg.textContent = 'Semua field wajib diisi';
      errMsg.style.display = 'block';
      return;
    }

    submitBtn.disabled = true;
    submitBtn.textContent = 'Menyimpan...';

    try {
      await createPurchase({
        date: dateInput.value,
        supplierId: parseInt(supplierSelect.value),
        wilayah: wilayahSelect.value,
        jenis: jenisSelect.value,
        kategori: kategoriSelect.value,
        qty: parseFloat(qtyInput.value),
        price: (parseFloat(priceInput.value) || 0) * 1000,
        deskripsi: deskripsiInput.value || undefined
      });
      overlay.remove();
      if (onSuccess) onSuccess();
    } catch (err) {
      errMsg.textContent = err.message;
      errMsg.style.display = 'block';
      submitBtn.disabled = false;
      submitBtn.textContent = 'Simpan';
    }
  }});

  footer.appendChild(cancelBtn);
  footer.appendChild(submitBtn);

  modal.appendChild(header);
  modal.appendChild(body);
  modal.appendChild(errMsg);
  modal.appendChild(footer);
  overlay.appendChild(modal);

  overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.remove(); });

  document.body.appendChild(overlay);
}
