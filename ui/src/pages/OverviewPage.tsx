import { useEffect, useState } from "react";
import { queryApi, releaseApi } from "../services/api";
import type { ReleaseOverview, ReleaseVersion } from "../types/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { BarChart3, FileText, Upload, Trash2, Users } from "lucide-react";
import { toast } from "sonner";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";

export default function OverviewPage() {
  const [releases, setReleases] = useState<ReleaseVersion[]>([]);
  const [selectedRelease, setSelectedRelease] = useState("");
  const [overview, setOverview] = useState<ReleaseOverview | null>(null);
  const [allOverviews, setAllOverviews] = useState<ReleaseOverview[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    releaseApi.list().then(setReleases).catch(() => toast.error("Failed to load releases"));
  }, []);

  useEffect(() => {
    if (releases.length > 0) {
      loadAllOverviews();
    }
  }, [releases]);

  const loadAllOverviews = async () => {
    try {
      const overviews = await Promise.all(
        releases.map((r) => queryApi.getReleaseOverview(r.releaseVersion))
      );
      setAllOverviews(overviews);
    } catch {
      // Silently fail for chart data
    }
  };

  useEffect(() => {
    if (!selectedRelease) {
      setOverview(null);
      return;
    }
    setLoading(true);
    queryApi
      .getReleaseOverview(selectedRelease)
      .then(setOverview)
      .catch(() => toast.error("Failed to load overview"))
      .finally(() => setLoading(false));
  }, [selectedRelease]);

  const formatDate = (d: string) =>
    new Date(d).toLocaleDateString("en-US", {
      year: "numeric", month: "short", day: "numeric",
    });

  const chartData = allOverviews.map((o) => ({
    name: o.releaseVersion,
    Files: o.totalFiles,
    Uploads: o.totalUploads,
    Deletions: o.totalDeletions,
  }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Release Overview</h1>
        <p className="text-zinc-500 text-sm mt-1">Analytics and statistics per release version</p>
      </div>

      {chartData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" /> All Releases Comparison
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="Files" fill="#3b82f6" />
                  <Bar dataKey="Uploads" fill="#22c55e" />
                  <Bar dataKey="Deletions" fill="#ef4444" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Release Detail</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Select value={selectedRelease} onValueChange={setSelectedRelease}>
            <SelectTrigger className="max-w-xs">
              <SelectValue placeholder="Select a release version" />
            </SelectTrigger>
            <SelectContent>
              {releases.map((r) => (
                <SelectItem key={r.releaseVersion} value={r.releaseVersion}>
                  {r.releaseVersion}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {loading && <p className="text-zinc-500 text-center py-8">Loading...</p>}

          {overview && !loading && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-sm text-zinc-500">
                {formatDate(overview.startDate)} — {formatDate(overview.endDate)}
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-3">
                      <FileText className="h-8 w-8 text-blue-500" />
                      <div>
                        <p className="text-2xl font-bold">{overview.totalFiles}</p>
                        <p className="text-xs text-zinc-500">Total Files</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-3">
                      <Upload className="h-8 w-8 text-green-500" />
                      <div>
                        <p className="text-2xl font-bold">{overview.totalUploads}</p>
                        <p className="text-xs text-zinc-500">Total Uploads</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-3">
                      <Trash2 className="h-8 w-8 text-red-500" />
                      <div>
                        <p className="text-2xl font-bold">{overview.totalDeletions}</p>
                        <p className="text-xs text-zinc-500">Deletions</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-3">
                      <Users className="h-8 w-8 text-purple-500" />
                      <div>
                        <p className="text-2xl font-bold">{overview.uploaders.length}</p>
                        <p className="text-xs text-zinc-500">Uploaders</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {overview.uploaders.length > 0 && (
                <div>
                  <h3 className="font-semibold mb-2">Contributors</h3>
                  <div className="flex flex-wrap gap-2">
                    {overview.uploaders.map((u) => (
                      <Badge key={u} variant="secondary" className="text-sm">
                        {u}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {!selectedRelease && !loading && (
            <p className="text-zinc-500 text-center py-8">
              Select a release version to see its overview
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
