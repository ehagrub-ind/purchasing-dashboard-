const { Router } = require('express');
const prisma = require('../db');
const router = Router();

router.get('/', async (req, res) => {
  try {
    const { wilayah } = req.query;
    const where = wilayah ? { wilayah } : {};

    const [data, summary] = await Promise.all([
      prisma.kas.findMany({ where, orderBy: [{ wilayah: 'asc' }, { date: 'asc' }] }),
      prisma.$queryRaw`
        SELECT wilayah,
          COALESCE(SUM(masuk), 0) as total_masuk,
          COALESCE(SUM(keluar), 0) as total_keluar,
          COALESCE(SUM(masuk), 0) - COALESCE(SUM(keluar), 0) as saldo
        FROM kas GROUP BY wilayah ORDER BY wilayah`
    ]);

    res.json({ data, summary });
  } catch (err) {
    console.error('Kas error:', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
