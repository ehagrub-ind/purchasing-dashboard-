const BASE = process.env.NEXT_PUBLIC_API_URL || '/api';

async function fetchJSON<T = any>(path: string): Promise<T> {
  let url = `${BASE}${path}`;
  const qIdx = url.indexOf('?');
  if (qIdx === -1) {
    url = url.endsWith('/') ? url : url + '/';
  } else {
    const base = url.slice(0, qIdx);
    url = (base.endsWith('/') ? base : base + '/') + url.slice(qIdx);
  }
  const finalUrl = url;
  const res = await fetch(finalUrl, { cache: 'no-store' });
  if (!res.ok) throw new Error(`API ${res.status}`);
  return res.json();
}

export const api = {
  getOverview: () => fetchJSON('/overview'),
  getSuppliers: () => fetchJSON('/suppliers'),
  getSupplier: (id: number) => fetchJSON(`/suppliers/${id}`),
  getPurchases: (params: Record<string, any> = {}) => {
    const qs = new URLSearchParams(params).toString();
    return fetchJSON(`/purchases${qs ? '?' + qs : ''}`);
  },
  getPurchaseStats: () => fetchJSON('/purchases/stats'),
  createPurchase: async (data: any) => {
    const res = await fetch(`${BASE}/purchases/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error(`API ${res.status}`);
    return res.json();
  },
  getPayments: (params: Record<string, any> = {}) => {
    const qs = new URLSearchParams(params).toString();
    return fetchJSON(`/payments${qs ? '?' + qs : ''}`);
  },
  getKas: (params: Record<string, any> = {}) => {
    const qs = new URLSearchParams(params).toString();
    return fetchJSON(`/kas${qs ? '?' + qs : ''}`);
  },
  getOperasional: () => fetchJSON('/operasional'),
  getFees: () => fetchJSON('/fees'),
  getImport: () => fetchJSON('/import'),
  getImportSummary: () => fetchJSON('/import/summary'),
  getMasterBahan: (params: Record<string, any> = {}) => {
    const qs = new URLSearchParams(params).toString();
    return fetchJSON(`/master-bahan${qs ? '?' + qs : ''}`);
  },
  getMasterBahanStats: async () => {
    const res = await fetch(`${BASE}/master-bahan/stats`, { cache: 'no-store' });
    if (!res.ok) throw new Error(`API ${res.status}`);
    return res.json();
  },
  createMasterBahan: async (data: any) => {
    const res = await fetch(`${BASE}/master-bahan/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error(`API ${res.status}`);
    return res.json();
  },
  updateMasterBahan: async (id: number, data: any) => {
    const res = await fetch(`${BASE}/master-bahan/${id}/`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error(`API ${res.status}`);
    return res.json();
  },
  deleteMasterBahan: async (id: number) => {
    const res = await fetch(`${BASE}/master-bahan/${id}/`, { method: 'DELETE' });
    if (!res.ok) throw new Error(`API ${res.status}`);
    return res.json();
  },
  toggleMasterBahan: async (id: number) => {
    const res = await fetch(`${BASE}/master-bahan/${id}/toggle/`, { method: 'PATCH' });
    if (!res.ok) throw new Error(`API ${res.status}`);
    return res.json();
  },

  // Wilayah
  getWilayah: (params: Record<string, any> = {}) => {
    const qs = new URLSearchParams(params).toString();
    return fetchJSON(`/wilayah${qs ? '?' + qs : ''}`);
  },
  getWilayahStats: async () => {
    const res = await fetch(`${BASE}/wilayah/stats/`, { cache: 'no-store' });
    if (!res.ok) throw new Error(`API ${res.status}`);
    return res.json();
  },
  createWilayah: async (data: any) => {
    const res = await fetch(`${BASE}/wilayah/`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
    if (!res.ok) throw new Error(`API ${res.status}`);
    return res.json();
  },
  updateWilayah: async (id: number, data: any) => {
    const res = await fetch(`${BASE}/wilayah/${id}/`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
    if (!res.ok) throw new Error(`API ${res.status}`);
    return res.json();
  },
  toggleWilayah: async (id: number) => {
    const res = await fetch(`${BASE}/wilayah/${id}/toggle/`, { method: 'PATCH' });
    if (!res.ok) throw new Error(`API ${res.status}`);
    return res.json();
  },
  deleteWilayah: async (id: number) => {
    const res = await fetch(`${BASE}/wilayah/${id}/`, { method: 'DELETE' });
    if (!res.ok) throw new Error(`API ${res.status}`);
    return res.json();
  },

  // PIC
  getPIC: (params: Record<string, any> = {}) => {
    const qs = new URLSearchParams(params).toString();
    return fetchJSON(`/pic${qs ? '?' + qs : ''}`);
  },
  createPIC: async (data: any) => {
    const res = await fetch(`${BASE}/pic/`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
    if (!res.ok) throw new Error(`API ${res.status}`);
    return res.json();
  },
  updatePIC: async (id: number, data: any) => {
    const res = await fetch(`${BASE}/pic/${id}/`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
    if (!res.ok) throw new Error(`API ${res.status}`);
    return res.json();
  },
  togglePIC: async (id: number) => {
    const res = await fetch(`${BASE}/pic/${id}/toggle/`, { method: 'PATCH' });
    if (!res.ok) throw new Error(`API ${res.status}`);
    return res.json();
  },
  deletePIC: async (id: number) => {
    const res = await fetch(`${BASE}/pic/${id}/`, { method: 'DELETE' });
    if (!res.ok) throw new Error(`API ${res.status}`);
    return res.json();
  },

  // Petani
  getPetani: (params: Record<string, any> = {}) => {
    const qs = new URLSearchParams(params).toString();
    return fetchJSON(`/petani${qs ? '?' + qs : ''}`);
  },
  createPetani: async (data: any) => {
    const res = await fetch(`${BASE}/petani/`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
    if (!res.ok) throw new Error(`API ${res.status}`);
    return res.json();
  },
  updatePetani: async (id: number, data: any) => {
    const res = await fetch(`${BASE}/petani/${id}/`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
    if (!res.ok) throw new Error(`API ${res.status}`);
    return res.json();
  },
  togglePetani: async (id: number) => {
    const res = await fetch(`${BASE}/petani/${id}/toggle/`, { method: 'PATCH' });
    if (!res.ok) throw new Error(`API ${res.status}`);
    return res.json();
  },
  deletePetani: async (id: number) => {
    const res = await fetch(`${BASE}/petani/${id}/`, { method: 'DELETE' });
    if (!res.ok) throw new Error(`API ${res.status}`);
    return res.json();
  },

  // Ukuran
  getUkuran: (params: Record<string, any> = {}) => {
    const qs = new URLSearchParams(params).toString();
    return fetchJSON(`/master-ukuran${qs ? '?' + qs : ''}`);
  },
  bulkCreateUkuran: async (data: any) => {
    const res = await fetch(`${BASE}/master-ukuran/bulk/`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
    if (!res.ok) throw new Error(`API ${res.status}`);
    return res.json();
  },
  createUkuran: async (data: any) => {
    const res = await fetch(`${BASE}/master-ukuran/`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
    if (!res.ok) throw new Error(`API ${res.status}`);
    return res.json();
  },
  updateUkuran: async (id: number, data: any) => {
    const res = await fetch(`${BASE}/master-ukuran/${id}/`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
    if (!res.ok) throw new Error(`API ${res.status}`);
    return res.json();
  },
  toggleUkuran: async (id: number) => {
    const res = await fetch(`${BASE}/master-ukuran/${id}/toggle/`, { method: 'PATCH' });
    if (!res.ok) throw new Error(`API ${res.status}`);
    return res.json();
  },
  deleteUkuran: async (id: number) => {
    const res = await fetch(`${BASE}/master-ukuran/${id}/`, { method: 'DELETE' });
    if (!res.ok) throw new Error(`API ${res.status}`);
    return res.json();
  },
  deleteAllUkuran: async () => {
    const res = await fetch(`${BASE}/master-ukuran/all/`, { method: 'DELETE' });
    if (!res.ok) throw new Error(`API ${res.status}`);
    return res.json();
  },

  // Warna
  getWarna: (params: Record<string, any> = {}) => {
    const qs = new URLSearchParams(params).toString();
    return fetchJSON(`/master-warna${qs ? '?' + qs : ''}`);
  },
  createWarna: async (data: any) => {
    const res = await fetch(`${BASE}/master-warna/`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
    if (!res.ok) throw new Error(`API ${res.status}`);
    return res.json();
  },
  updateWarna: async (id: number, data: any) => {
    const res = await fetch(`${BASE}/master-warna/${id}/`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
    if (!res.ok) throw new Error(`API ${res.status}`);
    return res.json();
  },
  toggleWarna: async (id: number) => {
    const res = await fetch(`${BASE}/master-warna/${id}/toggle/`, { method: 'PATCH' });
    if (!res.ok) throw new Error(`API ${res.status}`);
    return res.json();
  },
  deleteWarna: async (id: number) => {
    const res = await fetch(`${BASE}/master-warna/${id}/`, { method: 'DELETE' });
    if (!res.ok) throw new Error(`API ${res.status}`);
    return res.json();
  },

  // Supplier CRUD
  createSupplier: async (data: any) => {
    const res = await fetch(`${BASE}/suppliers/`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
    if (!res.ok) throw new Error(`API ${res.status}`);
    return res.json();
  },
  updateSupplier: async (id: number, data: any) => {
    const res = await fetch(`${BASE}/suppliers/${id}/`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
    if (!res.ok) throw new Error(`API ${res.status}`);
    return res.json();
  },
  toggleSupplier: async (id: number) => {
    const res = await fetch(`${BASE}/suppliers/${id}/toggle/`, { method: 'PATCH' });
    if (!res.ok) throw new Error(`API ${res.status}`);
    return res.json();
  },
  deleteSupplier: async (id: number) => {
    const res = await fetch(`${BASE}/suppliers/${id}/`, { method: 'DELETE' });
    if (!res.ok) throw new Error(`API ${res.status}`);
    return res.json();
  },

  // Arus Kas
  getArusKas: (params: Record<string, any> = {}) => {
    const qs = new URLSearchParams(params).toString();
    return fetchJSON(`/arus-kas${qs ? '?' + qs : ''}`);
  },
  getArusKasStats: () => fetchJSON('/arus-kas/stats'),

  // Delete individual
  deletePurchase: async (id: number) => {
    const res = await fetch(`${BASE}/purchases/${id}/`, { method: 'DELETE' });
    if (!res.ok) throw new Error(`API ${res.status}`);
    return res.json();
  },
  deletePayment: async (id: number) => {
    const res = await fetch(`${BASE}/payments/${id}/`, { method: 'DELETE' });
    if (!res.ok) throw new Error(`API ${res.status}`);
    return res.json();
  },

  // Clear Data
  clearPurchases: async () => {
    const res = await fetch(`${BASE}/hutang/clear-purchases/`, { method: 'DELETE' });
    if (!res.ok) throw new Error(`API ${res.status}`);
    return res.json();
  },
  clearPayments: async () => {
    const res = await fetch(`${BASE}/hutang/clear-payments/`, { method: 'DELETE' });
    if (!res.ok) throw new Error(`API ${res.status}`);
    return res.json();
  },

  // Hutang
  getHutang: () => fetchJSON('/hutang'),
  getHutangStats: () => fetchJSON('/hutang/stats'),
  getHutangTimeline: (supplierId: number) => fetchJSON(`/hutang/${supplierId}/timeline`),
  bayarHutang: async (supplierId: number, data: any) => {
    const res = await fetch(`${BASE}/hutang/${supplierId}/bayar/`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
    if (!res.ok) throw new Error(`API ${res.status}`);
    return res.json();
  },

  // Piutang
  getPiutang: (params: Record<string, any> = {}) => {
    const qs = new URLSearchParams(params).toString();
    return fetchJSON(`/piutang${qs ? '?' + qs : ''}`);
  },
  getPiutangStats: () => fetchJSON('/piutang/stats'),
  createPiutang: async (data: any) => {
    const res = await fetch(`${BASE}/piutang/`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
    if (!res.ok) throw new Error(`API ${res.status}`);
    return res.json();
  },
  updatePiutang: async (id: number, data: any) => {
    const res = await fetch(`${BASE}/piutang/${id}/`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
    if (!res.ok) throw new Error(`API ${res.status}`);
    return res.json();
  },
  bayarPiutang: async (id: number, nominal: number) => {
    const res = await fetch(`${BASE}/piutang/${id}/bayar/`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ nominal }) });
    if (!res.ok) throw new Error(`API ${res.status}`);
    return res.json();
  },
  deletePiutang: async (id: number) => {
    const res = await fetch(`${BASE}/piutang/${id}/`, { method: 'DELETE' });
    if (!res.ok) throw new Error(`API ${res.status}`);
    return res.json();
  },

  // Activity Log
  getActivityLog: (limit = 100) => fetchJSON(`/activity-log?limit=${limit}`),

  // Users / Tim
  getUsers: () => fetchJSON('/users'),
  createUser: async (data: any) => {
    const res = await fetch(`${BASE}/users/`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
    if (!res.ok) throw new Error(`API ${res.status}`);
    return res.json();
  },
  updateUser: async (id: number, data: any) => {
    const res = await fetch(`${BASE}/users/${id}/`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
    if (!res.ok) throw new Error(`API ${res.status}`);
    return res.json();
  },
  toggleUser: async (id: number) => {
    const res = await fetch(`${BASE}/users/${id}/toggle/`, { method: 'PATCH' });
    if (!res.ok) throw new Error(`API ${res.status}`);
    return res.json();
  },
  resetPassword: async (id: number, password: string) => {
    const res = await fetch(`${BASE}/users/${id}/reset-password/`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ password }) });
    if (!res.ok) throw new Error(`API ${res.status}`);
    return res.json();
  },
  deleteUser: async (id: number) => {
    const res = await fetch(`${BASE}/users/${id}/`, { method: 'DELETE' });
    if (!res.ok) throw new Error(`API ${res.status}`);
    return res.json();
  },

  // Kas CRUD
  createKas: async (data: any) => {
    const res = await fetch(`${BASE}/kas/`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
    if (!res.ok) throw new Error(`API ${res.status}`);
    return res.json();
  },
  deleteKas: async (id: number) => {
    const res = await fetch(`${BASE}/kas/${id}/`, { method: 'DELETE' });
    if (!res.ok) throw new Error(`API ${res.status}`);
    return res.json();
  },

  // Operasional CRUD
  createOperasional: async (data: any) => {
    const res = await fetch(`${BASE}/operasional/`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
    if (!res.ok) throw new Error(`API ${res.status}`);
    return res.json();
  },
  deleteOperasional: async (id: number) => {
    const res = await fetch(`${BASE}/operasional/${id}/`, { method: 'DELETE' });
    if (!res.ok) throw new Error(`API ${res.status}`);
    return res.json();
  },

  // Fee CRUD
  createFee: async (data: any) => {
    const res = await fetch(`${BASE}/fees/`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
    if (!res.ok) throw new Error(`API ${res.status}`);
    return res.json();
  },
  deleteFee: async (id: number) => {
    const res = await fetch(`${BASE}/fees/${id}/`, { method: 'DELETE' });
    if (!res.ok) throw new Error(`API ${res.status}`);
    return res.json();
  },

  // Penjualan
  getPenjualan: (params?: any) => {
    const qs = params ? '?' + new URLSearchParams(params).toString() : '';
    return fetchJSON('/penjualan' + qs);
  },
  getPenjualanStats: () => fetchJSON('/penjualan/stats'),
  getStok: () => fetchJSON('/penjualan/stok'),
  getHargaBahan: () => fetchJSON('/penjualan/harga-bahan'),
  createPenjualan: async (data: any) => {
    const res = await fetch(`${BASE}/penjualan/`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
    if (!res.ok) throw new Error(`API ${res.status}`);
    return res.json();
  },
  bayarPenjualan: async (id: number, nominal: number) => {
    const res = await fetch(`${BASE}/penjualan/${id}/bayar/`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ nominal }) });
    if (!res.ok) throw new Error(`API ${res.status}`);
    return res.json();
  },
  deletePenjualan: async (id: number) => {
    const res = await fetch(`${BASE}/penjualan/${id}/`, { method: 'DELETE' });
    if (!res.ok) throw new Error(`API ${res.status}`);
    return res.json();
  },
};
