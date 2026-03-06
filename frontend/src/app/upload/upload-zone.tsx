"use client";

import { useCallback, useState } from "react";
import { useDropzone } from "react-dropzone";
import { Upload, Check, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { uploadFile } from "@/lib/api";
import { useAppStore } from "@/lib/store";

export function UploadZone() {
  const { setSessionId, setUploadedFile } = useAppStore();
  const [uploading, setUploading] = useState(false);

  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
      if (acceptedFiles.length === 0) return;

      const file = acceptedFiles[0];
      if (file.size > 50 * 1024 * 1024) {
        toast.error("File too large (max 50MB)");
        return;
      }

      setUploading(true);
      try {
        const result = await uploadFile(file);
        setSessionId(result.session_id);
        setUploadedFile({
          name: result.filename,
          size: result.size,
          sessionId: result.session_id,
        });
        toast.success(`✨ ${result.filename} uploaded!`);
      } catch (err) {
        toast.error("Upload failed");
      } finally {
        setUploading(false);
      }
    },
    [setSessionId, setUploadedFile]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "text/csv": [".csv"],
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": [".xlsx"],
    },
    multiple: false,
  });

  return (
    <div
      {...getRootProps()}
      className={`
        relative rounded-2xl border-2 border-dashed transition-all duration-300
        ${
          isDragActive
            ? "border-indigo-400 bg-indigo-500/10 shadow-lg shadow-indigo-500/20"
            : "border-white/20 bg-white/5 hover:border-indigo-400/50 hover:bg-indigo-500/5"
        }
        p-12 text-center cursor-pointer group
      `}
    >
      <input {...getInputProps()} />

      {/* Animated background glow */}
      <div className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300">
        <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/20 via-violet-500/20 to-pink-500/20 rounded-2xl blur-xl" />
      </div>

      {/* Content */}
      <div className="relative space-y-4">
        <div className="flex justify-center">
          {uploading ? (
            <div className="h-16 w-16 rounded-full bg-indigo-500/20 flex items-center justify-center animate-pulse">
              <div className="h-12 w-12 rounded-full border-2 border-indigo-400 border-t-transparent animate-spin" />
            </div>
          ) : isDragActive ? (
            <div className="h-16 w-16 rounded-full bg-indigo-500/30 flex items-center justify-center animate-bounce">
              <Check className="h-8 w-8 text-indigo-400" />
            </div>
          ) : (
            <div className="h-16 w-16 rounded-full bg-indigo-500/10 flex items-center justify-center group-hover:bg-indigo-500/20 transition-colors">
              <Upload className="h-8 w-8 text-indigo-400" />
            </div>
          )}
        </div>

        <div>
          <h3 className="text-lg font-semibold text-foreground mb-1">
            {uploading ? "Uploading..." : isDragActive ? "Drop your file" : "Upload Dataset"}
          </h3>
          <p className="text-sm text-muted-foreground">
            {uploading
              ? "Processing your file..."
              : isDragActive
              ? "Release to upload"
              : "Drag and drop CSV or XLSX files (max 50MB)"}
          </p>
        </div>

        {!uploading && (
          <button className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-indigo-500 to-violet-600 px-6 py-2.5 text-sm font-semibold text-white hover:shadow-lg hover:shadow-indigo-500/40 transition-all">
            <Upload className="h-4 w-4" />
            Choose File
          </button>
        )}
      </div>
    </div>
  );
}
