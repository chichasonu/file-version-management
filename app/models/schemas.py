from datetime import datetime
from enum import Enum

from pydantic import BaseModel, Field


# ─── Enums ────────────────────────────────────────────────────────────────────

class AuditAction(str, Enum):
    UPLOAD = "UPLOAD"
    DELETE = "DELETE"


# ─── Release Version Schemas ─────────────────────────────────────────────────

class ReleaseVersionCreate(BaseModel):
    releaseVersion: str = Field(..., pattern=r"^R\d{2}\.\d{2}$", examples=["R26.03"])
    startDate: datetime
    endDate: datetime


class ReleaseVersionUpdate(BaseModel):
    startDate: datetime | None = None
    endDate: datetime | None = None


class ReleaseVersionResponse(BaseModel):
    releaseVersion: str
    startDate: datetime
    endDate: datetime
    createdAt: datetime
    updatedAt: datetime


# ─── File Version Schemas ────────────────────────────────────────────────────

class FileVersionEntry(BaseModel):
    version: int
    uploadedBy: str
    checksum: str
    uploadedAt: datetime


class DeletionHistoryEntry(BaseModel):
    deletedBy: str
    deletedAt: datetime
    reason: str | None = None


class FileUploadResponse(BaseModel):
    fileName: str
    uniqueId: str
    releaseVersion: str
    uploadedBy: str
    checksum: str
    version: int
    message: str


class FileDocumentResponse(BaseModel):
    fileName: str
    uniqueId: str
    releaseVersion: str
    currentChecksum: str | None
    isDeleted: bool
    totalUploadCount: int
    versions: list[FileVersionEntry]
    deletionHistory: list[DeletionHistoryEntry]
    createdAt: datetime
    updatedAt: datetime


class FileDeleteRequest(BaseModel):
    uniqueId: str
    deletedBy: str
    reason: str | None = None


class FileDeleteResponse(BaseModel):
    fileName: str
    uniqueId: str
    deletedBy: str
    message: str


# ─── Audit Log Schemas ──────────────────────────────────────────────────────

class AuditLogResponse(BaseModel):
    action: AuditAction
    fileName: str
    uniqueId: str
    releaseVersion: str
    performedBy: str
    checksum: str | None = None
    timestamp: datetime
    details: dict | None = None


# ─── Analytics Schemas ───────────────────────────────────────────────────────

class FilesByReleaseResponse(BaseModel):
    releaseVersion: str
    files: list[FileDocumentResponse]
    totalFiles: int


class FileUploadStatsResponse(BaseModel):
    fileName: str
    uniqueId: str
    totalUploadCount: int
    uploaders: list[str]
    versions: list[FileVersionEntry]


class ReleaseOverviewResponse(BaseModel):
    releaseVersion: str
    startDate: datetime
    endDate: datetime
    totalFiles: int
    totalUploads: int
    totalDeletions: int
    uploaders: list[str]
