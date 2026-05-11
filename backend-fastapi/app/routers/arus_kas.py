import json
import math
import os
from datetime import datetime
from fastapi import APIRouter, Depends, Query
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from ..database import get_db

router = APIRouter()

IMPORT_PATH = os.path.join(os.path.dirname(__file__), "..", "..", "data", "import_data.json")


def _load_import_payments() -> list[dict]:
    """Load import JSON and return IDR cash-flow entries (transfers + tax only).
    Converted to thousands to match DB convention."""
    if not os.path.isfile(IMPORT_PATH):
        return []
    with open(IMPORT_PATH, "r") as f:
        data = json.load(f)

    entries = []
    for i, p in enumerate(data.get("payments", [])):
        if p.get("kurs", 0) == 0:
            continue
        idr_thousands = p["idr"] / 1000
        entries.append({
            "id": 900_000 + i,
            "date": datetime.fromisoformat(p["date"]),
            "sumber": "impor",
            "deskripsi": p["desc"],
            "masuk": 0.0,
            "keluar": idr_thousands,
            "wilayah": "Impor",
            "referensi": f"Mr Islam · ${p['usd']:,.0f} · kurs {p['kurs']:,}",
        })
    return entries


def _filter_import(entries: list[dict], sumber: str, wilayah: str,
                   date_from: str, date_to: str) -> list[dict]:
    if sumber and sumber != "impor":
        return []
    if wilayah and wilayah.lower() != "impor":
        return []
    result = entries
    if date_from:
        df = datetime.fromisoformat(date_from)
        result = [e for e in result if e["date"] >= df]
    if date_to:
        dt = datetime.fromisoformat(date_to)
        result = [e for e in result if e["date"] <= dt]
    return result


@router.get("/")
async def list_arus_kas(
    sumber: str = Query("", description="kas / pembayaran / impor"),
    wilayah: str = Query("", description="filter wilayah"),
    date_from: str = Query("", description="YYYY-MM-DD"),
    date_to: str = Query("", description="YYYY-MM-DD"),
    page: int = Query(1, ge=1),
    limit: int = Query(50, ge=1, le=200),
    db: AsyncSession = Depends(get_db),
):
    import_entries = _filter_import(
        _load_import_payments(), sumber, wilayah, date_from, date_to
    )

    skip_db = sumber == "impor"

    db_rows: list[dict] = []
    if not skip_db:
        base_cte = """
            WITH unified AS (
                SELECT k.id, k.date, 'kas' AS sumber, k.deskripsi,
                       k.masuk, k.keluar, k.wilayah, '' AS referensi
                FROM kas k
                UNION ALL
                SELECT p.id, p.date, 'pembayaran' AS sumber, p.deskripsi,
                       CASE WHEN p.type='IN' THEN p.amount ELSE 0 END AS masuk,
                       CASE WHEN p.type='OUT' THEN p.amount ELSE 0 END AS keluar,
                       p.wilayah, COALESCE(s.name,'') AS referensi
                FROM payments p LEFT JOIN suppliers s ON s.id = p.supplier_id
            )
        """

        where_parts = ["1=1"]
        params: dict = {}

        if sumber:
            where_parts.append("sumber = :sumber")
            params["sumber"] = sumber.lower()
        if wilayah:
            where_parts.append("wilayah = :wilayah")
            params["wilayah"] = wilayah
        if date_from:
            where_parts.append("date::date >= :date_from::date")
            params["date_from"] = date_from
        if date_to:
            where_parts.append("date::date <= :date_to::date")
            params["date_to"] = date_to

        where_clause = " AND ".join(where_parts)

        all_sql = f"""
            {base_cte}
            SELECT * FROM unified
            WHERE {where_clause}
            ORDER BY date DESC, id DESC
        """
        rows = (await db.execute(text(all_sql), params)).mappings().all()
        db_rows = [dict(r) for r in rows]

    all_data = db_rows + [
        {**e, "date": e["date"].isoformat()} for e in import_entries
    ]

    for row in db_rows:
        if hasattr(row.get("date"), "isoformat"):
            row["date"] = row["date"].isoformat()

    all_data.sort(key=lambda r: r.get("date", ""), reverse=True)

    total = len(all_data)
    offset = (page - 1) * limit
    page_data = all_data[offset : offset + limit]

    return {
        "data": page_data,
        "pagination": {
            "page": page,
            "limit": limit,
            "total": total,
            "pages": math.ceil(total / limit) if limit else 1,
        },
    }


