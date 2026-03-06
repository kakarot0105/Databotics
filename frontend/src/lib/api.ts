import { getToken } from "./auth";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000";

export interface ColumnStats {
  name: string;
  type: string;
  null_count: number;
  null_pct: number;
  stats?: Record<string, number | null> | null;
}

export interface ProfileResponse {
  dataset_id?: string | null;
  filename?: string | null;
  row_count: number;
  columns: ColumnStats[];
  sample_rows: Record<string, unknown>[];
  warnings: string[];
}

export interface ValidationViolation {
  column?: string;
  message?: string;
  row_sample?: unknown;
  [key: string]: unknown;
}

export interface ValidateResponse {
  dataset_id?: string | null;
  ruleset_id?: string | null;
  summary: Record<string, unknown>;
  violations: ValidationViolation[];
}

export interface QueryResponse {
  columns: string[];
  rows: Record<string, unknown>[];
  row_count: number;
}

export interface GenerateSqlRequest {
  question: string;
  table: string;
  schema: Record<string, string>;
  sample_rows?: Record<string, unknown>[];
  model?: "claude" | "kimi" | "codex";
}

export interface GenerateSqlResponse {
  sql: string;
  explanation: string;
  safety: Record<string, unknown>;
}

export interface AnalyzeRequest {
  columns?: string[];
  outlier_method?: "iqr" | "zscore";
  null_spike_window?: number;
  null_spike_baseline?: number;
  type_mismatch_threshold?: number;
  webhook_url?: string | null;
  webhook_threshold?: number | null;
}

export interface AnalyzeResponse {
  anomalies: Array<Record<string, unknown>>;
  summary: Record<string, unknown>;
  narrative?: string | null;
}

export interface CorrelationMatrix {
  columns: string[];
  data: number[][];
  method: string;
}

export interface DistributionAnalysis {
  column_name: string;
  dtype: string;
  count: number;
  missing: number;
  unique: number;
  min?: number | null;
  q1?: number | null;
  median?: number | null;
  mean?: number | null;
  q3?: number | null;
  max?: number | null;
  std?: number | null;
  mode?: string | null;
  top_values?: Array<{ value: string; count: number; percentage: number }> | null;
}

export interface OutlierDetectionResult {
  column_name: string;
  method: string;
  outlier_count: number;
  outlier_percentage: number;
  lower_bound?: number | null;
  upper_bound?: number | null;
  outliers: Array<Record<string, unknown>>;
}

export interface BoxPlotData {
  column_name: string;
  dtype: string;
  min: number;
  q1: number;
  median: number;
  q3: number;
  max: number;
  mean: number;
  std: number;
  outliers: number[];
}

export interface Insight {
  title: string;
  description: string;
  type: string;
  confidence: number;
  supporting_data?: Record<string, unknown> | null;
}

export interface InsightReport {
  dataset_name?: string | null;
  total_rows: number;
  total_columns: number;
  insights: Insight[];
  generated_at?: string | null;
  ai_model: string;
}

export interface ReportPayload {
  [key: string]: unknown;
}

export interface ReportResponse {
  id: number;
  name: string;
  payload: ReportPayload;
  created_at: string;
}

export interface ProfileSettings {
  profile_id: string;
  webhook_url?: string | null;
  webhook_threshold?: number | null;
  updated_at?: string | null;
}

export interface CommentResponse {
  id: number;
  profile_id: string;
  chart_id?: string | null;
  user_id: string;
  content: string;
  created_at: string;
}

export interface CleanOptions {
  trim_strings: boolean;
  normalize_case?: "lower" | "upper";
  drop_duplicates: boolean;
}

function withAuthHeaders(init?: RequestInit): RequestInit {
  const token = getToken();
  const headers = new Headers(init?.headers ?? {});
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }
  return { ...init, headers };
}

function handleUnauthorized(response: Response) {
  if (response.status === 401 && typeof window !== "undefined") {
    window.location.href = "/login";
  }
}

async function fetchJson<T>(input: RequestInfo | URL, init?: RequestInit): Promise<T> {
  const response = await fetch(input, withAuthHeaders(init));
  handleUnauthorized(response);
  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || `Request failed: ${response.status}`);
  }
  return response.json() as Promise<T>;
}

export interface UploadResponse {
  session_id: string;
  filename: string;
  size: number;
}

export interface ConnectorPayload {
  name: string;
  engine: string;
  host?: string;
  port?: number | null;
  database?: string;
  username?: string;
  password?: string;
  ssl?: boolean;
  connection_string?: string;
  options?: Record<string, unknown>;
  tags?: string[];
  color?: string;
}

