from datetime import datetime, timezone

from fastapi import APIRouter, HTTPException, status

from app.core.database import get_database
from app.models.schemas import (
    ReleaseVersionCreate,
    ReleaseVersionResponse,
    ReleaseVersionUpdate,
)

router = APIRouter(prefix="/api/v1/releases", tags=["Release Versions"])


@router.post("/", response_model=ReleaseVersionResponse, status_code=status.HTTP_201_CREATED)
async def create_release_version(release: ReleaseVersionCreate):
    """Create a new release version with start and end dates."""
    db = get_database()

    if release.startDate >= release.endDate:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="startDate must be before endDate",
        )

    existing = await db.release_versions.find_one({"releaseVersion": release.releaseVersion})
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Release version '{release.releaseVersion}' already exists",
        )

    now = datetime.now(timezone.utc)
    document = {
        "releaseVersion": release.releaseVersion,
        "startDate": release.startDate,
        "endDate": release.endDate,
        "createdAt": now,
        "updatedAt": now,
    }
    await db.release_versions.insert_one(document)

    return ReleaseVersionResponse(**document)


@router.get("/", response_model=list[ReleaseVersionResponse])
async def list_release_versions():
    """List all release versions."""
    db = get_database()
    releases = await db.release_versions.find().sort("releaseVersion", 1).to_list(length=None)
    return [ReleaseVersionResponse(**r) for r in releases]


@router.get("/{release_version}", response_model=ReleaseVersionResponse)
async def get_release_version(release_version: str):
    """Get a specific release version."""
    db = get_database()
    release = await db.release_versions.find_one({"releaseVersion": release_version})
    if not release:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Release version '{release_version}' not found",
        )
    return ReleaseVersionResponse(**release)


@router.put("/{release_version}", response_model=ReleaseVersionResponse)
async def update_release_version(release_version: str, update: ReleaseVersionUpdate):
    """Update a release version's dates."""
    db = get_database()

    existing = await db.release_versions.find_one({"releaseVersion": release_version})
    if not existing:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Release version '{release_version}' not found",
        )

    update_data: dict = {"updatedAt": datetime.now(timezone.utc)}
    if update.startDate is not None:
        update_data["startDate"] = update.startDate
    if update.endDate is not None:
        update_data["endDate"] = update.endDate

    # Validate dates
    new_start = update_data.get("startDate", existing["startDate"])
    new_end = update_data.get("endDate", existing["endDate"])
    if new_start >= new_end:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="startDate must be before endDate",
        )

    await db.release_versions.update_one(
        {"releaseVersion": release_version},
        {"$set": update_data},
    )

    updated = await db.release_versions.find_one({"releaseVersion": release_version})
    return ReleaseVersionResponse(**updated)


@router.delete("/{release_version}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_release_version(release_version: str):
    """Delete a release version."""
    db = get_database()

    # Check if any files are associated with this release
    file_count = await db.files.count_documents({"releaseVersion": release_version})
    if file_count > 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot delete release version '{release_version}'. "
                   f"{file_count} file(s) are associated with it.",
        )

    result = await db.release_versions.delete_one({"releaseVersion": release_version})
    if result.deleted_count == 0:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Release version '{release_version}' not found",
        )
