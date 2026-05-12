import hashlib
import hmac
import secrets
import time
from fastapi import APIRouter, Depends, HTTPException, Header
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from ..database import get_db
from ..models import UserTeam

router = APIRouter()

SECRET = "ihc-purchasing-2026"


def _hash_password(plain: str) -> str:
    return hashlib.sha256(f"{SECRET}:{plain}".encode()).hexdigest()


def _make_token(user_id: int, email: str) -> str:
    ts = int(time.time())
    payload = f"{user_id}:{email}:{ts}"
    sig = hmac.new(SECRET.encode(), payload.encode(), hashlib.sha256).hexdigest()[:16]
    return f"{payload}:{sig}"


def _verify_token(token: str) -> dict | None:
    parts = token.split(":")
    if len(parts) != 4:
        return None
    user_id, email, ts, sig = parts
    payload = f"{user_id}:{email}:{ts}"
    expected = hmac.new(SECRET.encode(), payload.encode(), hashlib.sha256).hexdigest()[:16]
    if not hmac.compare_digest(sig, expected):
        return None
    return {"user_id": int(user_id), "email": email}


@router.post("/login/")
async def login(body: dict, db: AsyncSession = Depends(get_db)):
    email = (body.get("email") or "").lower().strip()
    password = body.get("password") or ""

    if not email or not password:
        raise HTTPException(status_code=400, detail="Email dan password wajib diisi")

    user = (await db.execute(
        select(UserTeam).where(UserTeam.email == email, UserTeam.aktif == True)
    )).scalar_one_or_none()

    if not user:
        raise HTTPException(status_code=401, detail="Email atau password salah")

    if not user.password_hash or user.password_hash == "":
        if password == "indohair123":
            user.password_hash = _hash_password(password)
            await db.commit()
        else:
            raise HTTPException(status_code=401, detail="Email atau password salah")
    else:
        if user.password_hash != _hash_password(password):
            raise HTTPException(status_code=401, detail="Email atau password salah")

    token = _make_token(user.id, user.email)

    return {
        "token": token,
        "user": {
            "id": user.id,
            "nama": user.nama,
            "email": user.email,
            "role": user.role,
        },
    }


@router.get("/me/")
async def get_me(authorization: str = Header(""), db: AsyncSession = Depends(get_db)):
    token = authorization.replace("Bearer ", "") if authorization.startswith("Bearer ") else authorization
    if not token:
        raise HTTPException(status_code=401, detail="Token tidak ditemukan")

    data = _verify_token(token)
    if not data:
        raise HTTPException(status_code=401, detail="Token tidak valid")

    user = (await db.execute(
        select(UserTeam).where(UserTeam.id == data["user_id"], UserTeam.aktif == True)
    )).scalar_one_or_none()

    if not user:
        raise HTTPException(status_code=401, detail="User tidak ditemukan")

    return {
        "id": user.id,
        "nama": user.nama,
        "email": user.email,
        "role": user.role,
    }


@router.post("/change-password/")
async def change_password(body: dict, authorization: str = Header(""), db: AsyncSession = Depends(get_db)):
    token = authorization.replace("Bearer ", "") if authorization.startswith("Bearer ") else authorization
    data = _verify_token(token)
    if not data:
        raise HTTPException(status_code=401, detail="Token tidak valid")

    user = (await db.execute(
        select(UserTeam).where(UserTeam.id == data["user_id"])
    )).scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User tidak ditemukan")

    old_pw = body.get("old_password", "")
    new_pw = body.get("new_password", "")

    if not new_pw or len(new_pw) < 6:
        raise HTTPException(status_code=400, detail="Password baru minimal 6 karakter")

    if user.password_hash and user.password_hash != _hash_password(old_pw):
        raise HTTPException(status_code=401, detail="Password lama salah")

    user.password_hash = _hash_password(new_pw)
    await db.commit()
    return {"ok": True, "message": "Password berhasil diubah"}