export interface ConnectorResponse {
  id: string;
  [key: string]: unknown;
}

export interface ConnectorTable {
  name: string;
  type: string;
  row_count?: number;
  columns?: Array<{ name: string; type: string }>;
}

export interface ConnectorSchemaResponse {
  tables: ConnectorTable[];
  table_count: number;
}

export interface ConnectorImportResponse {
  session_id: string;
  rows: number;
  columns: number;
  column_names: string[];
  dtypes: Record<string, string>;
}

export async function uploadFile(file: File): Promise<UploadResponse> {
  const formData = new FormData();
  formData.append("file", file);
  return fetchJson<UploadResponse>(`${API_BASE_URL}/upload`, {
    method: "POST",
    body: formData,
  });
}

export async function profileBySession(sessionId: string): Promise<ProfileResponse> {
  return fetchJson<ProfileResponse>(`${API_BASE_URL}/profile/${sessionId}`, {
    method: "POST",
  });
}

export async function createConnector(payload: ConnectorPayload): Promise<ConnectorResponse> {
  return fetchJson<ConnectorResponse>(`${API_BASE_URL}/connectors`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

export async function testConnector(connId: string): Promise<Record<string, unknown>> {
  return fetchJson<Record<string, unknown>>(`${API_BASE_URL}/connectors/${connId}/test`, {
    method: "POST",
  });
}

export async function getConnectorSchema(connId: string): Promise<ConnectorSchemaResponse> {
  return fetchJson<ConnectorSchemaResponse>(`${API_BASE_URL}/connectors/${connId}/schema`);
}

export async function importConnectorTable(connId: string, query: string, limit = 1000): Promise<ConnectorImportResponse> {
  return fetchJson<ConnectorImportResponse>(`${API_BASE_URL}/connectors/${connId}/import`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query, limit }),
  });
}

export async function profileFile(file: File): Promise<ProfileResponse> {
  const formData = new FormData();
  formData.append("file", file);
  return fetchJson<ProfileResponse>(`${API_BASE_URL}/profile`, {
    method: "POST",
    body: formData,
  });
}

export async function validateFile(file: File, rulesPath?: string): Promise<ValidateResponse> {
  const formData = new FormData();
  formData.append("file", file);
  const query = rulesPath ? `?rules_path=${encodeURIComponent(rulesPath)}` : "";
  return fetchJson<ValidateResponse>(`${API_BASE_URL}/validate${query}`, {
    method: "POST",
    body: formData,
  });
}

export async function queryFile(file: File, sql: string): Promise<QueryResponse> {
  const formData = new FormData();
  formData.append("file", file);
  const query = `?sql=${encodeURIComponent(sql)}`;
  return fetchJson<QueryResponse>(`${API_BASE_URL}/query${query}`, {
    method: "POST",
    body: formData,
  });
}

export async function cleanFile(file: File, options: CleanOptions): Promise<Blob> {
  const formData = new FormData();
  formData.append("file", file);
  const params = new URLSearchParams({
    trim_strings: String(options.trim_strings),
    drop_duplicates: String(options.drop_duplicates),
  });
  if (options.normalize_case) {
    params.set("normalize_case", options.normalize_case);
  }

  const response = await fetch(
    `${API_BASE_URL}/clean?${params.toString()}`,
    withAuthHeaders({
      method: "POST",
      body: formData,
    }),
  );

  handleUnauthorized(response);
  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || `Request failed: ${response.status}`);
  }

  return response.blob();
}

export async function analyzeFile(file: File, payload: AnalyzeRequest): Promise<AnalyzeResponse> {
  const formData = new FormData();
  formData.append("file", file);
  const params = new URLSearchParams();
  if (payload.columns?.length) params.set("columns", payload.columns.join(","));
  if (payload.outlier_method) params.set("outlier_method", payload.outlier_method);
  if (payload.null_spike_window) params.set("null_spike_window", String(payload.null_spike_window));
  if (payload.null_spike_baseline) params.set("null_spike_baseline", String(payload.null_spike_baseline));
  if (payload.type_mismatch_threshold) params.set("type_mismatch_threshold", String(payload.type_mismatch_threshold));

  return fetchJson<AnalyzeResponse>(`${API_BASE_URL}/analyze?${params.toString()}`, {
    method: "POST",
    body: formData,
  });
}

