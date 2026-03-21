"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { AlertBuilder, AlertCondition } from "@/components/ui/alert-builder";
import { LiveTable } from "@/components/ui/live-table";
import { MetricsCounter } from "@/components/ui/metrics-counter";
import { StreamStatus } from "@/components/ui/stream-status";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useWebSocket } from "@/hooks/useWebSocket";
import { getToken } from "@/lib/auth";
import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000";
const WS_BASE = API_BASE.replace(/^http/, "ws");

interface StreamingSource {
  id: number;
  name: string;
  type: string;
  config: Record<string, any>;
  interval_seconds: number;
  is_active: boolean;
  last_polled_at?: string | null;
}

interface AlertRecord {
  id: number;
  source_id: number;
  condition: Record<string, any>;
  channel: string;
  created_at: string;
}

interface AlertHistoryRecord {
  id: number;
  source_id: number;
  payload: Record<string, any>;
  created_at: string;
}

interface StreamMessage {
  type: "data" | "alert";
  source_id: number;
  rows?: Record<string, any>[];
  fetched_at?: string;
  received_at?: string;
  alert_id?: number;
  condition?: Record<string, any>;
  triggered_at?: string;
}

function authHeaders() {
  const token = getToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", ...(init?.headers ?? {}), ...authHeaders() },
  });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || "Request failed");
  }
  return response.json() as Promise<T>;
}

