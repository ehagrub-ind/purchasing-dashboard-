import math
from fastapi import APIRouter, Depends, Query
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from ..database import get_db
from ..models import Payment

router = APIRouter()


@router.get("/")
async def list_payments(
    wilayah: str | None = None,
    supplier: int | None = None,
    type: str | None = None,
    page: int = Query(1, ge=1),
    limit: int = Query(50, ge=1, le=200),
    db: AsyncSession = Depends(get_db),
):
    q = select(Payment).options(selectinload(Payment.supplier))
    c = select(func.count(Payment.id))

    if wilayah:
        q = q.where(Payment.wilayah == wilayah)
        c = c.where(Payment.wilayah == wilayah)
    if supplier:
        q = q.where(Payment.supplier_id == supplier)
        c = c.where(Payment.supplier_id == supplier)
    if type:
        q = q.where(Payment.type == type)
        c = c.where(Payment.type == type)

    total = (await db.execute(c)).scalar() or 0
    rows = (await db.execute(
        q.order_by(Payment.date.desc()).offset((page - 1) * limit).limit(limit)
    )).scalars().all()

    return {
        "data": [
            {
                "id": p.id, "date": p.date.isoformat(), "supplier_id": p.supplier_id,
                "wilayah": p.wilayah, "deskripsi": p.deskripsi,
                "amount": p.amount, "type": p.type,
                "supplier": {"name": p.supplier.name} if p.supplier else None,
            }
            for p in rows
        ],
        "pagination": {
            "page": page, "limit": limit, "total": total,
            "pages": math.ceil(total / limit) if total else 0,
        },
    }
