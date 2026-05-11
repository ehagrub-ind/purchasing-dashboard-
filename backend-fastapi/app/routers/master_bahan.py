from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from ..database import get_db
from ..models import MasterBahan

router = APIRouter()


@router.get("/")
async def list_master_bahan(
    kategori: str | None = None,
    aktif: str | None = None,
    db: AsyncSession = Depends(get_db),
):
    q = select(MasterBahan).order_by(MasterBahan.kategori_bahan, MasterBahan.nama_bahan)
    if kategori:
        q = q.where(MasterBahan.kategori_bahan == kategori)
    if aktif is not None:
        q = q.where(MasterBahan.aktif == (aktif.lower() == "true"))
    rows = (await db.execute(q)).scalars().all()
    return [
        {
            "id": r.id,
            "kode_bahan": r.kode_bahan,
            "nama_bahan": r.nama_bahan,
            "kategori_bahan": r.kategori_bahan,
            "ukuran_default": r.ukuran_default,
            "satuan": r.satuan,
            "aktif": r.aktif,
            "catatan": r.catatan,
            "created_at": r.created_at.isoformat() if r.created_at else None,
        }
        for r in rows
    ]


@router.get("/stats/")
async def master_bahan_stats(db: AsyncSession = Depends(get_db)):
    total_aktif = (await db.execute(
        select(func.count(MasterBahan.id)).where(MasterBahan.aktif == True)
    )).scalar() or 0

    by_kategori = (await db.execute(
        select(MasterBahan.kategori_bahan, func.count(MasterBahan.id))
        .where(MasterBahan.aktif == True)
        .group_by(MasterBahan.kategori_bahan)
    )).all()

    return {
        "total_aktif": total_aktif,
        "by_kategori": {k: v for k, v in by_kategori},
    }


@router.get("/{id}/")
async def get_master_bahan(id: int, db: AsyncSession = Depends(get_db)):
    row = (await db.execute(select(MasterBahan).where(MasterBahan.id == id))).scalar_one_or_none()
    if not row:
        raise HTTPException(status_code=404, detail="Bahan tidak ditemukan")
    return {
        "id": row.id,
        "kode_bahan": row.kode_bahan,
        "nama_bahan": row.nama_bahan,
        "kategori_bahan": row.kategori_bahan,
        "ukuran_default": row.ukuran_default,
        "satuan": row.satuan,
        "harga_standar": row.harga_standar,
        "aktif": row.aktif,
        "catatan": row.catatan,
        "created_at": row.created_at.isoformat() if row.created_at else None,
    }


@router.post("/", status_code=201)
async def create_master_bahan(body: dict, db: AsyncSession = Depends(get_db)):
    existing = (await db.execute(
        select(MasterBahan).where(MasterBahan.kode_bahan == body["kode_bahan"].upper())
    )).scalar_one_or_none()
    if existing:
        raise HTTPException(status_code=400, detail="Kode bahan sudah ada")

    row = MasterBahan(
        kode_bahan=body["kode_bahan"].upper(),
        nama_bahan=body["nama_bahan"],
        kategori_bahan=body["kategori_bahan"],
        ukuran_default=body.get("ukuran_default"),
        satuan=body.get("satuan", "kg"),
        aktif=body.get("aktif", True),
        catatan=body.get("catatan"),
    )
    db.add(row)
    await db.commit()
    await db.refresh(row)
    return {
        "id": row.id,
        "kode_bahan": row.kode_bahan,
        "nama_bahan": row.nama_bahan,
        "kategori_bahan": row.kategori_bahan,
        "ukuran_default": row.ukuran_default,
        "satuan": row.satuan,
        "harga_standar": row.harga_standar,
        "aktif": row.aktif,
        "catatan": row.catatan,
        "created_at": row.created_at.isoformat() if row.created_at else None,
    }


@router.put("/{id}/")
async def update_master_bahan(id: int, body: dict, db: AsyncSession = Depends(get_db)):
    row = (await db.execute(select(MasterBahan).where(MasterBahan.id == id))).scalar_one_or_none()
    if not row:
        raise HTTPException(status_code=404, detail="Bahan tidak ditemukan")

    for key in ["kode_bahan", "nama_bahan", "kategori_bahan", "ukuran_default", "satuan", "catatan"]:
        if key in body:
            val = body[key].upper() if key == "kode_bahan" else body[key]
            setattr(row, key, val)

    await db.commit()
    await db.refresh(row)
    return {
        "id": row.id,
        "kode_bahan": row.kode_bahan,
        "nama_bahan": row.nama_bahan,
        "kategori_bahan": row.kategori_bahan,
        "ukuran_default": row.ukuran_default,
        "satuan": row.satuan,
        "harga_standar": row.harga_standar,
        "aktif": row.aktif,
        "catatan": row.catatan,
        "created_at": row.created_at.isoformat() if row.created_at else None,
    }


@router.patch("/{id}/toggle/")
async def toggle_master_bahan(id: int, db: AsyncSession = Depends(get_db)):
    row = (await db.execute(select(MasterBahan).where(MasterBahan.id == id))).scalar_one_or_none()
    if not row:
        raise HTTPException(status_code=404, detail="Bahan tidak ditemukan")

    row.aktif = not row.aktif
    await db.commit()
    await db.refresh(row)
    return {"id": row.id, "aktif": row.aktif}


@router.delete("/{id}/")
async def delete_master_bahan(id: int, db: AsyncSession = Depends(get_db)):
    row = (await db.execute(select(MasterBahan).where(MasterBahan.id == id))).scalar_one_or_none()
    if not row:
        raise HTTPException(status_code=404, detail="Bahan tidak ditemukan")
    await db.delete(row)
    await db.commit()
    return {"ok": True}
