"use client";

import { useCallback, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useAppStore } from "@/lib/store";
import {
  uploadFile,
  profileBySession,
  createConnector,
  testConnector,
  getConnectorSchema,
  importConnectorTable,
  type ConnectorTable,
} from "@/lib/api";
import { toast } from "sonner";
import {
  Upload,
  FileSpreadsheet,
  Loader2,
  CheckCircle2,
  Database,
  Cable,
  ShieldCheck,
  Search,
} from "lucide-react";

const ENGINES = [
  { value: "postgresql", label: "PostgreSQL", icon: "🐘" },
  { value: "mysql", label: "MySQL", icon: "🐬" },
  { value: "snowflake", label: "Snowflake", icon: "❄️" },
  { value: "bigquery", label: "BigQuery", icon: "☁️" },
  { value: "redshift", label: "Redshift", icon: "🔴" },
  { value: "mongodb", label: "MongoDB", icon: "🍃" },
  { value: "clickhouse", label: "ClickHouse", icon: "🏠" },
  { value: "mssql", label: "SQL Server", icon: "🪟" },
  { value: "oracle", label: "Oracle", icon: "🔶" },
  { value: "duckdb", label: "DuckDB", icon: "🦆" },
  { value: "mariadb", label: "MariaDB", icon: "🦭" },
  { value: "cockroachdb", label: "CockroachDB", icon: "🪳" },
  { value: "supabase", label: "Supabase", icon: "⚡" },
  { value: "neon", label: "Neon", icon: "🟢" },
  { value: "planetscale", label: "PlanetScale", icon: "🪐" },
  { value: "turso", label: "Turso", icon: "🧩" },
];

type TabKey = "upload" | "connect" | "connectors";

