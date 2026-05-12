from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select, text
from sqlalchemy.ext.asyncio import AsyncSession

from ..database import get_db
from ..models import Penjualan

router = APIRouter()

MARGIN_DEFAULT = 5.0


@router.get("/")
async def list_penjualan(status: str | None = None, db: AsyncSession = Depends(get_db)):
    q = select(Penjualan).order_by(Penjualan.date.desc())
    if status:
        q = q.where(Penjualan.status == status)
    rows = (await db.execute(q)).scalars().all()
    return {
        "data": [
            {"id": r.id, "date": r.date.isoformat(), "customer": r.customer,
             "jenis": r.jenis, "kategori": r.kategori, "qty": r.qty,
             "harga_beli": r.harga_beli, "margin_pct": r.margin_pct,
             "harga_jual": r.harga_jual, "total": r.total,
             "terbayar": r.terbayar, "status": r.status, "keterangan": r.keterangan}
            for r in rows
        ]
    }


@router.get("/stats/")
async def penjualan_stats(db: AsyncSession = Depends(get_db)):
    row = (await db.execute(text("""
        SELECT
            COUNT(*)::int as total_transaksi,
            COALESCE(SUM(total), 0) as total_penjualan,
            COALESCE(SUM(terbayar), 0) as total_terbayar,
            COALESCE(SUM(total), 0) - COALESCE(SUM(terbayar), 0) as sisa_piutang,
            COALESCE(SUM(total - (harga_beli * qty)), 0) as total_margin,
            COALESCE(SUM(qty), 0) as total_kg
        FROM penjualan
    """))).mappings().first()
    return dict(row) if row else {}


@router.post("/", status_code=201)
async def create_penjualan(body: dict, db: AsyncSession = Depends(get_db)):
    qty = float(body.get("qty", 0))
    harga_beli = float(body.get("harga_beli", 0))
    margin_pct = float(body.get("margin_pct", MARGIN_DEFAULT))

    if qty <= 0 or harga_beli <= 0:
        raise HTTPException(400, "Qty dan harga beli harus lebih dari 0")

    harga_jual = harga_beli * (1 + margin_pct / 100)
    total = qty * harga_jual

    row = Penjualan(
        date=datetime.fromisoformat(body["tanggal"]) if body.get("tanggal") else datetime.utcnow(),
        customer=body.get("customer", "PT Indo Hair Corp"),
        jenis=body.get("jenis", ""),
        kategori=body.get("kategori", "Bahan Baku"),
        qty=qty,
        harga_beli=harga_beli,
        margin_pct=margin_pct,
        harga_jual=harga_jual,
        total=total,
        terbayar=0,
        status="belum_lunas",
        keterangan=body.get("keterangan", ""),
    )
    db.add(row)
    await db.commit()
    await db.refresh(row)
    return {"id": row.id, "date": row.date.isoformat(), "customer": row.customer,
            "jenis": row.jenis, "qty": row.qty, "harga_jual": row.harga_jual,
            "total": row.total, "status": row.status}


@router.post("/{sale_id}/bayar/", status_code=200)
async def bayar_penjualan(sale_id: int, body: dict, db: AsyncSession = Depends(get_db)):
    row = (await db.execute(select(Penjualan).where(Penjualan.id == sale_id))).scalar_one_or_none()
    if not row:
        raise HTTPException(404, "Data tidak ditemukan")

    nominal = float(body.get("nominal", 0))
    if nominal <= 0:
        raise HTTPException(400, "Nominal harus lebih dari 0")

    row.terbayar = min(row.terbayar + nominal, row.total)
    row.status = "lunas" if row.terbayar >= row.total else "belum_lunas"
    await db.commit()
    return {"id": row.id, "terbayar": row.terbayar, "status": row.status, "sisa": row.total - row.terbayar}


@router.delete("/{sale_id}/", status_code=200)
async def delete_penjualan(sale_id: int, db: AsyncSession = Depends(get_db)):
    row = (await db.execute(select(Penjualan).where(Penjualan.id == sale_id))).scalar_one_or_none()
    if not row:
        raise HTTPException(404, "Data tidak ditemukan")
    await db.delete(row)
    await db.commit()
    return {"ok": True}
