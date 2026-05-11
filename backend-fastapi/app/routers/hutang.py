from datetime import datetime
from fastapi import APIRouter, Depends
from sqlalchemy import text, select
from sqlalchemy.ext.asyncio import AsyncSession

from ..database import get_db
from ..models import Supplier, Purchase, Payment

router = APIRouter()


@router.get("/")
async def list_hutang(db: AsyncSession = Depends(get_db)):
    """Per-supplier hutang: total pembelian - total pembayaran."""
    rows = (await db.execute(text("""
        SELECT s.id, s.name, s.wilayah, COALESCE(s.pic,'') as pic,
            COALESCE(s.jalur,'Lokal') as jalur,
            COALESCE(pur.total_beli, 0) as total_beli,
            COALESCE(pur.total_kg, 0) as total_kg,
            COALESCE(pur.jml_po, 0)::int as jml_po,
            COALESCE(pay.total_bayar, 0) as total_bayar,
            COALESCE(pay.jml_bayar, 0)::int as jml_bayar,
            COALESCE(pur.total_beli, 0) - COALESCE(pay.total_bayar, 0) as sisa_hutang,
            pur.last_purchase,
            pay.last_payment
        FROM suppliers s
        LEFT JOIN (
            SELECT supplier_id,
                SUM(total) as total_beli, SUM(qty) as total_kg,
                COUNT(*) as jml_po, MAX(date) as last_purchase
            FROM purchases GROUP BY supplier_id
        ) pur ON pur.supplier_id = s.id
        LEFT JOIN (
            SELECT supplier_id,
                SUM(amount) as total_bayar, COUNT(*) as jml_bayar,
                MAX(date) as last_payment
            FROM payments GROUP BY supplier_id
        ) pay ON pay.supplier_id = s.id
        WHERE COALESCE(pur.total_beli, 0) > 0 OR COALESCE(pay.total_bayar, 0) > 0
        ORDER BY sisa_hutang DESC
    """))).mappings().all()

    return {"data": [dict(r) for r in rows]}


@router.get("/stats/")
async def hutang_stats(db: AsyncSession = Depends(get_db)):
    row = (await db.execute(text("""
        SELECT
            COALESCE(SUM(pur.total_beli), 0) as total_beli,
            COALESCE(SUM(pay.total_bayar), 0) as total_bayar,
            COALESCE(SUM(pur.total_beli), 0) - COALESCE(SUM(pay.total_bayar), 0) as sisa_hutang,
            COUNT(DISTINCT s.id) as total_supplier
        FROM suppliers s
        LEFT JOIN (SELECT supplier_id, SUM(total) as total_beli FROM purchases GROUP BY supplier_id) pur ON pur.supplier_id = s.id
        LEFT JOIN (SELECT supplier_id, SUM(amount) as total_bayar FROM payments GROUP BY supplier_id) pay ON pay.supplier_id = s.id
        WHERE COALESCE(pur.total_beli, 0) > 0 OR COALESCE(pay.total_bayar, 0) > 0
    """))).mappings().first()

    lunas = (await db.execute(text("""
        SELECT COUNT(*) as cnt FROM (
            SELECT s.id,
                COALESCE(pur.total_beli, 0) as beli,
                COALESCE(pay.total_bayar, 0) as bayar
            FROM suppliers s
            LEFT JOIN (SELECT supplier_id, SUM(total) as total_beli FROM purchases GROUP BY supplier_id) pur ON pur.supplier_id = s.id
            LEFT JOIN (SELECT supplier_id, SUM(amount) as total_bayar FROM payments GROUP BY supplier_id) pay ON pay.supplier_id = s.id
            WHERE COALESCE(pur.total_beli, 0) > 0
        ) sub WHERE bayar >= beli
    """))).mappings().first()

    belum = (await db.execute(text("""
        SELECT COUNT(*) as cnt FROM (
            SELECT s.id,
                COALESCE(pur.total_beli, 0) as beli,
                COALESCE(pay.total_bayar, 0) as bayar
            FROM suppliers s
            LEFT JOIN (SELECT supplier_id, SUM(total) as total_beli FROM purchases GROUP BY supplier_id) pur ON pur.supplier_id = s.id
            LEFT JOIN (SELECT supplier_id, SUM(amount) as total_bayar FROM payments GROUP BY supplier_id) pay ON pay.supplier_id = s.id
            WHERE COALESCE(pur.total_beli, 0) > 0
        ) sub WHERE bayar < beli
    """))).mappings().first()

    return {
        "total_beli": float(row["total_beli"]),
        "total_bayar": float(row["total_bayar"]),
        "sisa_hutang": float(row["sisa_hutang"]),
        "total_supplier": int(row["total_supplier"]),
        "lunas_count": int(lunas["cnt"]) if lunas else 0,
        "belum_count": int(belum["cnt"]) if belum else 0,
    }


@router.get("/{supplier_id}/timeline/")
async def hutang_timeline(supplier_id: int, db: AsyncSession = Depends(get_db)):
    """Chronological purchase + payment events for a supplier."""
    supplier = (await db.execute(select(Supplier).where(Supplier.id == supplier_id))).scalar_one_or_none()
    if not supplier:
        return {"error": "not found"}

    purchases = (await db.execute(
        select(Purchase).where(Purchase.supplier_id == supplier_id).order_by(Purchase.date.asc())
    )).scalars().all()

    payments = (await db.execute(
        select(Payment).where(Payment.supplier_id == supplier_id).order_by(Payment.date.asc())
    )).scalars().all()

    events = []
    for p in purchases:
        events.append({
            "type": "pembelian", "date": p.date.isoformat(),
            "deskripsi": p.deskripsi or f"{p.jenis} {p.kategori}",
            "qty": p.qty, "nominal": p.total, "saldo_efek": p.total,
        })
    for p in payments:
        events.append({
            "type": "pembayaran", "date": p.date.isoformat(),
            "deskripsi": p.deskripsi, "qty": 0, "nominal": p.amount,
            "saldo_efek": -p.amount,
        })
    events.sort(key=lambda e: e["date"])

    running = 0.0
    for e in events:
        running += e["saldo_efek"]
        e["saldo_berjalan"] = running

    total_beli = sum(p.total for p in purchases)
    total_bayar = sum(p.amount for p in payments)

    return {
        "supplier": {"id": supplier.id, "name": supplier.name, "wilayah": supplier.wilayah},
        "total_beli": total_beli,
        "total_bayar": total_bayar,
        "sisa_hutang": total_beli - total_bayar,
        "events": events,
    }


@router.post("/{supplier_id}/bayar/", status_code=201)
async def bayar_hutang(supplier_id: int, body: dict, db: AsyncSession = Depends(get_db)):
    """Record a payment to reduce hutang to a supplier."""
    supplier = (await db.execute(select(Supplier).where(Supplier.id == supplier_id))).scalar_one_or_none()
    if not supplier:
        return {"error": "not found"}

    payment = Payment(
        date=datetime.fromisoformat(body["tanggal"]) if body.get("tanggal") else datetime.utcnow(),
        supplier_id=supplier_id,
        wilayah=supplier.wilayah,
        deskripsi=body.get("keterangan", f"Pembayaran hutang ke {supplier.name}"),
        amount=float(body["nominal"]),
        type="IN",
    )
    db.add(payment)
    await db.commit()
    await db.refresh(payment)

    return {
        "id": payment.id, "date": payment.date.isoformat(),
        "supplier_id": supplier_id, "amount": payment.amount,
        "deskripsi": payment.deskripsi,
    }
