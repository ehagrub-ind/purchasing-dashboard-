from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from ..database import get_db
from ..models import MasterWarna

router = APIRouter()


def _row(r):
    return {
        "id": r.id,
        "kode_warna": r.kode_warna,
        "nama_warna": r.nama_warna,
        "aktif": r.aktif,
        "created_at": r.created_at.isoformat() if r.created_at else None,
    }


@router.get("/")
async def list_warna(aktif: str | None = None, db: AsyncSession = Depends(get_db)):
    q = select(MasterWarna).order_by(MasterWarna.nama_warna)
    if aktif is not None:
        q = q.where(MasterWarna.aktif == (aktif.lower() == "true"))
    rows = (await db.execute(q)).scalars().all()
    return [_row(r) for r in rows]


@router.get("/{id}/")
async def get_warna(id: int, db: AsyncSession = Depends(get_db)):
    row = (await db.execute(select(MasterWarna).where(MasterWarna.id == id))).scalar_one_or_none()
    if not row:
        raise HTTPException(status_code=404, detail="Warna tidak ditemukan")
    return _row(row)


@router.post("/", status_code=201)
async def create_warna(body: dict, db: AsyncSession = Depends(get_db)):
    existing = (await db.execute(
        select(MasterWarna).where(MasterWarna.kode_warna == body["kode_warna"].upper())
    )).scalar_one_or_none()
    if existing:
        raise HTTPException(status_code=400, detail="Kode warna sudah ada")

    row = MasterWarna(
        kode_warna=body["kode_warna"].upper(),
        nama_warna=body["nama_warna"],
        aktif=body.get("aktif", True),
    )
    db.add(row)
    await db.commit()
    await db.refresh(row)
    return _row(row)


@router.put("/{id}/")
async def update_warna(id: int, body: dict, db: AsyncSession = Depends(get_db)):
    row = (await db.execute(select(MasterWarna).where(MasterWarna.id == id))).scalar_one_or_none()
    if not row:
        raise HTTPException(status_code=404, detail="Warna tidak ditemukan")
    for key in ["kode_warna", "nama_warna"]:
        if key in body:
            val = body[key].upper() if key == "kode_warna" else body[key]
            setattr(row, key, val)
    await db.commit()
    await db.refresh(row)
    return _row(row)


@router.patch("/{id}/toggle/")
async def toggle_warna(id: int, db: AsyncSession = Depends(get_db)):
    row = (await db.execute(select(MasterWarna).where(MasterWarna.id == id))).scalar_one_or_none()
    if not row:
        raise HTTPException(status_code=404, detail="Warna tidak ditemukan")
    row.aktif = not row.aktif
    await db.commit()
    await db.refresh(row)
    return {"id": row.id, "aktif": row.aktif}


@router.delete("/{id}/")
async def delete_warna(id: int, db: AsyncSession = Depends(get_db)):
    row = (await db.execute(select(MasterWarna).where(MasterWarna.id == id))).scalar_one_or_none()
    if not row:
        raise HTTPException(status_code=404, detail="Warna tidak ditemukan")
    await db.delete(row)
    await db.commit()
    return {"ok": True}
