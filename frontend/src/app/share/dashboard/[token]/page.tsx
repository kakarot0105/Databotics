"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { Responsive, WidthProvider, Layouts } from "react-grid-layout";
import "react-grid-layout/css/styles.css";
import "react-resizable/css/styles.css";
import { getSharedDashboard, type DashboardResponse, type DashboardWidget } from "@/lib/api";
import { WidgetWrapper } from "@/components/dashboard/widget-wrapper";
import { KpiWidget } from "@/components/dashboard/kpi-widget";
import { ChartWidget } from "@/components/dashboard/chart-widget";
import { TableWidget } from "@/components/dashboard/table-widget";
import { StatWidget } from "@/components/dashboard/stat-widget";
import { WidgetType } from "@/components/dashboard/widget-toolbar";

const ResponsiveGrid = WidthProvider(Responsive);

export default function SharedDashboardPage() {
  const params = useParams();
  const token = params?.token as string;
  const [dashboard, setDashboard] = useState<DashboardResponse | null>(null);
  const [layouts, setLayouts] = useState<Layouts>({ lg: [] });
  const [error, setError] = useState<string | null>(null);

  const buildLayouts = (widgets: DashboardWidget[]) => ({
    lg: widgets.map((widget, index) => {
      const position = (widget.position || {}) as Partial<any>;
      const size = (widget.size || {}) as Partial<any>;
      return {
        i: String(widget.id),
        x: position.x ?? (index * 4) % 12,
        y: position.y ?? Math.floor(index / 3) * 6,
        w: size.w ?? 4,
        h: size.h ?? 6,
      };
    }),
  });

  useEffect(() => {
    if (!token) return;
    getSharedDashboard(token)
      .then((data) => {
        setDashboard(data);
        if (data.layout_config && (data.layout_config as any).layouts) {
          setLayouts((data.layout_config as any).layouts as Layouts);
        } else {
          setLayouts(buildLayouts(data.widgets));
        }
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load shared dashboard"));
  }, [token]);

  const sampleRows = useMemo(() => dashboard?.widgets?.[0]?.config?.sample_rows as any[] | undefined, [dashboard]);
  const data = sampleRows ?? [];
  const columns = useMemo(() => Object.keys(data[0] ?? {}), [data]);

  const renderWidget = (widget: DashboardWidget) => {
    const config = (widget.config ?? {}) as any;
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

  if (error) {
    return <div className="p-6 text-red-400">{error}</div>;
  }

  if (!dashboard) {
    return <div className="p-6 text-white/40">Loading shared dashboard...</div>;
  }

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">{dashboard.name}</h1>
        <p className="text-sm text-muted-foreground">{dashboard.description ?? "Shared dashboard"}</p>
      </div>
      <div className="rounded-3xl border border-white/5 bg-[#0b1020]/40 p-4">
        <ResponsiveGrid
          className="layout"
          layouts={layouts}
          isDraggable={false}
          isResizable={false}
          breakpoints={{ lg: 1200, md: 996, sm: 768, xs: 480, xxs: 0 }}
          cols={{ lg: 12, md: 10, sm: 6, xs: 4, xxs: 2 }}
          rowHeight={30}
        >
          {dashboard.widgets.map((widget) => (
            <div key={String(widget.id)}>
              <WidgetWrapper title={widget.title} subtitle={widget.widget_type.replace("_", " ")}> 
                {renderWidget(widget)}
              </WidgetWrapper>
            </div>
          ))}
        </ResponsiveGrid>
      </div>
    </div>
  );
}
