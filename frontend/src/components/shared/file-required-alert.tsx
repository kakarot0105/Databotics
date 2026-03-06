"use client";

import Link from "next/link";
import { Upload, ArrowRight } from "lucide-react";

export function FileRequiredAlert() {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <div className="rounded-2xl bg-indigo-500/10 p-6 mb-4 animate-float">
        <Upload className="h-10 w-10 text-indigo-400" />
      </div>
      <h3 className="text-lg font-semibold text-foreground">No file uploaded</h3>
      <p className="mt-1 max-w-sm text-sm text-muted-foreground">
        Upload a CSV or XLSX file on the Upload page before running this workflow.
      </p>
      <Link
        href="/upload"
        className="mt-6 flex items-center gap-2 rounded-lg bg-indigo-500/10 px-5 py-2.5 text-sm font-medium text-indigo-400 transition-colors hover:bg-indigo-500/20"
      >
        Go to Upload <ArrowRight className="h-4 w-4" />
      </Link>
    </div>
  );
}
