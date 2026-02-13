from datetime import timedelta
from bson import ObjectId
from fastapi import APIRouter, HTTPException, Response
from jose import jwt, JWTError

from app.core.config import settings
from app.core.security import hash_password, verify_password, create_token, ALGO
from app.db.mongo import get_db
from app.models.user import UserCreate, UserOut, LoginRequest

router = APIRouter(tags=["auth"])

def _user_out(doc) -> UserOut:
    return UserOut(id=str(doc["_id"]), email=doc["email"])

@router.post("/auth/signup", response_model=UserOut, status_code=201)
async def signup(payload: UserCreate):
    db = get_db()
    email = payload.email.lower()

    existing = await db.users.find_one({"email": email})
    if existing:
        raise HTTPException(status_code=409, detail="Email already registered")

    doc = {"email": email, "password_hash": hash_password(payload.password)}
    res = await db.users.insert_one(doc)
    doc["_id"] = res.inserted_id
    return _user_out(doc)

@router.post("/auth/login")
async def login(payload: LoginRequest, response: Response):
    db = get_db()
    email = payload.email.lower()

    user = await db.users.find_one({"email": email})
    if not user or not verify_password(payload.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid credentials")

    user_id = str(user["_id"])
    access = create_token(
        sub=user_id,
        token_type="access",
        expires_delta=timedelta(minutes=settings.JWT_ACCESS_MINUTES),
    )
    refresh = create_token(
        sub=user_id,
        token_type="refresh",
        expires_delta=timedelta(days=settings.JWT_REFRESH_DAYS),
    )

    # httpOnly refresh cookie (server-managed)
    response.set_cookie(
        key="refresh_token",
        value=refresh,
        httponly=True,
        secure=False,      # set True in production (HTTPS)
        samesite="lax",
        max_age=settings.JWT_REFRESH_DAYS * 24 * 3600,
        path="/",
    )
    return {"access_token": access, "token_type": "bearer"}

@router.post("/auth/refresh")
async def refresh(response: Response, refresh_token: str | None = None):
    # refresh_token comes from cookie in browser; for dev/testing allow body param too
    token = refresh_token
    if token is None:
        raise HTTPException(status_code=401, detail="Missing refresh token")

    try:
        payload = jwt.decode(token, settings.JWT_SECRET, algorithms=[ALGO])
        if payload.get("type") != "refresh":
            raise HTTPException(status_code=401, detail="Invalid token type")
        user_id = payload["sub"]
    except (JWTError, KeyError):
        raise HTTPException(status_code=401, detail="Invalid refresh token")

    access = create_token(
        sub=user_id,
        token_type="access",
        expires_delta=timedelta(minutes=settings.JWT_ACCESS_MINUTES),
    )
    return {"access_token": access, "token_type": "bearer"}

@router.post("/auth/logout", status_code=204)
async def logout(response: Response):
    response.delete_cookie("refresh_token", path="/")
    return None
