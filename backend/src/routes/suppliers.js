const { Router } = require('express');
const prisma = require('../db');
const router = Router();

router.get('/', async (req, res) => {
  try {
    const suppliers = await prisma.$queryRaw`
      SELECT
        s.id, s.name, s.wilayah,
        COALESCE(p.total_kg, 0) as total_kg,
        COALESCE(p.total_nilai, 0) as total_nilai,
        COALESCE(p.total_transaksi, 0)::int as total_transaksi,
        COALESCE(pay_in.total_masuk, 0) as total_masuk,
        COALESCE(pay_out.total_keluar, 0) as total_keluar,
        COALESCE(pay_in.total_masuk, 0) - COALESCE(pay_out.total_keluar, 0) as saldo
      FROM suppliers s
      LEFT JOIN (
        SELECT supplier_id, SUM(qty) as total_kg, SUM(total) as total_nilai, COUNT(*) as total_transaksi
        FROM purchases GROUP BY supplier_id
      ) p ON p.supplier_id = s.id
      LEFT JOIN (
        SELECT supplier_id, SUM(amount) as total_masuk FROM payments WHERE type = 'IN' GROUP BY supplier_id
      ) pay_in ON pay_in.supplier_id = s.id
      LEFT JOIN (
        SELECT supplier_id, SUM(amount) as total_keluar FROM payments WHERE type = 'OUT' GROUP BY supplier_id
      ) pay_out ON pay_out.supplier_id = s.id
      ORDER BY total_kg DESC`;

    res.json(suppliers);
  } catch (err) {
    console.error('Suppliers error:', err);
    res.status(500).json({ error: err.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const supplier = await prisma.supplier.findUnique({ where: { id } });
    if (!supplier) return res.status(404).json({ error: 'Not found' });

    const [purchases, payments, byKategori] = await Promise.all([
      prisma.purchase.findMany({
        where: { supplierId: id },
        orderBy: { date: 'desc' }
      }),
      prisma.payment.findMany({
        where: { supplierId: id },
        orderBy: { date: 'desc' }
      }),
      prisma.$queryRaw`
        SELECT kategori, SUM(qty) as total_kg, SUM(total) as total_nilai, COUNT(*)::int as count
        FROM purchases WHERE supplier_id = ${id}
        GROUP BY kategori ORDER BY total_kg DESC`
    ]);

    res.json({ ...supplier, purchases, payments, by_kategori: byKategori });
  } catch (err) {
    console.error('Supplier detail error:', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
