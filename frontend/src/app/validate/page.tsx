"use client";

import { useState } from "react";
import { validateFile } from "../../lib/api";
import { useAppStore } from "../../lib/store";
import { FileRequiredAlert } from "../../components/shared/file-required-alert";
import { Button } from "../../components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../../components/ui/table";
import { toast } from "sonner";

export default function ValidatePage() {
  const { uploadedFile, validation, setValidation } = useAppStore();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!uploadedFile) {
    return <FileRequiredAlert />;
  }

  const runValidation = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await validateFile(uploadedFile);
      setValidation(result);
      toast.success(`Validation complete: ${result.violations.length} violation(s)`);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Validation failed";
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Validate</CardTitle>
        <CardDescription>Run rule-based validation and inspect violations.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Button onClick={runValidation} disabled={loading}>
          {loading ? "Running..." : "Run Validation"}
        </Button>
        {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}

        {loading ? (
          <div className="space-y-2 animate-pulse">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-10 rounded bg-slate-100 dark:bg-slate-900" />
            ))}
          </div>
        ) : null}

        {validation && !loading && (
          <>
            <p className="text-sm text-slate-700 dark:text-slate-300">Violations: {validation.violations.length}</p>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Column</TableHead>
                    <TableHead>Message</TableHead>
                    <TableHead>Row sample</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {validation.violations.map((violation, index) => (
                    <TableRow key={`${violation.column ?? "unknown"}-${index}`}>
                      <TableCell>{String(violation.column ?? "-")}</TableCell>
                      <TableCell>{String(violation.message ?? "-")}</TableCell>
                      <TableCell className="max-w-md truncate">{JSON.stringify(violation.row_sample ?? "-")}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
