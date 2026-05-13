from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
import logging
import os

from .database import engine
from .models import Base


class _HealthAccessFilter(logging.Filter):
    def filter(self, record: logging.LogRecord) -> bool:
        try:
            return "/api/health" not in record.args[2]
        except (TypeError, IndexError, AttributeError):
            return True


logging.getLogger("uvicorn.access").addFilter(_HealthAccessFilter())
from .routers import overview, suppliers, purchases, payments, kas, operasional, fees, import_india, master_bahan, master_ukuran, master_warna, petani, wilayah, pic_master, user_team, piutang, hutang, arus_kas, auth, penjualan, activity_log


async def _ensure_columns(conn):
    """Add missing columns to existing tables without full migration tool."""
    from sqlalchemy import text, inspect as sa_inspect
    def _check(sync_conn):
        insp = sa_inspect(sync_conn)
        result = {}
        for tbl in ("suppliers", "purchases", "petani", "master_bahan", "user_team", "operasional", "fees", "penjualan"):
            result[tbl] = {c["name"] for c in insp.get_columns(tbl)} if insp.has_table(tbl) else set()
        return result
    existing = await conn.run_sync(_check)
    if existing["user_team"] and "password_hash" not in existing["user_team"]:
        await conn.execute(text("ALTER TABLE user_team ADD COLUMN password_hash VARCHAR DEFAULT ''"))
    if "pic" not in existing["suppliers"]:
        await conn.execute(text("ALTER TABLE suppliers ADD COLUMN pic VARCHAR DEFAULT ''"))
    if "jalur" not in existing["suppliers"]:
        await conn.execute(text("ALTER TABLE suppliers ADD COLUMN jalur VARCHAR DEFAULT 'Lokal'"))
    if "aktif" not in existing["suppliers"]:
        await conn.execute(text("ALTER TABLE suppliers ADD COLUMN aktif BOOLEAN DEFAULT TRUE"))
    if "petani" not in existing["purchases"]:
        await conn.execute(text("ALTER TABLE purchases ADD COLUMN petani VARCHAR DEFAULT ''"))
    if existing["petani"] and "aktif" not in existing["petani"]:
        await conn.execute(text("ALTER TABLE petani ADD COLUMN aktif BOOLEAN DEFAULT TRUE"))
    if existing["operasional"] and "date" not in existing["operasional"]:
        await conn.execute(text("ALTER TABLE operasional ADD COLUMN date TIMESTAMP DEFAULT NOW()"))
        await conn.execute(text("ALTER TABLE operasional ADD COLUMN created_at TIMESTAMP DEFAULT NOW()"))
    if existing["fees"] and "date" not in existing["fees"]:
        await conn.execute(text("ALTER TABLE fees ADD COLUMN date TIMESTAMP DEFAULT NOW()"))
    if existing["purchases"] and "currency" not in existing["purchases"]:
        await conn.execute(text("ALTER TABLE purchases ADD COLUMN currency VARCHAR DEFAULT 'IDR'"))


@asynccontextmanager
async def lifespan(app: FastAPI):
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
        await _ensure_columns(conn)
    yield
    await engine.dispose()


app = FastAPI(title="Purchasing Dashboard API", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(overview.router, prefix="/api/overview", tags=["overview"])
app.include_router(suppliers.router, prefix="/api/suppliers", tags=["suppliers"])
app.include_router(master_bahan.router, prefix="/api/master-bahan", tags=["master-bahan"])
app.include_router(master_ukuran.router, prefix="/api/master-ukuran", tags=["master-ukuran"])
app.include_router(master_warna.router, prefix="/api/master-warna", tags=["master-warna"])
app.include_router(petani.router, prefix="/api/petani", tags=["petani"])
app.include_router(wilayah.router, prefix="/api/wilayah", tags=["wilayah"])
app.include_router(pic_master.router, prefix="/api/pic", tags=["pic"])
app.include_router(purchases.router, prefix="/api/purchases", tags=["purchases"])
app.include_router(payments.router, prefix="/api/payments", tags=["payments"])
app.include_router(kas.router, prefix="/api/kas", tags=["kas"])
app.include_router(operasional.router, prefix="/api/operasional", tags=["operasional"])
app.include_router(fees.router, prefix="/api/fees", tags=["fees"])
app.include_router(import_india.router, prefix="/api/import", tags=["import"])
app.include_router(user_team.router, prefix="/api/users", tags=["users"])
app.include_router(piutang.router, prefix="/api/piutang", tags=["piutang"])
app.include_router(hutang.router, prefix="/api/hutang", tags=["hutang"])
app.include_router(arus_kas.router, prefix="/api/arus-kas", tags=["arus-kas"])
app.include_router(auth.router, prefix="/api/auth", tags=["auth"])
app.include_router(penjualan.router, prefix="/api/penjualan", tags=["penjualan"])
app.include_router(activity_log.router, prefix="/api/activity-log", tags=["activity-log"])


@app.get("/api/health")
async def health():
    return {"status": "ok"}


PUBLIC_DIR = os.path.join(os.path.dirname(__file__), "..", "public")

if os.path.isdir(PUBLIC_DIR):
    @app.middleware("http")
    async def serve_spa(request, call_next):
        path = request.url.path
        if path.startswith("/api") or path.startswith("/docs") or path.startswith("/openapi"):
            return await call_next(request)
        file_path = os.path.join(PUBLIC_DIR, path.lstrip("/"))
        if os.path.isfile(file_path):
            return FileResponse(file_path)
        index = os.path.join(PUBLIC_DIR, "index.html")
        if os.path.isfile(index):
            return FileResponse(index)
        return await call_next(request)
