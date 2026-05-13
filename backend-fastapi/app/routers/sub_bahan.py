from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from ..database import get_db
from ..models import SubBahan, MasterBahan

router = APIRouter()


def _row_dict(r, bahan_nama: str = ""):
    return {
        "id": r.id,
        "kode_sub": r.kode_sub,
        "nama_sub": r.nama_sub,
        "bahan_id": r.bahan_id,
        "bahan_nama": bahan_nama,
        "satuan": r.satuan,
        "harga_standar": r.harga_standar,
        "aktif": r.aktif,
        "catatan": r.catatan,
        "created_at": r.created_at.isoformat() if r.created_at else None,
    }


@router.get("/")
async def list_sub_bahan(
    bahan_id: int | None = None,
    aktif: str | None = None,
    db: AsyncSession = Depends(get_db),
):
    q = (
        select(SubBahan, MasterBahan.nama_bahan)
        .outerjoin(MasterBahan, SubBahan.bahan_id == MasterBahan.id)
        .order_by(MasterBahan.nama_bahan, SubBahan.nama_sub)
    )
    if bahan_id:
        q = q.where(SubBahan.bahan_id == bahan_id)
    if aktif is not None:
        q = q.where(SubBahan.aktif == (aktif.lower() == "true"))
    rows = (await db.execute(q)).all()
    return [_row_dict(r[0], r[1] or "") for r in rows]


@router.get("/stats/")
async def sub_bahan_stats(db: AsyncSession = Depends(get_db)):
    total = (await db.execute(select(func.count(SubBahan.id)))).scalar() or 0
    total_aktif = (await db.execute(
        select(func.count(SubBahan.id)).where(SubBahan.aktif == True)
    )).scalar() or 0

    by_bahan = (await db.execute(
        select(MasterBahan.nama_bahan, func.count(SubBahan.id))
        .outerjoin(MasterBahan, SubBahan.bahan_id == MasterBahan.id)
        .where(SubBahan.aktif == True)
        .group_by(MasterBahan.nama_bahan)
    )).all()

    return {
        "total": total,
        "total_aktif": total_aktif,
        "by_bahan": {k or "Lainnya": v for k, v in by_bahan},
    }


@router.post("/", status_code=201)
async def create_sub_bahan(body: dict, db: AsyncSession = Depends(get_db)):
    kode = body["kode_sub"].upper()
    existing = (await db.execute(
        select(SubBahan).where(SubBahan.kode_sub == kode)
    )).scalar_one_or_none()
    if existing:
        raise HTTPException(status_code=400, detail="Kode sub-bahan sudah ada")

    row = SubBahan(
        kode_sub=kode,
        nama_sub=body["nama_sub"],
        bahan_id=body["bahan_id"],
        satuan=body.get("satuan", "kg"),
        harga_standar=body.get("harga_standar", 0),
        catatan=body.get("catatan"),
    )
    db.add(row)
    await db.commit()
    await db.refresh(row)

    bahan = (await db.execute(select(MasterBahan.nama_bahan).where(MasterBahan.id == row.bahan_id))).scalar()
    return _row_dict(row, bahan or "")


@router.put("/{id}/")
async def update_sub_bahan(id: int, body: dict, db: AsyncSession = Depends(get_db)):
    row = (await db.execute(select(SubBahan).where(SubBahan.id == id))).scalar_one_or_none()
    if not row:
        raise HTTPException(status_code=404, detail="Sub-bahan tidak ditemukan")

    for key in ["kode_sub", "nama_sub", "bahan_id", "satuan", "harga_standar", "catatan"]:
        if key in body:
            val = body[key].upper() if key == "kode_sub" else body[key]
            setattr(row, key, val)

    await db.commit()
    await db.refresh(row)
    bahan = (await db.execute(select(MasterBahan.nama_bahan).where(MasterBahan.id == row.bahan_id))).scalar()
    return _row_dict(row, bahan or "")


@router.patch("/{id}/toggle/")
async def toggle_sub_bahan(id: int, db: AsyncSession = Depends(get_db)):
    row = (await db.execute(select(SubBahan).where(SubBahan.id == id))).scalar_one_or_none()
    if not row:
        raise HTTPException(status_code=404, detail="Sub-bahan tidak ditemukan")
    row.aktif = not row.aktif
    await db.commit()
    return {"id": row.id, "aktif": row.aktif}


@router.delete("/{id}/")
async def delete_sub_bahan(id: int, db: AsyncSession = Depends(get_db)):
    row = (await db.execute(select(SubBahan).where(SubBahan.id == id))).scalar_one_or_none()
    if not row:
        raise HTTPException(status_code=404, detail="Sub-bahan tidak ditemukan")
    await db.delete(row)
    await db.commit()
    return {"ok": True}
