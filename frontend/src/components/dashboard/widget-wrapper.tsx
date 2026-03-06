"use client";

import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Edit2, Trash2, RefreshCw } from "lucide-react";
import { DashboardWidget } from "@/lib/api";
import { WidgetConfig } from "./widget-config";
import { ChartWidget } from "./chart-widget";
import { TableWidget } from "./table-widget";
import { KPIWidget } from "./kpi-widget";
import { StatWidget } from "./stat-widget";

interface WidgetWrapperProps {
  widget: DashboardWidget;
  onDelete: () => void;
  onUpdate: (updates: Partial<DashboardWidget>) => void;
}

export function WidgetWrapper({ widget, onDelete, onUpdate }: WidgetWrapperProps) {
  const [editMode, setEditMode] = useState(false);
  const [data, setData] = useState<Record<string, any>[]>([]);
  const [loading, setLoading] = useState(false);

  const handleRefresh = async () => {
    setLoading(true);
    try {\n      // Fetch data based on widget config (SQL query, etc.)\n      // For now, use mock data
      setData([{ value: 100 }]);\n    } finally {\n      setLoading(false);\n    }\n  };

  const renderWidget = () => {\n    switch (widget.widget_type) {\n      case "bar_chart":\n      case "line_chart":\n      case "area_chart":\n      case "scatter_plot":\n      case "pie_chart":\n        return <ChartWidget data={data} type={widget.widget_type} config={widget.config as any} />;\n      case "table":\n        return <TableWidget data={data} columns={[]} />;\n      case "kpi_card":\n        return <KPIWidget data={data} config={widget.config as any} />;\n      case "stat_counter":\n        return <StatWidget data={data} config={widget.config as any} />;\n      default:\n        return <div className="text-muted-foreground">Unknown widget type</div>;\n    }\n  };

  return (\n    <Card className="glass-card flex flex-col rounded-xl border border-white/10 p-0 overflow-hidden">\n      {/* Widget Header */}\n      <div className="flex items-center justify-between border-b border-white/10 px-4 py-3 bg-white/3">\n        <h3 className="font-semibold text-foreground">{widget.title}</h3>\n        <div className="flex gap-1">\n          <Button\n            size="sm"\n            variant="ghost"\n            onClick={handleRefresh}\n            disabled={loading}\n            className="h-8 w-8 p-0"\n          >\n            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />\n          </Button>\n          <Button\n            size="sm"\n            variant="ghost"\n            onClick={() => setEditMode(!editMode)}\n            className="h-8 w-8 p-0"\n          >\n            <Edit2 className="h-4 w-4" />\n          </Button>\n          <Button\n            size="sm"\n            variant="ghost"\n            onClick={onDelete}\n            className="h-8 w-8 p-0 text-red-400 hover:text-red-300"\n          >\n            <Trash2 className="h-4 w-4" />\n          </Button>\n        </div>\n      </div>\n\n      {/* Widget Content */}\n      <div className="flex-1 p-4 overflow-auto">\n        {editMode ? (\n          <WidgetConfig\n            widget={widget}\n            onSave={(config) => {\n              onUpdate({ config });\n              setEditMode(false);\n            }}\n            onCancel={() => setEditMode(false)}\n          />\n        ) : (\n          renderWidget()\n        )}\n      </div>\n    </Card>\n  );\n}\n"
          