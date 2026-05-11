from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import text, select
from sqlalchemy.ext.asyncio import AsyncSession

from ..database import get_db
from ..models import Supplier, Purchase, Payment

router = APIRouter()


@router.get("/")
async def list_suppliers(db: AsyncSession = Depends(get_db)):
    rows = (await db.execute(text("""
        SELECT s.id, s.name, s.wilayah, COALESCE(s.pic, '') as pic, COALESCE(s.jalur, 'Lokal') as jalur,
            COALESCE(p.total_kg,0) as total_kg, COALESCE(p.total_nilai,0) as total_nilai,
            COALESCE(p.total_transaksi,0)::int as total_transaksi,
            COALESCE(pi.total_masuk,0) as total_masuk, COALESCE(po.total_keluar,0) as total_keluar,
            COALESCE(pi.total_masuk,0) - COALESCE(po.total_keluar,0) as saldo
        FROM suppliers s
        LEFT JOIN (SELECT supplier_id, SUM(qty) as total_kg, SUM(total) as total_nilai, COUNT(*) as total_transaksi
                   FROM purchases GROUP BY supplier_id) p ON p.supplier_id = s.id
        LEFT JOIN (SELECT supplier_id, SUM(amount) as total_masuk FROM payments WHERE type='IN' GROUP BY supplier_id) pi ON pi.supplier_id = s.id
        LEFT JOIN (SELECT supplier_id, SUM(amount) as total_keluar FROM payments WHERE type='OUT' GROUP BY supplier_id) po ON po.supplier_id = s.id
        ORDER BY total_kg DESC
    """))).mappings().all()
    return [dict(r) for r in rows]


@router.get("/{supplier_id}/")
async def get_supplier(supplier_id: int, db: AsyncSession = Depends(get_db)):
    supplier = (await db.execute(select(Supplier).where(Supplier.id == supplier_id))).scalar_one_or_none()
    if not supplier:
        raise HTTPException(404, "Not found")

    purchases = (await db.execute(
        select(Purchase).where(Purchase.supplier_id == supplier_id).order_by(Purchase.date.desc())
    )).scalars().all()

    payments = (await db.execute(
        select(Payment).where(Payment.supplier_id == supplier_id).order_by(Payment.date.desc())
    )).scalars().all()

    by_kategori = (await db.execute(text(
        "SELECT kategori, SUM(qty) as total_kg, SUM(total) as total_nilai, COUNT(*)::int as count "
        "FROM purchases WHERE supplier_id = :sid GROUP BY kategori ORDER BY total_kg DESC"
    ), {"sid": supplier_id})).mappings().all()

    return {
        "id": supplier.id, "name": supplier.name, "wilayah": supplier.wilayah,
        "purchases": [{"id": p.id, "date": p.date.isoformat(), "wilayah": p.wilayah, "deskripsi": p.deskripsi,
                        "jenis": p.jenis, "qty": p.qty, "price": p.price, "total": p.total, "kategori": p.kategori}
                       for p in purchases],
        "payments": [{"id": p.id, "date": p.date.isoformat(), "wilayah": p.wilayah, "deskripsi": p.deskripsi,
                       "amount": p.amount, "type": p.type} for p in payments],
        "by_kategori": [dict(r) for r in by_kategori],
    }


@router.post("/", status_code=201)
async def create_supplier(body: dict, db: AsyncSession = Depends(get_db)):
    existing = (await db.execute(
        select(Supplier).where(Supplier.name == body["name"])
    )).scalar_one_or_none()
    if existing:
        raise HTTPException(status_code=400, detail="Nama supplier sudah ada")

    row = Supplier(
        name=body["name"],
        wilayah=body.get("wilayah", ""),
        pic=body.get("pic", ""),
        jalur=body.get("jalur", "Lokal"),
        aktif=body.get("aktif", True),
    )
    db.add(row)
    await db.commit()
    await db.refresh(row)
    return {
        "id": row.id,
        "name": row.name,
        "wilayah": row.wilayah,
        "pic": row.pic,
        "jalur": row.jalur,
        "aktif": row.aktif,
        "created_at": row.created_at.isoformat() if row.created_at else None,
    }


@router.put("/{supplier_id}/")
async def update_supplier(supplier_id: int, body: dict, db: AsyncSession = Depends(get_db)):
    row = (await db.execute(select(Supplier).where(Supplier.id == supplier_id))).scalar_one_or_none()
    if not row:
        raise HTTPException(status_code=404, detail="Supplier tidak ditemukan")

    for key in ["name", "wilayah", "pic", "jalur"]:
        if key in body:
            setattr(row, key, body[key])

    await db.commit()
    await db.refresh(row)
    return {
        "id": row.id,
        "name": row.name,
        "wilayah": row.wilayah,
        "pic": row.pic,
        "jalur": row.jalur,
        "aktif": row.aktif,
        "created_at": row.created_at.isoformat() if row.created_at else None,
    }


@router.patch("/{supplier_id}/toggle/")
async def toggle_supplier(supplier_id: int, db: AsyncSession = Depends(get_db)):
    row = (await db.execute(select(Supplier).where(Supplier.id == supplier_id))).scalar_one_or_none()
    if not row:
        raise HTTPException(status_code=404, detail="Supplier tidak ditemukan")

    row.aktif = not row.aktif
    await db.commit()
    await db.refresh(row)
    return {"id": row.id, "aktif": row.aktif}


@router.delete("/{supplier_id}/")
async def delete_supplier(supplier_id: int, db: AsyncSession = Depends(get_db)):
    row = (await db.execute(select(Supplier).where(Supplier.id == supplier_id))).scalar_one_or_none()
    if not row:
        raise HTTPException(status_code=404, detail="Supplier tidak ditemukan")
    await db.delete(row)
    await db.commit()
    return {"ok": True}