export async function generateSql(payload: GenerateSqlRequest): Promise<GenerateSqlResponse> {
  return fetchJson<GenerateSqlResponse>(`${API_BASE_URL}/generate_sql`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

// ---- Session-based API functions (no file re-upload) ----

export async function queryBySession(sessionId: string, sql: string): Promise<QueryResponse> {
  const query = `?sql=${encodeURIComponent(sql)}`;
  return fetchJson<QueryResponse>(`${API_BASE_URL}/query/${sessionId}${query}`, {
    method: "POST",
  });
}

export async function validateBySession(sessionId: string, rulesPath?: string): Promise<ValidateResponse> {
  const query = rulesPath ? `?rules_path=${encodeURIComponent(rulesPath)}` : "";
  return fetchJson<ValidateResponse>(`${API_BASE_URL}/validate/${sessionId}${query}`, {
    method: "POST",
  });
}

export async function cleanBySession(sessionId: string, options: CleanOptions): Promise<Blob> {
  const params = new URLSearchParams({
    trim_strings: String(options.trim_strings),
    drop_duplicates: String(options.drop_duplicates),
  });
  if (options.normalize_case) {
    params.set("normalize_case", options.normalize_case);
  }
  const response = await fetch(
    `${API_BASE_URL}/clean/${sessionId}?${params.toString()}`,
    withAuthHeaders({ method: "POST" }),
  );
  handleUnauthorized(response);
  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || `Request failed: ${response.status}`);
  }
  return response.blob();
}

export async function analyzeBySession(sessionId: string, payload: AnalyzeRequest): Promise<AnalyzeResponse> {
  const params = new URLSearchParams();
  if (payload.columns?.length) params.set("columns", payload.columns.join(","));
  if (payload.outlier_method) params.set("outlier_method", payload.outlier_method);
  if (payload.null_spike_window) params.set("null_spike_window", String(payload.null_spike_window));
  if (payload.null_spike_baseline) params.set("null_spike_baseline", String(payload.null_spike_baseline));
  if (payload.type_mismatch_threshold) params.set("type_mismatch_threshold", String(payload.type_mismatch_threshold));
  return fetchJson<AnalyzeResponse>(`${API_BASE_URL}/analyze/${sessionId}?${params.toString()}`, {
    method: "POST",
  });
}

// ---- Advanced Analytics ----

export async function correlateFile(file: File, method: string = "pearson"): Promise<CorrelationMatrix> {
  const formData = new FormData();
  formData.append("file", file);
  const params = new URLSearchParams({ method });
  return fetchJson<CorrelationMatrix>(`${API_BASE_URL}/correlate?${params.toString()}`, {
    method: "POST",
    body: formData,
  });
}

export async function correlateBySession(sessionId: string, method: string = "pearson"): Promise<CorrelationMatrix> {
  const params = new URLSearchParams({ method });
  return fetchJson<CorrelationMatrix>(`${API_BASE_URL}/correlate/${sessionId}?${params.toString()}`, { method: "POST" });
}

export async function distributionsFile(file: File): Promise<{ distributions: DistributionAnalysis[] }> {
  const formData = new FormData();
  formData.append("file", file);
  return fetchJson<{ distributions: DistributionAnalysis[] }>(`${API_BASE_URL}/distributions`, {
    method: "POST",
    body: formData,
  });
}

export async function distributionsBySession(sessionId: string): Promise<{ distributions: DistributionAnalysis[] }> {
  return fetchJson<{ distributions: DistributionAnalysis[] }>(`${API_BASE_URL}/distributions/${sessionId}`, { method: "POST" });
}

export async function outliersFile(file: File, method: string = "iqr", threshold: number = 1.5): Promise<{ outliers: OutlierDetectionResult[]; method: string; threshold: number }> {
  const formData = new FormData();
  formData.append("file", file);
  const params = new URLSearchParams({ method, threshold: String(threshold) });
  return fetchJson<{ outliers: OutlierDetectionResult[]; method: string; threshold: number }>(`${API_BASE_URL}/outliers?${params.toString()}`, {
    method: "POST",
    body: formData,
  });
}

export async function outliersBySession(sessionId: string, method: string = "iqr", threshold: number = 1.5): Promise<{ outliers: OutlierDetectionResult[]; method: string; threshold: number }> {
  const params = new URLSearchParams({ method, threshold: String(threshold) });
  return fetchJson<{ outliers: OutlierDetectionResult[]; method: string; threshold: number }>(`${API_BASE_URL}/outliers/${sessionId}?${params.toString()}`, { method: "POST" });
}

export async function boxPlotsFile(file: File): Promise<{ box_plots: BoxPlotData[] }> {
  const formData = new FormData();
  formData.append("file", file);
  return fetchJson<{ box_plots: BoxPlotData[] }>(`${API_BASE_URL}/box-plots`, { method: "POST", body: formData });
}

