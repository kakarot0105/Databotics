"use client";

import { useEffect, useMemo, useState } from "react";
import { Responsive, WidthProvider, type Layouts, type Layout } from "react-grid-layout";
import "react-grid-layout/css/styles.css";
import "react-resizable/css/styles.css";
import { useAppStore } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Plus, Save, LayoutDashboard } from "lucide-react";
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

const ResponsiveGrid = WidthProvider(Responsive);

const COLORS = ["#6366f1", "#8b5cf6", "#ec4899", "#f59e0b", "#10b981", "#06b6d4"];

type ChartType = "bar" | "line" | "scatter" | "pie";

interface WidgetConfig {
  id: string;
  type: ChartType;
  xKey?: string;
  yKey?: string;
  valueKey?: string;
  labelKey?: string;
}

const STORAGE_KEY = "databotics_dashboard_layout";

function createDefaultLayout(widgets: WidgetConfig[]): Layout[] {
  return widgets.map((w, index) => ({ i: w.id, x: (index * 4) % 12, y: Math.floor(index / 3) * 4, w: 4, h: 6 }));
}

export default function DashboardPage() {
  const { profile } = useAppStore();
  const [widgets, setWidgets] = useState<WidgetConfig[]>([]);
  const [layouts, setLayouts] = useState<Layouts>({ lg: [] });
  const [showAdd, setShowAdd] = useState(false);
  const [draft, setDraft] = useState<WidgetConfig>({ id: "", type: "bar" });

  const data = useMemo(() => profile?.sample_rows ?? [], [profile]);
  const columns = useMemo(() => profile?.columns?.map((c) => c.name) ?? [], [profile]);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        const parsed = JSON.parse(stored) as { widgets: WidgetConfig[]; layouts: Layouts };
        setWidgets(parsed.widgets || []);
        setLayouts(parsed.layouts || { lg: [] });
        return;
      } catch {}
    }
  }, []);

  const saveLayout = () => {
    const payload = { widgets, layouts };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  };

  const addWidget = () => {
    if (!draft.type) return;
    const id = `widget-${Date.now()}`;
    const newWidget: WidgetConfig = { ...draft, id };
    const nextWidgets = [...widgets, newWidget];
    const nextLayout = createDefaultLayout(nextWidgets);
    setWidgets(nextWidgets);
    setLayouts({ lg: nextLayout });
    setDraft({ id: "", type: "bar" });
    setShowAdd(false);
  };

  const renderChart = (widget: WidgetConfig) => {
    if (!data.length) {
      return <div className="text-sm text-muted-foreground">Upload data to populate charts.</div>;
    }
    const xKey = widget.xKey || columns[0];
    const yKey = widget.yKey || columns[1];
    const labelKey = widget.labelKey || columns[0];
    const valueKey = widget.valueKey || columns[1];

    switch (widget.type) {
      case "bar":
        return (
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={data}>
              <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" />
              <XAxis dataKey={xKey} tick={{ fill: "#9ca3af" }} />
              <YAxis tick={{ fill: "#9ca3af" }} />
              <Tooltip />
              <Legend />
              <Bar dataKey={yKey} fill="#6366f1" />
            </BarChart>
          </ResponsiveContainer>
        );
      case "line":
        return (
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={data}>
              <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" />
              <XAxis dataKey={xKey} tick={{ fill: "#9ca3af" }} />
              <YAxis tick={{ fill: "#9ca3af" }} />
              <Tooltip />
              <Legend />
              <Line dataKey={yKey} stroke="#10b981" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        );
      case "scatter":
        return (
          <ResponsiveContainer width="100%" height={260}>
            <ScatterChart>
              <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" />
              <XAxis dataKey={xKey} tick={{ fill: "#9ca3af" }} />
              <YAxis dataKey={yKey} tick={{ fill: "#9ca3af" }} />
              <Tooltip />
              <Legend />
              <Scatter data={data} fill="#ec4899" />
            </ScatterChart>
          </ResponsiveContainer>
        );
      case "pie":
        return (
          <ResponsiveContainer width="100%" height={260}>
            <PieChart>
              <Tooltip />
              <Legend />
              <Pie data={data} dataKey={valueKey} nameKey={labelKey} outerRadius={90}>
                {data.map((_, idx) => (
                  <Cell key={`cell-${idx}`} fill={COLORS[idx % COLORS.length]} />
                ))}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
        );
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/5 pb-4">
        <div className="flex items-center gap-3">
          <div className="rounded-xl bg-indigo-500/15 p-2.5">
            <LayoutDashboard className="h-5 w-5 text-indigo-300" />
          </div>
          <div className="space-y-1">
            <h1 className="text-2xl font-semibold text-foreground">Dashboard Builder</h1>
            <p className="text-sm text-muted-foreground">Drag, resize, and customize charts for every workspace.</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button onClick={() => setShowAdd(true)}>
            <Plus className="mr-2 h-4 w-4" /> Add Widget
          </Button>
          <Button variant="outline" onClick={saveLayout}>
            <Save className="mr-2 h-4 w-4" /> Save Layout
          </Button>
        </div>
      </div>

      {showAdd && (
        <div className="glass-card rounded-2xl border border-white/10 bg-gradient-to-br from-white/5 to-white/0 p-5">
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="text-xs text-muted-foreground">Chart type</label>
              <select
                value={draft.type}
                onChange={(e) => setDraft({ ...draft, type: e.target.value as ChartType })}
                className="mt-1 w-full rounded-xl border border-border bg-background/50 px-3 py-2 text-sm text-foreground"
              >
                <option value="bar">Bar</option>
                <option value="line">Line</option>
                <option value="scatter">Scatter</option>
                <option value="pie">Pie</option>
              </select>
            </div>
            <div>
              <label className="text-xs text-muted-foreground">X / Label column</label>
              <select
                value={draft.xKey || ""}
                onChange={(e) => setDraft({ ...draft, xKey: e.target.value, labelKey: e.target.value })}
                className="mt-1 w-full rounded-xl border border-border bg-background/50 px-3 py-2 text-sm text-foreground"
              >
                <option value="">Select column</option>
                {columns.map((col) => (
                  <option key={col} value={col}>
                    {col}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Y / Value column</label>
              <select
                value={draft.yKey || ""}
                onChange={(e) => setDraft({ ...draft, yKey: e.target.value, valueKey: e.target.value })}
                className="mt-1 w-full rounded-xl border border-border bg-background/50 px-3 py-2 text-sm text-foreground"
              >
                <option value="">Select column</option>
                {columns.map((col) => (
                  <option key={col} value={col}>
                    {col}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="mt-4 flex gap-2">
            <Button onClick={addWidget}>Add to Dashboard</Button>
            <Button variant="ghost" onClick={() => setShowAdd(false)}>
              Cancel
            </Button>
          </div>
        </div>
      )}

      {widgets.length === 0 && !showAdd ? (
        <div className="glass-card flex flex-col items-center gap-3 rounded-2xl border border-white/10 bg-gradient-to-br from-white/5 to-white/0 p-10 text-center">
          <div className="rounded-full bg-indigo-500/15 p-3">
            <LayoutDashboard className="h-6 w-6 text-indigo-300" />
          </div>
          <div>
            <p className="text-sm font-semibold text-foreground">No widgets yet</p>
            <p className="mt-1 text-sm text-muted-foreground">Add your first chart to start composing a live dashboard.</p>
          </div>
          <Button onClick={() => setShowAdd(true)} size="sm">
            <Plus className="mr-2 h-4 w-4" /> Add Widget
          </Button>
        </div>
      ) : (
        <ResponsiveGrid
          className="layout"
          layouts={layouts}
          onLayoutChange={(current, all) => setLayouts(all)}
          breakpoints={{ lg: 1200, md: 996, sm: 768, xs: 480, xxs: 0 }}
          cols={{ lg: 12, md: 10, sm: 6, xs: 4, xxs: 2 }}
          rowHeight={30}
        >
          {widgets.map((widget) => (
            <div key={widget.id} className="glass-card hover-lift rounded-2xl border border-white/10 bg-gradient-to-br from-white/5 to-white/0 p-4">
              <div className="mb-2 text-sm font-semibold capitalize text-white/80">{widget.type} chart</div>
              {renderChart(widget)}
            </div>
          ))}
        </ResponsiveGrid>
      )}
    </div>
  );
}
