"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Responsive, WidthProvider, Layouts, Layout } from "react-grid-layout";
import "react-grid-layout/css/styles.css";
import "react-resizable/css/styles.css";
import { Button } from "@/components/ui/button";
import { useAppStore } from "@/lib/store";
import {
  addDashboardWidget,
  deleteDashboard,
  deleteDashboardWidget,
  getDashboard,
  shareDashboard,
  updateDashboard,
  updateDashboardWidget,
  type DashboardResponse,
  type DashboardWidget,
  type DashboardWidgetType,
} from "@/lib/api";
import { WidgetToolbar, WidgetType } from "@/components/dashboard/widget-toolbar";
import { WidgetWrapper } from "@/components/dashboard/widget-wrapper";
import { WidgetConfig, WidgetConfigState } from "@/components/dashboard/widget-config";
import { KpiWidget } from "@/components/dashboard/kpi-widget";
import { ChartWidget } from "@/components/dashboard/chart-widget";
import { TableWidget } from "@/components/dashboard/table-widget";
import { StatWidget } from "@/components/dashboard/stat-widget";
import { LayoutDashboard, Share2, Download, Trash2 } from "lucide-react";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";

const ResponsiveGrid = WidthProvider(Responsive);

function toLayoutItem(widget: DashboardWidget, index: number): Layout {
  const position = (widget.position || {}) as Partial<Layout>;
  const size = (widget.size || {}) as Partial<Layout>;
  return {
    i: String(widget.id),
    x: position.x ?? (index * 4) % 12,
    y: position.y ?? Math.floor(index / 3) * 6,
    w: size.w ?? 4,
    h: size.h ?? 6,
    minW: 3,
    minH: 4,
  };
}

function defaultConfig(type: DashboardWidgetType): WidgetConfigState {
  if (type === "kpi_card") {
    return { title: "KPI", query: "", showLegend: false };
  }
  if (type === "stat_counter") {
    return { title: "Counter", query: "", showLegend: false };
  }
  if (type === "table") {
    return { title: "Table", query: "" };
  }
  return { title: "Chart", query: "", color: "#6366f1", showLegend: true };
}

