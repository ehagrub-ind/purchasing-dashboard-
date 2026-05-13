from fastapi import APIRouter, Depends, Query
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from ..database import get_db
from ..models import ActivityLog

router = APIRouter()


async def log_activity(
    db: AsyncSession,
    user_id: int | None,
    user_nama: str,
    action: str,
    target: str = "",
    detail: str = "",
):
    """Helper to insert an activity log entry. Import from other routers."""
    entry = ActivityLog(
        user_id=user_id,
        user_nama=user_nama,
        action=action,
        target=target,
        detail=detail,
    )
    db.add(entry)
    # Don't commit here — let the caller handle commit


@router.get("/")
async def list_activity_log(
    limit: int = Query(100, ge=1, le=500),
    db: AsyncSession = Depends(get_db),
):
    rows = (await db.execute(
        select(ActivityLog).order_by(ActivityLog.created_at.desc()).limit(limit)
    )).scalars().all()

    return [
        {
            "id": r.id,
            "user_id": r.user_id,
            "user_nama": r.user_nama,
            "action": r.action,
            "target": r.target,
            "detail": r.detail,
            "created_at": r.created_at.isoformat() if r.created_at else None,
        }
        for r in rows
    ]
