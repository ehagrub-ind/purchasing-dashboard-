from fastapi import APIRouter, Depends
from sqlalchemy import select, text
from sqlalchemy.ext.asyncio import AsyncSession

from ..database import get_db
from ..models import Kas

router = APIRouter()


@router.get("/")
async def list_kas(wilayah: str | None = None, db: AsyncSession = Depends(get_db)):
    q = select(Kas).order_by(Kas.wilayah, Kas.date)
    if wilayah:
        q = q.where(Kas.wilayah == wilayah)

    rows = (await db.execute(q)).scalars().all()
    summary = (await db.execute(text("""
        SELECT wilayah,
            COALESCE(SUM(masuk),0) as total_masuk,
            COALESCE(SUM(keluar),0) as total_keluar,
            COALESCE(SUM(masuk),0) - COALESCE(SUM(keluar),0) as saldo
        FROM kas GROUP BY wilayah ORDER BY wilayah
    """))).mappings().all()

    return {
        "data": [
            {"id": r.id, "date": r.date.isoformat(), "wilayah": r.wilayah,
             "deskripsi": r.deskripsi, "masuk": r.masuk, "keluar": r.keluar, "balance": r.balance}
            for r in rows
        ],
        "summary": [dict(r) for r in summary],
    }
