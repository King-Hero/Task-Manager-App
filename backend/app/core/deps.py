from fastapi import Header, HTTPException
from jose import jwt, JWTError

from app.core.config import settings
from app.core.security import ALGO

def get_current_user_id(authorization: str | None = Header(default=None)) -> str:
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing or invalid Authorization header")

    token = authorization.split(" ", 1)[1].strip()
    try:
        payload = jwt.decode(token, settings.JWT_SECRET, algorithms=[ALGO])
        if payload.get("type") != "access":
            raise HTTPException(status_code=401, detail="Invalid token type")
        user_id = payload.get("sub")
        if not user_id:
            raise HTTPException(status_code=401, detail="Invalid token subject")
        return user_id
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid token")
