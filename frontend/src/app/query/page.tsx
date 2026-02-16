"use client";

import { useState } from "react";
import { useAppStore } from "@/lib/store";
import { queryFile } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";

export default function QueryPage() {
  const { uploadedFile } = useAppStore();
  const [sql, setSql] = useState("SELECT * FROM loaded_table LIMIT 100;");
  const [result, setResult] = useState<{ columns: string[]; rows: Record<string, unknown>[]; row_count: number } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const run = async () => {
    if (!uploadedFile) return;
    setError(null);
    setLoading(true);
    try {
      const res = await queryFile(uploadedFile, sql);
      setResult(res);
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : "Query failed";
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  if (!uploadedFile) {
    return <Alert><AlertDescription>Upload a file first.</AlertDescription></Alert>;
  }

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">SQL Query (DuckDB)</h2>
      <Card>
        <CardHeader><CardTitle>Query Console</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <Textarea
            rows={5}
            value={sql}
            onChange={(e) => setSql(e.target.value)}
            className="font-mono text-sm"
            placeholder="SELECT * FROM loaded_table LIMIT 100;"
          />
          <Button onClick={run} disabled={loading}>{loading ? "Running…" : "Run SQL"}</Button>
          {error && <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert>}
          {loading ? (
            <div className="space-y-2 animate-pulse">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-9 rounded bg-slate-100 dark:bg-slate-900" />
              ))}
            </div>
          ) : null}
        </CardContent>
      </Card>

      {result && !loading && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              Results <Badge>{result.row_count} rows</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  {result.columns.map((c) => <TableHead key={c}>{c}</TableHead>)}
                </TableRow>
              </TableHeader>
              <TableBody>
                {result.rows.slice(0, 200).map((row, i) => (
                  <TableRow key={i}>
                    {result.columns.map((c) => <TableCell key={c}>{String(row[c] ?? "")}</TableCell>)}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
