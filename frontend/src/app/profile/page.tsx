"use client";

import { useAppStore } from "@/lib/store";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Alert, AlertDescription } from "@/components/ui/alert";

function ProfileSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="h-8 w-48 rounded bg-slate-200 dark:bg-slate-800" />
      <Card>
        <CardHeader>
          <div className="h-6 w-44 rounded bg-slate-200 dark:bg-slate-800" />
        </CardHeader>
        <CardContent className="space-y-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-10 rounded bg-slate-100 dark:bg-slate-900" />
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

export default function ProfilePage() {
  const { profile, uploadedFile, hydrated } = useAppStore();

  if (!hydrated) {
    return <ProfileSkeleton />;
  }

  if (!profile) {
    return (
      <Alert>
        <AlertDescription>No profile data. Upload a file first.</AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-4">
        <h2 className="text-2xl font-bold">Profile</h2>
        {uploadedFile && <Badge variant="secondary">{uploadedFile.name}</Badge>}
        <Badge>{profile.row_count.toLocaleString()} rows</Badge>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Column Statistics</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Column</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Nulls</TableHead>
                <TableHead>Null %</TableHead>
                <TableHead>Min</TableHead>
                <TableHead>Max</TableHead>
                <TableHead>Mean</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {profile.columns.map((col) => (
                <TableRow key={col.name}>
                  <TableCell className="font-medium">{col.name}</TableCell>
                  <TableCell><Badge variant="outline">{col.type}</Badge></TableCell>
                  <TableCell>{col.null_count}</TableCell>
                  <TableCell>{(col.null_pct * 100).toFixed(1)}%</TableCell>
                  <TableCell>{col.stats?.min ?? "—"}</TableCell>
                  <TableCell>{col.stats?.max ?? "—"}</TableCell>
                  <TableCell>{col.stats?.mean != null ? Number(col.stats.mean).toFixed(2) : "—"}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Sample Rows (first 20)</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                {profile.columns.map((c) => (
                  <TableHead key={c.name}>{c.name}</TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {profile.sample_rows.map((row, i) => (
                <TableRow key={i}>
                  {profile.columns.map((c) => (
                    <TableCell key={c.name}>{String(row[c.name] ?? "")}</TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
