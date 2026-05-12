from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException
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
        "data": [{"id": r.id, "date": r.date.isoformat() if r.date else None,
                   "partai": r.partai, "wilayah": r.wilayah, "kategori": r.kategori,
                   "qty": r.qty, "fee": r.fee, "total": r.total} for r in rows],
        "by_partai": [dict(r) for r in by_partai],
        "by_wilayah": [dict(r) for r in by_wilayah],
    }


@router.post("/", status_code=201)
async def create_fee(body: dict, db: AsyncSession = Depends(get_db)):
    qty = float(body.get("qty", 0))
    fee_rate = float(body.get("fee", 50))
    if qty <= 0:
        raise HTTPException(400, "Qty harus lebih dari 0")

    row = Fee(
        date=datetime.fromisoformat(body["tanggal"]) if body.get("tanggal") else datetime.utcnow(),
        partai=int(body.get("partai", 1)),
        wilayah=body.get("wilayah", ""),
        kategori=body.get("kategori", ""),
        qty=qty,
        fee=fee_rate,
        total=qty * fee_rate,
    )
    db.add(row)
    await db.commit()
    await db.refresh(row)
    return {"id": row.id, "partai": row.partai, "wilayah": row.wilayah,
            "kategori": row.kategori, "qty": row.qty, "fee": row.fee, "total": row.total}


@router.delete("/{fee_id}/", status_code=200)
async def delete_fee(fee_id: int, db: AsyncSession = Depends(get_db)):
    row = (await db.execute(select(Fee).where(Fee.id == fee_id))).scalar_one_or_none()
    if not row:
        raise HTTPException(404, "Data tidak ditemukan")
    await db.delete(row)
    await db.commit()
    return {"ok": True}
