from fastapi import APIRouter, Depends
from sqlalchemy import select, text
from sqlalchemy.ext.asyncio import AsyncSession

from ..database import get_db
from ..models import Operasional

router = APIRouter()


@router.get("/")
async def list_operasional(db: AsyncSession = Depends(get_db)):
    rows = (await db.execute(select(Operasional).order_by(Operasional.wilayah, Operasional.jumlah.desc()))).scalars().all()
    summary = (await db.execute(text("""
        SELECT wilayah, COALESCE(SUM(jumlah),0) as total, COUNT(*)::int as items
        FROM operasional GROUP BY wilayah ORDER BY total DESC
    """))).mappings().all()

    return {
        "data": [{"id": r.id, "wilayah": r.wilayah, "deskripsi": r.deskripsi, "jumlah": r.jumlah} for r in rows],
        "summary": [dict(r) for r in summary],
    }