export async function boxPlotsBySession(sessionId: string): Promise<{ box_plots: BoxPlotData[] }> {
  return fetchJson<{ box_plots: BoxPlotData[] }>(`${API_BASE_URL}/box-plots/${sessionId}`, { method: "POST" });
}

export async function insightsFile(file: File, useAi: boolean = true): Promise<InsightReport> {
  const formData = new FormData();
  formData.append("file", file);
  const params = new URLSearchParams({ use_ai: String(useAi) });
  return fetchJson<InsightReport>(`${API_BASE_URL}/insights?${params.toString()}`, { method: "POST", body: formData });
}

export async function insightsBySession(sessionId: string, useAi: boolean = true): Promise<InsightReport> {
  const params = new URLSearchParams({ use_ai: String(useAi) });
  return fetchJson<InsightReport>(`${API_BASE_URL}/insights/${sessionId}?${params.toString()}`, { method: "POST" });
}

// ---- Sessions ----

export interface SessionMeta {
  session_id: string;
  filename: string;
  created_at: string;
  last_modified: string;
  data_shape: [number, number];
  size_kb: number;
}

export interface SessionState {
  session_id: string;
  filename: string;
  created_at: string;
  last_modified: string;
  data_shape: [number, number];
  columns: string[];
  operations: Array<Record<string, unknown>>;
  insights: Record<string, unknown> | null;
  undo_stack: Array<Record<string, unknown>>;
  redo_stack: Array<Record<string, unknown>>;
}

export async function listSessions(): Promise<{ sessions: SessionMeta[]; count: number }> {
  return fetchJson<{ sessions: SessionMeta[]; count: number }>(`${API_BASE_URL}/session/list`, { method: "GET" });
}

export async function loadSession(sessionId: string): Promise<SessionState> {
  return fetchJson<SessionState>(`${API_BASE_URL}/session/load/${sessionId}`, { method: "POST" });
}

export async function deleteSession(sessionId: string): Promise<{ deleted: boolean }> {
  return fetchJson<{ deleted: boolean }>(`${API_BASE_URL}/session/${sessionId}`, { method: "DELETE" });
}

export async function exportSession(sessionId: string): Promise<Blob> {
  const response = await fetch(`${API_BASE_URL}/session/export/${sessionId}`, withAuthHeaders({ method: "POST" }));
  handleUnauthorized(response);
  if (!response.ok) throw new Error("Export failed");
  return response.blob();
}

export async function getShortcuts(platform: string = "windows"): Promise<{ shortcuts: Record<string, string> }> {
  return fetchJson<{ shortcuts: Record<string, string> }>(`${API_BASE_URL}/shortcuts?platform=${platform}`, { method: "GET" });
}

// ---- Reports ----

export async function listReports(): Promise<ReportResponse[]> {
  return fetchJson<ReportResponse[]>(`${API_BASE_URL}/reports`, { method: "GET" });
}

export async function createReport(name: string, payload: ReportPayload): Promise<ReportResponse> {
  return fetchJson<ReportResponse>(`${API_BASE_URL}/reports`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, payload }),
  });
}

export async function getReport(reportId: number): Promise<ReportResponse> {
  return fetchJson<ReportResponse>(`${API_BASE_URL}/reports/${reportId}`, { method: "GET" });
}

export async function deleteReport(reportId: number): Promise<{ deleted: boolean }> {
  return fetchJson<{ deleted: boolean }>(`${API_BASE_URL}/reports/${reportId}`, { method: "DELETE" });
}

// ---- Profile settings ----

export async function getProfileSettings(profileId: string): Promise<ProfileSettings> {
  return fetchJson<ProfileSettings>(`${API_BASE_URL}/profiles/${profileId}/settings`, { method: "GET" });
}

export async function updateProfileSettings(profileId: string, settings: Partial<ProfileSettings>): Promise<ProfileSettings> {
  return fetchJson<ProfileSettings>(`${API_BASE_URL}/profiles/${profileId}/settings`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ webhook_url: settings.webhook_url, webhook_threshold: settings.webhook_threshold }),
  });
}

// ---- Sharing ----

export async function createShareLink(profileId: string): Promise<{ profile_id: string; token: string; created_at?: string }> {
  return fetchJson<{ profile_id: string; token: string; created_at?: string }>(`${API_BASE_URL}/profiles/${profileId}/share`, { method: "POST" });
}

