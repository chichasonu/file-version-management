from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.database import close_mongodb_connection, connect_to_mongodb
from app.routes.file_routes import router as file_router
from app.routes.query_routes import router as query_router
from app.routes.release_routes import router as release_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Manage application lifecycle: connect/disconnect MongoDB."""
    await connect_to_mongodb()
    yield
    await close_mongodb_connection()


app = FastAPI(
    title="File Version Management Service",
    description=(
        "A microservice for managing file uploads with versioning, "
        "release-based validation, and comprehensive audit trails. "
        "Supports .txt and .pdf files up to 10MB."
    ),
    version="1.0.0",
    lifespan=lifespan,
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register routers
app.include_router(release_router)
app.include_router(file_router)
app.include_router(query_router)


@app.get("/", tags=["Health"])
async def root():
    """Health check endpoint."""
    return {
        "service": "File Version Management",
        "version": "1.0.0",
        "status": "running",
    }


@app.get("/health", tags=["Health"])
async def health_check():
    """Detailed health check."""
    from app.core.database import get_database

    try:
        db = get_database()
        await db.command("ping")
        db_status = "connected"
    except Exception:
        db_status = "disconnected"

    return {
        "status": "healthy" if db_status == "connected" else "degraded",
        "database": db_status,
    }
