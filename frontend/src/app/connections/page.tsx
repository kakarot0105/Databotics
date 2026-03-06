"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Database,
  Plus,
  Trash2,
  ChevronDown,
  Save,
  Check,
  X,
  Zap,
  Shield,
  Settings,
  Search,
  Eye,
  EyeOff,
  Play,
  Clock,
  ChevronRight,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Circle,
  Download,
  Filter,
  Layers,
  Terminal,
  Lock,
  Unlock,
  Globe,
  Server,
  Cloud,
  Table,
} from "lucide-react";
import { toast } from "sonner";

interface EngineInfo {
  engine: string;
  name: string;
  icon: string;
  category: string;
  default_port: number | null;
  driver_installed: boolean;
}

interface Connection {
  id: string;
  name: string;
  engine: string;
  host: string;
  port: number | null;
  database: string;
  username: string;
  password: string;
  ssl: boolean;
  connection_string: string;
  options: Record<string, unknown>;
  status: "untested" | "connected" | "failed";
  error_message: string;
  last_tested: number | null;
  tags: string[];
  color: string;
}

interface SchemaTable {
  name: string;
  type: string;
  columns: { name: string; type: string; nullable?: boolean; pk?: boolean }[];
  row_count: number;
}

interface QueryResult {
  columns: string[];
  rows: unknown[][];
  row_count: number;
  execution_time_ms: number;
  truncated: boolean;
  message?: string;
}

interface QueryRefineResponse {
  query: string;
  explanation?: string;
  model?: string;
}

const CATEGORY_META: Record<string, { label: string; icon: React.ReactNode; color: string }> = {
  relational: { label: "Relational", icon: <Database className="w-4 h-4" />, color: "text-blue-400" },
  nosql: { label: "NoSQL", icon: <Layers className="w-4 h-4" />, color: "text-green-400" },
  warehouse: { label: "Data Warehouse", icon: <Cloud className="w-4 h-4" />, color: "text-purple-400" },
  analytics: { label: "Analytics", icon: <Zap className="w-4 h-4" />, color: "text-amber-400" },
  baas: { label: "Backend-as-a-Service", icon: <Globe className="w-4 h-4" />, color: "text-cyan-400" },
  serverless: { label: "Serverless", icon: <Server className="w-4 h-4" />, color: "text-indigo-400" },
  integration: { label: "Integrations", icon: <Globe className="w-4 h-4" />, color: "text-teal-400" },
};

const STATUS_META = {
  untested: { label: "Not tested", color: "text-white/30 bg-white/5 border-white/10", icon: <Circle className="w-3 h-3" /> },
  connected: { label: "Connected", color: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20", icon: <CheckCircle2 className="w-3 h-3" /> },
  failed: { label: "Failed", color: "text-red-400 bg-red-500/10 border-red-500/20", icon: <AlertCircle className="w-3 h-3" /> },
};

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

function getHeaders() {
  const token = typeof window !== "undefined" ? sessionStorage.getItem("token") : null;
  return { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) };
}

async function api<T = unknown>(path: string, opts?: RequestInit): Promise<T> {
  const res = await fetch(`${API}${path}`, { ...opts, headers: { ...getHeaders(), ...opts?.headers } });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail || res.statusText);
  }
  return res.json();
}

function ToggleSwitch({ enabled, onChange }: { enabled: boolean; onChange: () => void }) {
  return (
    <button onClick={onChange} className={`relative w-11 h-6 rounded-full transition-colors duration-200 ${enabled ? "bg-indigo-500" : "bg-white/10"}`}>
      <motion.div animate={{ x: enabled ? 20 : 2 }} transition={{ type: "spring", stiffness: 500, damping: 30 }} className="absolute top-1 w-4 h-4 rounded-full bg-white shadow-lg" />
    </button>
  );
}

