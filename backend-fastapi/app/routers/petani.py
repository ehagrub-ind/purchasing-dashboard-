from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from ..database import get_db
from ..models import Petani, Supplier

router = APIRouter()


def _row_dict(r, supplier_name: str = ""):
    return {
        "id": r.id,
        "nama": r.nama,
        "supplier_id": r.supplier_id,
        "wilayah": r.wilayah,
        "aktif": r.aktif,
        "created_at": r.created_at.isoformat() if r.created_at else None,
        "supplier_name": supplier_name,
    }


@router.get("/")
async def list_petani(
    supplier_id: int | None = None,
    aktif: str | None = None,
    db: AsyncSession = Depends(get_db),
):
    q = select(Petani, Supplier.name).join(Supplier, Petani.supplier_id == Supplier.id, isouter=True).order_by(Petani.nama)
    if supplier_id:
        q = q.where(Petani.supplier_id == supplier_id)
    if aktif is not None:
        q = q.where(Petani.aktif == (aktif.lower() == "true"))
    rows = (await db.execute(q)).all()
    return [_row_dict(r[0], r[1] or "") for r in rows]


@router.get("/{id}/")
async def get_petani(id: int, db: AsyncSession = Depends(get_db)):
    result = (await db.execute(
        select(Petani, Supplier.name)
        .join(Supplier, Petani.supplier_id == Supplier.id, isouter=True)
        .where(Petani.id == id)
    )).one_or_none()
    if not result:
        raise HTTPException(status_code=404, detail="Petani tidak ditemukan")
    return _row_dict(result[0], result[1] or "")


@router.post("/", status_code=201)
async def create_petani(body: dict, db: AsyncSession = Depends(get_db)):
    row = Petani(
        nama=body["nama"],
        supplier_id=body["supplier_id"],
        wilayah=body.get("wilayah", ""),
        aktif=body.get("aktif", True),
    )
    db.add(row)
    await db.commit()
    await db.refresh(row)

    supplier = (await db.execute(select(Supplier.name).where(Supplier.id == row.supplier_id))).scalar_one_or_none()
    return _row_dict(row, supplier or "")


@router.put("/{id}/")
async def update_petani(id: int, body: dict, db: AsyncSession = Depends(get_db)):
    row = (await db.execute(select(Petani).where(Petani.id == id))).scalar_one_or_none()
    if not row:
        raise HTTPException(status_code=404, detail="Petani tidak ditemukan")

    for key in ["nama", "supplier_id", "wilayah"]:
        if key in body:
            setattr(row, key, body[key])

    await db.commit()
    await db.refresh(row)

    supplier = (await db.execute(select(Supplier.name).where(Supplier.id == row.supplier_id))).scalar_one_or_none()
    return _row_dict(row, supplier or "")


@router.patch("/{id}/toggle/")
async def toggle_petani(id: int, db: AsyncSession = Depends(get_db)):
    row = (await db.execute(select(Petani).where(Petani.id == id))).scalar_one_or_none()
    if not row:
        raise HTTPException(status_code=404, detail="Petani tidak ditemukan")

    row.aktif = not row.aktif
    await db.commit()
    await db.refresh(row)
    return {"id": row.id, "aktif": row.aktif}


@router.delete("/{id}/")
async def delete_petani(id: int, db: AsyncSession = Depends(get_db)):
    row = (await db.execute(select(Petani).where(Petani.id == id))).scalar_one_or_none()
    if not row:
        raise HTTPException(status_code=404, detail="Petani tidak ditemukan")
    await db.delete(row)
    await db.commit()
    return {"ok": True}
