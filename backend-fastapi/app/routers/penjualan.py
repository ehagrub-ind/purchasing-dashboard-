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


@router.get("/stok/")
async def get_stok(db: AsyncSession = Depends(get_db)):
    """Stok per jenis bahan = total beli - total jual."""
    rows = (await db.execute(text("""
        SELECT
            p.jenis,
            COALESCE(p.total_beli_kg, 0) as total_beli,
            COALESCE(p.avg_harga, 0) as avg_harga,
            COALESCE(p.last_harga, 0) as last_harga,
            COALESCE(j.total_jual_kg, 0) as total_jual,
            COALESCE(p.total_beli_kg, 0) - COALESCE(j.total_jual_kg, 0) as stok_kg
        FROM (
            SELECT jenis,
                SUM(qty) as total_beli_kg,
                ROUND(AVG(price)::numeric, 2) as avg_harga,
                (ARRAY_AGG(price ORDER BY date DESC))[1] as last_harga
            FROM purchases
            GROUP BY jenis
        ) p
        LEFT JOIN (
            SELECT jenis, SUM(qty) as total_jual_kg
            FROM penjualan
            GROUP BY jenis
        ) j ON j.jenis = p.jenis
        ORDER BY stok_kg DESC
    """))).mappings().all()
    return {"data": [dict(r) for r in rows]}


@router.get("/harga-bahan/")
async def harga_bahan(db: AsyncSession = Depends(get_db)):
    """Kontrol harga bahan baku: rate/kg per supplier per jenis = total / qty."""
    rows = (await db.execute(text("""
        SELECT
            p.jenis,
            s.name as supplier,
            SUM(p.qty) as total_kg,
            SUM(p.total) as total_nilai,
            ROUND((SUM(p.total) / NULLIF(SUM(p.qty), 0))::numeric, 2) as rate_per_kg,
            MIN(p.price) as harga_min,
            MAX(p.price) as harga_max,
            (ARRAY_AGG(p.price ORDER BY p.date DESC))[1] as harga_terakhir,
            COUNT(*)::int as jumlah_transaksi,
            MAX(p.date) as tanggal_terakhir,
            p.currency
        FROM purchases p
        JOIN suppliers s ON s.id = p.supplier_id
        GROUP BY p.jenis, s.name, p.currency
        ORDER BY p.jenis, rate_per_kg ASC
    """))).mappings().all()

    summary = (await db.execute(text("""
        SELECT
            p.jenis,
            SUM(p.qty) as total_kg,
            SUM(p.total) as total_nilai,
            ROUND((SUM(p.total) / NULLIF(SUM(p.qty), 0))::numeric, 2) as avg_rate,
            MIN(p.price) as harga_min,
            MAX(p.price) as harga_max,
            COUNT(DISTINCT p.supplier_id)::int as jumlah_supplier
        FROM purchases p
        GROUP BY p.jenis
        ORDER BY avg_rate DESC
    """))).mappings().all()

    return {
        "detail": [dict(r) for r in rows],
        "summary": [dict(r) for r in summary],
    }


@router.post("/", status_code=201)
async def create_penjualan(body: dict, db: AsyncSession = Depends(get_db)):
    qty = float(body.get("qty", 0))
    margin_pct = float(body.get("margin_pct", MARGIN_DEFAULT))
    jenis = body.get("jenis", "")

    if qty <= 0 or not jenis:
        raise HTTPException(400, "Qty dan jenis harus diisi")

    harga_beli = float(body.get("harga_beli", 0))

    if harga_beli <= 0:
        row = (await db.execute(text(
            "SELECT price FROM purchases WHERE jenis = :j ORDER BY date DESC LIMIT 1"
        ), {"j": jenis})).mappings().first()
        if row:
            harga_beli = float(row["price"])
        else:
            raise HTTPException(400, "Harga beli tidak ditemukan, input manual")

    stok_row = (await db.execute(text("""
        SELECT COALESCE(SUM(qty), 0) as beli FROM purchases WHERE jenis = :j
    """), {"j": jenis})).mappings().first()
    jual_row = (await db.execute(text("""
        SELECT COALESCE(SUM(qty), 0) as jual FROM penjualan WHERE jenis = :j
    """), {"j": jenis})).mappings().first()
    stok = float(stok_row["beli"]) - float(jual_row["jual"])

    if qty > stok:
        raise HTTPException(400, f"Stok {jenis} tidak cukup. Tersedia: {stok:.1f} kg, diminta: {qty:.1f} kg")

    harga_jual = harga_beli * (1 + margin_pct / 100)
    total = qty * harga_jual

    row = Penjualan(
        date=datetime.fromisoformat(body["tanggal"]) if body.get("tanggal") else datetime.utcnow(),
        customer=body.get("customer", "PT Indo Hair Corp"),
        jenis=jenis,
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
            "jenis": row.jenis, "qty": row.qty, "harga_beli": row.harga_beli,
            "harga_jual": row.harga_jual, "total": row.total, "status": row.status}


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
