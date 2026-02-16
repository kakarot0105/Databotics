"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useAppStore } from "@/lib/store";
import { uploadFile, profileBySession } from "@/lib/api";
import { toast } from "sonner";

export default function UploadPage() {
  const { setUploadedFile, setProfile, setSessionId } = useAppStore();
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
        const upload = await uploadFile(file);
        setSessionId(upload.session_id);
        const prof = await profileBySession(upload.session_id);
        setProfile(prof);
        toast.success("Upload complete. Profile ready.");
        router.push("/profile");
      } catch (e: unknown) {
        const message = e instanceof Error ? e.message : "Upload failed";
        setError(message);
        toast.error(message);
      } finally {
        setLoading(false);
      }
    },
    [setUploadedFile, setProfile, setSessionId, router],
  );

  return (
    <div className="mx-auto w-full max-w-2xl space-y-6">
      <h2 className="text-2xl font-bold">Upload Dataset</h2>
      <Card>
        <CardHeader>
          <CardTitle>Drag &amp; Drop or Browse</CardTitle>
        </CardHeader>
        <CardContent>
          <div
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragOver(false);
              const f = e.dataTransfer.files[0];
              if (f) handleFile(f);
            }}
            className={`flex min-h-[200px] w-full cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed p-8 text-center transition ${
              dragOver ? "border-blue-500 bg-blue-50 dark:bg-blue-950/20" : "border-slate-300 dark:border-slate-700"
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
            <p className="text-lg text-slate-600 dark:text-slate-300">
              {loading ? "Uploading & profiling…" : fileName ? `Selected: ${fileName}` : "Drop CSV / XLSX here or click to browse"}
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