function ConnectionForm({ engines, initial, onSave, onCancel }: { engines: EngineInfo[]; initial?: Connection; onSave: (d: Record<string, unknown>) => void; onCancel: () => void }) {
  const [form, setForm] = useState({ name: initial?.name || "", engine: initial?.engine || "postgresql", host: initial?.host || "", port: initial?.port || null as number | null, database: initial?.database || "", username: initial?.username || "", password: initial?.password || "", ssl: initial?.ssl ?? true, connection_string: initial?.connection_string || "", options: initial?.options || {}, id: initial?.id });
  const [useConnString, setUseConnString] = useState(!!initial?.connection_string);
  const [showPass, setShowPass] = useState(false);
  const [step, setStep] = useState<"engine" | "config">(initial ? "config" : "engine");
  const sel = engines.find((e) => e.engine === form.engine);
  const grouped = engines.reduce((acc, e) => { (acc[e.category] = acc[e.category] || []).push(e); return acc; }, {} as Record<string, EngineInfo[]>);
  const isRest = form.engine === "rest_api";
  const isSheets = form.engine === "google_sheets";

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }} className="rounded-2xl bg-white/[0.03] border border-white/10 overflow-hidden">
      <div className="flex items-center justify-between p-5 border-b border-white/5">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-gradient-to-br from-indigo-500/20 to-purple-500/20 border border-indigo-500/10"><Database className="w-5 h-5 text-indigo-400" /></div>
          <div><h3 className="font-semibold">{initial ? "Edit" : "New"} Connection</h3><p className="text-xs text-white/40">{step === "engine" ? "Choose engine" : `Configure ${sel?.name}`}</p></div>
        </div>
        <button onClick={onCancel} className="p-2 rounded-lg hover:bg-white/5 text-white/40"><X className="w-4 h-4" /></button>
      </div>
      <div className="p-5 space-y-5">
        {step === "engine" && Object.entries(grouped).map(([cat, engs]) => (
          <div key={cat}>
            <div className="flex items-center gap-2 mb-2"><span className={CATEGORY_META[cat]?.color}>{CATEGORY_META[cat]?.icon}</span><span className="text-xs font-medium text-white/50">{CATEGORY_META[cat]?.label}</span></div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
              {engs.map((eng) => (
                <button key={eng.engine} onClick={() => { setForm({ ...form, engine: eng.engine, port: eng.default_port }); setStep("config"); }} className={`flex items-center gap-2.5 p-3 rounded-xl border transition-all hover:bg-white/[0.04] ${form.engine === eng.engine ? "bg-indigo-500/10 border-indigo-500/30 text-indigo-400" : "bg-white/[0.02] border-white/5 text-white/70"}`}>
                  <span className="text-xl">{eng.icon}</span>
                  <div className="text-left"><p className="text-sm font-medium">{eng.name}</p>{!eng.driver_installed && <p className="text-[10px] text-amber-400/80">Driver needed</p>}</div>
                </button>
              ))}
            </div>
          </div>
        ))}
        {step === "config" && (
          <div className="space-y-4">
            {!initial && <button onClick={() => setStep("engine")} className="text-xs text-white/40 hover:text-white">← Change engine</button>}
            <div className="flex items-center gap-3 p-3 rounded-xl bg-white/[0.03] border border-white/5"><span className="text-2xl">{sel?.icon}</span><div><p className="text-sm font-medium">{sel?.name}</p><p className="text-[10px] text-white/30">{sel?.driver_installed ? "✓ Driver ready" : "⚠ Driver needed"}</p></div></div>
            <div><label className="text-xs text-white/40 mb-1 block">Name</label><input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder={`My ${sel?.name}`} className="w-full px-3 py-2.5 rounded-xl bg-white/5 border border-white/10 text-sm focus:outline-none focus:border-indigo-500/50" /></div>
            {!isRest && !isSheets && (
              <div className="flex gap-2">
                <button onClick={() => setUseConnString(false)} className={`px-3 py-1.5 rounded-lg text-xs font-medium border ${!useConnString ? "bg-indigo-500/15 text-indigo-400 border-indigo-500/30" : "bg-white/[0.03] text-white/40 border-white/5"}`}>Fields</button>
                <button onClick={() => setUseConnString(true)} className={`px-3 py-1.5 rounded-lg text-xs font-medium border ${useConnString ? "bg-indigo-500/15 text-indigo-400 border-indigo-500/30" : "bg-white/[0.03] text-white/40 border-white/5"}`}>Connection String</button>
              </div>
            )}
            {isRest && (
              <>
                <div><label className="text-xs text-white/40 mb-1 block">Endpoint URL</label><input value={form.connection_string} onChange={(e) => setForm({ ...form, connection_string: e.target.value })} placeholder="https://api.example.com/data" className="w-full px-3 py-2.5 rounded-xl bg-white/5 border border-white/10 text-sm focus:outline-none focus:border-indigo-500/50" /></div>
                <div><label className="text-xs text-white/40 mb-1 block">Headers (JSON)</label><textarea value={(form.options as Record<string, string>).headers || ""} onChange={(e) => setForm({ ...form, options: { ...form.options, headers: e.target.value } })} placeholder='{"Authorization": "Bearer ..."}' className="w-full px-3 py-2.5 rounded-xl bg-white/5 border border-white/10 text-xs font-mono focus:outline-none focus:border-indigo-500/50 resize-none h-20" /></div>
                <div><label className="text-xs text-white/40 mb-1 block">JSON Path</label><input value={(form.options as Record<string, string>).json_path || ""} onChange={(e) => setForm({ ...form, options: { ...form.options, json_path: e.target.value } })} placeholder="data.items" className="w-full px-3 py-2.5 rounded-xl bg-white/5 border border-white/10 text-sm focus:outline-none focus:border-indigo-500/50" /></div>
              </>
            )}
            {isSheets && (
              <>
                <div><label className="text-xs text-white/40 mb-1 block">Sheet ID</label><input value={form.connection_string || (form.options as Record<string, string>).sheet_id || ""} onChange={(e) => setForm({ ...form, connection_string: e.target.value, options: { ...form.options, sheet_id: e.target.value } })} placeholder="1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms" className="w-full px-3 py-2.5 rounded-xl bg-white/5 border border-white/10 text-sm focus:outline-none focus:border-indigo-500/50" /></div>
                <div><label className="text-xs text-white/40 mb-1 block">Worksheet</label><input value={(form.options as Record<string, string>).worksheet || "Sheet1"} onChange={(e) => setForm({ ...form, options: { ...form.options, worksheet: e.target.value } })} className="w-full px-3 py-2.5 rounded-xl bg-white/5 border border-white/10 text-sm focus:outline-none focus:border-indigo-500/50" /></div>
                <div><label className="text-xs text-white/40 mb-1 block">Service Account JSON</label><textarea value={(form.options as Record<string, string>).service_account_json || ""} onChange={(e) => setForm({ ...form, options: { ...form.options, service_account_json: e.target.value } })} placeholder="{...}" className="w-full px-3 py-2.5 rounded-xl bg-white/5 border border-white/10 text-xs font-mono focus:outline-none focus:border-indigo-500/50 resize-none h-28" /></div>
              </>
            )}
            {!isRest && !isSheets && (useConnString ? (
              <textarea value={form.connection_string} onChange={(e) => setForm({ ...form, connection_string: e.target.value })} placeholder={`${form.engine}://user:pass@host:port/db`} className="w-full px-3 py-2.5 rounded-xl bg-white/5 border border-white/10 text-xs font-mono focus:outline-none focus:border-indigo-500/50 resize-none h-20" />
            ) : (
              <>
                <div className="grid grid-cols-3 gap-3">
                  <div className="col-span-2"><label className="text-xs text-white/40 mb-1 block">Host</label><input value={form.host} onChange={(e) => setForm({ ...form, host: e.target.value })} placeholder="localhost" className="w-full px-3 py-2.5 rounded-xl bg-white/5 border border-white/10 text-sm focus:outline-none focus:border-indigo-500/50" /></div>
                  <div><label className="text-xs text-white/40 mb-1 block">Port</label><input type="number" value={form.port ?? ""} onChange={(e) => setForm({ ...form, port: e.target.value ? parseInt(e.target.value) : null })} className="w-full px-3 py-2.5 rounded-xl bg-white/5 border border-white/10 text-sm focus:outline-none focus:border-indigo-500/50" /></div>
                </div>
                <div><label className="text-xs text-white/40 mb-1 block">Database</label><input value={form.database} onChange={(e) => setForm({ ...form, database: e.target.value })} className="w-full px-3 py-2.5 rounded-xl bg-white/5 border border-white/10 text-sm focus:outline-none focus:border-indigo-500/50" /></div>
                <div className="grid grid-cols-2 gap-3">
                  <div><label className="text-xs text-white/40 mb-1 block">Username</label><input value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} className="w-full px-3 py-2.5 rounded-xl bg-white/5 border border-white/10 text-sm focus:outline-none focus:border-indigo-500/50" /></div>
                  <div><label className="text-xs text-white/40 mb-1 block">Password</label><div className="relative"><input type={showPass ? "text" : "password"} value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} className="w-full px-3 py-2.5 pr-9 rounded-xl bg-white/5 border border-white/10 text-sm focus:outline-none focus:border-indigo-500/50" /><button onClick={() => setShowPass(!showPass)} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-white/30 hover:text-white">{showPass ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}</button></div></div>
                </div>
              </>
            ))}
            {!isRest && !isSheets && (
              <div className="flex items-center justify-between p-3 rounded-xl bg-white/[0.03] border border-white/5">
                <div className="flex items-center gap-2">{form.ssl ? <Lock className="w-4 h-4 text-emerald-400" /> : <Unlock className="w-4 h-4 text-white/30" />}<div><p className="text-xs font-medium">SSL/TLS</p><p className="text-[10px] text-white/30">Encrypt connection</p></div></div>
                <ToggleSwitch enabled={form.ssl} onChange={() => setForm({ ...form, ssl: !form.ssl })} />
              </div>
            )}
            {form.engine === "snowflake" && (
              <div className="grid grid-cols-2 gap-3">
                <div><label className="text-xs text-white/40 mb-1 block">Account</label><input value={(form.options as Record<string,string>).account || ""} onChange={(e) => setForm({ ...form, options: { ...form.options, account: e.target.value } })} className="w-full px-3 py-2.5 rounded-xl bg-white/5 border border-white/10 text-sm focus:outline-none focus:border-indigo-500/50" /></div>
                <div><label className="text-xs text-white/40 mb-1 block">Warehouse</label><input value={(form.options as Record<string,string>).warehouse || ""} onChange={(e) => setForm({ ...form, options: { ...form.options, warehouse: e.target.value } })} className="w-full px-3 py-2.5 rounded-xl bg-white/5 border border-white/10 text-sm focus:outline-none focus:border-indigo-500/50" /></div>
              </div>
            )}
            {form.engine === "bigquery" && (
              <div><label className="text-xs text-white/40 mb-1 block">Project ID</label><input value={(form.options as Record<string,string>).project_id || ""} onChange={(e) => setForm({ ...form, options: { ...form.options, project_id: e.target.value } })} className="w-full px-3 py-2.5 rounded-xl bg-white/5 border border-white/10 text-sm focus:outline-none focus:border-indigo-500/50" /></div>
            )}
          </div>
        )}
      </div>
      {step === "config" && (
        <div className="flex items-center justify-end gap-2 p-5 border-t border-white/5">
          <button onClick={onCancel} className="px-4 py-2 rounded-xl text-sm text-white/50 hover:text-white">Cancel</button>
          <button onClick={() => onSave(form as Record<string, unknown>)} className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-500/20 text-indigo-400 text-sm font-medium border border-indigo-500/30 hover:bg-indigo-500/30"><Save className="w-4 h-4" />{initial ? "Update" : "Save"}</button>
        </div>
      )}
    </motion.div>
  );
}

