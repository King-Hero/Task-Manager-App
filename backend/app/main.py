from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.routes.health import router as health_router
from app.routes.mongo_health import router as mongo_health_router
from app.routes.tasks import router as tasks_router
from app.routes.auth import router as auth_router


app = FastAPI(title="Task Manager API", version="0.1.0")

origins = [o.strip() for o in settings.CORS_ORIGINS.split(",") if o.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health_router, prefix=settings.API_PREFIX)
app.include_router(mongo_health_router, prefix=settings.API_PREFIX)
app.include_router(tasks_router, prefix=settings.API_PREFIX)
app.include_router(auth_router, prefix=settings.API_PREFIX)
