from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
import os

from .database import engine
from .models import Base
from .routers import overview, suppliers, purchases, payments, kas, operasional, fees, import_india


@asynccontextmanager
async def lifespan(app: FastAPI):
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
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
app.include_router(purchases.router, prefix="/api/purchases", tags=["purchases"])
app.include_router(payments.router, prefix="/api/payments", tags=["payments"])
app.include_router(kas.router, prefix="/api/kas", tags=["kas"])
app.include_router(operasional.router, prefix="/api/operasional", tags=["operasional"])
app.include_router(fees.router, prefix="/api/fees", tags=["fees"])
app.include_router(import_india.router, prefix="/api/import", tags=["import"])


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
