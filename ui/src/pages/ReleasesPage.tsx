import { useEffect, useState } from "react";
import { releaseApi } from "../services/api";
import type { ReleaseVersion } from "../types/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Plus, Pencil, Trash2, Calendar } from "lucide-react";
import { toast } from "sonner";

export default function ReleasesPage() {
  const [releases, setReleases] = useState<ReleaseVersion[]>([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<ReleaseVersion | null>(null);
  const [form, setForm] = useState({ releaseVersion: "", startDate: "", endDate: "" });

  const fetchReleases = async () => {
    setLoading(true);
    try {
      const data = await releaseApi.list();
      setReleases(data);
    } catch {
      toast.error("Failed to fetch releases");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReleases();
  }, []);

  const handleCreate = async () => {
    try {
      await releaseApi.create({
        releaseVersion: form.releaseVersion,
        startDate: new Date(form.startDate).toISOString(),
        endDate: new Date(form.endDate).toISOString(),
      });
      toast.success("Release version created");
      setCreateOpen(false);
      setForm({ releaseVersion: "", startDate: "", endDate: "" });
      fetchReleases();
    } catch (err: unknown) {
      const msg =
        err && typeof err === "object" && "response" in err
          ? (err as { response: { data: { detail: string } } }).response?.data?.detail
          : "Failed to create release";
      toast.error(msg || "Failed to create release");
    }
  };

  const handleUpdate = async () => {
    if (!editTarget) return;
    try {
      await releaseApi.update(editTarget.releaseVersion, {
        startDate: form.startDate ? new Date(form.startDate).toISOString() : undefined,
        endDate: form.endDate ? new Date(form.endDate).toISOString() : undefined,
      });
      toast.success("Release version updated");
      setEditOpen(false);
      setEditTarget(null);
      setForm({ releaseVersion: "", startDate: "", endDate: "" });
      fetchReleases();
    } catch (err: unknown) {
      const msg =
        err && typeof err === "object" && "response" in err
          ? (err as { response: { data: { detail: string } } }).response?.data?.detail
          : "Failed to update release";
      toast.error(msg || "Failed to update release");
    }
  };

  const handleDelete = async (version: string) => {
    if (!window.confirm(`Delete release ${version}?`)) return;
    try {
      await releaseApi.delete(version);
      toast.success("Release version deleted");
      fetchReleases();
    } catch (err: unknown) {
      const msg =
        err && typeof err === "object" && "response" in err
          ? (err as { response: { data: { detail: string } } }).response?.data?.detail
          : "Failed to delete release";
      toast.error(msg || "Failed to delete release");
    }
  };

  const isActive = (r: ReleaseVersion) => {
    const now = new Date();
    return new Date(r.startDate) <= now && now <= new Date(r.endDate);
  };

  const formatDate = (d: string) => new Date(d).toLocaleDateString("en-US", {
    year: "numeric", month: "short", day: "numeric",
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Release Versions</h1>
          <p className="text-zinc-500 text-sm mt-1">Manage release windows for file uploads</p>
        </div>
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" /> Add Release
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Release Version</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-4">
              <div>
                <Label>Release Version (e.g., R26.03)</Label>
                <Input
                  placeholder="R26.03"
                  value={form.releaseVersion}
                  onChange={(e) => setForm({ ...form, releaseVersion: e.target.value })}
                />
              </div>
              <div>
                <Label>Start Date</Label>
                <Input
                  type="datetime-local"
                  value={form.startDate}
                  onChange={(e) => setForm({ ...form, startDate: e.target.value })}
                />
              </div>
              <div>
                <Label>End Date</Label>
                <Input
                  type="datetime-local"
                  value={form.endDate}
                  onChange={(e) => setForm({ ...form, endDate: e.target.value })}
                />
              </div>
              <Button className="w-full" onClick={handleCreate}>
                Create
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" /> All Releases
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-zinc-500 text-center py-8">Loading...</p>
          ) : releases.length === 0 ? (
            <p className="text-zinc-500 text-center py-8">No release versions found. Create one to get started.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Version</TableHead>
                  <TableHead>Start Date</TableHead>
                  <TableHead>End Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {releases.map((r) => (
                  <TableRow key={r.releaseVersion}>
                    <TableCell className="font-medium">{r.releaseVersion}</TableCell>
                    <TableCell>{formatDate(r.startDate)}</TableCell>
                    <TableCell>{formatDate(r.endDate)}</TableCell>
                    <TableCell>
                      {isActive(r) ? (
                        <Badge className="bg-green-600">Active</Badge>
                      ) : new Date() < new Date(r.startDate) ? (
                        <Badge variant="secondary">Upcoming</Badge>
                      ) : (
                        <Badge variant="outline">Ended</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right space-x-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setEditTarget(r);
                          setForm({
                            releaseVersion: r.releaseVersion,
                            startDate: r.startDate.slice(0, 16),
                            endDate: r.endDate.slice(0, 16),
                          });
                          setEditOpen(true);
                        }}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(r.releaseVersion)}
                      >
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Release: {editTarget?.releaseVersion}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <div>
              <Label>Start Date</Label>
              <Input
                type="datetime-local"
                value={form.startDate}
                onChange={(e) => setForm({ ...form, startDate: e.target.value })}
              />
            </div>
            <div>
              <Label>End Date</Label>
              <Input
                type="datetime-local"
                value={form.endDate}
                onChange={(e) => setForm({ ...form, endDate: e.target.value })}
              />
            </div>
            <Button className="w-full" onClick={handleUpdate}>
              Save Changes
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
