const { Router } = require('express');
const prisma = require('../db');
const router = Router();

router.get('/', async (req, res) => {
  try {
    const { wilayah, supplier, type, from, to, page = 1, limit = 50 } = req.query;
    const where = {};

    if (wilayah) where.wilayah = wilayah;
    if (supplier) where.supplierId = parseInt(supplier);
    if (type) where.type = type;
    if (from || to) {
      where.date = {};
      if (from) where.date.gte = new Date(from);
      if (to) where.date.lte = new Date(to);
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [data, total] = await Promise.all([
      prisma.payment.findMany({
        where,
        include: { supplier: { select: { name: true } } },
        orderBy: { date: 'desc' },
        skip,
        take: parseInt(limit)
      }),
      prisma.payment.count({ where })
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
    console.error('Payments error:', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
