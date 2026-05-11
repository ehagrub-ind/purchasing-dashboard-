const express = require('express');
const path = require('path');
const fs = require('fs');
const router = express.Router();

function loadData() {
  const filePath = path.join(__dirname, '../../data/import_data.json');
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

router.get('/', (req, res) => {
  try {
    const data = loadData();
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: 'Failed to load import data' });
  }
});

router.get('/summary', (req, res) => {
  try {
    const data = loadData();
    const rm = data.raw_materials;
    const totalKg = rm.reduce((s, r) => s + r.kg, 0);
    const totalUsd = rm.reduce((s, r) => s + r.usd, 0);

    const ucupPayments = data.payments.filter(p => p.desc.toLowerCase().includes('ucup'));
    const ucupTotalIdr = ucupPayments.reduce((s, p) => s + p.idr, 0);
    const ucupTotalUsd = ucupPayments.reduce((s, p) => s + p.usd, 0);

    res.json({
      account: data.account,
      raw_material_summary: {
        total_kg: Math.round(totalKg * 1000) / 1000,
        total_usd: Math.round(totalUsd * 100) / 100,
        avg_price_per_kg: Math.round((totalUsd / totalKg) * 100) / 100,
        shipments: rm.length
      },
      pak_ucup_summary: {
        total_idr: ucupTotalIdr,
        total_usd: Math.round(ucupTotalUsd * 100) / 100,
        transactions: ucupPayments.length,
        avg_kurs: Math.round(ucupTotalIdr / ucupTotalUsd)
      },
      balance: data.balance_timeline[data.balance_timeline.length - 1]
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to compute summary' });
  }
});

module.exports = router;
