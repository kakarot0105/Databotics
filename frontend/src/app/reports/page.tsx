"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  FileText,
  Mail,
  Calendar,
  Clock,
  Download,
  Trash2,
  Play,
  CheckCircle,
  AlertCircle,
} from "lucide-react";

interface ScheduledReport {
  id: string;
  name: string;
  type: "pdf" | "excel" | "csv";
  frequency: "daily" | "weekly" | "monthly";
  email: string;
  query: string;
  active: boolean;
  lastRun?: string;
  nextRun?: string;
}

const exampleReports: ScheduledReport[] = [
  {
    id: "1",
    name: "Daily Sales Summary",
    type: "pdf",
    frequency: "daily",
    email: "admin@company.com",
    query: "SELECT * FROM sales WHERE date = CURRENT_DATE",
    active: true,
    lastRun: "2026-03-04 09:00",
    nextRun: "2026-03-05 09:00",
  },
  {
    id: "2",
    name: "Weekly Analytics",
    type: "excel",
    frequency: "weekly",
    email: "team@company.com",
    query: "SELECT * FROM analytics WHERE week = CURRENT_WEEK",
    active: true,
    lastRun: "2026-03-02 09:00",
    nextRun: "2026-03-09 09:00",
  },
];

export default function ScheduledReportsPage() {
  const [reports, setReports] = useState<ScheduledReport[]>(exampleReports);
  const [newReport, setNewReport] = useState<Partial<ScheduledReport>>({
    type: "pdf",
    frequency: "daily",
    active: true,
  });
  const [isCreating, setIsCreating] = useState(false);

  const handleCreate = () => {
    if (!newReport.name || !newReport.email || !newReport.query) return;

    const report: ScheduledReport = {
      id: Date.now().toString(),
      name: newReport.name,
      type: newReport.type || "pdf",
      frequency: newReport.frequency || "daily",
      email: newReport.email,
      query: newReport.query,
      active: newReport.active ?? true,
      nextRun: calculateNextRun(newReport.frequency || "daily"),
    };

    setReports([...reports, report]);
    setIsCreating(false);
    setNewReport({ type: "pdf", frequency: "daily", active: true });
  };

  const calculateNextRun = (frequency: string): string => {
    const now = new Date();
    switch (frequency) {
      case "daily":
        now.setDate(now.getDate() + 1);
        break;
      case "weekly":
        now.setDate(now.getDate() + 7);
        break;
      case "monthly":
        now.setMonth(now.getMonth() + 1);
        break;
    }
    return now.toISOString().split("T")[0] + " 09:00";
  };

  const toggleActive = (id: string) => {
    setReports(
      reports.map((r) =>
        r.id === id ? { ...r, active: !r.active } : r
      )
    );
  };

  const deleteReport = (id: string) => {
    setReports(reports.filter((r) => r.id !== id));
  };

  const runNow = (id: string) => {
    // Simulate running report
    alert(`Generating report #${id}... Check your email in 2 minutes!`);
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Scheduled Reports
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Auto-generate and email PDF/Excel reports
          </p>
        </div>
        <Button onClick={() => setIsCreating(true)}>
          <FileText className="w-4 h-4 mr-2" />
          New Report
        </Button>
      </div>

      {/* Create New Report Form */}
      {isCreating && (
        <Card className="mb-8 border-blue-200 dark:border-blue-800">
          <CardHeader>
            <CardTitle>Create New Scheduled Report</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Report Name</Label>
                <Input
                  placeholder="e.g., Daily Sales Summary"
                  value={newReport.name || ""}
                  onChange={(e) =>
                    setNewReport({ ...newReport, name: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>Email Recipients</Label>
                <Input
                  type="email"
                  placeholder="team@company.com"
                  value={newReport.email || ""}
                  onChange={(e) =>
                    setNewReport({ ...newReport, email: e.target.value })
                  }
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Export Format</Label>
                <Select
                  value={newReport.type}
                  onValueChange={(v) =>
                    setNewReport({ ...newReport, type: v as any })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pdf">📄 PDF Document</SelectItem>
                    <SelectItem value="excel">📊 Excel Spreadsheet</SelectItem>
                    <SelectItem value="csv">📋 CSV File</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Frequency</Label>
                <Select
                  value={newReport.frequency}
                  onValueChange={(v) =>
                    setNewReport({ ...newReport, frequency: v as any })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="daily">📅 Daily (9:00 AM)</SelectItem>
                    <SelectItem value="weekly">📅 Weekly (Monday 9:00 AM)</SelectItem>
                    <SelectItem value="monthly">📅 Monthly (1st of month)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>SQL Query</Label>
              <textarea
                className="w-full h-24 p-3 rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 font-mono text-sm"
                placeholder="SELECT * FROM sales WHERE date >= CURRENT_DATE - INTERVAL '1 day'"
                value={newReport.query || ""}
                onChange={(e) =>
                  setNewReport({ ...newReport, query: e.target.value })
                }
              />
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                checked={newReport.active}
                onCheckedChange={(v) =>
                  setNewReport({ ...newReport, active: v })
                }
              />
              <Label>Active (start sending immediately)</Label>
            </div>

            <div className="flex gap-2 pt-4">
              <Button onClick={handleCreate} className="bg-blue-600">
                Create Report
              </Button>
              <Button variant="outline" onClick={() => setIsCreating(false)}>
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Reports List */}
      <div className="grid gap-4">
        {reports.map((report) => (
          <Card
            key={report.id}
            className={`${
              report.active
                ? "border-green-200 dark:border-green-800"
                : "border-gray-200 dark:border-gray-700 opacity-75"
            }`}
          >
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                      {report.name}
                    </h3>
                    <Badge
                      variant={report.active ? "default" : "secondary"}
                      className={
                        report.active
                          ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                          : ""
                      }
                    >
                      {report.active ? (
                        <>
                          <CheckCircle className="w-3 h-3 mr-1" />
                          Active
                        </>
                      ) : (
                        "Paused"
                      )}
                    </Badge>
                    <Badge variant="outline">
                      {report.type === "pdf" && "📄 PDF"}
                      {report.type === "excel" && "📊 Excel"}
                      {report.type === "csv" && "📋 CSV"}
                    </Badge>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-gray-600 dark:text-gray-400">
                    <div className="flex items-center gap-2">
                      <Mail className="w-4 h-4" />
                      {report.email}
                    </div>
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4" />
                      {report.frequency}
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4" />
                      Next: {report.nextRun}
                    </div>
                    <div className="flex items-center gap-2">
                      <AlertCircle className="w-4 h-4" />
                      Last: {report.lastRun || "Never"}
                    </div>
                  </div>

                  <div className="mt-3 p-2 bg-gray-50 dark:bg-gray-800 rounded font-mono text-xs text-gray-600 dark:text-gray-400">
                    {report.query}
                  </div>
                </div>

                <div className="flex items-center gap-2 ml-4">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => runNow(report.id)}
                  >
                    <Play className="w-4 h-4 mr-1" />
                    Run Now
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => toggleActive(report.id)}
                  >
                    {report.active ? "Pause" : "Resume"}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-red-600 hover:text-red-700"
                    onClick={() => deleteReport(report.id)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4 mt-8">
        <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg text-center">
          <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
            {reports.length}
          </div>
          <div className="text-sm text-blue-800 dark:text-blue-300">
            Total Reports
          </div>
        </div>
        <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg text-center">
          <div className="text-2xl font-bold text-green-600 dark:text-green-400">
            {reports.filter((r) => r.active).length}
          </div>
          <div className="text-sm text-green-800 dark:text-green-300">
            Active
          </div>
        </div>
        <div className="p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg text-center">
          <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
            {reports.filter((r) => r.type === "pdf").length}
          </div>
          <div className="text-sm text-purple-800 dark:text-purple-300">
            PDF Reports
          </div>
        </div>
        <div className="p-4 bg-orange-50 dark:bg-orange-900/20 rounded-lg text-center">
          <div className="text-2xl font-bold text-orange-600 dark:text-orange-400">
            Daily
          </div>
          <div className="text-sm text-orange-800 dark:text-orange-300">
            Most Common
          </div>
        </div>
      </div>
    </div>
  );
}
