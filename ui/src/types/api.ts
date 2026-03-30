export interface ReleaseVersion {
  releaseVersion: string;
  startDate: string;
  endDate: string;
  createdAt: string;
  updatedAt: string;
}

export interface ReleaseVersionCreate {
  releaseVersion: string;
  startDate: string;
  endDate: string;
}

export interface ReleaseVersionUpdate {
  startDate?: string;
  endDate?: string;
}

export interface FileVersionEntry {
  version: number;
  uploadedBy: string;
  checksum: string;
  uploadedAt: string;
}

export interface DeletionHistoryEntry {
  deletedBy: string;
  deletedAt: string;
  reason: string | null;
}

export interface FileDocument {
  fileName: string;
  uniqueId: string;
  releaseVersion: string;
  currentChecksum: string | null;
  isDeleted: boolean;
  totalUploadCount: number;
  versions: FileVersionEntry[];
  deletionHistory: DeletionHistoryEntry[];
  createdAt: string;
  updatedAt: string;
}

export interface FileUploadResponse {
  fileName: string;
  uniqueId: string;
  releaseVersion: string;
  uploadedBy: string;
  checksum: string;
  version: number;
  message: string;
}

export interface FileDeleteResponse {
  fileName: string;
  uniqueId: string;
  deletedBy: string;
  message: string;
}

export interface FilesByRelease {
  releaseVersion: string;
  files: FileDocument[];
  totalFiles: number;
}

export interface FileUploadStats {
  fileName: string;
  uniqueId: string;
  totalUploadCount: number;
  uploaders: string[];
  versions: FileVersionEntry[];
}

export interface AuditLogEntry {
  action: "UPLOAD" | "DELETE";
  fileName: string;
  uniqueId: string;
  releaseVersion: string;
  performedBy: string;
  checksum: string | null;
  timestamp: string;
  details: Record<string, unknown> | null;
}

export interface ReleaseOverview {
  releaseVersion: string;
  startDate: string;
  endDate: string;
  totalFiles: number;
  totalUploads: number;
  totalDeletions: number;
  uploaders: string[];
}
