"use client";

import { useAppStore } from "@/lib/store";
import { generateInsights } from "@/lib/insights";
import {
  correlateBySession,
  correlateFile,
  distributionsBySession,
  distributionsFile,
  outliersBySession,
  outliersFile,
  boxPlotsBySession,
  boxPlotsFile,
  listReports,
  createReport,
  deleteReport,
  createShareLink,
  listComments,
  addComment,
  removeComment,
  getProfileSettings,
  updateProfileSettings,
  type CorrelationMatrix,
  type DistributionAnalysis,
  type OutlierDetectionResult,
  type BoxPlotData,
  type ReportResponse,
  type CommentResponse,
  type ProfileSettings,
} from "@/lib/api";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import {
  Rows3,
  Columns3,
  AlertCircle,
  BarChart3,
  Download,
  Filter,
  Save,
} from "lucide-react";
import { useState, useMemo, useEffect } from "react";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ScatterChart,
  Scatter,
} from "recharts";

const COLORS = [
  "#6366f1",
  "#8b5cf6",
  "#ec4899",
  "#f59e0b",
  "#10b981",
  "#06b6d4",
];

function StatCard({
  icon: Icon,
  label,
  value,
  color,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string | number;
  color: string;
}) {
  return (
    <div className="glass-card hover-lift flex items-center gap-4 rounded-2xl border border-white/10 bg-gradient-to-br from-white/5 to-white/0 p-6 backdrop-blur-xl">
      <div className={`rounded-xl p-3 ${color}`}>
        <Icon className="h-6 w-6" />
      </div>
      <div>
        <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          {label}
        </p>
        <p className="text-2xl font-bold text-foreground">{value}</p>
      </div>
    </div>
  );
}

interface InsightCardProps {
  insight: {
    icon: string;
    type: string;
    text: string;
  };
}

function InsightCard({ insight }: InsightCardProps) {
  const bgColor =
    insight.type === "warning"
      ? "bg-red-500/10 border-red-500/20"
      : insight.type === "positive"
        ? "bg-green-500/10 border-green-500/20"
        : "bg-blue-500/10 border-blue-500/20";

  return (
    <div className={`glass-card rounded-xl border p-4 ${bgColor}`}>
      <div className="flex items-start gap-3">
        <span className="text-xl">{insight.icon}</span>
        <p className="text-sm text-foreground">{insight.text}</p>
      </div>
    </div>
  );
}

function ChartCard({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="glass-card hover-lift space-y-4 rounded-2xl border border-white/10 bg-gradient-to-br from-white/5 to-white/0 p-6 backdrop-blur-xl">
      <h3 className="text-base font-semibold text-foreground">{title}</h3>
      {children}
    </div>
  );
}

function ProfileSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="glass-card animate-pulse rounded-2xl border border-white/10 bg-gradient-to-br from-white/5 to-white/0 p-6 backdrop-blur-xl"
          >
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-xl bg-white/10" />
              <div className="space-y-2">
                <div className="h-3 w-16 rounded bg-white/10" />
                <div className="h-6 w-12 rounded bg-white/10" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function ProfilePage() {
  const { profile, sessionId, uploadedFile, setProfile } = useAppStore();
  const [searchTerm, setSearchTerm] = useState("");
  const [sortCol, setSortCol] = useState<string | null>(null);
  const [correlation, setCorrelation] = useState<CorrelationMatrix | null>(null);
  const [distributions, setDistributions] = useState<DistributionAnalysis[]>([]);
  const [outliers, setOutliers] = useState<OutlierDetectionResult[]>([]);
  const [boxPlots, setBoxPlots] = useState<BoxPlotData[]>([]);
  const [advancedLoading, setAdvancedLoading] = useState(false);
  const [advancedError, setAdvancedError] = useState<string | null>(null);
  const [reports, setReports] = useState<ReportResponse[]>([]);
  const [reportName, setReportName] = useState("");
  const [shareLink, setShareLink] = useState<string | null>(null);
  const [comments, setComments] = useState<CommentResponse[]>([]);
  const [newComment, setNewComment] = useState("");
  const [settings, setSettings] = useState<ProfileSettings | null>(null);
  const [settingsSaving, setSettingsSaving] = useState(false);

  if (!profile) {
    return (
      <div className="space-y-6">
        <div className="border-b border-white/5 pb-4">
          <h1 className="text-2xl font-semibold text-foreground">Data Profile</h1>
          <p className="text-sm text-muted-foreground">Waiting for a dataset to finish profiling.</p>
        </div>
        <ProfileSkeleton />
      </div>
    );
  }

  const insights = useMemo(() => generateInsights(profile), [profile]);

  useEffect(() => {
    if (!profile) return;
    if (!sessionId && !uploadedFile) return;
    let mounted = true;
    const load = async () => {
      try {
        setAdvancedLoading(true);
        setAdvancedError(null);
        if (sessionId) {
          const [corr, dist, out, box] = await Promise.all([
            correlateBySession(sessionId),
            distributionsBySession(sessionId),
            outliersBySession(sessionId),
            boxPlotsBySession(sessionId),
          ]);
          if (!mounted) return;
          setCorrelation(corr);
          setDistributions(dist.distributions);
          setOutliers(out.outliers);
          setBoxPlots(box.box_plots);
        } else if (uploadedFile) {
          const [corr, dist, out, box] = await Promise.all([
            correlateFile(uploadedFile),
            distributionsFile(uploadedFile),
            outliersFile(uploadedFile),
            boxPlotsFile(uploadedFile),
          ]);
          if (!mounted) return;
          setCorrelation(corr);
          setDistributions(dist.distributions);
          setOutliers(out.outliers);
          setBoxPlots(box.box_plots);
        }
      } catch (err) {
        if (!mounted) return;
        setAdvancedError(err instanceof Error ? err.message : "Failed to load advanced analytics");
      } finally {
        if (mounted) setAdvancedLoading(false);
      }
    };
    load();
    return () => {
      mounted = false;
    };
  }, [profile, sessionId, uploadedFile]);

  useEffect(() => {
    if (!sessionId) return;
    let active = true;
    const loadExtras = async () => {
      try {
        const [reportsData, commentsData, settingsData] = await Promise.all([
          listReports(),
          listComments(sessionId),
          getProfileSettings(sessionId),
        ]);
        if (!active) return;
        setReports(reportsData);
        setComments(commentsData);
        setSettings(settingsData);
      } catch {
        if (!active) return;
      }
    };
    loadExtras();
    return () => {
      active = false;
    };
  }, [sessionId]);

  const handleSaveReport = async () => {
    if (!reportName.trim()) return;
    const payload = {
      profile,
      insights,
      correlation,
      distributions,
      outliers,
      boxPlots,
    };
    const report = await createReport(reportName.trim(), payload as Record<string, unknown>);
    setReports([report, ...reports]);
    setReportName("");
  };

  const handleLoadReport = (report: ReportResponse) => {
    const payload = report.payload as Record<string, unknown>;
    if (payload.profile) {
      setProfile(payload.profile as typeof profile);
    }
    setCorrelation((payload.correlation as CorrelationMatrix) || null);
    setDistributions((payload.distributions as DistributionAnalysis[]) || []);
    setOutliers((payload.outliers as OutlierDetectionResult[]) || []);
    setBoxPlots((payload.boxPlots as BoxPlotData[]) || []);
  };

  const handleShare = async () => {
    if (!sessionId) return;
    const share = await createShareLink(sessionId);
    const url = `${window.location.origin}/share/${share.token}`;
    setShareLink(url);
    await navigator.clipboard.writeText(url);
  };

  const handleAddComment = async () => {
    if (!sessionId || !newComment.trim()) return;
    const comment = await addComment(sessionId, newComment.trim());
    setComments([comment, ...comments]);
    setNewComment("");
  };

  const handleDeleteComment = async (commentId: number) => {
    if (!sessionId) return;
    await removeComment(sessionId, commentId);
    setComments(comments.filter((c) => c.id !== commentId));
  };

  const handleExportPdf = async () => {
    const node = document.getElementById("profile-export");
    if (!node) return;
    const canvas = await html2canvas(node, { backgroundColor: "#0f172a" });
    const imgData = canvas.toDataURL("image/png");
    const pdf = new jsPDF("p", "pt", "a4");
    const width = pdf.internal.pageSize.getWidth();
    const height = (canvas.height * width) / canvas.width;
    pdf.addImage(imgData, "PNG", 0, 0, width, height);
    pdf.save("databotics-profile.pdf");
  };

  const handleSaveSettings = async () => {
    if (!sessionId || !settings) return;
    setSettingsSaving(true);
    try {
      const updated = await updateProfileSettings(sessionId, settings);
      setSettings(updated);
    } finally {
      setSettingsSaving(false);
    }
  };

  // Prepare chart data
  const numericCols = profile.columns.filter((c) => c.stats);
  const statChartData = numericCols.slice(0, 5).map((col) => ({
    name: col.name.slice(0, 10),
    mean: col.stats?.mean || 0,
    std: col.stats?.std || 0,
  }));

  // For pie chart: missing values ratio
  const missingData = profile.columns.slice(0, 4).map((col) => ({
    name: col.name.slice(0, 10),
    complete: col.null_count === 0 ? 100 : ((1 - col.null_pct) * 100).toFixed(1),
    missing: (col.null_pct * 100).toFixed(1),
  }));

  // For scatter: correlation-like plot (first 2 numeric cols)
  const scatterData = numericCols.slice(0, 2).length === 2
    ? profile.sample_rows.slice(0, 50).map((row) => ({
        x: numericCols[0] ? parseFloat(String(row[numericCols[0].name])) : 0,
        y: numericCols[1] ? parseFloat(String(row[numericCols[1].name])) : 0,
      }))
    : [];

  // Sorted/filtered rows
  let displayRows = [...profile.sample_rows];
  if (searchTerm) {
    displayRows = displayRows.filter((row) =>
      JSON.stringify(row)
        .toLowerCase()
        .includes(searchTerm.toLowerCase())
    );
  }
  if (sortCol && numericCols.find((c) => c.name === sortCol)) {
    displayRows.sort(
      (a, b) => (a[sortCol] as number) - (b[sortCol] as number)
    );
  }

  const handleExportCSV = () => {
    const csv = [
      Object.keys(profile.sample_rows[0] || {}),
      ...profile.sample_rows.map((row) =>
        Object.values(row)
          .map((v) => `"${v}"`)
          .join(",")
      ),
    ]
      .join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "data_export.csv";
    a.click();
  };

  const corrColor = (value: number) => {
    const abs = Math.abs(value);
    const alpha = Math.min(0.85, 0.15 + abs * 0.85);
    return value >= 0 ? `rgba(99, 102, 241, ${alpha})` : `rgba(236, 72, 153, ${alpha})`;
  };

  const heatmapCols = correlation?.columns.slice(0, 8) ?? [];
  const heatmapData = correlation?.data.slice(0, 8).map((row) => row.slice(0, 8)) ?? [];
  const topOutliers = [...outliers].sort((a, b) => b.outlier_count - a.outlier_count).slice(0, 6);
  const topDistributions = distributions.filter((d) => typeof d.mean === "number").slice(0, 6);
  const topBoxPlots = boxPlots.slice(0, 6);

  return (
    <div id="profile-export" className="space-y-8">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/5 pb-4">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold text-foreground">Data Profile</h1>
          <p className="text-sm text-muted-foreground">
            {profile.filename} • {profile.row_count.toLocaleString()} rows • {profile.columns.length} columns
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button onClick={handleSaveReport} size="sm" className="gap-2">
            <Save className="h-4 w-4" />
            Save Report
          </Button>
          <Button onClick={handleShare} variant="outline" size="sm" className="gap-2">
            <Filter className="h-4 w-4" />
            Share Link
          </Button>
          <Button onClick={handleExportPdf} variant="outline" size="sm" className="gap-2">
            <BarChart3 className="h-4 w-4" />
            Export PDF
          </Button>
          <Button onClick={handleExportCSV} variant="outline" size="sm" className="gap-2">
            <Download className="h-4 w-4" />
            Export CSV
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          icon={Rows3}
          label="Total Rows"
          value={profile.row_count.toLocaleString()}
          color="bg-blue-500/20 text-blue-400"
        />
        <StatCard
          icon={Columns3}
          label="Total Columns"
          value={profile.columns.length}
          color="bg-purple-500/20 text-purple-400"
        />
        <StatCard
          icon={AlertCircle}
          label="Missing Values"
          value={
            profile.columns
              .reduce((sum, c) => sum + c.null_count, 0)
              .toLocaleString()
          }
          color="bg-red-500/20 text-red-400"
        />
        <StatCard
          icon={BarChart3}
          label="Numeric Columns"
          value={numericCols.length}
          color="bg-green-500/20 text-green-400"
        />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="glass-card space-y-4 rounded-2xl border border-white/10 bg-gradient-to-br from-white/5 to-white/0 p-6 backdrop-blur-xl">
          <div>
            <h3 className="text-sm font-semibold text-foreground">Saved Reports</h3>
            <p className="text-xs text-muted-foreground">Capture profile snapshots for later review.</p>
          </div>
          <div className="flex gap-2">
            <input
              value={reportName}
              onChange={(e) => setReportName(e.target.value)}
              placeholder="Report name"
              className="flex-1 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm"
            />
            <Button size="sm" onClick={handleSaveReport}>
              Save
            </Button>
          </div>
          <div className="space-y-2 max-h-52 overflow-y-auto">
            {reports.length === 0 && <p className="text-xs text-white/40">No saved reports yet.</p>}
            {reports.map((report) => (
              <div key={report.id} className="flex items-center justify-between rounded-lg border border-white/10 bg-white/5 px-3 py-2">
                <button onClick={() => handleLoadReport(report)} className="text-left text-xs text-white/80 hover:text-white">
                  {report.name}
                </button>
                <button
                  onClick={async () => {
                    await deleteReport(report.id);
                    setReports(reports.filter((r) => r.id !== report.id));
                  }}
                  className="text-xs text-red-400"
                >
                  Delete
                </button>
              </div>
            ))}
          </div>
          {shareLink && <p className="text-xs text-emerald-400">Share link copied: {shareLink}</p>}
        </div>

        <div className="glass-card space-y-4 rounded-2xl border border-white/10 bg-gradient-to-br from-white/5 to-white/0 p-6 backdrop-blur-xl">
          <div>
            <h3 className="text-sm font-semibold text-foreground">Webhook Alerts</h3>
            <p className="text-xs text-muted-foreground">Notify downstream systems when anomalies appear.</p>
          </div>
          <div>
            <label className="text-xs text-white/40">Webhook URL</label>
            <input
              value={settings?.webhook_url || ""}
              onChange={(e) => setSettings(settings ? { ...settings, webhook_url: e.target.value } : { profile_id: sessionId || "", webhook_url: e.target.value, webhook_threshold: 1 })}
              placeholder="https://hooks.example.com"
              className="mt-1 w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="text-xs text-white/40">Min anomalies to trigger</label>
            <input
              type="number"
              min={1}
              value={settings?.webhook_threshold || 1}
              onChange={(e) => setSettings(settings ? { ...settings, webhook_threshold: Number(e.target.value) } : { profile_id: sessionId || "", webhook_url: "", webhook_threshold: Number(e.target.value) })}
              className="mt-1 w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm"
            />
          </div>
          <Button size="sm" onClick={handleSaveSettings} disabled={settingsSaving}>
            {settingsSaving ? "Saving..." : "Save Settings"}
          </Button>
        </div>

        <div className="glass-card space-y-4 rounded-2xl border border-white/10 bg-gradient-to-br from-white/5 to-white/0 p-6 backdrop-blur-xl">
          <div>
            <h3 className="text-sm font-semibold text-foreground">Comments</h3>
            <p className="text-xs text-muted-foreground">Share notes with your team while reviewing the profile.</p>
          </div>
          <div className="flex gap-2">
            <input
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              placeholder="Add a comment"
              className="flex-1 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm"
            />
            <Button size="sm" onClick={handleAddComment}>
              Post
            </Button>
          </div>
          <div className="space-y-2 max-h-52 overflow-y-auto">
            {comments.length === 0 && <p className="text-xs text-white/40">No comments yet.</p>}
            {comments.map((comment) => (
              <div key={comment.id} className="rounded-lg border border-white/10 bg-white/5 px-3 py-2">
                <div className="flex items-center justify-between">
                  <p className="text-xs text-white/60">{comment.user_id}</p>
                  <button onClick={() => handleDeleteComment(comment.id)} className="text-xs text-red-400">Delete</button>
                </div>
                <p className="text-sm text-white/80">{comment.content}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Insights */}
      <div className="space-y-3">
        <h2 className="text-lg font-semibold text-foreground">
          Auto-Generated Insights
        </h2>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
          {insights.map((insight, idx) => (
            <InsightCard key={idx} insight={insight} />
          ))}
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Bar Chart: Mean & Std Dev */}
        {statChartData.length > 0 && (
          <ChartCard title="Mean & Standard Deviation">
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={statChartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                <XAxis dataKey="name" stroke="rgba(255,255,255,0.6)" />
                <YAxis stroke="rgba(255,255,255,0.6)" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "rgba(15, 23, 42, 0.9)",
                    border: "1px solid rgba(255,255,255,0.1)",
                  }}
                />
                <Legend />
                <Bar dataKey="mean" fill="#6366f1" />
                <Bar dataKey="std" fill="#8b5cf6" />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
        )}

        {/* Pie Chart: Data Completeness */}
        {missingData.length > 0 && (
          <ChartCard title="Data Completeness">
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={[
                    {
                      name: "Complete",
                      value: 100 - parseFloat(missingData[0]?.missing || "0"),
                    },
                    {
                      name: "Missing",
                      value: parseFloat(missingData[0]?.missing || "0"),
                    },
                  ]}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, value }) => `${name}: ${value.toFixed(1)}%`}
                  outerRadius={80}
                  fill="#8b5cf6"
                  dataKey="value"
                >
                  <Cell fill="#10b981" />
                  <Cell fill="#ef4444" />
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </ChartCard>
        )}

        {/* Line Chart: Column Statistics */}
        {numericCols.length > 1 && (
          <ChartCard title="Column Value Range">
            <ResponsiveContainer width="100%" height={300}>
              <LineChart
                data={numericCols.slice(0, 5).map((col) => ({
                  name: col.name.slice(0, 8),
                  min: col.stats?.min || 0,
                  max: col.stats?.max || 0,
                }))}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                <XAxis dataKey="name" stroke="rgba(255,255,255,0.6)" />
                <YAxis stroke="rgba(255,255,255,0.6)" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "rgba(15, 23, 42, 0.9)",
                    border: "1px solid rgba(255,255,255,0.1)",
                  }}
                />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="min"
                  stroke="#6366f1"
                  strokeWidth={2}
                />
                <Line
                  type="monotone"
                  dataKey="max"
                  stroke="#ec4899"
                  strokeWidth={2}
                />
              </LineChart>
            </ResponsiveContainer>
          </ChartCard>
        )}

        {/* Scatter: Distribution */}
        {scatterData.length > 0 && (
          <ChartCard
            title={`${numericCols[0]?.name || "X"} vs ${numericCols[1]?.name || "Y"}`}
          >
            <ResponsiveContainer width="100%" height={300}>
              <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                <XAxis
                  type="number"
                  dataKey="x"
                  stroke="rgba(255,255,255,0.6)"
                />
                <YAxis
                  type="number"
                  dataKey="y"
                  stroke="rgba(255,255,255,0.6)"
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "rgba(15, 23, 42, 0.9)",
                    border: "1px solid rgba(255,255,255,0.1)",
                  }}
                />
                <Scatter
                  name="Data Points"
                  data={scatterData}
                  fill="#6366f1"
                  fillOpacity={0.6}
                />
              </ScatterChart>
            </ResponsiveContainer>
          </ChartCard>
        )}
      </div>

      {/* Advanced Analytics */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold text-foreground">Advanced Analytics</h2>
        {advancedLoading && (
          <div className="glass-card rounded-2xl border border-white/10 bg-gradient-to-br from-white/5 to-white/0 p-6 text-sm text-muted-foreground">
            Loading correlation, outliers, and distributions…
          </div>
        )}
        {advancedError && (
          <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-400">
            {advancedError}
          </div>
        )}

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {heatmapCols.length > 0 && (
            <ChartCard title="Correlation Heatmap (Top 8)">
              <div className="overflow-x-auto">
                <div className="grid" style={{ gridTemplateColumns: `120px repeat(${heatmapCols.length}, minmax(56px, 1fr))` }}>
                  <div />
                  {heatmapCols.map((c) => (
                    <div key={c} className="px-2 pb-2 text-xs text-muted-foreground truncate">{c}</div>
                  ))}
                  {heatmapCols.map((rowLabel, i) => (
                    <div key={rowLabel} className="contents">
                      <div className="pr-2 py-1 text-xs text-muted-foreground truncate">{rowLabel}</div>
                      {heatmapData[i]?.map((val, j) => (
                        <div
                          key={`${rowLabel}-${j}`}
                          className="h-10 rounded-md border border-white/5 flex items-center justify-center text-[10px] text-white/80"
                          style={{ background: corrColor(val) }}
                        >
                          {val.toFixed(2)}
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              </div>
            </ChartCard>
          )}

          {topOutliers.length > 0 && (
            <ChartCard title="Outliers by Column">
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={topOutliers.map((o) => ({ name: o.column_name.slice(0, 10), count: o.outlier_count }))}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                  <XAxis dataKey="name" stroke="rgba(255,255,255,0.6)" />
                  <YAxis stroke="rgba(255,255,255,0.6)" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "rgba(15, 23, 42, 0.9)",
                      border: "1px solid rgba(255,255,255,0.1)",
                    }}
                  />
                  <Bar dataKey="count" fill="#f59e0b" />
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>
          )}
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {topBoxPlots.length > 0 && (
            <ChartCard title="Box Plot Summary">
              <div className="space-y-3">
                {topBoxPlots.map((b) => (
                  <div key={b.column_name} className="rounded-lg border border-white/10 bg-white/5 p-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-foreground">{b.column_name}</span>
                      <span className="text-xs text-muted-foreground">outliers: {b.outliers.length}</span>
                    </div>
                    <div className="mt-2 grid grid-cols-5 gap-2 text-[10px] text-muted-foreground">
                      <div>min {b.min.toFixed(2)}</div>
                      <div>q1 {b.q1.toFixed(2)}</div>
                      <div>med {b.median.toFixed(2)}</div>
                      <div>q3 {b.q3.toFixed(2)}</div>
                      <div>max {b.max.toFixed(2)}</div>
                    </div>
                  </div>
                ))}
              </div>
            </ChartCard>
          )}

          {topDistributions.length > 0 && (
            <ChartCard title="Distributions (Numeric)">
              <div className="space-y-3">
                {topDistributions.map((d) => (
                  <div key={d.column_name} className="rounded-lg border border-white/10 bg-white/5 p-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-foreground">{d.column_name}</span>
                      <span className="text-xs text-muted-foreground">missing {d.missing}</span>
                    </div>
                    <div className="mt-2 grid grid-cols-3 gap-2 text-[10px] text-muted-foreground">
                      <div>mean {Number(d.mean ?? 0).toFixed(2)}</div>
                      <div>median {Number(d.median ?? 0).toFixed(2)}</div>
                      <div>std {Number(d.std ?? 0).toFixed(2)}</div>
                    </div>
                  </div>
                ))}
              </div>
            </ChartCard>
          )}
        </div>
      </div>

      {/* Column Statistics Table */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold text-foreground">
          Column Details
        </h2>
        <div className="glass-card overflow-x-auto rounded-2xl border border-white/10 bg-gradient-to-br from-white/5 to-white/0 backdrop-blur-xl">
          <Table>
            <TableHeader>
              <TableRow className="border-white/10 hover:bg-white/5">
                <TableHead className="text-foreground">Column</TableHead>
                <TableHead className="text-foreground">Type</TableHead>
                <TableHead className="text-foreground">Null Count</TableHead>
                <TableHead className="text-foreground">Min</TableHead>
                <TableHead className="text-foreground">Max</TableHead>
                <TableHead className="text-foreground">Mean</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {profile.columns.map((col) => (
                <TableRow key={col.name} className="border-white/10 hover:bg-white/5">
                  <TableCell className="font-medium">{col.name}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{col.type}</Badge>
                  </TableCell>
                  <TableCell>{col.null_count}</TableCell>
                  <TableCell>
                    {col.stats?.min?.toFixed(2) || "—"}
                  </TableCell>
                  <TableCell>
                    {col.stats?.max?.toFixed(2) || "—"}
                  </TableCell>
                  <TableCell>
                    {col.stats?.mean?.toFixed(2) || "—"}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Data Preview with Search/Sort */}
      <div className="space-y-4">
        <div className="flex gap-2">
          <input
            type="text"
            placeholder="Search rows..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="flex-1 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground"
          />
          <select
            value={sortCol || ""}
            onChange={(e) => setSortCol(e.target.value || null)}
            className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-foreground"
          >
            <option value="">Sort by...</option>
            {numericCols.map((col) => (
              <option key={col.name} value={col.name}>
                {col.name}
              </option>
            ))}
          </select>
        </div>

        <div className="glass-card overflow-x-auto rounded-2xl border border-white/10 bg-gradient-to-br from-white/5 to-white/0 backdrop-blur-xl">
          <Table>
            <TableHeader>
              <TableRow className="border-white/10 hover:bg-white/5">
                {profile.columns.slice(0, 6).map((col) => (
                  <TableHead key={col.name} className="text-foreground">
                    {col.name}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {displayRows.slice(0, 10).map((row, idx) => (
                <TableRow key={idx} className="border-white/10 hover:bg-white/5">
                  {profile.columns.slice(0, 6).map((col) => (
                    <TableCell key={col.name} className="text-sm">
                      {String(row[col.name]).slice(0, 20)}
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
        <p className="text-xs text-muted-foreground">
          Showing {Math.min(10, displayRows.length)} of {displayRows.length} rows
        </p>
      </div>
    </div>
  );
}
