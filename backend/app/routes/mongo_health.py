from fastapi import APIRouter, HTTPException
from app.db.mongo import get_db
from app.core.config import settings

router = APIRouter(tags=["health"])

@router.get("/mongo-health")
async def mongo_health():
    try:
        db = get_db()
        await db.command("ping")

        uri = settings.MONGODB_URI
        redacted = "..." + uri.split("@")[-1] if "@" in uri else "MISSING_AT"

        return {"mongo": "ok", "db": settings.MONGODB_DB, "uri_tail": redacted}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"{type(e).__name__}: {e}")
