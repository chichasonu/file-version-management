import hashlib
from datetime import datetime, timezone

from fastapi import HTTPException, UploadFile, status
from motor.motor_asyncio import AsyncIOMotorDatabase

from app.core.config import settings
from app.models.schemas import AuditAction
from app.services.external_api import external_api_service


def compute_checksum(content: bytes) -> str:
    """Compute SHA-256 checksum of file content."""
    return hashlib.sha256(content).hexdigest()


def validate_file_extension(filename: str) -> None:
    """Validate that the file has an allowed extension."""
    ext = "." + filename.rsplit(".", 1)[-1].lower() if "." in filename else ""
    if ext not in settings.allowed_file_extensions:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"File type not allowed. Allowed types: {settings.allowed_file_extensions}",
        )


def validate_file_size(content: bytes) -> None:
    """Validate that the file does not exceed the maximum size."""
    max_size = settings.max_file_size_mb * 1024 * 1024
    if len(content) > max_size:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=f"File size exceeds maximum allowed size of {settings.max_file_size_mb}MB",
        )


async def validate_release_version(db: AsyncIOMotorDatabase, release_version: str) -> dict:
    """Validate that the release version exists and current date is within range."""
    release = await db.release_versions.find_one({"releaseVersion": release_version})
    if not release:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Release version '{release_version}' not found",
        )

    now = datetime.now(timezone.utc)
    start_date = release["startDate"]
    end_date = release["endDate"]

    # Ensure dates are timezone-aware for comparison
    if start_date.tzinfo is None:
        start_date = start_date.replace(tzinfo=timezone.utc)
    if end_date.tzinfo is None:
        end_date = end_date.replace(tzinfo=timezone.utc)

    if now < start_date:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Upload not allowed. Release '{release_version}' has not started yet. "
                   f"Start date: {start_date.isoformat()}",
        )
    if now > end_date:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Upload not allowed. Release '{release_version}' has ended. "
                   f"End date: {end_date.isoformat()}",
        )

    return release


async def upload_file(
    db: AsyncIOMotorDatabase,
    file: UploadFile,
    uploaded_by: str,
    release_version: str,
) -> dict:
    """Handle the complete file upload workflow."""
    # Read file content
    content = await file.read()

    # Validations
    validate_file_extension(file.filename)
    validate_file_size(content)
    await validate_release_version(db, release_version)

    # Compute checksum
    checksum = compute_checksum(content)

    # Call external API to get unique ID
    unique_id = await external_api_service.upload_file(file.filename, content)

    now = datetime.now(timezone.utc)

    # Check if file document already exists (same uniqueId)
    existing_file = await db.files.find_one({"uniqueId": unique_id})

    if existing_file:
        # File exists - add new version
        current_version = len(existing_file["versions"]) + 1
        new_version_entry = {
            "version": current_version,
            "uploadedBy": uploaded_by,
            "checksum": checksum,
            "uploadedAt": now,
        }

        await db.files.update_one(
            {"uniqueId": unique_id},
            {
                "$push": {"versions": new_version_entry},
                "$inc": {"totalUploadCount": 1},
                "$set": {
                    "currentChecksum": checksum,
                    "isDeleted": False,
                    "updatedAt": now,
                },
            },
        )
        version = current_version
    else:
        # New file - create document
        file_document = {
            "fileName": file.filename,
            "uniqueId": unique_id,
            "releaseVersion": release_version,
            "currentChecksum": checksum,
            "isDeleted": False,
            "totalUploadCount": 1,
            "versions": [
                {
                    "version": 1,
                    "uploadedBy": uploaded_by,
                    "checksum": checksum,
                    "uploadedAt": now,
                }
            ],
            "deletionHistory": [],
            "createdAt": now,
            "updatedAt": now,
        }
        await db.files.insert_one(file_document)
        version = 1

    # Create audit log entry
    audit_entry = {
        "action": AuditAction.UPLOAD.value,
        "fileName": file.filename,
        "uniqueId": unique_id,
        "releaseVersion": release_version,
        "performedBy": uploaded_by,
        "checksum": checksum,
        "timestamp": now,
        "details": {"version": version, "fileSize": len(content)},
    }
    await db.audit_log.insert_one(audit_entry)

    return {
        "fileName": file.filename,
        "uniqueId": unique_id,
        "releaseVersion": release_version,
        "uploadedBy": uploaded_by,
        "checksum": checksum,
        "version": version,
        "message": f"File uploaded successfully (version {version})",
    }


async def delete_file(
    db: AsyncIOMotorDatabase,
    unique_id: str,
    deleted_by: str,
    reason: str | None = None,
) -> dict:
    """Handle file deletion workflow."""
    # Find the file
    file_doc = await db.files.find_one({"uniqueId": unique_id})
    if not file_doc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"File with uniqueId '{unique_id}' not found",
        )

    if file_doc["isDeleted"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"File '{file_doc['fileName']}' is already deleted",
        )

    # Call external API to delete
    success = await external_api_service.delete_file(unique_id)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="External API failed to delete the file",
        )

    now = datetime.now(timezone.utc)

    # Update file document
    deletion_entry = {
        "deletedBy": deleted_by,
        "deletedAt": now,
        "reason": reason,
    }

    await db.files.update_one(
        {"uniqueId": unique_id},
        {
            "$set": {
                "isDeleted": True,
                "currentChecksum": None,
                "updatedAt": now,
            },
            "$push": {"deletionHistory": deletion_entry},
        },
    )

    # Create audit log entry
    audit_entry = {
        "action": AuditAction.DELETE.value,
        "fileName": file_doc["fileName"],
        "uniqueId": unique_id,
        "releaseVersion": file_doc["releaseVersion"],
        "performedBy": deleted_by,
        "checksum": None,
        "timestamp": now,
        "details": {"reason": reason},
    }
    await db.audit_log.insert_one(audit_entry)

    return {
        "fileName": file_doc["fileName"],
        "uniqueId": unique_id,
        "deletedBy": deleted_by,
        "message": f"File '{file_doc['fileName']}' deleted successfully",
    }
