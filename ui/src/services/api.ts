import axios from "axios";
import type {
  AuditLogEntry,
  FileDeleteResponse,
  FileDocument,
  FilesByRelease,
  FileUploadResponse,
  FileUploadStats,
  ReleaseOverview,
  ReleaseVersion,
  ReleaseVersionCreate,
  ReleaseVersionUpdate,
} from "../types/api";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";

const api = axios.create({
  baseURL: API_BASE_URL,
});

// ─── Release Versions ────────────────────────────────────────────────────────

export const releaseApi = {
  create: (data: ReleaseVersionCreate) =>
    api.post<ReleaseVersion>("/api/v1/releases/", data).then((r) => r.data),

  list: () =>
    api.get<ReleaseVersion[]>("/api/v1/releases/").then((r) => r.data),

  get: (version: string) =>
    api.get<ReleaseVersion>(`/api/v1/releases/${version}`).then((r) => r.data),

  update: (version: string, data: ReleaseVersionUpdate) =>
    api.put<ReleaseVersion>(`/api/v1/releases/${version}`, data).then((r) => r.data),

  delete: (version: string) =>
    api.delete(`/api/v1/releases/${version}`).then((r) => r.data),
};

// ─── Files ───────────────────────────────────────────────────────────────────

export const fileApi = {
  upload: (file: File, uploadedBy: string, releaseVersion: string) => {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("uploadedBy", uploadedBy);
    formData.append("releaseVersion", releaseVersion);
    return api
      .post<FileUploadResponse>("/api/v1/files/upload", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      })
      .then((r) => r.data);
  },

  delete: (uniqueId: string, deletedBy: string, reason?: string) =>
    api
      .delete<FileDeleteResponse>("/api/v1/files/", {
        data: { uniqueId, deletedBy, reason },
      })
      .then((r) => r.data),
};

// ─── Query & Analytics ───────────────────────────────────────────────────────

export const queryApi = {
  listFiles: (includeDeleted = false) =>
    api
      .get<FileDocument[]>("/api/v1/query/files", {
        params: { include_deleted: includeDeleted },
      })
      .then((r) => r.data),

  getFilesByRelease: (version: string) =>
    api
      .get<FilesByRelease>(`/api/v1/query/files/by-release/${version}`)
      .then((r) => r.data),

  getFileDetails: (uniqueId: string) =>
    api.get<FileDocument>(`/api/v1/query/files/${uniqueId}`).then((r) => r.data),

  getFileStats: (uniqueId: string) =>
    api
      .get<FileUploadStats>(`/api/v1/query/files/${uniqueId}/stats`)
      .then((r) => r.data),

  getAuditLog: (params?: {
    action?: string;
    file_name?: string;
    performed_by?: string;
    release_version?: string;
    limit?: number;
    skip?: number;
  }) =>
    api
      .get<AuditLogEntry[]>("/api/v1/query/audit-log", { params })
      .then((r) => r.data),

  getReleaseOverview: (version: string) =>
    api
      .get<ReleaseOverview>(`/api/v1/query/release-overview/${version}`)
      .then((r) => r.data),

  getFilesByUploader: (name: string) =>
    api
      .get<FileDocument[]>(`/api/v1/query/uploaders/${name}`)
      .then((r) => r.data),

  getDeletions: (releaseVersion?: string) =>
    api
      .get<AuditLogEntry[]>("/api/v1/query/deletions", {
        params: releaseVersion ? { release_version: releaseVersion } : {},
      })
      .then((r) => r.data),
};
