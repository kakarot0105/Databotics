"use client";

import { useState } from "react";
import { cleanFile } from "../../lib/api";
import { useAppStore } from "../../lib/store";
import { FileRequiredAlert } from "../../components/shared/file-required-alert";
import { Button } from "../../components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../components/ui/card";
import { Label } from "../../components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../components/ui/select";

export default function CleanPage() {
  const { uploadedFile } = useAppStore();
  const [trimStrings, setTrimStrings] = useState(true);
  const [dropDuplicates, setDropDuplicates] = useState(false);
  const [normalizeCase, setNormalizeCase] = useState<"none" | "lower" | "upper">("none");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!uploadedFile) return <FileRequiredAlert />;

  const runClean = async () => {
    setLoading(true);
    setError(null);
    try {
      const blob = await cleanFile(uploadedFile, {
        trim_strings: trimStrings,
        drop_duplicates: dropDuplicates,
        normalize_case: normalizeCase === "none" ? undefined : normalizeCase,
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = "cleaned_output";
      link.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Cleaning failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Clean Dataset</CardTitle>
        <CardDescription>Apply trim/case normalization/dedup and download cleaned file.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Label className="flex items-center gap-2">
          <input type="checkbox" checked={trimStrings} onChange={(e) => setTrimStrings(e.target.checked)} /> Trim strings
        </Label>
        <Label className="flex items-center gap-2">
          <input type="checkbox" checked={dropDuplicates} onChange={(e) => setDropDuplicates(e.target.checked)} /> Drop duplicates
        </Label>
        <div className="space-y-2">
          <Label>Normalize case</Label>
          <Select value={normalizeCase} onValueChange={(v) => setNormalizeCase(v as "none" | "lower" | "upper")}>
            <SelectTrigger className="w-60">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">None</SelectItem>
              <SelectItem value="lower">Lower</SelectItem>
              <SelectItem value="upper">Upper</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Button onClick={runClean} disabled={loading}>{loading ? "Running..." : "Run Clean & Download"}</Button>
        {error && <p className="text-sm text-red-600">{error}</p>}
      </CardContent>
    </Card>
  );
}