@router.get("/stats/")
async def arus_kas_stats(db: AsyncSession = Depends(get_db)):
    combined = (await db.execute(text("""
        SELECT
            COALESCE(SUM(masuk), 0) AS total_masuk,
            COALESCE(SUM(keluar), 0) AS total_keluar,
            COALESCE(SUM(masuk), 0) - COALESCE(SUM(keluar), 0) AS saldo_bersih,
            COUNT(*) AS jumlah_transaksi
        FROM (
            SELECT masuk, keluar FROM kas
            UNION ALL
            SELECT
                CASE WHEN type='IN' THEN amount ELSE 0 END,
                CASE WHEN type='OUT' THEN amount ELSE 0 END
            FROM payments
        ) combined
    """))).mappings().first()

    import_entries = _load_import_payments()
    impor_keluar = sum(e["keluar"] for e in import_entries)
    impor_count = len(import_entries)

    total_masuk = float(combined["total_masuk"])
    total_keluar = float(combined["total_keluar"]) + impor_keluar
    saldo_bersih = total_masuk - total_keluar
    jumlah_transaksi = int(combined["jumlah_transaksi"]) + impor_count

    operasional_total = (await db.execute(text(
        "SELECT COALESCE(SUM(jumlah), 0) AS total FROM operasional"
    ))).scalar() or 0

    piutang_terbayar = (await db.execute(text(
        "SELECT COALESCE(SUM(terbayar), 0) AS total FROM piutang"
    ))).scalar() or 0

    by_sumber = {}
    for src in ["kas", "pembayaran"]:
        if src == "kas":
            row = (await db.execute(text("""
                SELECT COALESCE(SUM(masuk),0) AS masuk,
                       COALESCE(SUM(keluar),0) AS keluar,
                       COUNT(*) AS count FROM kas
            """))).mappings().first()
        else:
            row = (await db.execute(text("""
                SELECT COALESCE(SUM(CASE WHEN type='IN' THEN amount ELSE 0 END),0) AS masuk,
                       COALESCE(SUM(CASE WHEN type='OUT' THEN amount ELSE 0 END),0) AS keluar,
                       COUNT(*) AS count FROM payments
            """))).mappings().first()
        by_sumber[src] = {
            "masuk": float(row["masuk"]),
            "keluar": float(row["keluar"]),
            "count": int(row["count"]),
        }

    by_sumber["impor"] = {
        "masuk": 0.0,
        "keluar": impor_keluar,
        "count": impor_count,
    }

    wil_rows = (await db.execute(text("""
        SELECT wilayah,
               COALESCE(SUM(masuk),0) AS masuk,
               COALESCE(SUM(keluar),0) AS keluar
        FROM (
            SELECT wilayah, masuk, keluar FROM kas
            UNION ALL
            SELECT wilayah,
                CASE WHEN type='IN' THEN amount ELSE 0 END,
                CASE WHEN type='OUT' THEN amount ELSE 0 END
            FROM payments
        ) u GROUP BY wilayah ORDER BY wilayah
    """))).mappings().all()

    by_wilayah = [dict(r) for r in wil_rows]
    if impor_keluar > 0:
        by_wilayah.append({"wilayah": "Impor", "masuk": 0.0, "keluar": impor_keluar})

    monthly_db = (await db.execute(text("""
        SELECT TO_CHAR(date,'YYYY-MM') AS bulan,
               COALESCE(SUM(masuk),0) AS masuk,
               COALESCE(SUM(keluar),0) AS keluar
        FROM (
            SELECT date, masuk, keluar FROM kas
            UNION ALL
            SELECT date,
                CASE WHEN type='IN' THEN amount ELSE 0 END,
                CASE WHEN type='OUT' THEN amount ELSE 0 END
            FROM payments
        ) u GROUP BY bulan ORDER BY bulan
    """))).mappings().all()

    monthly_map: dict[str, dict] = {}
    for r in monthly_db:
        monthly_map[r["bulan"]] = {"bulan": r["bulan"], "masuk": float(r["masuk"]), "keluar": float(r["keluar"])}
    for e in import_entries:
        bulan = e["date"].strftime("%Y-%m")
        if bulan not in monthly_map:
            monthly_map[bulan] = {"bulan": bulan, "masuk": 0.0, "keluar": 0.0}
        monthly_map[bulan]["keluar"] += e["keluar"]

    monthly = sorted(monthly_map.values(), key=lambda x: x["bulan"])

    return {
        "total_masuk": total_masuk,
        "total_keluar": total_keluar,
        "saldo_bersih": saldo_bersih,
        "jumlah_transaksi": jumlah_transaksi,
        "operasional_total": float(operasional_total),
        "piutang_terbayar": float(piutang_terbayar),
        "by_sumber": by_sumber,
        "by_wilayah": by_wilayah,
        "monthly": monthly,
    }
