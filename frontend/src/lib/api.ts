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
}

export interface GenerateSqlResponse {
  sql: string;
  explanation: string;
  safety: Record<string, unknown>;
}

export interface AnalyzeRequest {
  timestamp_col: string;
  metric_col: string;
  dimension_cols?: string[];
  method?: string;
}

export interface AnalyzeResponse {
  anomalies: Array<Record<string, unknown>>;
  summary: Record<string, unknown>;
  narrative: string;
}

export interface CleanOptions {
  trim_strings: boolean;
  normalize_case?: "lower" | "upper";
  drop_duplicates: boolean;
}

async function fetchJson<T>(input: RequestInfo | URL, init?: RequestInit): Promise<T> {
  const response = await fetch(input, init);
  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || `Request failed: ${response.status}`);
  }
  return response.json() as Promise<T>;
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

  const response = await fetch(`${API_BASE_URL}/clean?${params.toString()}`, {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || `Request failed: ${response.status}`);
  }

  return response.blob();
}

export async function analyzeFile(file: File, payload: AnalyzeRequest): Promise<AnalyzeResponse> {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("payload", new Blob([JSON.stringify(payload)], { type: "application/json" }));

  return fetchJson<AnalyzeResponse>(`${API_BASE_URL}/analyze`, {
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
