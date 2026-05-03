const { Router } = require('express');
const prisma = require('../db');
const router = Router();

router.get('/', async (req, res) => {
  try {
    const [
      totalPurchases,
      totalSuppliers,
      purchaseAgg,
      paymentIn,
      paymentOut,
      feeAgg,
      opAgg,
      byWilayah,
      byKategori,
      monthlyTrend
    ] = await Promise.all([
      prisma.purchase.count(),
      prisma.supplier.count(),
      prisma.purchase.aggregate({ _sum: { qty: true, total: true } }),
      prisma.payment.aggregate({ where: { type: 'IN' }, _sum: { amount: true } }),
      prisma.payment.aggregate({ where: { type: 'OUT' }, _sum: { amount: true } }),
      prisma.fee.aggregate({ _sum: { total: true, qty: true } }),
      prisma.operasional.aggregate({ _sum: { jumlah: true } }),
      prisma.$queryRaw`
        SELECT wilayah,
          COUNT(*)::int as total_transaksi,
          COALESCE(SUM(qty), 0) as total_kg,
          COALESCE(SUM(total), 0) as total_nilai
        FROM purchases GROUP BY wilayah ORDER BY total_kg DESC`,
      prisma.$queryRaw`
        SELECT kategori,
          COUNT(*)::int as total_transaksi,
          COALESCE(SUM(qty), 0) as total_kg,
          COALESCE(SUM(total), 0) as total_nilai
        FROM purchases GROUP BY kategori ORDER BY total_kg DESC`,
      prisma.$queryRaw`
        SELECT TO_CHAR(date, 'YYYY-MM') as bulan,
          COALESCE(SUM(qty), 0) as total_kg,
          COALESCE(SUM(total), 0) as total_nilai,
          COUNT(*)::int as transaksi
        FROM purchases GROUP BY TO_CHAR(date, 'YYYY-MM')
        ORDER BY bulan`
    ]);

    res.json({
      summary: {
        total_transaksi: totalPurchases,
        total_supplier: totalSuppliers,
        total_kg: purchaseAgg._sum.qty || 0,
        total_nilai: purchaseAgg._sum.total || 0,
        total_pembayaran_masuk: paymentIn._sum.amount || 0,
        total_pembayaran_keluar: paymentOut._sum.amount || 0,
        total_fee: feeAgg._sum.total || 0,
        total_fee_kg: feeAgg._sum.qty || 0,
        total_operasional: opAgg._sum.jumlah || 0
      },
      by_wilayah: byWilayah,
      by_kategori: byKategori,
      monthly_trend: monthlyTrend
    });
  } catch (err) {
    console.error('Overview error:', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
