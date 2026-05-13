import hashlib

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from ..database import get_db
from ..models import UserTeam

router = APIRouter()

SECRET = "ihc-purchasing-2026"


def _hash_password(plain: str) -> str:
    return hashlib.sha256(f"{SECRET}:{plain}".encode()).hexdigest()


def _row(r):
    return {
        "id": r.id,
        "nama": r.nama,
        "email": r.email,
        "telepon": r.telepon,
        "role": r.role,
        "aktif": r.aktif,
        "created_at": r.created_at.isoformat() if r.created_at else None,
    }


@router.get("/")
async def list_users(db: AsyncSession = Depends(get_db)):
    rows = (await db.execute(select(UserTeam).order_by(UserTeam.id))).scalars().all()
    return [_row(r) for r in rows]


@router.get("/{id}/")
async def get_user(id: int, db: AsyncSession = Depends(get_db)):
    row = (await db.execute(select(UserTeam).where(UserTeam.id == id))).scalar_one_or_none()
    if not row:
        raise HTTPException(status_code=404, detail="User tidak ditemukan")
    return _row(row)


@router.post("/", status_code=201)
async def create_user(body: dict, db: AsyncSession = Depends(get_db)):
    existing = (await db.execute(
        select(UserTeam).where(UserTeam.email == body["email"].lower().strip())
    )).scalar_one_or_none()
    if existing:
        raise HTTPException(status_code=400, detail="Email sudah terdaftar")

    password = body.get("password", "")
    row = UserTeam(
        nama=body["nama"],
        email=body["email"].lower().strip(),
        password_hash=_hash_password(password) if password else "",
        telepon=body.get("telepon", ""),
        role=body.get("role", "PIC"),
        aktif=body.get("aktif", True),
    )
    db.add(row)
    await db.commit()
    await db.refresh(row)
    return _row(row)


@router.put("/{id}/")
async def update_user(id: int, body: dict, db: AsyncSession = Depends(get_db)):
    row = (await db.execute(select(UserTeam).where(UserTeam.id == id))).scalar_one_or_none()
    if not row:
        raise HTTPException(status_code=404, detail="User tidak ditemukan")
    for key in ["nama", "email", "telepon", "role"]:
        if key in body:
            val = body[key].lower().strip() if key == "email" else body[key]
            setattr(row, key, val)
    if body.get("password"):
        row.password_hash = _hash_password(body["password"])
    await db.commit()
    await db.refresh(row)
    return _row(row)


@router.patch("/{id}/toggle/")
async def toggle_user(id: int, db: AsyncSession = Depends(get_db)):
    row = (await db.execute(select(UserTeam).where(UserTeam.id == id))).scalar_one_or_none()
    if not row:
        raise HTTPException(status_code=404, detail="User tidak ditemukan")
    row.aktif = not row.aktif
    await db.commit()
    await db.refresh(row)
    return {"id": row.id, "aktif": row.aktif}


@router.post("/{id}/reset-password/")
async def reset_password(id: int, body: dict, db: AsyncSession = Depends(get_db)):
    row = (await db.execute(select(UserTeam).where(UserTeam.id == id))).scalar_one_or_none()
    if not row:
        raise HTTPException(status_code=404, detail="User tidak ditemukan")
    new_pw = body.get("password", "")
    if not new_pw or len(new_pw) < 6:
        raise HTTPException(status_code=400, detail="Password minimal 6 karakter")
    row.password_hash = _hash_password(new_pw)
    await db.commit()
    return {"ok": True, "message": f"Password {row.nama} berhasil direset"}


@router.delete("/{id}/")
async def delete_user(id: int, db: AsyncSession = Depends(get_db)):
    row = (await db.execute(select(UserTeam).where(UserTeam.id == id))).scalar_one_or_none()
    if not row:
        raise HTTPException(status_code=404, detail="User tidak ditemukan")
    await db.delete(row)
    await db.commit()
    return {"ok": True}
