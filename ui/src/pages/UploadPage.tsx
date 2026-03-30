import { useEffect, useRef, useState } from "react";
import { fileApi, releaseApi } from "../services/api";
import type { ReleaseVersion } from "../types/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Upload, FileText, CheckCircle, AlertCircle } from "lucide-react";
import { toast } from "sonner";

export default function UploadPage() {
  const [releases, setReleases] = useState<ReleaseVersion[]>([]);
  const [selectedRelease, setSelectedRelease] = useState("");
  const [uploadedBy, setUploadedBy] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState<{
    fileName: string;
    uniqueId: string;
    version: number;
    checksum: string;
    message: string;
  } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    releaseApi.list().then(setReleases).catch(() => toast.error("Failed to load releases"));
  }, []);

  const activeReleases = releases.filter((r) => {
    const now = new Date();
    return new Date(r.startDate) <= now && now <= new Date(r.endDate);
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (!selected) return;

    const ext = selected.name.split(".").pop()?.toLowerCase();
    if (ext !== "txt" && ext !== "pdf") {
      toast.error("Only .txt and .pdf files are allowed");
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    if (selected.size > 10 * 1024 * 1024) {
      toast.error("File size exceeds 10MB limit");
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    setFile(selected);
    setResult(null);
  };

  const handleUpload = async () => {
    if (!file || !uploadedBy.trim() || !selectedRelease) {
      toast.error("Please fill in all fields");
      return;
    }

    setUploading(true);
    try {
      const data = await fileApi.upload(file, uploadedBy.trim(), selectedRelease);
      setResult(data);
      toast.success(data.message);
      setFile(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
    } catch (err: unknown) {
      const msg =
        err && typeof err === "object" && "response" in err
          ? (err as { response: { data: { detail: string } } }).response?.data?.detail
          : "Upload failed";
      toast.error(msg || "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Upload File</h1>
        <p className="text-zinc-500 text-sm mt-1">Upload .txt or .pdf files (max 10MB) to a release version</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Upload className="h-5 w-5" /> Upload Form
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Release Version</Label>
              <Select value={selectedRelease} onValueChange={setSelectedRelease}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a release version" />
                </SelectTrigger>
                <SelectContent>
                  {activeReleases.length === 0 ? (
                    <SelectItem value="_none" disabled>
                      No active releases available
                    </SelectItem>
                  ) : (
                    activeReleases.map((r) => (
                      <SelectItem key={r.releaseVersion} value={r.releaseVersion}>
                        {r.releaseVersion}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
              {activeReleases.length === 0 && (
                <p className="text-xs text-orange-500 mt-1">
                  No active releases. Create a release with valid dates first.
                </p>
              )}
            </div>

            <div>
              <Label>Uploaded By</Label>
              <Input
                placeholder="Enter your name"
                value={uploadedBy}
                onChange={(e) => setUploadedBy(e.target.value)}
              />
            </div>

            <div>
              <Label>File (.txt or .pdf, max 10MB)</Label>
              <Input
                ref={fileInputRef}
                type="file"
                accept=".txt,.pdf"
                onChange={handleFileChange}
                className="cursor-pointer"
              />
            </div>

            {file && (
              <div className="flex items-center gap-3 rounded-lg border p-3 bg-zinc-50">
                <FileText className="h-8 w-8 text-blue-500" />
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">{file.name}</p>
                  <p className="text-xs text-zinc-500">{formatSize(file.size)}</p>
                </div>
                <Badge variant="secondary">
                  {file.name.split(".").pop()?.toUpperCase()}
                </Badge>
              </div>
            )}

            <Button
              className="w-full"
              onClick={handleUpload}
              disabled={uploading || !file || !uploadedBy.trim() || !selectedRelease}
            >
              {uploading ? "Uploading..." : "Upload File"}
            </Button>
          </CardContent>
        </Card>

        {result && (
          <Card className="border-green-200 bg-green-50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-green-700">
                <CheckCircle className="h-5 w-5" /> Upload Successful
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-2 gap-2 text-sm">
                <span className="text-zinc-500">File Name</span>
                <span className="font-medium">{result.fileName}</span>
                <span className="text-zinc-500">Unique ID</span>
                <span className="font-mono text-xs break-all">{result.uniqueId}</span>
                <span className="text-zinc-500">Version</span>
                <span className="font-medium">{result.version}</span>
                <span className="text-zinc-500">Checksum</span>
                <span className="font-mono text-xs break-all">{result.checksum}</span>
              </div>
              <p className="text-sm text-green-700 font-medium">{result.message}</p>
            </CardContent>
          </Card>
        )}

        {!result && (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-12 text-zinc-400">
              <AlertCircle className="h-12 w-12 mb-3" />
              <p className="font-medium">Upload a file to see the result here</p>
              <p className="text-sm mt-1">
                Supported formats: .txt, .pdf (max 10MB)
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
