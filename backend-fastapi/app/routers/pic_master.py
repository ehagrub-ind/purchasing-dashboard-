from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from ..database import get_db
from ..models import MasterPIC

router = APIRouter()


@router.get("/")
async def list_pic(
    aktif: str | None = None,
    db: AsyncSession = Depends(get_db),
):
    q = select(MasterPIC).order_by(MasterPIC.nama_pic)
    if aktif is not None:
        q = q.where(MasterPIC.aktif == (aktif.lower() == "true"))
    rows = (await db.execute(q)).scalars().all()
    return [
        {
            "id": r.id,
            "kode_pic": r.kode_pic,
            "nama_pic": r.nama_pic,
            "telepon": r.telepon,
            "aktif": r.aktif,
            "created_at": r.created_at.isoformat() if r.created_at else None,
        }
        for r in rows
    ]


@router.get("/{id}/")
async def get_pic(id: int, db: AsyncSession = Depends(get_db)):
    row = (await db.execute(select(MasterPIC).where(MasterPIC.id == id))).scalar_one_or_none()
    if not row:
        raise HTTPException(status_code=404, detail="PIC tidak ditemukan")
    return {
        "id": row.id,
        "kode_pic": row.kode_pic,
        "nama_pic": row.nama_pic,
        "telepon": row.telepon,
        "aktif": row.aktif,
        "created_at": row.created_at.isoformat() if row.created_at else None,
    }


@router.post("/", status_code=201)
async def create_pic(body: dict, db: AsyncSession = Depends(get_db)):
    existing = (await db.execute(
        select(MasterPIC).where(MasterPIC.kode_pic == body["kode_pic"].upper())
    )).scalar_one_or_none()
    if existing:
        raise HTTPException(status_code=400, detail="Kode PIC sudah ada")

    row = MasterPIC(
        kode_pic=body["kode_pic"].upper(),
        nama_pic=body["nama_pic"],
        telepon=body.get("telepon", ""),
        aktif=body.get("aktif", True),
    )
    db.add(row)
    await db.commit()
    await db.refresh(row)
    return {
        "id": row.id,
        "kode_pic": row.kode_pic,
        "nama_pic": row.nama_pic,
        "telepon": row.telepon,
        "aktif": row.aktif,
        "created_at": row.created_at.isoformat() if row.created_at else None,
    }


@router.put("/{id}/")
async def update_pic(id: int, body: dict, db: AsyncSession = Depends(get_db)):
    row = (await db.execute(select(MasterPIC).where(MasterPIC.id == id))).scalar_one_or_none()
    if not row:
        raise HTTPException(status_code=404, detail="PIC tidak ditemukan")

    for key in ["kode_pic", "nama_pic", "telepon"]:
        if key in body:
            val = body[key].upper() if key == "kode_pic" else body[key]
            setattr(row, key, val)

    await db.commit()
    await db.refresh(row)
    return {
        "id": row.id,
        "kode_pic": row.kode_pic,
        "nama_pic": row.nama_pic,
        "telepon": row.telepon,
        "aktif": row.aktif,
        "created_at": row.created_at.isoformat() if row.created_at else None,
    }


@router.patch("/{id}/toggle/")
async def toggle_pic(id: int, db: AsyncSession = Depends(get_db)):
    row = (await db.execute(select(MasterPIC).where(MasterPIC.id == id))).scalar_one_or_none()
    if not row:
        raise HTTPException(status_code=404, detail="PIC tidak ditemukan")

    row.aktif = not row.aktif
    await db.commit()
    await db.refresh(row)
    return {"id": row.id, "aktif": row.aktif}


@router.delete("/{id}/")
async def delete_pic(id: int, db: AsyncSession = Depends(get_db)):
    row = (await db.execute(select(MasterPIC).where(MasterPIC.id == id))).scalar_one_or_none()
    if not row:
        raise HTTPException(status_code=404, detail="PIC tidak ditemukan")
    await db.delete(row)
    await db.commit()
    return {"ok": True}
