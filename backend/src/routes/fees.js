const { Router } = require('express');
const prisma = require('../db');
const router = Router();

router.get('/', async (req, res) => {
  try {
    const [data, byPartai, byWilayah] = await Promise.all([
      prisma.fee.findMany({ orderBy: [{ partai: 'asc' }, { wilayah: 'asc' }] }),
      prisma.$queryRaw`
        SELECT partai,
          COALESCE(SUM(qty), 0) as total_kg,
          COALESCE(SUM(total), 0) as total_fee
        FROM fees GROUP BY partai ORDER BY partai`,
      prisma.$queryRaw`
        SELECT wilayah,
          COALESCE(SUM(qty), 0) as total_kg,
          COALESCE(SUM(total), 0) as total_fee,
          COUNT(*)::int as entries
        FROM fees GROUP BY wilayah ORDER BY total_fee DESC`
    ]);

    res.json({ data, by_partai: byPartai, by_wilayah: byWilayah });
  } catch (err) {
    console.error('Fee error:', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
