import { useState } from "react";
import { fileApi } from "../services/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Trash2, AlertCircle, CheckCircle } from "lucide-react";
import { toast } from "sonner";

export default function DeletePage() {
  const [uniqueId, setUniqueId] = useState("");
  const [deletedBy, setDeletedBy] = useState("");
  const [reason, setReason] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [result, setResult] = useState<{
    fileName: string;
    uniqueId: string;
    deletedBy: string;
    message: string;
  } | null>(null);

  const handleDelete = async () => {
    if (!uniqueId.trim() || !deletedBy.trim()) {
      toast.error("Please provide Unique ID and your name");
      return;
    }

    if (!window.confirm("Are you sure you want to delete this file?")) return;

    setDeleting(true);
    try {
      const data = await fileApi.delete(
        uniqueId.trim(),
        deletedBy.trim(),
        reason.trim() || undefined
      );
      setResult(data);
      toast.success(data.message);
      setUniqueId("");
      setDeletedBy("");
      setReason("");
    } catch (err: unknown) {
      const msg =
        err && typeof err === "object" && "response" in err
          ? (err as { response: { data: { detail: string } } }).response?.data?.detail
          : "Delete failed";
      toast.error(msg || "Delete failed");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Delete File</h1>
        <p className="text-zinc-500 text-sm mt-1">
          Delete a file by its unique ID. Deletion is recorded for audit purposes.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-600">
              <Trash2 className="h-5 w-5" /> Delete File
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Unique ID</Label>
              <Input
                placeholder="Enter the file's unique ID"
                value={uniqueId}
                onChange={(e) => {
                  setUniqueId(e.target.value);
                  setResult(null);
                }}
              />
            </div>
            <div>
              <Label>Deleted By</Label>
              <Input
                placeholder="Enter your name"
                value={deletedBy}
                onChange={(e) => setDeletedBy(e.target.value)}
              />
            </div>
            <div>
              <Label>Reason (optional)</Label>
              <Textarea
                placeholder="Reason for deletion..."
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                rows={3}
              />
            </div>
            <Button
              variant="destructive"
              className="w-full"
              onClick={handleDelete}
              disabled={deleting || !uniqueId.trim() || !deletedBy.trim()}
            >
              {deleting ? "Deleting..." : "Delete File"}
            </Button>
          </CardContent>
        </Card>

        {result ? (
          <Card className="border-green-200 bg-green-50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-green-700">
                <CheckCircle className="h-5 w-5" /> File Deleted
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <span className="text-zinc-500">File Name</span>
                <span className="font-medium">{result.fileName}</span>
                <span className="text-zinc-500">Unique ID</span>
                <span className="font-mono text-xs break-all">{result.uniqueId}</span>
                <span className="text-zinc-500">Deleted By</span>
                <span className="font-medium">{result.deletedBy}</span>
              </div>
              <p className="text-sm text-green-700 font-medium mt-3">{result.message}</p>
            </CardContent>
          </Card>
        ) : (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-12 text-zinc-400">
              <AlertCircle className="h-12 w-12 mb-3" />
              <p className="font-medium">Provide a unique ID to delete a file</p>
              <p className="text-sm mt-1">
                You can find unique IDs in the File Browser
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
