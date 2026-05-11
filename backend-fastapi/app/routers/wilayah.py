from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from ..database import get_db
from ..models import MasterWilayah

router = APIRouter()


@router.get("/")
async def list_wilayah(
    provinsi: str | None = None,
    aktif: str | None = None,
    db: AsyncSession = Depends(get_db),
):
    q = select(MasterWilayah).order_by(MasterWilayah.provinsi, MasterWilayah.nama_wilayah)
    if provinsi:
        q = q.where(MasterWilayah.provinsi == provinsi)
    if aktif is not None:
        q = q.where(MasterWilayah.aktif == (aktif.lower() == "true"))
    rows = (await db.execute(q)).scalars().all()
    return [
        {
            "id": r.id,
            "kode_wilayah": r.kode_wilayah,
            "nama_wilayah": r.nama_wilayah,
            "provinsi": r.provinsi,
            "pic": r.pic,
            "aktif": r.aktif,
            "created_at": r.created_at.isoformat() if r.created_at else None,
        }
        for r in rows
    ]


@router.get("/stats/")
async def wilayah_stats(db: AsyncSession = Depends(get_db)):
    total_aktif = (await db.execute(
        select(func.count(MasterWilayah.id)).where(MasterWilayah.aktif == True)
    )).scalar() or 0

    by_provinsi = (await db.execute(
        select(MasterWilayah.provinsi, func.count(MasterWilayah.id))
        .where(MasterWilayah.aktif == True)
        .group_by(MasterWilayah.provinsi)
    )).all()

    return {
        "total_aktif": total_aktif,
        "by_provinsi": {k: v for k, v in by_provinsi},
    }


@router.get("/{id}/")
async def get_wilayah(id: int, db: AsyncSession = Depends(get_db)):
    row = (await db.execute(select(MasterWilayah).where(MasterWilayah.id == id))).scalar_one_or_none()
    if not row:
        raise HTTPException(status_code=404, detail="Wilayah tidak ditemukan")
    return {
        "id": row.id,
        "kode_wilayah": row.kode_wilayah,
        "nama_wilayah": row.nama_wilayah,
        "provinsi": row.provinsi,
        "pic": row.pic,
        "aktif": row.aktif,
        "created_at": row.created_at.isoformat() if row.created_at else None,
    }


@router.post("/", status_code=201)
async def create_wilayah(body: dict, db: AsyncSession = Depends(get_db)):
    existing = (await db.execute(
        select(MasterWilayah).where(MasterWilayah.kode_wilayah == body["kode_wilayah"].upper())
    )).scalar_one_or_none()
    if existing:
        raise HTTPException(status_code=400, detail="Kode wilayah sudah ada")

    row = MasterWilayah(
        kode_wilayah=body["kode_wilayah"].upper(),
        nama_wilayah=body["nama_wilayah"],
        provinsi=body["provinsi"],
        pic=body.get("pic", ""),
        aktif=body.get("aktif", True),
    )
    db.add(row)
    await db.commit()
    await db.refresh(row)
    return {
        "id": row.id,
        "kode_wilayah": row.kode_wilayah,
        "nama_wilayah": row.nama_wilayah,
        "provinsi": row.provinsi,
        "pic": row.pic,
        "aktif": row.aktif,
        "created_at": row.created_at.isoformat() if row.created_at else None,
    }


@router.put("/{id}/")
async def update_wilayah(id: int, body: dict, db: AsyncSession = Depends(get_db)):
    row = (await db.execute(select(MasterWilayah).where(MasterWilayah.id == id))).scalar_one_or_none()
    if not row:
        raise HTTPException(status_code=404, detail="Wilayah tidak ditemukan")

    for key in ["kode_wilayah", "nama_wilayah", "provinsi", "pic"]:
        if key in body:
            val = body[key].upper() if key == "kode_wilayah" else body[key]
            setattr(row, key, val)

    await db.commit()
    await db.refresh(row)
    return {
        "id": row.id,
        "kode_wilayah": row.kode_wilayah,
        "nama_wilayah": row.nama_wilayah,
        "provinsi": row.provinsi,
        "pic": row.pic,
        "aktif": row.aktif,
        "created_at": row.created_at.isoformat() if row.created_at else None,
    }


@router.patch("/{id}/toggle/")
async def toggle_wilayah(id: int, db: AsyncSession = Depends(get_db)):
    row = (await db.execute(select(MasterWilayah).where(MasterWilayah.id == id))).scalar_one_or_none()
    if not row:
        raise HTTPException(status_code=404, detail="Wilayah tidak ditemukan")

    row.aktif = not row.aktif
    await db.commit()
    await db.refresh(row)
    return {"id": row.id, "aktif": row.aktif}


@router.delete("/{id}/")
async def delete_wilayah(id: int, db: AsyncSession = Depends(get_db)):
    row = (await db.execute(select(MasterWilayah).where(MasterWilayah.id == id))).scalar_one_or_none()
    if not row:
        raise HTTPException(status_code=404, detail="Wilayah tidak ditemukan")
    await db.delete(row)
    await db.commit()
    return {"ok": True}
