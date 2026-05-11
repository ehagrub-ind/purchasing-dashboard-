import math
from fastapi import APIRouter, Depends, Query
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from ..database import get_db

router = APIRouter()


@router.get("/")
async def list_arus_kas(
    sumber: str = Query("", description="kas / pembayaran"),
    wilayah: str = Query("", description="filter wilayah"),
    date_from: str = Query("", description="YYYY-MM-DD"),
    date_to: str = Query("", description="YYYY-MM-DD"),
    page: int = Query(1, ge=1),
    limit: int = Query(50, ge=1, le=200),
    db: AsyncSession = Depends(get_db),
):
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
    offset = (page - 1) * limit
    params["limit"] = limit
    params["offset"] = offset

    count_sql = f"{base_cte} SELECT COUNT(*) as cnt FROM unified WHERE {where_clause}"
    total = (await db.execute(text(count_sql), params)).scalar() or 0

    data_sql = f"""
        {base_cte}
        SELECT * FROM unified
        WHERE {where_clause}
        ORDER BY date DESC, id DESC
        LIMIT :limit OFFSET :offset
    """
    rows = (await db.execute(text(data_sql), params)).mappings().all()

    return {
        "data": [dict(r) for r in rows],
        "pagination": {
            "page": page,
            "limit": limit,
            "total": int(total),
            "pages": math.ceil(int(total) / limit) if limit else 1,
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

    monthly = (await db.execute(text("""
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

    return {
        "total_masuk": float(combined["total_masuk"]),
        "total_keluar": float(combined["total_keluar"]),
        "saldo_bersih": float(combined["saldo_bersih"]),
        "jumlah_transaksi": int(combined["jumlah_transaksi"]),
        "operasional_total": float(operasional_total),
        "piutang_terbayar": float(piutang_terbayar),
        "by_sumber": by_sumber,
        "by_wilayah": [dict(r) for r in wil_rows],
        "monthly": [dict(r) for r in monthly],
    }
