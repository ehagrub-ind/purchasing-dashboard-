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
    const res = await fetch(`${BASE}/purchases`, {
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
};