export async function getSharedProfile(token: string): Promise<ProfileResponse> {
  return fetchJson<ProfileResponse>(`${API_BASE_URL}/share/${token}`, { method: "GET" });
}

// ---- Comments ----

export async function listComments(profileId: string): Promise<CommentResponse[]> {
  return fetchJson<CommentResponse[]>(`${API_BASE_URL}/profiles/${profileId}/comments`, { method: "GET" });
}

export async function addComment(profileId: string, content: string, chartId?: string | null): Promise<CommentResponse> {
  return fetchJson<CommentResponse>(`${API_BASE_URL}/profiles/${profileId}/comments`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ content, chart_id: chartId ?? null }),
  });
}

export async function removeComment(profileId: string, commentId: number): Promise<{ deleted: boolean }> {
  return fetchJson<{ deleted: boolean }>(`${API_BASE_URL}/profiles/${profileId}/comments/${commentId}`, { method: "DELETE" });
}

// ---- Dashboards ----

export type DashboardWidgetType =
  | "kpi_card"
  | "bar_chart"
  | "line_chart"
  | "pie_chart"
  | "table"
  | "stat_counter"
  | "area_chart"
  | "scatter_plot";

export interface DashboardWidget {
  id: number;
  dashboard_id: number;
  widget_type: DashboardWidgetType;
  title: string;
  config?: Record<string, unknown> | null;
  position?: Record<string, unknown> | null;
  size?: Record<string, unknown> | null;
}

export interface DashboardResponse {
  id: number;
  name: string;
  description?: string | null;
  layout_config?: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
  widget_count: number;
  widgets: DashboardWidget[];
}

export interface DashboardListItem {
  id: number;
  name: string;
  description?: string | null;
  widget_count: number;
  updated_at: string;
  created_at: string;
}

export async function listDashboards(): Promise<DashboardListItem[]> {
  return fetchJson<DashboardListItem[]>(`${API_BASE_URL}/api/dashboards`, { method: "GET" });
}

export async function createDashboard(payload: { name: string; description?: string; layout_config?: Record<string, unknown> | null }): Promise<DashboardResponse> {
  return fetchJson<DashboardResponse>(`${API_BASE_URL}/api/dashboards`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

export async function getDashboard(dashboardId: number): Promise<DashboardResponse> {
  return fetchJson<DashboardResponse>(`${API_BASE_URL}/api/dashboards/${dashboardId}`, { method: "GET" });
}

export async function updateDashboard(
  dashboardId: number,
  payload: { name?: string; description?: string; layout_config?: Record<string, unknown> | null },
): Promise<DashboardResponse> {
  return fetchJson<DashboardResponse>(`${API_BASE_URL}/api/dashboards/${dashboardId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

export async function deleteDashboard(dashboardId: number): Promise<{ deleted: boolean; dashboard_id: number }> {
  return fetchJson<{ deleted: boolean; dashboard_id: number }>(`${API_BASE_URL}/api/dashboards/${dashboardId}`, { method: "DELETE" });
}

export async function addDashboardWidget(
  dashboardId: number,
  payload: Omit<DashboardWidget, "id" | "dashboard_id">,
): Promise<DashboardWidget> {
  return fetchJson<DashboardWidget>(`${API_BASE_URL}/api/dashboards/${dashboardId}/widgets`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

export async function updateDashboardWidget(
  dashboardId: number,
  widgetId: number,
  payload: Partial<Omit<DashboardWidget, "id" | "dashboard_id">>,
): Promise<DashboardWidget> {
  return fetchJson<DashboardWidget>(`${API_BASE_URL}/api/dashboards/${dashboardId}/widgets/${widgetId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

export async function deleteDashboardWidget(dashboardId: number, widgetId: number): Promise<{ deleted: boolean; widget_id: number }> {
  return fetchJson<{ deleted: boolean; widget_id: number }>(`${API_BASE_URL}/api/dashboards/${dashboardId}/widgets/${widgetId}`, {
    method: "DELETE",
  });
}

export async function shareDashboard(dashboardId: number, expiresInDays = 7): Promise<{ dashboard_id: number; token: string; expires_at?: string | null }> {
  return fetchJson<{ dashboard_id: number; token: string; expires_at?: string | null }>(`${API_BASE_URL}/api/dashboards/${dashboardId}/share`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ expires_in_days: expiresInDays }),
  });
}

export async function getSharedDashboard(token: string): Promise<DashboardResponse> {
  return fetchJson<DashboardResponse>(`${API_BASE_URL}/api/dashboards/shared/${token}`, { method: "GET" });
}

