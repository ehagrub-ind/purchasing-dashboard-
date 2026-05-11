from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select, func, cast, Integer as SAInt
from sqlalchemy.ext.asyncio import AsyncSession

from ..database import get_db
from ..models import MasterUkuran

router = APIRouter()


def _row(r):
    return {
        "id": r.id,
        "kode_ukuran": r.kode_ukuran,
        "nama_ukuran": r.nama_ukuran,
        "satuan": r.satuan,
        "aktif": r.aktif,
        "created_at": r.created_at.isoformat() if r.created_at else None,
    }


@router.get("/")
async def list_ukuran(aktif: str | None = None, db: AsyncSession = Depends(get_db)):
    q = select(MasterUkuran).order_by(
        func.length(MasterUkuran.kode_ukuran),
        MasterUkuran.kode_ukuran,
    )
    if aktif is not None:
        q = q.where(MasterUkuran.aktif == (aktif.lower() == "true"))
    rows = (await db.execute(q)).scalars().all()
    return [_row(r) for r in rows]


@router.get("/{id}/")
async def get_ukuran(id: int, db: AsyncSession = Depends(get_db)):
    row = (await db.execute(select(MasterUkuran).where(MasterUkuran.id == id))).scalar_one_or_none()
    if not row:
        raise HTTPException(status_code=404, detail="Ukuran tidak ditemukan")
    return _row(row)


@router.post("/", status_code=201)
async def create_ukuran(body: dict, db: AsyncSession = Depends(get_db)):
    existing = (await db.execute(
        select(MasterUkuran).where(MasterUkuran.kode_ukuran == body["kode_ukuran"].upper())
    )).scalar_one_or_none()
    if existing:
        raise HTTPException(status_code=400, detail="Kode ukuran sudah ada")

    row = MasterUkuran(
        kode_ukuran=body["kode_ukuran"].upper(),
        nama_ukuran=body["nama_ukuran"],
        satuan=body.get("satuan", "inch"),
        aktif=body.get("aktif", True),
    )
    db.add(row)
    await db.commit()
    await db.refresh(row)
    return _row(row)


@router.post("/bulk/", status_code=201)
async def bulk_create_ukuran(body: dict, db: AsyncSession = Depends(get_db)):
    dari = body["dari"]
    sampai = body["sampai"]
    kelipatan = body["kelipatan"]
    satuan = body.get("satuan", "inch")

    existing_codes = {r.kode_ukuran for r in (await db.execute(select(MasterUkuran))).scalars().all()}

    created = []
    skipped = []
    suffix = "" if satuan == "inch" else f"-{satuan}"
    start = dari if kelipatan == 1 else ((dari + kelipatan - 1) // kelipatan) * kelipatan
    for n in range(start, sampai + 1, kelipatan):
        kode = f"{n}{suffix}"
        if kode in existing_codes:
            skipped.append(kode)
            continue
        nama = f'{n}"' if satuan == "inch" else f"{n} {satuan}"
        db.add(MasterUkuran(kode_ukuran=kode, nama_ukuran=nama, satuan=satuan))
        created.append(kode)

    if created:
        await db.commit()
    return {"created": len(created), "skipped": len(skipped), "detail": created}


@router.put("/{id}/")
async def update_ukuran(id: int, body: dict, db: AsyncSession = Depends(get_db)):
    row = (await db.execute(select(MasterUkuran).where(MasterUkuran.id == id))).scalar_one_or_none()
    if not row:
        raise HTTPException(status_code=404, detail="Ukuran tidak ditemukan")
    for key in ["kode_ukuran", "nama_ukuran", "satuan"]:
        if key in body:
            val = body[key].upper() if key == "kode_ukuran" else body[key]
            setattr(row, key, val)
    await db.commit()
    await db.refresh(row)
    return _row(row)


@router.patch("/{id}/toggle/")
async def toggle_ukuran(id: int, db: AsyncSession = Depends(get_db)):
    row = (await db.execute(select(MasterUkuran).where(MasterUkuran.id == id))).scalar_one_or_none()
    if not row:
        raise HTTPException(status_code=404, detail="Ukuran tidak ditemukan")
    row.aktif = not row.aktif
    await db.commit()
    await db.refresh(row)
    return {"id": row.id, "aktif": row.aktif}


@router.delete("/all/")
async def delete_all_ukuran(db: AsyncSession = Depends(get_db)):
    from sqlalchemy import delete
    result = await db.execute(delete(MasterUkuran))
    await db.commit()
    return {"deleted": result.rowcount}


@router.delete("/{id}/")
async def delete_ukuran(id: int, db: AsyncSession = Depends(get_db)):
    row = (await db.execute(select(MasterUkuran).where(MasterUkuran.id == id))).scalar_one_or_none()
    if not row:
        raise HTTPException(status_code=404, detail="Ukuran tidak ditemukan")
    await db.delete(row)
    await db.commit()
    return {"ok": True}