function SchemaBrowser({ connId }: { connId: string }) {
  const [tables, setTables] = useState<SchemaTable[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  useEffect(() => { setLoading(true); api<{ tables: SchemaTable[] }>(`/connectors/${connId}/schema`).then((d) => { setTables(d.tables); setError(""); }).catch((e) => setError(e.message)).finally(() => setLoading(false)); }, [connId]);
  if (loading) return <div className="flex items-center gap-2 p-4 text-white/40 text-sm"><Loader2 className="w-4 h-4 animate-spin" /> Loading schema...</div>;
  if (error) return <div className="p-4 text-red-400 text-sm flex items-center gap-2"><AlertCircle className="w-4 h-4" /> {error}</div>;
  return (
    <div className="space-y-1 max-h-96 overflow-y-auto">
      {tables.map((t) => (
        <div key={t.name}>
          <button onClick={() => { const next = new Set(expanded); next.has(t.name) ? next.delete(t.name) : next.add(t.name); setExpanded(next); }} className="w-full flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-white/5 text-sm">
            <ChevronRight className={`w-3 h-3 text-white/30 transition-transform ${expanded.has(t.name) ? "rotate-90" : ""}`} />
            <Table className="w-3.5 h-3.5 text-indigo-400" />
            <span className="font-mono text-white/80">{t.name}</span>
            <span className="text-[10px] text-white/20 ml-auto">{t.row_count.toLocaleString()} rows</span>
          </button>
          <AnimatePresence>
            {expanded.has(t.name) && (
              <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                <div className="ml-8 space-y-0.5 pb-2">
                  {t.columns.map((col) => (
                    <div key={col.name} className="flex items-center gap-2 px-2 py-1 text-xs">
                      <span className="font-mono text-white/60">{col.name}</span>
                      <span className="text-[10px] text-white/20 bg-white/5 px-1.5 py-0.5 rounded">{col.type}</span>
                      {col.pk && <span className="text-[10px] text-amber-400 bg-amber-500/10 px-1 rounded">PK</span>}
                    </div>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      ))}
    </div>
  );
}

function QueryEditor({ connId, engine }: { connId: string; engine: string }) {
  const isSyncOnly = engine === "rest_api" || engine === "google_sheets";
  const [query, setQuery] = useState(isSyncOnly ? "" : "SELECT * FROM ");
  const [result, setResult] = useState<QueryResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [aiRefining, setAiRefining] = useState(false);
  const [aiNote, setAiNote] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [limit, setLimit] = useState(100);

  const run = async () => {
    setLoading(true);
    setError("");
    setAiNote(null);
    let finalQuery = query;
    if (!isSyncOnly && query.trim()) {
      setAiRefining(true);
      try {
        const refined = await api<QueryRefineResponse>(`/connectors/${connId}/refine_query`, {
          method: "POST",
          body: JSON.stringify({ query }),
        });
        if (refined?.query?.trim()) {
          finalQuery = refined.query;
          setQuery(refined.query);
          setAiNote(refined.explanation || "AI refined the SQL before running.");
        }
      } catch (e: unknown) {
        setAiNote("AI refinement skipped.");
      } finally {
        setAiRefining(false);
      }
    }

    try {
      const data = await api<QueryResult>(`/connectors/${connId}/query`, { method: "POST", body: JSON.stringify({ query: finalQuery, limit }) });
      setResult(data);
    } catch (e: unknown) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const importData = () => { setLoading(true); api<{ rows: number; columns: number; session_id: string }>(`/connectors/${connId}/import`, { method: "POST", body: JSON.stringify({ query, limit: 50000 }) }).then((d) => toast.success(`Imported ${d.rows} rows × ${d.columns} cols → session ${d.session_id}`)).catch((e) => toast.error(e.message)).finally(() => setLoading(false)); };
  return (
    <div className="space-y-3">
      <textarea
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onKeyDown={(e) => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) run(); }}
        placeholder={isSyncOnly ? "No query required for this connector" : "SELECT * FROM table LIMIT 100"}
        disabled={isSyncOnly}
        className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-sm font-mono focus:outline-none focus:border-indigo-500/50 resize-none h-28 disabled:opacity-60"
      />
      <div className="flex items-center gap-2">
        <button onClick={run} disabled={loading || aiRefining} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-500/20 text-indigo-400 text-sm font-medium border border-indigo-500/30 hover:bg-indigo-500/30 disabled:opacity-50">{loading || aiRefining ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />} {aiRefining ? "Refining…" : isSyncOnly ? "Fetch" : "Run"}</button>
        <button onClick={importData} disabled={loading || aiRefining} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 text-white/60 text-sm border border-white/10 hover:text-white disabled:opacity-50"><Download className="w-4 h-4" /> {isSyncOnly ? "Sync" : "Import"}</button>
        <div className="ml-auto flex items-center gap-2"><span className="text-xs text-white/30">Limit:</span><select value={limit} onChange={(e) => setLimit(parseInt(e.target.value))} className="px-2 py-1 rounded-lg bg-white/5 border border-white/10 text-xs">{[50, 100, 500, 1000].map((n) => <option key={n} value={n}>{n}</option>)}</select></div>
      </div>
      {aiNote && <div className="p-3 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-200 text-xs">{aiNote}</div>}
      {error && <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm flex items-center gap-2"><AlertCircle className="w-4 h-4" /> {error}</div>}
      {result && (
        <div className="rounded-xl bg-white/[0.02] border border-white/5 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-2 bg-white/[0.03] border-b border-white/5"><span className="text-xs text-white/40">{result.row_count} rows · {result.execution_time_ms}ms{result.truncated ? " (truncated)" : ""}</span></div>
          {result.columns.length > 0 && (
            <div className="overflow-x-auto max-h-80">
              <table className="w-full text-xs">
                <thead><tr className="border-b border-white/5">{result.columns.map((c) => <th key={c} className="px-3 py-2 text-left text-white/50 font-medium whitespace-nowrap">{c}</th>)}</tr></thead>
                <tbody>{result.rows.map((row, i) => <tr key={i} className="border-b border-white/[0.03] hover:bg-white/[0.02]">{row.map((cell, j) => <td key={j} className="px-3 py-1.5 text-white/70 whitespace-nowrap font-mono">{cell === null ? <span className="text-white/15 italic">null</span> : String(cell)}</td>)}</tr>)}</tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function ConnectionsPage() {
  const [connections, setConnections] = useState<Connection[]>([]);
  const [engines, setEngines] = useState<EngineInfo[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingConn, setEditingConn] = useState<Connection | undefined>();
  const [selectedConn, setSelectedConn] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"schema" | "query">("schema");
  const [searchQuery, setSearchQuery] = useState("");
  const [testing, setTesting] = useState<Set<string>>(new Set());

  const load = () => { api<Connection[]>("/connectors").then(setConnections).catch(() => {}); };
  useEffect(() => { api<EngineInfo[]>("/connectors/engines").then(setEngines).catch(() => {}); load(); }, []);

  const handleSave = async (data: Record<string, unknown>) => {
    try {
      if (data.id) await api(`/connectors/${data.id}`, { method: "PUT", body: JSON.stringify(data) });
      else await api("/connectors", { method: "POST", body: JSON.stringify(data) });
      toast.success("Saved!"); setShowForm(false); setEditingConn(undefined); load();
    } catch (e: unknown) { toast.error((e as Error).message); }
  };

  const handleTest = async (id: string) => {
    setTesting((p) => new Set(p).add(id));
    try {
      const r = await api<{ success: boolean; latency_ms?: number; error?: string }>(`/connectors/${id}/test`, { method: "POST" });
      r.success ? toast.success(`Connected (${r.latency_ms}ms)`) : toast.error(r.error || "Failed");
      load();
    } catch (e: unknown) { toast.error((e as Error).message); }
    setTesting((p) => { const n = new Set(p); n.delete(id); return n; });
  };

  const handleDelete = async (id: string) => {
    await api(`/connectors/${id}`, { method: "DELETE" }).catch(() => {});
    if (selectedConn === id) setSelectedConn(null);
    load(); toast.success("Deleted");
  };

  const filtered = connections.filter((c) => !searchQuery || c.name.toLowerCase().includes(searchQuery.toLowerCase()) || c.engine.includes(searchQuery.toLowerCase()));
  const sel = connections.find((c) => c.id === selectedConn);

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white">
      <div className="border-b border-white/5 bg-[#0a0a0f]/80 backdrop-blur-xl sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-gradient-to-br from-indigo-500/20 to-purple-500/20 border border-indigo-500/10"><Database className="w-5 h-5 text-indigo-400" /></div>
              <div><h1 className="text-xl font-semibold">Database Connections</h1><p className="text-sm text-white/40">{connections.length} connections · {engines.length} engines</p></div>
            </div>
            <button onClick={() => { setShowForm(true); setEditingConn(undefined); }} className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-500/20 text-indigo-400 text-sm font-medium border border-indigo-500/30 hover:bg-indigo-500/30"><Plus className="w-4 h-4" /> New</button>
          </div>
          <div className="mt-4 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
            <input value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Search..." className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-sm placeholder:text-white/30 focus:outline-none focus:border-indigo-500/50" />
          </div>
        </div>
      </div>
      <div className="max-w-7xl mx-auto px-6 py-6">
        <AnimatePresence>{showForm && <div className="mb-6"><ConnectionForm engines={engines} initial={editingConn} onSave={handleSave} onCancel={() => { setShowForm(false); setEditingConn(undefined); }} /></div>}</AnimatePresence>
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          <div className="lg:col-span-2 space-y-2">
            {filtered.length === 0 && !showForm && (
              <div className="text-center py-20"><Database className="w-12 h-12 text-white/10 mx-auto mb-4" /><p className="text-white/30 text-sm mb-4">No connections</p><button onClick={() => setShowForm(true)} className="px-4 py-2 rounded-xl bg-indigo-500/20 text-indigo-400 text-sm border border-indigo-500/30">Add first connection</button></div>
            )}
            {filtered.map((conn, i) => {
              const eng = engines.find((e) => e.engine === conn.engine);
              const st = STATUS_META[conn.status] || STATUS_META.untested;
              return (
                <motion.div key={conn.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }} onClick={() => setSelectedConn(conn.id)} className={`group p-4 rounded-xl border cursor-pointer transition-all ${selectedConn === conn.id ? "bg-indigo-500/5 border-indigo-500/20" : "bg-white/[0.02] border-white/5 hover:bg-white/[0.04]"}`}>
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{eng?.icon || "🔗"}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2"><h3 className="text-sm font-medium truncate">{conn.name || "Unnamed"}</h3><span className={`flex items-center gap-1 px-1.5 py-0.5 rounded border text-[10px] ${st.color}`}>{st.icon} {st.label}</span></div>
                      <p className="text-xs text-white/30 mt-0.5 truncate">{eng?.name} · {conn.host || conn.database || "local"}</p>
                    </div>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={(e) => { e.stopPropagation(); handleTest(conn.id); }} className="p-1.5 rounded-lg hover:bg-white/10 text-white/30 hover:text-emerald-400">{testing.has(conn.id) ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Zap className="w-3.5 h-3.5" />}</button>
                      <button onClick={(e) => { e.stopPropagation(); setEditingConn(conn); setShowForm(true); }} className="p-1.5 rounded-lg hover:bg-white/10 text-white/30 hover:text-white"><Settings className="w-3.5 h-3.5" /></button>
                      <button onClick={(e) => { e.stopPropagation(); handleDelete(conn.id); }} className="p-1.5 rounded-lg hover:bg-red-500/10 text-white/30 hover:text-red-400"><Trash2 className="w-3.5 h-3.5" /></button>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
          <div className="lg:col-span-3">
            {sel ? (
              <div className="rounded-2xl bg-white/[0.02] border border-white/5 overflow-hidden">
                <div className="flex items-center gap-3 p-5 border-b border-white/5"><span className="text-2xl">{engines.find((e) => e.engine === sel.engine)?.icon}</span><div><h2 className="font-semibold">{sel.name}</h2><p className="text-xs text-white/40">{engines.find((e) => e.engine === sel.engine)?.name} · {sel.host || sel.database}</p></div></div>
                <div className="flex border-b border-white/5">
                  {(["schema", "query"] as const).map((tab) => (
                    <button key={tab} onClick={() => setActiveTab(tab)} className={`flex items-center gap-2 px-5 py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === tab ? "text-indigo-400 border-indigo-500" : "text-white/40 border-transparent hover:text-white/60"}`}>
                      {tab === "schema" ? <Table className="w-4 h-4" /> : <Terminal className="w-4 h-4" />}{tab === "schema" ? "Schema" : "Query"}
                    </button>
                  ))}
                </div>
                <div className="p-5">{activeTab === "schema" ? <SchemaBrowser connId={sel.id} /> : <QueryEditor connId={sel.id} engine={sel.engine} />}</div>
              </div>
            ) : (
              <div className="rounded-2xl bg-white/[0.02] border border-white/5 p-12 text-center"><Database className="w-12 h-12 text-white/10 mx-auto mb-4" /><p className="text-white/30 text-sm">Select a connection to browse or query</p></div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
