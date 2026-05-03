export function el(tag, attrs = {}, children = []) {
  const element = document.createElement(tag);
  for (const [key, val] of Object.entries(attrs)) {
    if (key === 'className') element.className = val;
    else if (key === 'textContent') element.textContent = val;
    else if (key.startsWith('on')) element.addEventListener(key.slice(2).toLowerCase(), val);
    else element.setAttribute(key, val);
  }
  for (const child of children) {
    if (typeof child === 'string') element.appendChild(document.createTextNode(child));
    else if (child) element.appendChild(child);
  }
  return element;
}

export function clear(container) {
  while (container.firstChild) container.removeChild(container.firstChild);
}

export function showLoading(container) {
  clear(container);
  const loader = el('div', { className: 'loading' }, [
    el('div', { className: 'spinner' }),
    el('span', { textContent: 'Memuat data...' })
  ]);
  container.appendChild(loader);
}

export function buildTable(headers, rows) {
  const table = el('table');
  const thead = el('thead');
  const headerRow = el('tr');
  for (const h of headers) {
    headerRow.appendChild(el('th', { textContent: h.label, className: h.align === 'right' ? 'num-right' : '' }));
  }
  thead.appendChild(headerRow);
  table.appendChild(thead);

  const tbody = el('tbody');
  for (const row of rows) {
    const tr = el('tr');
    for (let i = 0; i < headers.length; i++) {
      const td = el('td', { className: headers[i].align === 'right' ? 'num-right' : '' });
      const cell = row[i];
      if (cell instanceof HTMLElement) td.appendChild(cell);
      else td.textContent = cell != null ? String(cell) : '';
      tr.appendChild(td);
    }
    tbody.appendChild(tr);
  }
  table.appendChild(tbody);
  return table;
}

export function buildPagination(pagination, onPage) {
  const { page, pages, total } = pagination;
  const container = el('div', { className: 'pagination' });

  const prev = el('button', { textContent: 'Prev', onClick: () => onPage(page - 1) });
  if (page <= 1) prev.disabled = true;

  const info = el('span', { textContent: `Hal ${page} dari ${pages} (${total} data)` });

  const next = el('button', { textContent: 'Next', onClick: () => onPage(page + 1) });
  if (page >= pages) next.disabled = true;

  container.appendChild(prev);
  container.appendChild(info);
  container.appendChild(next);
  return container;
}