export default function StreamingPage() {
  const [sources, setSources] = useState<StreamingSource[]>([]);
  const [alerts, setAlerts] = useState<AlertRecord[]>([]);
  const [alertHistory, setAlertHistory] = useState<AlertHistoryRecord[]>([]);
  const [selectedSource, setSelectedSource] = useState<StreamingSource | null>(null);
  const [rows, setRows] = useState<Record<string, any>[]>([]);
  const [paused, setPaused] = useState(false);
  const [filter, setFilter] = useState("");

  const [newSource, setNewSource] = useState({
    name: "",
    type: "api",
    interval_seconds: 10,
    config: {},
  });

  const [chartSeries, setChartSeries] = useState<{ time: string; count: number }[]>([]);
  const [messagesPerSecond, setMessagesPerSecond] = useState(0);

  const wsUrl = selectedSource ? `${WS_BASE}/api/streaming/ws/stream/${selectedSource.id}` : null;
  const { status, lastMessageAt, messages } = useWebSocket<StreamMessage>({
    url: wsUrl,
    autoConnect: Boolean(selectedSource),
    onMessage: (message) => {
      const data = message.data;
      if (!data) return;
      if (data.type === "data" && data.rows?.length) {
        setRows((prev) => [...prev, ...data.rows!]);
      }
      if (data.type === "alert") {
        toast.error(`Alert ${data.alert_id} triggered`);
        loadAlerts();
      }
    },
  });

  const messageRate = useMemo(() => {
    const now = Date.now();
    const recent = messages.filter((m) => now - m.receivedAt < 5000);
    return recent.length / 5;
  }, [messages]);

  useEffect(() => {
    setMessagesPerSecond(messageRate);
  }, [messageRate]);

  const loadSources = async () => {
    const data = await apiFetch<StreamingSource[]>("/api/streaming/sources");
    setSources(data);
    if (!selectedSource && data.length) {
      setSelectedSource(data[0]);
    }
  };

  const loadAlerts = async () => {
    const data = await apiFetch<{ alerts: AlertRecord[]; history: AlertHistoryRecord[] }>("/api/streaming/alerts");
    setAlerts(data.alerts);
    setAlertHistory(data.history);
  };

  useEffect(() => {
    loadSources();
    loadAlerts();
  }, []);

  useEffect(() => {
    setRows([]);
  }, [selectedSource?.id]);

  useEffect(() => {
    if (!messages.length) return;
    const now = new Date();
    setChartSeries((prev) => {
      const next = [...prev, { time: now.toLocaleTimeString(), count: messages.length }];
      return next.slice(-20);
    });
  }, [messages]);

  const handleCreateSource = async () => {
    try {
      const created = await apiFetch<StreamingSource>("/api/streaming/sources", {
        method: "POST",
        body: JSON.stringify(newSource),
      });
      toast.success("Source saved");
      setNewSource({ name: "", type: "api", interval_seconds: 10, config: {} });
      await loadSources();
      setSelectedSource(created);
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const toggleSource = async (source: StreamingSource) => {
    try {
      await apiFetch<StreamingSource>("/api/streaming/sources", {
        method: "POST",
        body: JSON.stringify({ ...source, is_active: !source.is_active }),
      });
      toast.success("Source updated");
      loadSources();
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const deleteSource = async (sourceId: number) => {
    try {
      await apiFetch(`/api/streaming/sources/${sourceId}`, { method: "DELETE" });
      toast.success("Source deleted");
      setSources((prev) => prev.filter((s) => s.id !== sourceId));
      if (selectedSource?.id === sourceId) {
        setSelectedSource(null);
      }
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const createAlert = async (condition: AlertCondition) => {
    if (!selectedSource) return;
    try {
      await apiFetch<AlertRecord>("/api/streaming/alerts", {
        method: "POST",
        body: JSON.stringify({ source_id: selectedSource.id, condition, channel: condition.webhook_url ? "webhook" : "in_app" }),
      });
      toast.success("Alert created");
      loadAlerts();
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const deleteAlert = async (alertId: number) => {
    try {
      await apiFetch(`/api/streaming/alerts/${alertId}`, { method: "DELETE" });
      toast.success("Alert deleted");
      loadAlerts();
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  return (
    <div className="space-y-8 p-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-white">Live Stream</h1>
          <p className="text-sm text-slate-400">Monitor streaming sources and real-time alerts.</p>
        </div>
        <StreamStatus status={status} messagesPerSecond={messagesPerSecond} lastMessageAt={lastMessageAt} />
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <MetricsCounter label="Active Sources" value={sources.filter((s) => s.is_active).length} />
        <MetricsCounter label="Alerts" value={alerts.length} />
        <MetricsCounter label="Messages" value={messages.length} />
        <MetricsCounter label="Rows" value={rows.length} />
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <Card className="border-white/10 bg-white/[0.02] p-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-white">Sources</h2>
            <Button size="sm" variant="outline" onClick={loadSources}>
              Refresh
            </Button>
          </div>
          <div className="mt-4 space-y-3">
            {sources.map((source) => (
              <div key={source.id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-white/10 bg-white/[0.02] p-3">
                <div>
                  <p className="text-sm font-semibold text-white">{source.name}</p>
                  <p className="text-xs text-slate-400">{source.type} • {source.interval_seconds}s • {source.is_active ? "active" : "paused"}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Button size="sm" variant="secondary" onClick={() => setSelectedSource(source)}>
                    View
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => toggleSource(source)}>
                    {source.is_active ? "Pause" : "Start"}
                  </Button>
                  <Button size="sm" variant="destructive" onClick={() => deleteSource(source.id)}>
                    Delete
                  </Button>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-6 border-t border-white/10 pt-6">
            <h3 className="text-sm font-semibold text-white">Add Source</h3>
            <div className="mt-3 grid gap-3 md:grid-cols-2">
              <Input placeholder="Name" value={newSource.name} onChange={(e) => setNewSource({ ...newSource, name: e.target.value })} />
              <Select value={newSource.type} onValueChange={(v) => setNewSource({ ...newSource, type: v })}>
                <SelectTrigger>
                  <SelectValue placeholder="Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="api">API polling</SelectItem>
                  <SelectItem value="database">Database polling</SelectItem>
                  <SelectItem value="webhook">Webhook receiver</SelectItem>
                  <SelectItem value="file">File watcher</SelectItem>
                </SelectContent>
              </Select>
              <Input
                type="number"
                placeholder="Interval (seconds)"
                value={newSource.interval_seconds}
                onChange={(e) => setNewSource({ ...newSource, interval_seconds: Number(e.target.value) })}
              />
              {newSource.type === "api" && (
                <Input
                  placeholder="API URL"
                  value={newSource.config.url ?? ""}
                  onChange={(e) => setNewSource({ ...newSource, config: { ...newSource.config, url: e.target.value } })}
                />
              )}
              {newSource.type === "file" && (
                <Input
                  placeholder="Directory path"
                  value={newSource.config.directory ?? ""}
                  onChange={(e) => setNewSource({ ...newSource, config: { ...newSource.config, directory: e.target.value } })}
                />
              )}
              {newSource.type === "database" && (
                <>
                  <Input
                    placeholder="Engine (postgres/mysql)"
                    value={newSource.config.engine ?? "postgres"}
                    onChange={(e) => setNewSource({ ...newSource, config: { ...newSource.config, engine: e.target.value } })}
                  />
                  <Input
                    placeholder="Host"
                    value={newSource.config.host ?? ""}
                    onChange={(e) => setNewSource({ ...newSource, config: { ...newSource.config, host: e.target.value } })}
                  />
                  <Input
                    placeholder="Port"
                    value={newSource.config.port ?? ""}
                    onChange={(e) => setNewSource({ ...newSource, config: { ...newSource.config, port: e.target.value } })}
                  />
                  <Input
                    placeholder="Database"
                    value={newSource.config.database ?? ""}
                    onChange={(e) => setNewSource({ ...newSource, config: { ...newSource.config, database: e.target.value } })}
                  />
                  <Input
                    placeholder="User"
                    value={newSource.config.user ?? ""}
                    onChange={(e) => setNewSource({ ...newSource, config: { ...newSource.config, user: e.target.value } })}
                  />
                  <Input
                    placeholder="Password"
                    type="password"
                    value={newSource.config.password ?? ""}
                    onChange={(e) => setNewSource({ ...newSource, config: { ...newSource.config, password: e.target.value } })}
                  />
                  <Input
                    className="md:col-span-2"
                    placeholder="Query"
                    value={newSource.config.query ?? ""}
                    onChange={(e) => setNewSource({ ...newSource, config: { ...newSource.config, query: e.target.value } })}
                  />
                </>
              )}
              {newSource.type === "webhook" && (
                <Input placeholder="Webhook will be /api/streaming/webhook/{id}" disabled />
              )}
            </div>
            <Button className="mt-3" onClick={handleCreateSource}>
              Save Source
            </Button>
          </div>
        </Card>

        <Card className="border-white/10 bg-white/[0.02] p-6">
          <h2 className="text-lg font-semibold text-white">Live Metrics</h2>
          <div className="mt-4 h-40">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartSeries}>
                <XAxis dataKey="time" stroke="#94a3b8" tick={{ fontSize: 10 }} />
                <YAxis stroke="#94a3b8" tick={{ fontSize: 10 }} />
                <Tooltip />
                <Line type="monotone" dataKey="count" stroke="#6366f1" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-4 text-xs text-slate-400">Messages over time (last 20 points)</div>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.3fr_0.7fr]">
        <Card className="border-white/10 bg-white/[0.02] p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-white">Live Data</h2>
              <p className="text-xs text-slate-400">Source: {selectedSource?.name ?? "None"}</p>
            </div>
            <div className="flex items-center gap-2">
              <Input placeholder="Filter" value={filter} onChange={(e) => setFilter(e.target.value)} className="w-48" />
              <Button size="sm" variant="outline" onClick={() => setPaused((p) => !p)}>
                {paused ? "Resume" : "Pause"}
              </Button>
            </div>
          </div>
          <div className="mt-4">
            <LiveTable rows={rows} paused={paused} filter={filter} />
          </div>
        </Card>

        <Card className="border-white/10 bg-white/[0.02] p-6">
          <h2 className="text-lg font-semibold text-white">Alerts</h2>
          <div className="mt-4">
            <AlertBuilder onCreate={createAlert} />
          </div>
          <div className="mt-6 space-y-3">
            <h3 className="text-sm font-semibold text-white">Active Alerts</h3>
            {alerts.map((alert) => (
              <div key={alert.id} className="flex items-center justify-between rounded-lg border border-white/10 bg-white/[0.03] p-3">
                <div>
                  <p className="text-xs text-slate-400">Source #{alert.source_id}</p>
                  <p className="text-sm text-white">{JSON.stringify(alert.condition)}</p>
                </div>
                <Button size="sm" variant="destructive" onClick={() => deleteAlert(alert.id)}>
                  Delete
                </Button>
              </div>
            ))}
          </div>
          <div className="mt-6 space-y-3">
            <h3 className="text-sm font-semibold text-white">Alert History</h3>
            {alertHistory.map((entry) => (
              <div key={entry.id} className="rounded-lg border border-white/10 bg-white/[0.03] p-3 text-xs text-slate-300">
                <p>{entry.payload?.condition ? JSON.stringify(entry.payload.condition) : "Alert"}</p>
                <p className="text-slate-500">{entry.created_at}</p>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
