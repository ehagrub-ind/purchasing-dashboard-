from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select, text
from sqlalchemy.ext.asyncio import AsyncSession

from ..database import get_db
from ..models import Operasional

router = APIRouter()


@router.get("/")
async def list_operasional(db: AsyncSession = Depends(get_db)):
    rows = (await db.execute(select(Operasional).order_by(Operasional.date.desc()))).scalars().all()
    summary = (await db.execute(text("""
        SELECT wilayah, COALESCE(SUM(jumlah),0) as total, COUNT(*)::int as items
        FROM operasional GROUP BY wilayah ORDER BY total DESC
    """))).mappings().all()

    return {
        "data": [{"id": r.id, "date": r.date.isoformat() if r.date else None,
                   "wilayah": r.wilayah, "deskripsi": r.deskripsi, "jumlah": r.jumlah} for r in rows],
        "summary": [dict(r) for r in summary],
    }


@router.post("/", status_code=201)
async def create_operasional(body: dict, db: AsyncSession = Depends(get_db)):
    jumlah = float(body.get("jumlah", 0))
    if jumlah <= 0:
        raise HTTPException(400, "Jumlah harus lebih dari 0")

    row = Operasional(
        date=datetime.fromisoformat(body["tanggal"]) if body.get("tanggal") else datetime.utcnow(),
        wilayah=body.get("wilayah", ""),
        deskripsi=body.get("deskripsi", ""),
        jumlah=jumlah,
    )
    db.add(row)
    await db.commit()
    await db.refresh(row)
    return {"id": row.id, "date": row.date.isoformat(), "wilayah": row.wilayah,
            "deskripsi": row.deskripsi, "jumlah": row.jumlah}


@router.delete("/{op_id}/", status_code=200)
async def delete_operasional(op_id: int, db: AsyncSession = Depends(get_db)):
    row = (await db.execute(select(Operasional).where(Operasional.id == op_id))).scalar_one_or_none()
    if not row:
        raise HTTPException(404, "Data tidak ditemukan")
    await db.delete(row)
    await db.commit()
    return {"ok": True}
