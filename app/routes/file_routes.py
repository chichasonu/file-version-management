from fastapi import APIRouter, File, Form, UploadFile, status

from app.core.database import get_database
from app.models.schemas import FileDeleteRequest, FileDeleteResponse, FileUploadResponse
from app.services.file_service import delete_file, upload_file

router = APIRouter(prefix="/api/v1/files", tags=["Files"])


@router.post("/upload", response_model=FileUploadResponse, status_code=status.HTTP_201_CREATED)
async def upload_file_endpoint(
    file: UploadFile = File(..., description="File to upload (.txt or .pdf, max 10MB)"),
    uploadedBy: str = Form(..., description="Name of the uploader"),
    releaseVersion: str = Form(..., description="Release version (e.g., R26.03)"),
):
    """Upload a file with metadata.

    - Validates file type (.txt, .pdf) and size (max 10MB)
    - Validates release version dates (upload allowed only within release window)
    - Sends file to external API to obtain unique ID
    - Stores file metadata and version history in MongoDB
    - Supports re-uploading the same file (creates new version)
    """
    db = get_database()
    result = await upload_file(db, file, uploadedBy, releaseVersion)
    return FileUploadResponse(**result)


@router.delete("/", response_model=FileDeleteResponse)
async def delete_file_endpoint(request: FileDeleteRequest):
    """Delete a file by its unique ID.

    - Calls external API to delete the file
    - Maintains deletion audit trail in MongoDB
    - Marks file as deleted (soft delete for audit purposes)
    """
    db = get_database()
    result = await delete_file(db, request.uniqueId, request.deletedBy, request.reason)
    return FileDeleteResponse(**result)
