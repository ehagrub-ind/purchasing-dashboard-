from fastapi import APIRouter, Depends
from sqlalchemy import text, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from ..database import get_db
from ..models import Purchase, Supplier, Payment, Fee, Operasional

router = APIRouter()


@router.get("/")
async def get_overview(db: AsyncSession = Depends(get_db)):
    total_purchases = (await db.execute(select(func.count(Purchase.id)))).scalar() or 0
    total_suppliers = (await db.execute(select(func.count(Supplier.id)))).scalar() or 0

    pa = (await db.execute(select(func.sum(Purchase.qty), func.sum(Purchase.total)))).one()
    pi = (await db.execute(select(func.sum(Payment.amount)).where(Payment.type == "IN"))).scalar() or 0
    po = (await db.execute(select(func.sum(Payment.amount)).where(Payment.type == "OUT"))).scalar() or 0
    fa = (await db.execute(select(func.sum(Fee.total), func.sum(Fee.qty)))).one()
    oa = (await db.execute(select(func.sum(Operasional.jumlah)))).scalar() or 0

    by_wilayah = (await db.execute(text("""
        SELECT wilayah, COUNT(*)::int as total_transaksi,
            COALESCE(SUM(qty),0) as total_kg, COALESCE(SUM(total),0) as total_nilai
        FROM purchases GROUP BY wilayah ORDER BY total_kg DESC
    """))).mappings().all()

    by_kategori = (await db.execute(text("""
        SELECT kategori, COUNT(*)::int as total_transaksi,
            COALESCE(SUM(qty),0) as total_kg, COALESCE(SUM(total),0) as total_nilai
        FROM purchases GROUP BY kategori ORDER BY total_kg DESC
    """))).mappings().all()

    monthly = (await db.execute(text("""
        SELECT TO_CHAR(date, 'YYYY-MM') as bulan,
            COALESCE(SUM(qty),0) as total_kg, COALESCE(SUM(total),0) as total_nilai,
            COUNT(*)::int as transaksi
        FROM purchases GROUP BY TO_CHAR(date, 'YYYY-MM') ORDER BY bulan
    """))).mappings().all()

    return {
        "summary": {
            "total_transaksi": total_purchases,
            "total_supplier": total_suppliers,
            "total_kg": float(pa[0] or 0),
            "total_nilai": float(pa[1] or 0),
            "total_pembayaran_masuk": float(pi),
            "total_pembayaran_keluar": float(po),
            "total_fee": float(fa[0] or 0),
            "total_fee_kg": float(fa[1] or 0),
            "total_operasional": float(oa),
        },
        "by_wilayah": [dict(r) for r in by_wilayah],
        "by_kategori": [dict(r) for r in by_kategori],
        "monthly_trend": [dict(r) for r in monthly],
    }
