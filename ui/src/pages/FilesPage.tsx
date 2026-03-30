import { useEffect, useState } from "react";
import { queryApi } from "../services/api";
import type { FileDocument } from "../types/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { FolderOpen, Eye, FileText, Search } from "lucide-react";
import { toast } from "sonner";

export default function FilesPage() {
  const [files, setFiles] = useState<FileDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [includeDeleted, setIncludeDeleted] = useState(false);
  const [search, setSearch] = useState("");
  const [selectedFile, setSelectedFile] = useState<FileDocument | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  const fetchFiles = async () => {
    setLoading(true);
    try {
      const data = await queryApi.listFiles(includeDeleted);
      setFiles(data);
    } catch {
      toast.error("Failed to fetch files");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFiles();
  }, [includeDeleted]);

  const filteredFiles = files.filter(
    (f) =>
      f.fileName.toLowerCase().includes(search.toLowerCase()) ||
      f.uniqueId.toLowerCase().includes(search.toLowerCase()) ||
      f.releaseVersion.toLowerCase().includes(search.toLowerCase())
  );

  const formatDate = (d: string) =>
    new Date(d).toLocaleString("en-US", {
      year: "numeric", month: "short", day: "numeric",
      hour: "2-digit", minute: "2-digit",
    });

  const openDetails = (file: FileDocument) => {
    setSelectedFile(file);
    setDetailOpen(true);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">File Browser</h1>
        <p className="text-zinc-500 text-sm mt-1">Browse and inspect all uploaded files</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FolderOpen className="h-5 w-5" /> Files
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-3 items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
              <Input
                className="pl-9"
                placeholder="Search by file name, ID, or release..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <Button
              variant={includeDeleted ? "default" : "outline"}
              size="sm"
              onClick={() => setIncludeDeleted(!includeDeleted)}
            >
              {includeDeleted ? "Showing Deleted" : "Show Deleted"}
            </Button>
          </div>

          {loading ? (
            <p className="text-zinc-500 text-center py-8">Loading...</p>
          ) : filteredFiles.length === 0 ? (
            <p className="text-zinc-500 text-center py-8">No files found</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>File Name</TableHead>
                    <TableHead>Release</TableHead>
                    <TableHead>Unique ID</TableHead>
                    <TableHead>Versions</TableHead>
                    <TableHead>Uploads</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Last Updated</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredFiles.map((f) => (
                    <TableRow key={f.uniqueId}>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          <FileText className="h-4 w-4 text-blue-500" />
                          {f.fileName}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">{f.releaseVersion}</Badge>
                      </TableCell>
                      <TableCell className="font-mono text-xs max-w-32 truncate">
                        {f.uniqueId}
                      </TableCell>
                      <TableCell>{f.versions.length}</TableCell>
                      <TableCell>{f.totalUploadCount}</TableCell>
                      <TableCell>
                        {f.isDeleted ? (
                          <Badge variant="destructive">Deleted</Badge>
                        ) : (
                          <Badge className="bg-green-600">Active</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-sm">{formatDate(f.updatedAt)}</TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="sm" onClick={() => openDetails(f)}>
                          <Eye className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" /> {selectedFile?.fileName}
            </DialogTitle>
          </DialogHeader>
          {selectedFile && (
            <div className="space-y-6 pt-2">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <span className="text-zinc-500">Unique ID</span>
                <span className="font-mono text-xs break-all">{selectedFile.uniqueId}</span>
                <span className="text-zinc-500">Release Version</span>
                <span>{selectedFile.releaseVersion}</span>
                <span className="text-zinc-500">Status</span>
                <span>
                  {selectedFile.isDeleted ? (
                    <Badge variant="destructive">Deleted</Badge>
                  ) : (
                    <Badge className="bg-green-600">Active</Badge>
                  )}
                </span>
                <span className="text-zinc-500">Total Uploads</span>
                <span>{selectedFile.totalUploadCount}</span>
                <span className="text-zinc-500">Current Checksum</span>
                <span className="font-mono text-xs break-all">
                  {selectedFile.currentChecksum || "N/A"}
                </span>
              </div>

              <div>
                <h3 className="font-semibold mb-2">Version History</h3>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Version</TableHead>
                      <TableHead>Uploaded By</TableHead>
                      <TableHead>Checksum</TableHead>
                      <TableHead>Date</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {selectedFile.versions.map((v) => (
                      <TableRow key={v.version}>
                        <TableCell>v{v.version}</TableCell>
                        <TableCell>{v.uploadedBy}</TableCell>
                        <TableCell className="font-mono text-xs max-w-32 truncate">
                          {v.checksum}
                        </TableCell>
                        <TableCell className="text-sm">{formatDate(v.uploadedAt)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {selectedFile.deletionHistory.length > 0 && (
                <div>
                  <h3 className="font-semibold mb-2 text-red-600">Deletion History</h3>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Deleted By</TableHead>
                        <TableHead>Reason</TableHead>
                        <TableHead>Date</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {selectedFile.deletionHistory.map((d, i) => (
                        <TableRow key={i}>
                          <TableCell>{d.deletedBy}</TableCell>
                          <TableCell>{d.reason || "—"}</TableCell>
                          <TableCell className="text-sm">{formatDate(d.deletedAt)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
