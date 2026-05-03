import { render as renderOverview } from './components/overview.js';
import { render as renderSuppliers } from './components/suppliers.js';
import { render as renderPurchases } from './components/purchases.js';
import { render as renderFinance } from './components/finance.js';
import { render as renderFees } from './components/fees.js';

const pages = {
  overview: renderOverview,
  suppliers: renderSuppliers,
  purchases: renderPurchases,
  finance: renderFinance,
  fees: renderFees
};

let currentPage = 'overview';
let navItems = [];

function navigate(page, clickedEl) {
  if (!pages[page]) return;
  currentPage = page;

  navItems.forEach(n => n.classList.remove('active'));
  if (clickedEl) {
    clickedEl.classList.add('active');
  } else {
    const match = navItems.find(n => n.dataset.page === page);
    if (match) match.classList.add('active');
  }

  const container = document.getElementById('app-content');
  pages[page](container);
}

document.addEventListener('DOMContentLoaded', () => {
  navItems = Array.from(document.querySelectorAll('.nav-item'));

  navItems.forEach(n => {
    n.addEventListener('click', () => navigate(n.dataset.page, n));
  });

  navigate('overview');
});
