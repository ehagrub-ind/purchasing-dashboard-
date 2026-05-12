from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select, text
from sqlalchemy.ext.asyncio import AsyncSession

from ..database import get_db
from ..models import Kas

router = APIRouter()


@router.get("/")
async def list_kas(wilayah: str | None = None, db: AsyncSession = Depends(get_db)):
    q = select(Kas).order_by(Kas.date.desc())
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


@router.post("/", status_code=201)
async def create_kas(body: dict, db: AsyncSession = Depends(get_db)):
    tipe = body.get("tipe", "masuk")
    nominal = float(body.get("nominal", 0))
    if nominal <= 0:
        raise HTTPException(400, "Nominal harus lebih dari 0")

    row = Kas(
        date=datetime.fromisoformat(body["tanggal"]) if body.get("tanggal") else datetime.utcnow(),
        wilayah=body.get("wilayah", ""),
        deskripsi=body.get("deskripsi", ""),
        masuk=nominal if tipe == "masuk" else 0,
        keluar=nominal if tipe == "keluar" else 0,
        balance=0,
    )
    db.add(row)
    await db.commit()
    await db.refresh(row)
    return {"id": row.id, "date": row.date.isoformat(), "wilayah": row.wilayah,
            "masuk": row.masuk, "keluar": row.keluar, "deskripsi": row.deskripsi}


@router.delete("/{kas_id}/", status_code=200)
async def delete_kas(kas_id: int, db: AsyncSession = Depends(get_db)):
    row = (await db.execute(select(Kas).where(Kas.id == kas_id))).scalar_one_or_none()
    if not row:
        raise HTTPException(404, "Data tidak ditemukan")
    await db.delete(row)
    await db.commit()
    return {"ok": True}
