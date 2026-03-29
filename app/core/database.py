from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase

from app.core.config import settings

_client: AsyncIOMotorClient | None = None
_database: AsyncIOMotorDatabase | None = None


async def connect_to_mongodb() -> None:
    """Create MongoDB connection and set up indexes."""
    global _client, _database
    _client = AsyncIOMotorClient(settings.mongodb_url)
    _database = _client[settings.database_name]
    await _create_indexes()


async def close_mongodb_connection() -> None:
    """Close MongoDB connection."""
    global _client, _database
    if _client:
        _client.close()
        _client = None
        _database = None


def get_database() -> AsyncIOMotorDatabase:
    """Get the database instance."""
    if _database is None:
        raise RuntimeError("Database not initialized. Call connect_to_mongodb() first.")
    return _database


async def _create_indexes() -> None:
    """Create indexes for efficient querying."""
    db = get_database()

    # release_versions indexes
    await db.release_versions.create_index("releaseVersion", unique=True)
    await db.release_versions.create_index([("startDate", 1), ("endDate", 1)])

    # files collection indexes
    await db.files.create_index("uniqueId", unique=True)
    await db.files.create_index("fileName")
    await db.files.create_index("releaseVersion")
    await db.files.create_index("isDeleted")
    await db.files.create_index([("fileName", 1), ("releaseVersion", 1)])

    # audit_log indexes
    await db.audit_log.create_index("action")
    await db.audit_log.create_index("fileName")
    await db.audit_log.create_index("uniqueId")
    await db.audit_log.create_index("performedBy")
    await db.audit_log.create_index("timestamp")
    await db.audit_log.create_index("releaseVersion")
