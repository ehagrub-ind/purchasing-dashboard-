const { Router } = require('express');
const prisma = require('../db');
const router = Router();

router.get('/', async (req, res) => {
  try {
    const [data, summary] = await Promise.all([
      prisma.operasional.findMany({ orderBy: [{ wilayah: 'asc' }, { jumlah: 'desc' }] }),
      prisma.$queryRaw`
        SELECT wilayah,
          COALESCE(SUM(jumlah), 0) as total,
          COUNT(*)::int as items
        FROM operasional GROUP BY wilayah ORDER BY total DESC`
    ]);

    res.json({ data, summary });
  } catch (err) {
    console.error('Operasional error:', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