export default function DashboardDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { profile } = useAppStore();
  const [dashboard, setDashboard] = useState<DashboardResponse | null>(null);
  const [widgets, setWidgets] = useState<DashboardWidget[]>([]);
  const [layouts, setLayouts] = useState<Layouts>({ lg: [] });
  const [configOpen, setConfigOpen] = useState(false);
  const [activeWidget, setActiveWidget] = useState<DashboardWidget | null>(null);
  const [configDraft, setConfigDraft] = useState<WidgetConfigState>({ title: "", query: "" });
  const [saving, setSaving] = useState(false);
  const gridRef = useRef<HTMLDivElement | null>(null);
  const saveTimer = useRef<number | null>(null);

  const dashboardId = Number(params?.id);
  const data = useMemo(() => profile?.sample_rows ?? [], [profile]);
  const columns = useMemo(() => profile?.columns?.map((c) => c.name) ?? [], [profile]);

  const buildLayouts = (items: DashboardWidget[]) => ({
    lg: items.map(toLayoutItem),
  });

  const loadDashboard = async () => {
    const data = await getDashboard(dashboardId);
    setDashboard(data);
    setWidgets(data.widgets);
    if (data.layout_config && (data.layout_config as any).layouts) {
      setLayouts((data.layout_config as any).layouts as Layouts);
    } else {
      setLayouts(buildLayouts(data.widgets));
    }
  };

  useEffect(() => {
    if (!dashboardId) return;
    loadDashboard();
  }, [dashboardId]);

  const scheduleLayoutSave = (nextLayouts: Layouts, nextWidgets: DashboardWidget[]) => {
    if (saveTimer.current) {
      window.clearTimeout(saveTimer.current);
    }
    saveTimer.current = window.setTimeout(async () => {
      try {
        setSaving(true);
        await updateDashboard(dashboardId, { layout_config: { layouts: nextLayouts } });
        const updates = nextWidgets.map((widget) => {
          const layoutItem = nextLayouts.lg?.find((l) => l.i === String(widget.id));
          if (!layoutItem) return null;
          return updateDashboardWidget(dashboardId, widget.id, {
            position: { x: layoutItem.x, y: layoutItem.y },
            size: { w: layoutItem.w, h: layoutItem.h },
          });
        });
        await Promise.all(updates.filter(Boolean));
      } finally {
        setSaving(false);
      }
    }, 600);
  };

  const handleAddWidget = async (type: WidgetType) => {
    const payload = defaultConfig(type as DashboardWidgetType);
    const created = await addDashboardWidget(dashboardId, {
      widget_type: type,
      title: payload.title,
      config: payload,
      position: null,
      size: null,
    });
    const nextWidgets = [...widgets, created];
    setWidgets(nextWidgets);
    const nextLayouts = buildLayouts(nextWidgets);
    setLayouts(nextLayouts);
    scheduleLayoutSave(nextLayouts, nextWidgets);
  };

  const handleLayoutChange = (current: Layout[], all: Layouts) => {
    setLayouts(all);
    const nextWidgets = widgets.map((widget) => {
      const layoutItem = all.lg?.find((l) => l.i === String(widget.id));
      if (!layoutItem) return widget;
      return {
        ...widget,
        position: { x: layoutItem.x, y: layoutItem.y },
        size: { w: layoutItem.w, h: layoutItem.h },
      };
    });
    setWidgets(nextWidgets);
    scheduleLayoutSave(all, nextWidgets);
  };

  const openConfig = (widget: DashboardWidget) => {
    setActiveWidget(widget);
    const config = (widget.config ?? {}) as WidgetConfigState;
    setConfigDraft({
      title: widget.title,
      query: config.query ?? "",
      xKey: config.xKey,
      yKey: config.yKey,
      labelKey: config.labelKey,
      valueKey: config.valueKey,
      color: config.color,
      showLegend: config.showLegend,
    });
    setConfigOpen(true);
  };

  const handleSaveConfig = async (next: WidgetConfigState) => {
    if (!activeWidget) return;
    const updated = await updateDashboardWidget(dashboardId, activeWidget.id, {
      title: next.title,
      config: next,
    });
    setWidgets((prev) => prev.map((w) => (w.id === updated.id ? updated : w)));
    setActiveWidget(null);
  };

  const handleDeleteWidget = async (widget: DashboardWidget) => {
    await deleteDashboardWidget(dashboardId, widget.id);
    const nextWidgets = widgets.filter((w) => w.id !== widget.id);
    setWidgets(nextWidgets);
    const nextLayouts = buildLayouts(nextWidgets);
    setLayouts(nextLayouts);
    scheduleLayoutSave(nextLayouts, nextWidgets);
  };

  const handleShare = async () => {
    const share = await shareDashboard(dashboardId, 7);
    const url = `${window.location.origin}/share/dashboard/${share.token}`;
    await navigator.clipboard.writeText(url);
    alert("Share link copied to clipboard");
  };

  const handleExport = async (format: "png" | "pdf") => {
    if (!gridRef.current) return;
    const canvas = await html2canvas(gridRef.current, { backgroundColor: "#0b1020", scale: 2 });
    if (format === "png") {
      const link = document.createElement("a");
      link.href = canvas.toDataURL("image/png");
      link.download = `${dashboard?.name ?? "dashboard"}.png`;
      link.click();
      return;
    }
    const pdf = new jsPDF("landscape", "pt", "a4");
    const imgData = canvas.toDataURL("image/png");
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
    pdf.addImage(imgData, "PNG", 0, 0, pdfWidth, pdfHeight);
    pdf.save(`${dashboard?.name ?? "dashboard"}.pdf`);
  };

  const handleDeleteDashboard = async () => {
    if (!dashboard) return;
    if (!confirm("Delete this dashboard?")) return;
    await deleteDashboard(dashboard.id);
    router.push("/dashboards");
  };

  const renderWidget = (widget: DashboardWidget) => {
    const config = (widget.config ?? {}) as WidgetConfigState;
    switch (widget.widget_type) {
      case "kpi_card":
        return <KpiWidget data={data} config={config} />;
      case "stat_counter":
        return <StatWidget data={data} config={config} />;
      case "table":
        return <TableWidget data={data} columns={columns} />;
      default:
        return <ChartWidget data={data} type={widget.widget_type as WidgetType} config={config} />;
    }
  };

  return (
    <div className="grid gap-6 xl:grid-cols-[1fr_280px]">
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/5 pb-4">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-indigo-500/15 p-2.5">
              <LayoutDashboard className="h-5 w-5 text-indigo-300" />
            </div>
            <div>
              <h1 className="text-2xl font-semibold text-foreground">{dashboard?.name ?? "Dashboard"}</h1>
              <p className="text-sm text-muted-foreground">{dashboard?.description ?? "Customize, drag, and resize widgets."}</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={handleShare}>
              <Share2 className="mr-2 h-4 w-4" /> Share
            </Button>
            <Button variant="outline" onClick={() => handleExport("png")}>
              <Download className="mr-2 h-4 w-4" /> Export PNG
            </Button>
            <Button variant="outline" onClick={() => handleExport("pdf")}>
              <Download className="mr-2 h-4 w-4" /> Export PDF
            </Button>
            <Button variant="ghost" className="text-red-400" onClick={handleDeleteDashboard}>
              <Trash2 className="mr-2 h-4 w-4" /> Delete
            </Button>
          </div>
        </div>

        <div className="text-xs text-muted-foreground">{saving ? "Saving layout..." : "Layout synced"}</div>

        <div ref={gridRef} className="rounded-3xl border border-white/5 bg-[#0b1020]/40 p-4">
          {widgets.length === 0 ? (
            <div className="flex flex-col items-center gap-3 rounded-2xl border border-white/10 bg-gradient-to-br from-white/5 to-white/0 p-10 text-center">
              <p className="text-sm font-semibold text-foreground">No widgets yet</p>
              <p className="text-sm text-muted-foreground">Use the widget library to start building.</p>
            </div>
          ) : (
            <ResponsiveGrid
              className="layout"
              layouts={layouts}
              onLayoutChange={handleLayoutChange}
              breakpoints={{ lg: 1200, md: 996, sm: 768, xs: 480, xxs: 0 }}
              cols={{ lg: 12, md: 10, sm: 6, xs: 4, xxs: 2 }}
              rowHeight={30}
              draggableHandle=".drag-handle"
            >
              {widgets.map((widget) => (
                <div key={String(widget.id)}>
                  <WidgetWrapper
                    title={widget.title}
                    subtitle={widget.widget_type.replace("_", " ")}
                    onEdit={() => openConfig(widget)}
                    onDelete={() => handleDeleteWidget(widget)}
                  >
                    {renderWidget(widget)}
                  </WidgetWrapper>
                </div>
              ))}
            </ResponsiveGrid>
          )}
        </div>
      </div>

      <div className="space-y-4">
        <WidgetToolbar onAddWidget={handleAddWidget} />
        <div className="glass-card rounded-2xl border border-white/10 bg-gradient-to-br from-white/5 to-white/0 p-4 text-xs text-muted-foreground">
          <p className="font-semibold text-foreground">Data sources</p>
          <p className="mt-2">Widgets use the latest uploaded dataset. Configure SQL per widget to refine slices.</p>
        </div>
      </div>

      {activeWidget && (
        <WidgetConfig
          open={configOpen}
          onClose={() => {
            setConfigOpen(false);
            setActiveWidget(null);
          }}
          columns={columns}
          value={configDraft}
          onSave={handleSaveConfig}
        />
      )}
    </div>
  );
}
