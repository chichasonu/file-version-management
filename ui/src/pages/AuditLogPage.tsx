import { useEffect, useState } from "react";
import { queryApi } from "../services/api";
import type { AuditLogEntry } from "../types/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ClipboardList, Search, RefreshCw } from "lucide-react";
import { toast } from "sonner";

export default function AuditLogPage() {
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionFilter, setActionFilter] = useState("ALL");
  const [fileNameFilter, setFileNameFilter] = useState("");
  const [performerFilter, setPerformerFilter] = useState("");
  const [releaseFilter, setReleaseFilter] = useState("");

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const params: Record<string, string | number> = { limit: 500 };
      if (actionFilter !== "ALL") params.action = actionFilter;
      if (fileNameFilter.trim()) params.file_name = fileNameFilter.trim();
      if (performerFilter.trim()) params.performed_by = performerFilter.trim();
      if (releaseFilter.trim()) params.release_version = releaseFilter.trim();
      const data = await queryApi.getAuditLog(params);
      setLogs(data);
    } catch {
      toast.error("Failed to fetch audit log");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  const formatDate = (d: string) =>
    new Date(d).toLocaleString("en-US", {
      year: "numeric", month: "short", day: "numeric",
      hour: "2-digit", minute: "2-digit", second: "2-digit",
    });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Audit Log</h1>
        <p className="text-zinc-500 text-sm mt-1">Complete audit trail of all uploads and deletions</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ClipboardList className="h-5 w-5" /> Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            <Select value={actionFilter} onValueChange={setActionFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Action" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Actions</SelectItem>
                <SelectItem value="UPLOAD">Upload</SelectItem>
                <SelectItem value="DELETE">Delete</SelectItem>
              </SelectContent>
            </Select>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
              <Input
                className="pl-9"
                placeholder="File name..."
                value={fileNameFilter}
                onChange={(e) => setFileNameFilter(e.target.value)}
              />
            </div>
            <Input
              placeholder="Performed by..."
              value={performerFilter}
              onChange={(e) => setPerformerFilter(e.target.value)}
            />
            <Input
              placeholder="Release (e.g. R26.03)..."
              value={releaseFilter}
              onChange={(e) => setReleaseFilter(e.target.value)}
            />
            <Button onClick={fetchLogs} className="w-full">
              <RefreshCw className="mr-2 h-4 w-4" /> Apply Filters
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>
            Log Entries ({logs.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-zinc-500 text-center py-8">Loading...</p>
          ) : logs.length === 0 ? (
            <p className="text-zinc-500 text-center py-8">No audit log entries found</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Timestamp</TableHead>
                    <TableHead>Action</TableHead>
                    <TableHead>File Name</TableHead>
                    <TableHead>Release</TableHead>
                    <TableHead>Performed By</TableHead>
                    <TableHead>Unique ID</TableHead>
                    <TableHead>Checksum</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {logs.map((log, i) => (
                    <TableRow key={i}>
                      <TableCell className="text-sm whitespace-nowrap">
                        {formatDate(log.timestamp)}
                      </TableCell>
                      <TableCell>
                        {log.action === "UPLOAD" ? (
                          <Badge className="bg-blue-600">UPLOAD</Badge>
                        ) : (
                          <Badge variant="destructive">DELETE</Badge>
                        )}
                      </TableCell>
                      <TableCell className="font-medium">{log.fileName}</TableCell>
                      <TableCell>
                        <Badge variant="secondary">{log.releaseVersion}</Badge>
                      </TableCell>
                      <TableCell>{log.performedBy}</TableCell>
                      <TableCell className="font-mono text-xs max-w-28 truncate">
                        {log.uniqueId}
                      </TableCell>
                      <TableCell className="font-mono text-xs max-w-28 truncate">
                        {log.checksum || "—"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
