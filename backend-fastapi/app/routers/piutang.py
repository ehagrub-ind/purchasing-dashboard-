from datetime import datetime
from fastapi import APIRouter, Depends, Query
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from ..database import get_db
from ..models import Piutang

router = APIRouter()


def _row(r: Piutang) -> dict:
    return {
        "id": r.id,
        "tanggal": r.tanggal.isoformat(),
        "jatuh_tempo": r.jatuh_tempo.isoformat(),
        "pelanggan": r.pelanggan,
        "keterangan": r.keterangan,
        "jumlah": r.jumlah,
        "terbayar": r.terbayar,
        "sisa": r.jumlah - r.terbayar,
        "status": r.status,
        "wilayah": r.wilayah,
        "kategori": r.kategori,
        "created_at": r.created_at.isoformat() if r.created_at else None,
    }


@router.get("/")
async def list_piutang(
    status: str | None = None,
    wilayah: str | None = None,
    kategori: str | None = None,
    db: AsyncSession = Depends(get_db),
):
    q = select(Piutang).order_by(Piutang.jatuh_tempo.asc())
    if status:
        q = q.where(Piutang.status == status)
    if wilayah:
        q = q.where(Piutang.wilayah == wilayah)
    if kategori:
        q = q.where(Piutang.kategori == kategori)

    rows = (await db.execute(q)).scalars().all()
    return {"data": [_row(r) for r in rows]}


@router.get("/stats/")
async def piutang_stats(db: AsyncSession = Depends(get_db)):
    rows = (await db.execute(select(Piutang))).scalars().all()
    total = sum(r.jumlah for r in rows)
    terbayar = sum(r.terbayar for r in rows)
    sisa = total - terbayar

    now = datetime.utcnow()
    jatuh_tempo_count = sum(1 for r in rows if r.status != "lunas" and r.jatuh_tempo < now)

    by_status = {}
    for r in rows:
        by_status.setdefault(r.status, {"count": 0, "jumlah": 0})
        by_status[r.status]["count"] += 1
        by_status[r.status]["jumlah"] += r.jumlah

    by_kategori = {}
    for r in rows:
        by_kategori.setdefault(r.kategori, {"count": 0, "jumlah": 0})
        by_kategori[r.kategori]["count"] += 1
        by_kategori[r.kategori]["jumlah"] += r.jumlah

    return {
        "total_piutang": total,
        "total_terbayar": terbayar,
        "total_sisa": sisa,
        "jatuh_tempo_count": jatuh_tempo_count,
        "count": len(rows),
        "by_status": by_status,
        "by_kategori": by_kategori,
    }


@router.get("/{pid}/")
async def get_piutang(pid: int, db: AsyncSession = Depends(get_db)):
    row = (await db.execute(select(Piutang).where(Piutang.id == pid))).scalar_one_or_none()
    if not row:
        return {"error": "not found"}
    return _row(row)


@router.post("/", status_code=201)
async def create_piutang(body: dict, db: AsyncSession = Depends(get_db)):
    row = Piutang(
        tanggal=datetime.fromisoformat(body["tanggal"]) if body.get("tanggal") else datetime.utcnow(),
        jatuh_tempo=datetime.fromisoformat(body["jatuh_tempo"]),
        pelanggan=body["pelanggan"],
        keterangan=body.get("keterangan", ""),
        jumlah=float(body["jumlah"]),
        terbayar=float(body.get("terbayar", 0)),
        status=body.get("status", "belum_lunas"),
        wilayah=body.get("wilayah", ""),
        kategori=body.get("kategori", "Lainnya"),
    )
    db.add(row)
    await db.commit()
    await db.refresh(row)
    return _row(row)


@router.put("/{pid}/", status_code=200)
async def update_piutang(pid: int, body: dict, db: AsyncSession = Depends(get_db)):
    row = (await db.execute(select(Piutang).where(Piutang.id == pid))).scalar_one_or_none()
    if not row:
        return {"error": "not found"}
    for key in ("pelanggan", "keterangan", "wilayah", "kategori", "status"):
        if key in body:
            setattr(row, key, body[key])
    if "jumlah" in body:
        row.jumlah = float(body["jumlah"])
    if "terbayar" in body:
        row.terbayar = float(body["terbayar"])
    if "tanggal" in body:
        row.tanggal = datetime.fromisoformat(body["tanggal"])
    if "jatuh_tempo" in body:
        row.jatuh_tempo = datetime.fromisoformat(body["jatuh_tempo"])
    await db.commit()
    await db.refresh(row)
    return _row(row)


@router.post("/{pid}/bayar/", status_code=200)
async def bayar_piutang(pid: int, body: dict, db: AsyncSession = Depends(get_db)):
    row = (await db.execute(select(Piutang).where(Piutang.id == pid))).scalar_one_or_none()
    if not row:
        return {"error": "not found"}
    nominal = float(body["nominal"])
    row.terbayar = row.terbayar + nominal
    if row.terbayar >= row.jumlah:
        row.terbayar = row.jumlah
        row.status = "lunas"
    elif row.terbayar > 0:
        row.status = "sebagian"
    await db.commit()
    await db.refresh(row)
    return _row(row)


@router.delete("/{pid}/")
async def delete_piutang(pid: int, db: AsyncSession = Depends(get_db)):
    row = (await db.execute(select(Piutang).where(Piutang.id == pid))).scalar_one_or_none()
    if not row:
        return {"error": "not found"}
    await db.delete(row)
    await db.commit()
    return {"ok": True}
