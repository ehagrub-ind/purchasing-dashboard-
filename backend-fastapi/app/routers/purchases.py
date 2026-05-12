import math
from datetime import datetime
from fastapi import APIRouter, Depends, Query
from sqlalchemy import select, func, text
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from ..database import get_db
from ..models import Purchase, Supplier, Petani

router = APIRouter()


@router.get("/")
async def list_purchases(
    wilayah: str | None = None,
    kategori: str | None = None,
    jenis: str | None = None,
    supplier: int | None = None,
    page: int = Query(1, ge=1),
    limit: int = Query(50, ge=1, le=1000),
    db: AsyncSession = Depends(get_db),
):
    q = select(Purchase).options(selectinload(Purchase.supplier))
    c = select(func.count(Purchase.id))

    if wilayah:
        q = q.where(Purchase.wilayah == wilayah)
        c = c.where(Purchase.wilayah == wilayah)
    if kategori:
        q = q.where(Purchase.kategori == kategori)
        c = c.where(Purchase.kategori == kategori)
    if jenis:
        q = q.where(Purchase.jenis == jenis)
        c = c.where(Purchase.jenis == jenis)
    if supplier:
        q = q.where(Purchase.supplier_id == supplier)
        c = c.where(Purchase.supplier_id == supplier)

    total = (await db.execute(c)).scalar() or 0
    rows = (await db.execute(
        q.order_by(Purchase.date.desc()).offset((page - 1) * limit).limit(limit)
    )).scalars().all()

    return {
        "data": [
            {
                "id": p.id, "date": p.date.isoformat(), "supplier_id": p.supplier_id,
                "wilayah": p.wilayah, "deskripsi": p.deskripsi, "jenis": p.jenis,
                "petani": getattr(p, "petani", "") or "",
                "qty": p.qty, "price": p.price, "total": p.total, "kategori": p.kategori,
                "currency": getattr(p, "currency", "IDR") or "IDR",
                "supplier": {"name": p.supplier.name} if p.supplier else None,
            }
            for p in rows
        ],
        "pagination": {
            "page": page, "limit": limit, "total": total,
            "pages": math.ceil(total / limit) if total else 0,
        },
    }


@router.get("/stats")
async def purchase_stats(db: AsyncSession = Depends(get_db)):
    by_supplier = (await db.execute(text("""
        SELECT s.name as supplier, p.wilayah, p.kategori,
            SUM(p.qty) as total_kg, SUM(p.total) as total_nilai, COUNT(*)::int as count
        FROM purchases p JOIN suppliers s ON s.id = p.supplier_id
        GROUP BY s.name, p.wilayah, p.kategori ORDER BY s.name, p.kategori
    """))).mappings().all()

    by_month = (await db.execute(text("""
        SELECT TO_CHAR(date, 'YYYY-MM') as bulan, wilayah,
            SUM(qty) as total_kg, SUM(total) as total_nilai
        FROM purchases GROUP BY TO_CHAR(date, 'YYYY-MM'), wilayah ORDER BY bulan, wilayah
    """))).mappings().all()

    return {"by_supplier": [dict(r) for r in by_supplier], "by_month": [dict(r) for r in by_month]}


@router.delete("/all/")
async def delete_all_purchases(db: AsyncSession = Depends(get_db)):
    from sqlalchemy import delete as sql_delete
    count = (await db.execute(select(func.count(Purchase.id)))).scalar() or 0
    await db.execute(sql_delete(Purchase))
    await db.commit()
    return {"deleted": count}


@router.post("/", status_code=201)
async def create_purchase(body: dict, db: AsyncSession = Depends(get_db)):
    qty = float(body["qty"])
    price = float(body["price"])
    petani_nama = (body.get("petani") or "").strip()
    supplier_id = int(body["supplierId"])

    if petani_nama:
        existing = (await db.execute(
            select(Petani).where(Petani.nama == petani_nama, Petani.supplier_id == supplier_id)
        )).scalar_one_or_none()
        if not existing:
            db.add(Petani(nama=petani_nama, supplier_id=supplier_id, wilayah=body.get("wilayah", "")))

    p = Purchase(
        date=datetime.fromisoformat(body["date"]),
        supplier_id=supplier_id,
        wilayah=body["wilayah"],
        deskripsi=body.get("deskripsi", f"{body['jenis']} {body['kategori']}"),
        petani=petani_nama,
        jenis=body["jenis"],
        qty=qty, price=price, total=qty * price,
        kategori=body["kategori"],
        currency=body.get("currency", "IDR"),
    )
    db.add(p)
    await db.commit()
    await db.refresh(p, ["supplier"])
    return {
        "id": p.id, "date": p.date.isoformat(), "supplier_id": p.supplier_id,
        "wilayah": p.wilayah, "deskripsi": p.deskripsi, "jenis": p.jenis,
        "petani": p.petani or "",
        "qty": p.qty, "price": p.price, "total": p.total, "kategori": p.kategori,
        "currency": p.currency,
        "supplier": {"name": p.supplier.name} if p.supplier else None,
    }
