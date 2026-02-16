"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useAppStore } from "@/lib/store";
import { profileFile } from "@/lib/api";

export default function UploadPage() {
  const { setUploadedFile, setProfile } = useAppStore();
  const [dragOver, setDragOver] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const router = useRouter();

  const handleFile = useCallback(
    async (file: File) => {
      setError(null);
      setFileName(file.name);
      setUploadedFile(file);
      setLoading(true);
      try {
        const prof = await profileFile(file);
        setProfile(prof);
        router.push("/profile");
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : "Upload failed");
      } finally {
        setLoading(false);
      }
    },
    [setUploadedFile, setProfile, router],
  );

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <h2 className="text-2xl font-bold">Upload Dataset</h2>
      <Card>
        <CardHeader>
          <CardTitle>Drag &amp; Drop or Browse</CardTitle>
        </CardHeader>
        <CardContent>
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragOver(false);
              const f = e.dataTransfer.files[0];
              if (f) handleFile(f);
            }}
            className={`flex min-h-[200px] cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed p-8 transition ${
              dragOver ? "border-blue-500 bg-blue-50" : "border-slate-300"
            }`}
            onClick={() => {
              const input = document.createElement("input");
              input.type = "file";
              input.accept = ".csv,.xlsx,.xls";
              input.onchange = (ev) => {
                const f = (ev.target as HTMLInputElement).files?.[0];
                if (f) handleFile(f);
              };
              input.click();
            }}
          >
            <p className="text-lg text-slate-600">
              {loading ? "Profiling…" : fileName ? `Selected: ${fileName}` : "Drop CSV / XLSX here or click to browse"}
            </p>
          </div>
          {error && (
            <Alert variant="destructive" className="mt-4">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
