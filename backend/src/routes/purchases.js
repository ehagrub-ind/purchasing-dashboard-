const { Router } = require('express');
const prisma = require('../db');
const router = Router();

router.get('/', async (req, res) => {
  try {
    const { wilayah, kategori, supplier, from, to, page = 1, limit = 50 } = req.query;
    const where = {};

    if (wilayah) where.wilayah = wilayah;
    if (kategori) where.kategori = kategori;
    if (supplier) where.supplierId = parseInt(supplier);
    if (from || to) {
      where.date = {};
      if (from) where.date.gte = new Date(from);
      if (to) where.date.lte = new Date(to);
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [data, total] = await Promise.all([
      prisma.purchase.findMany({
        where,
        include: { supplier: { select: { name: true } } },
        orderBy: { date: 'desc' },
        skip,
        take: parseInt(limit)
      }),
      prisma.purchase.count({ where })
    ]);

    res.json({
      data,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (err) {
    console.error('Purchases error:', err);
    res.status(500).json({ error: err.message });
  }
});

router.get('/stats', async (req, res) => {
  try {
    const [bySupplier, byMonth] = await Promise.all([
      prisma.$queryRaw`
        SELECT s.name as supplier, p.wilayah, p.kategori,
          SUM(p.qty) as total_kg, SUM(p.total) as total_nilai, COUNT(*)::int as count
        FROM purchases p JOIN suppliers s ON s.id = p.supplier_id
        GROUP BY s.name, p.wilayah, p.kategori
        ORDER BY s.name, p.kategori`,
      prisma.$queryRaw`
        SELECT TO_CHAR(date, 'YYYY-MM') as bulan, wilayah,
          SUM(qty) as total_kg, SUM(total) as total_nilai
        FROM purchases GROUP BY TO_CHAR(date, 'YYYY-MM'), wilayah
        ORDER BY bulan, wilayah`
    ]);

    res.json({ by_supplier: bySupplier, by_month: byMonth });
  } catch (err) {
    console.error('Purchase stats error:', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
