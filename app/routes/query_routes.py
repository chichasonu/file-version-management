from fastapi import APIRouter, HTTPException, Query, status

from app.core.database import get_database
from app.models.schemas import (
    AuditLogResponse,
    FileDocumentResponse,
    FilesByReleaseResponse,
    FileUploadStatsResponse,
    FileVersionEntry,
    ReleaseOverviewResponse,
)

router = APIRouter(prefix="/api/v1/query", tags=["Query & Analytics"])


@router.get("/files", response_model=list[FileDocumentResponse])
async def list_all_files(
    include_deleted: bool = Query(False, description="Include deleted files"),
):
    """List all files with their version history."""
    db = get_database()
    query: dict = {}
    if not include_deleted:
        query["isDeleted"] = False

    files = await db.files.find(query).sort("updatedAt", -1).to_list(length=None)
    return [FileDocumentResponse(**f) for f in files]


@router.get("/files/by-release/{release_version}", response_model=FilesByReleaseResponse)
async def get_files_by_release(release_version: str):
    """Get all files uploaded for a specific release version."""
    db = get_database()

    release = await db.release_versions.find_one({"releaseVersion": release_version})
    if not release:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Release version '{release_version}' not found",
        )

    files = await db.files.find({"releaseVersion": release_version}).to_list(length=None)

    return FilesByReleaseResponse(
        releaseVersion=release_version,
        files=[FileDocumentResponse(**f) for f in files],
        totalFiles=len(files),
    )


@router.get("/files/{unique_id}", response_model=FileDocumentResponse)
async def get_file_details(unique_id: str):
    """Get detailed information about a specific file including all versions."""
    db = get_database()
    file_doc = await db.files.find_one({"uniqueId": unique_id})
    if not file_doc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"File with uniqueId '{unique_id}' not found",
        )
    return FileDocumentResponse(**file_doc)


@router.get("/files/{unique_id}/stats", response_model=FileUploadStatsResponse)
async def get_file_upload_stats(unique_id: str):
    """Get upload statistics for a specific file.

    Shows how many times the same file has been uploaded and by whom.
    """
    db = get_database()
    file_doc = await db.files.find_one({"uniqueId": unique_id})
    if not file_doc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"File with uniqueId '{unique_id}' not found",
        )

    uploaders = list({v["uploadedBy"] for v in file_doc["versions"]})

    return FileUploadStatsResponse(
        fileName=file_doc["fileName"],
        uniqueId=file_doc["uniqueId"],
        totalUploadCount=file_doc["totalUploadCount"],
        uploaders=uploaders,
        versions=[FileVersionEntry(**v) for v in file_doc["versions"]],
    )


@router.get("/audit-log", response_model=list[AuditLogResponse])
async def get_audit_log(
    action: str | None = Query(None, description="Filter by action (UPLOAD/DELETE)"),
    file_name: str | None = Query(None, description="Filter by file name"),
    performed_by: str | None = Query(None, description="Filter by performer"),
    release_version: str | None = Query(None, description="Filter by release version"),
    limit: int = Query(100, ge=1, le=1000, description="Max results to return"),
    skip: int = Query(0, ge=0, description="Number of results to skip"),
):
    """Query the audit log with optional filters.

    Supports filtering by action type, file name, performer, and release version.
    """
    db = get_database()
    query: dict = {}
    if action:
        query["action"] = action.upper()
    if file_name:
        query["fileName"] = file_name
    if performed_by:
        query["performedBy"] = performed_by
    if release_version:
        query["releaseVersion"] = release_version

    logs = await db.audit_log.find(query).sort("timestamp", -1).skip(skip).limit(limit).to_list(length=limit)
    return [AuditLogResponse(**log) for log in logs]


@router.get("/release-overview/{release_version}", response_model=ReleaseOverviewResponse)
async def get_release_overview(release_version: str):
    """Get a comprehensive overview of a release version.

    Includes file counts, upload/deletion counts, and list of uploaders.
    """
    db = get_database()

    release = await db.release_versions.find_one({"releaseVersion": release_version})
    if not release:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Release version '{release_version}' not found",
        )

    # Aggregate stats
    pipeline = [
        {"$match": {"releaseVersion": release_version}},
        {
            "$group": {
                "_id": None,
                "totalFiles": {"$sum": 1},
                "totalUploads": {"$sum": "$totalUploadCount"},
                "totalDeletions": {"$sum": {"$size": "$deletionHistory"}},
                "allVersions": {"$push": "$versions"},
            }
        },
    ]

    result = await db.files.aggregate(pipeline).to_list(length=1)

    if result:
        stats = result[0]
        # Extract unique uploaders from all versions
        all_uploaders: set[str] = set()
        for versions_list in stats["allVersions"]:
            for version in versions_list:
                all_uploaders.add(version["uploadedBy"])

        return ReleaseOverviewResponse(
            releaseVersion=release_version,
            startDate=release["startDate"],
            endDate=release["endDate"],
            totalFiles=stats["totalFiles"],
            totalUploads=stats["totalUploads"],
            totalDeletions=stats["totalDeletions"],
            uploaders=sorted(all_uploaders),
        )

    return ReleaseOverviewResponse(
        releaseVersion=release_version,
        startDate=release["startDate"],
        endDate=release["endDate"],
        totalFiles=0,
        totalUploads=0,
        totalDeletions=0,
        uploaders=[],
    )


@router.get("/uploaders/{uploader_name}", response_model=list[FileDocumentResponse])
async def get_files_by_uploader(uploader_name: str):
    """Get all files uploaded by a specific user."""
    db = get_database()
    files = await db.files.find(
        {"versions.uploadedBy": uploader_name}
    ).to_list(length=None)

    if not files:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"No files found uploaded by '{uploader_name}'",
        )

    return [FileDocumentResponse(**f) for f in files]


@router.get("/deletions", response_model=list[AuditLogResponse])
async def get_all_deletions(
    release_version: str | None = Query(None, description="Filter by release version"),
):
    """Get all file deletion records for audit purposes."""
    db = get_database()
    query: dict = {"action": "DELETE"}
    if release_version:
        query["releaseVersion"] = release_version

    logs = await db.audit_log.find(query).sort("timestamp", -1).to_list(length=None)
    return [AuditLogResponse(**log) for log in logs]
