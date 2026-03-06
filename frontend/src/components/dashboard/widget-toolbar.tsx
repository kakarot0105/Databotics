"use client";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  BarChart3,
  LineChart as LineChartIcon,
  PieChart as PieChartIcon,
  Table2,
  TrendingUp,
  Gauge,
  AreaChart as AreaChartIcon,
  Scatter3D,
} from "lucide-react";

export type WidgetType =
  | "bar_chart"\n  | "line_chart"\n  | "pie_chart"\n  | "table"\n  | "kpi_card"\n  | "stat_counter"\n  | "area_chart"\n  | "scatter_plot";

interface WidgetToolbarProps {\n  onAddWidget: (type: WidgetType) => void;\n}

const widgets: { type: WidgetType; label: string; icon: React.ReactNode }[] = [\n  { type: "bar_chart", label: "Bar Chart", icon: <BarChart3 className="h-4 w-4" /> },\n  { type: "line_chart", label: "Line Chart", icon: <LineChartIcon className="h-4 w-4" /> },\n  { type: "area_chart", label: "Area Chart", icon: <AreaChartIcon className="h-4 w-4" /> },\n  { type: "pie_chart", label: "Pie Chart", icon: <PieChartIcon className="h-4 w-4" /> },\n  { type: "scatter_plot", label: "Scatter Plot", icon: <Scatter3D className="h-4 w-4" /> },\n  { type: "table", label: "Data Table", icon: <Table2 className="h-4 w-4" /> },\n  { type: "kpi_card", label: "KPI Card", icon: <Gauge className="h-4 w-4" /> },\n  { type: "stat_counter", label: "Stat", icon: <TrendingUp className="h-4 w-4" /> },\n];\n\nexport function WidgetToolbar({ onAddWidget }: WidgetToolbarProps) {\n  return (\n    <Card className="glass-card sticky top-6 w-64 space-y-3 rounded-2xl border border-white/10 p-4">\n      <h3 className="text-sm font-semibold text-foreground">Add Widgets</h3>\n      <div className="space-y-2">\n        {widgets.map((widget) => (\n          <Button\n            key={widget.type}\n            variant="ghost"\n            className="w-full justify-start gap-2 text-xs"\n            onClick={() => onAddWidget(widget.type)}\n          >\n            {widget.icon}\n            <span className="flex-1 text-left">{widget.label}</span>\n          </Button>\n        ))}\n      </div>\n      <div className="border-t border-white/10 pt-3 text-xs text-muted-foreground">\n        <p>Drag widgets to reposition. Resize from corners. Click Edit to configure.</p>\n      </div>\n    </Card>\n  );\n}\n"
          