export default function UploadPage() {
  const { setUploadedFile, setProfile, setSessionId } = useAppStore();
  const [activeTab, setActiveTab] = useState<TabKey>("upload");
  const [dragOver, setDragOver] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const router = useRouter();

  // Connect flow state
  const [engine, setEngine] = useState("snowflake");
  const [connName, setConnName] = useState("Primary Warehouse");
  const [host, setHost] = useState("");
  const [port, setPort] = useState<string>("");
  const [database, setDatabase] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [ssl, setSsl] = useState(true);
  const [warehouse, setWarehouse] = useState("");
  const [schema, setSchema] = useState("public");
  const [account, setAccount] = useState("");
  const [projectId, setProjectId] = useState("");
  const [jsonKeyPath, setJsonKeyPath] = useState("");
  const [connId, setConnId] = useState<string | null>(null);
  const [testing, setTesting] = useState(false);
  const [schemaLoading, setSchemaLoading] = useState(false);
  const [tables, setTables] = useState<ConnectorTable[]>([]);
  const [tableSearch, setTableSearch] = useState("");
  const [selectedTable, setSelectedTable] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);

  const filteredTables = useMemo(() => {
    if (!tableSearch) return tables;
    return tables.filter((t) => t.name.toLowerCase().includes(tableSearch.toLowerCase()));
  }, [tables, tableSearch]);

  const handleFile = useCallback(
    async (file: File) => {
      setError(null);
      setFileName(file.name);
      setUploadedFile(file);
      setLoading(true);
      setProgress(20);
      try {
        const upload = await uploadFile(file);
        setProgress(60);
        setSessionId(upload.session_id);
        const prof = await profileBySession(upload.session_id);
        setProgress(100);
        setProfile(prof);
        toast.success("Upload complete. Profile ready.");
        setTimeout(() => router.push("/profile"), 500);
      } catch (e: unknown) {
        const message = e instanceof Error ? e.message : "Upload failed";
        setError(message);
        toast.error(message);
        setProgress(0);
      } finally {
        setLoading(false);
      }
    },
    [setUploadedFile, setProfile, setSessionId, router],
  );

  const connect = async () => {
    setError(null);
    setTesting(true);
    try {
      const payload = {
        name: connName,
        engine,
        host: host || undefined,
        port: port ? Number(port) : undefined,
        database: database || undefined,
        username: username || undefined,
        password: password || undefined,
        ssl,
        options: {
          warehouse: warehouse || undefined,
          schema: schema || undefined,
          account: account || undefined,
          project_id: projectId || undefined,
          json_key_path: jsonKeyPath || undefined,
        },
      };
      const conn = await createConnector(payload);
      const id = String(conn.id);
      await testConnector(id);
      setConnId(id);
      toast.success("Connection verified");
      setSchemaLoading(true);
      const schemaResp = await getConnectorSchema(id);
      setTables(schemaResp.tables ?? []);
      setSchemaLoading(false);
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : "Connection failed";
      setError(message);
      toast.error(message);
      setSchemaLoading(false);
    } finally {
      setTesting(false);
    }
  };

  const profileTable = async () => {
    if (!connId || !selectedTable) return;
    setImporting(true);
    setError(null);
    try {
      const query = `SELECT * FROM ${selectedTable} LIMIT 50000`;
      const imported = await importConnectorTable(connId, query, 50000);
      setSessionId(imported.session_id);
      const prof = await profileBySession(imported.session_id);
      setProfile(prof);
      setUploadedFile(null);
      toast.success("Table imported. Profile ready.");
      router.push("/profile");
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : "Import failed";
      setError(message);
      toast.error(message);
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="mx-auto w-full max-w-4xl space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold text-foreground">Upload & Connect</h1>
        <p className="text-sm text-muted-foreground">Bring in a dataset from file or live databases to start profiling.</p>
      </div>

      {/* Tabs */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {[
          { key: "upload", label: "Upload File", icon: Upload },
          { key: "connect", label: "Connect Database", icon: Database },
          { key: "connectors", label: "Connectors", icon: Cable },
        ].map((tab) => {
          const Icon = tab.icon;
          const active = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as TabKey)}
              className={`glass-card hover-lift flex items-center gap-3 rounded-xl p-4 text-left transition-all ${
                active
                  ? "border-indigo-500/30 bg-indigo-500/5 ring-1 ring-indigo-500/20"
                  : "hover:border-white/10"
              }`}
            >
              <div className={`rounded-lg p-2 ${active ? "bg-indigo-500/15 text-indigo-400" : "bg-white/5 text-muted-foreground"}`}>
                <Icon className="h-4 w-4" />
              </div>
              <div>
                <p className={`text-sm font-medium ${active ? "text-indigo-400" : "text-foreground"}`}>{tab.label}</p>
                <p className="text-xs text-muted-foreground">
                  {tab.key === "upload" ? "CSV / XLSX" : tab.key === "connect" ? "Live data" : "All supported DBs"}
                </p>
              </div>
            </button>
          );
        })}
      </div>

      {/* Upload Tab */}
      {activeTab === "upload" && (
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragOver(false);
            const f = e.dataTransfer.files[0];
            if (f) handleFile(f);
          }}
          onClick={() => {
            const input = document.createElement("input");
            input.type = "file";
            input.accept = ".csv,.xlsx,.xls";
            input.onchange = (ev) => {
              const f = (ev.target as HTMLInputElement).files?.[0];
              if (f) handleFile(f);
            };
            input.click();
          }}
          className={`glass-card group relative flex min-h-[280px] w-full cursor-pointer flex-col items-center justify-center rounded-2xl p-8 text-center transition-all duration-300 ${
            dragOver
              ? "border-indigo-500 bg-indigo-500/5 shadow-lg shadow-indigo-500/10"
              : "hover:border-indigo-500/30 hover:shadow-lg hover:shadow-indigo-500/5"
          }`}
        >
          {dragOver && (
            <div className="absolute inset-0 rounded-2xl opacity-50">
              <div
                className="absolute inset-0 rounded-2xl bg-gradient-to-r from-indigo-500 via-violet-500 to-cyan-500 opacity-20 animate-gradient"
                style={{ backgroundSize: "200% 200%" }}
              />
            </div>
          )}

          <div className="relative z-10 flex flex-col items-center gap-4">
            {loading ? (
              <>
                <Loader2 className="h-12 w-12 animate-spin text-indigo-400" />
                <div>
                  <p className="text-lg font-semibold text-foreground">Processing {fileName}</p>
                  <p className="mt-1 text-sm text-muted-foreground">Uploading and profiling your dataset…</p>
                </div>
                <div className="mt-2 h-1.5 w-48 overflow-hidden rounded-full bg-white/10">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-violet-500 transition-all duration-500"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </>
            ) : fileName && progress === 100 ? (
              <>
                <CheckCircle2 className="h-12 w-12 text-emerald-400" />
                <div>
                  <p className="text-lg font-semibold text-foreground">Upload Complete</p>
                  <p className="mt-1 text-sm text-muted-foreground">Redirecting to profile…</p>
                </div>
              </>
            ) : (
              <>
                <div className={`rounded-2xl bg-indigo-500/10 p-4 transition-transform duration-300 ${dragOver ? "scale-110" : "group-hover:scale-105"}`}>
                  <Upload className="h-8 w-8 text-indigo-400" />
                </div>
                <div>
                  <p className="text-lg font-semibold text-foreground">Drop your dataset here</p>
                  <p className="mt-1 text-sm text-muted-foreground">or click to browse files</p>
                </div>
                <div className="mt-2 flex items-center gap-3">
                  <span className="flex items-center gap-1.5 rounded-lg bg-emerald-500/10 px-3 py-1.5 text-xs font-medium text-emerald-400">
                    <FileSpreadsheet className="h-3.5 w-3.5" /> CSV
                  </span>
                  <span className="flex items-center gap-1.5 rounded-lg bg-blue-500/10 px-3 py-1.5 text-xs font-medium text-blue-400">
                    <FileSpreadsheet className="h-3.5 w-3.5" /> XLSX
                  </span>
                  <span className="flex items-center gap-1.5 rounded-lg bg-orange-500/10 px-3 py-1.5 text-xs font-medium text-orange-400">
                    <FileSpreadsheet className="h-3.5 w-3.5" /> XLS
                  </span>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Connect Database Tab */}
      {activeTab === "connect" && (
        <div className="space-y-6">
          <div className="glass-card rounded-2xl p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="rounded-xl bg-indigo-500/10 p-2 text-indigo-400">
                <Database className="h-4 w-4" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-foreground">Step 1 · Pick Engine</h3>
                <p className="text-xs text-muted-foreground">Choose your database provider</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {ENGINES.map((e) => (
                <button
                  key={e.value}
                  onClick={() => setEngine(e.value)}
                  className={`rounded-xl border px-3 py-2 text-left text-xs transition-all ${
                    engine === e.value
                      ? "border-indigo-500/40 bg-indigo-500/10 text-indigo-300"
                      : "border-white/10 bg-white/5 text-muted-foreground hover:border-white/20"
                  }`}
                >
                  <div className="text-sm">{e.icon}</div>
                  <div className="font-medium text-foreground/90">{e.label}</div>
                </button>
              ))}
            </div>
          </div>

          <div className="glass-card rounded-2xl p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="rounded-xl bg-indigo-500/10 p-2 text-indigo-400">
                <ShieldCheck className="h-4 w-4" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-foreground">Step 2 · Credentials</h3>
                <p className="text-xs text-muted-foreground">Secure connection details</p>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Connection Name</label>
                <input
                  value={connName}
                  onChange={(e) => setConnName(e.target.value)}
                  placeholder="Prod Warehouse"
                  className="w-full rounded-lg border border-border bg-background/50 px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/50"
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Host</label>
                <input
                  value={host}
                  onChange={(e) => setHost(e.target.value)}
                  placeholder="account.snowflakecomputing.com"
                  className="w-full rounded-lg border border-border bg-background/50 px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/50"
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Port</label>
                <input
                  value={port}
                  onChange={(e) => setPort(e.target.value)}
                  placeholder="443"
                  className="w-full rounded-lg border border-border bg-background/50 px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/50"
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Database</label>
                <input
                  value={database}
                  onChange={(e) => setDatabase(e.target.value)}
                  placeholder="ANALYTICS"
                  className="w-full rounded-lg border border-border bg-background/50 px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/50"
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Username</label>
                <input
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="admin"
                  className="w-full rounded-lg border border-border bg-background/50 px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/50"
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Password</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full rounded-lg border border-border bg-background/50 px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/50"
                />
              </div>
              {(engine === "snowflake" || engine === "redshift") && (
                <>
                  <div className="space-y-2">
                    <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Warehouse</label>
                    <input
                      value={warehouse}
                      onChange={(e) => setWarehouse(e.target.value)}
                      placeholder="COMPUTE_WH"
                      className="w-full rounded-lg border border-border bg-background/50 px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/50"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Schema</label>
                    <input
                      value={schema}
                      onChange={(e) => setSchema(e.target.value)}
                      placeholder="PUBLIC"
                      className="w-full rounded-lg border border-border bg-background/50 px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/50"
                    />
                  </div>
                </>
              )}
              {engine === "snowflake" && (
                <div className="space-y-2">
                  <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Account</label>
                  <input
                    value={account}
                    onChange={(e) => setAccount(e.target.value)}
                    placeholder="xy12345.us-east-1"
                    className="w-full rounded-lg border border-border bg-background/50 px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/50"
                  />
                </div>
              )}
              {engine === "bigquery" && (
                <>
                  <div className="space-y-2">
                    <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Project ID</label>
                    <input
                      value={projectId}
                      onChange={(e) => setProjectId(e.target.value)}
                      placeholder="my-gcp-project"
                      className="w-full rounded-lg border border-border bg-background/50 px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/50"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">JSON Key Path</label>
                    <input
                      value={jsonKeyPath}
                      onChange={(e) => setJsonKeyPath(e.target.value)}
                      placeholder="/secrets/bq.json"
                      className="w-full rounded-lg border border-border bg-background/50 px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/50"
                    />
                  </div>
                </>
              )}
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={connect}
                disabled={testing || !engine}
                className="gradient-btn flex items-center gap-2 rounded-lg px-5 py-2.5 text-sm font-semibold disabled:opacity-50"
              >
                {testing ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
                {testing ? "Testing…" : "Test Connection"}
              </button>
              <label className="flex items-center gap-2 text-xs text-muted-foreground">
                <input type="checkbox" checked={ssl} onChange={(e) => setSsl(e.target.checked)} />
                Use SSL
              </label>
            </div>
          </div>

          <div className="glass-card rounded-2xl p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="rounded-xl bg-indigo-500/10 p-2 text-indigo-400">
                <Search className="h-4 w-4" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-foreground">Step 3 · Pick Table</h3>
                <p className="text-xs text-muted-foreground">Browse schema after connecting</p>
              </div>
            </div>

            {schemaLoading ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" /> Loading tables…
              </div>
            ) : (
              <>
                <input
                  value={tableSearch}
                  onChange={(e) => setTableSearch(e.target.value)}
                  placeholder="Search tables"
                  className="w-full rounded-lg border border-border bg-background/50 px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/50"
                />
                <div className="max-h-64 overflow-y-auto space-y-2">
                  {filteredTables.length === 0 && (
                    <div className="text-xs text-muted-foreground">No tables loaded yet.</div>
                  )}
                  {filteredTables.map((t) => (
                    <button
                      key={t.name}
                      onClick={() => setSelectedTable(t.name)}
                      className={`w-full rounded-lg border px-4 py-3 text-left text-sm transition-all ${
                        selectedTable === t.name
                          ? "border-indigo-500/40 bg-indigo-500/10 text-indigo-300"
                          : "border-white/10 bg-white/5 text-muted-foreground hover:border-white/20"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-foreground/90">{t.name}</span>
                        <span className="text-[11px] text-muted-foreground">
                          {t.row_count ?? "?"} rows · {t.columns?.length ?? 0} cols
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
                <button
                  onClick={profileTable}
                  disabled={!selectedTable || importing}
                  className="gradient-btn flex items-center gap-2 rounded-lg px-5 py-2.5 text-sm font-semibold disabled:opacity-50"
                >
                  {importing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Database className="h-4 w-4" />}
                  {importing ? "Profiling…" : "Profile Table"}
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {/* Connectors list */}
      {activeTab === "connectors" && (
        <div className="glass-card rounded-2xl p-6">
          <h3 className="text-sm font-semibold text-foreground mb-3">Supported Connectors</h3>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {ENGINES.map((e) => (
              <div key={e.value} className="rounded-xl border border-white/10 bg-white/5 px-3 py-3">
                <div className="text-lg">{e.icon}</div>
                <div className="text-sm font-medium text-foreground/90">{e.label}</div>
                <div className="text-[11px] text-muted-foreground">{e.value}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {error && (
        <div className="animate-fade-in rounded-xl bg-red-500/10 border border-red-500/20 px-5 py-4 text-sm text-red-400">
          {error}
        </div>
      )}
    </div>
  );
}
