"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { getSharedProfile, type ProfileResponse } from "@/lib/api";

export default function SharedProfilePage() {
  const params = useParams();
  const token = params?.token as string;
  const [profile, setProfile] = useState<ProfileResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;
    getSharedProfile(token)
      .then((data) => setProfile(data))
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load shared profile"));
  }, [token]);

  if (error) {
    return <div className="p-6 text-red-400">{error}</div>;
  }

  if (!profile) {
    return <div className="p-6 text-white/40">Loading shared profile...</div>;
  }

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Shared Profile</h1>
        <p className="text-sm text-muted-foreground">{profile.filename} • {profile.row_count.toLocaleString()} rows</p>
      </div>
      <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
        <h2 className="text-lg font-semibold mb-3">Columns</h2>
        <ul className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
          {profile.columns.map((col) => (
            <li key={col.name} className="rounded-lg border border-white/10 bg-white/5 px-3 py-2">
              <div className="font-medium text-white/80">{col.name}</div>
              <div className="text-xs text-white/40">{col.type} • nulls {col.null_count}</div>
            </li>
          ))}
        </ul>
      </div>
      <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
        <h2 className="text-lg font-semibold mb-3">Sample Rows</h2>
        <pre className="text-xs text-white/70 overflow-x-auto">
          {JSON.stringify(profile.sample_rows, null, 2)}
        </pre>
      </div>
    </div>
  );
}
