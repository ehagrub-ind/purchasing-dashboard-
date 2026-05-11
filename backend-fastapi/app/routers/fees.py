from fastapi import APIRouter, Depends
from sqlalchemy import select, text
from sqlalchemy.ext.asyncio import AsyncSession

from ..database import get_db
from ..models import Fee

router = APIRouter()


@router.get("/")
async def list_fees(db: AsyncSession = Depends(get_db)):
    rows = (await db.execute(select(Fee).order_by(Fee.partai, Fee.wilayah))).scalars().all()

    by_partai = (await db.execute(text("""
        SELECT partai, COALESCE(SUM(qty),0) as total_kg, COALESCE(SUM(total),0) as total_fee
        FROM fees GROUP BY partai ORDER BY partai
    """))).mappings().all()

    by_wilayah = (await db.execute(text("""
        SELECT wilayah, COALESCE(SUM(qty),0) as total_kg, COALESCE(SUM(total),0) as total_fee,
            COUNT(*)::int as entries
        FROM fees GROUP BY wilayah ORDER BY total_fee DESC
    """))).mappings().all()

    return {
        "data": [{"id": r.id, "partai": r.partai, "wilayah": r.wilayah, "kategori": r.kategori,
                   "qty": r.qty, "fee": r.fee, "total": r.total} for r in rows],
        "by_partai": [dict(r) for r in by_partai],
        "by_wilayah": [dict(r) for r in by_wilayah],
    }
