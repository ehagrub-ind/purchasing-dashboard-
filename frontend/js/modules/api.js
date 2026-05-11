const API_BASE = '/api';

async function fetchJSON(url) {
  const res = await fetch(`${API_BASE}${url}`);
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  return res.json();
}

export function getOverview() {
  return fetchJSON('/overview');
}

export function getSuppliers() {
  return fetchJSON('/suppliers');
}

export function getSupplier(id) {
  return fetchJSON(`/suppliers/${id}`);
}

export function getPurchases(params = {}) {
  const qs = new URLSearchParams(params).toString();
  return fetchJSON(`/purchases${qs ? '?' + qs : ''}`);
}

export async function createPurchase(data) {
  const res = await fetch(`${API_BASE}/purchases`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `API error: ${res.status}`);
  }
  return res.json();
}

export function getPurchaseStats() {
  return fetchJSON('/purchases/stats');
}

export function getPayments(params = {}) {
  const qs = new URLSearchParams(params).toString();
  return fetchJSON(`/payments${qs ? '?' + qs : ''}`);
}

export function getKas(params = {}) {
  const qs = new URLSearchParams(params).toString();
  return fetchJSON(`/kas${qs ? '?' + qs : ''}`);
}

export function getOperasional() {
  return fetchJSON('/operasional');
}

export function getFees() {
  return fetchJSON('/fees');
}

export function getImport() {
  return fetchJSON('/import');
}

export function getImportSummary() {
  return fetchJSON('/import/summary');
}
