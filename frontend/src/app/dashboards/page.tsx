"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { listDashboards, createDashboard, type DashboardListItem } from "@/lib/api";
import { LayoutDashboard, Plus, Search } from "lucide-react";

export default function DashboardsPage() {
  const [dashboards, setDashboards] = useState<DashboardListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");

  const loadDashboards = async () => {
    setLoading(true);
    try {
      const data = await listDashboards();
      setDashboards(data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboards();
  }, []);

  const filtered = useMemo(() => {
    if (!search) return dashboards;
    return dashboards.filter((d) => d.name.toLowerCase().includes(search.toLowerCase()) || (d.description ?? "").toLowerCase().includes(search.toLowerCase()));
  }, [dashboards, search]);

  const handleCreate = async () => {
    if (!name.trim()) return;
    const created = await createDashboard({ name: name.trim(), description: description.trim() || undefined });
    const item: DashboardListItem = {
      id: created.id,
      name: created.name,
      description: created.description,
      widget_count: created.widget_count,
      updated_at: created.updated_at,
      created_at: created.created_at,
    };
    setOpen(false);
    setName("");
    setDescription("");
    setDashboards((prev) => [item, ...prev]);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/5 pb-4">
        <div className="flex items-center gap-3">
          <div className="rounded-xl bg-indigo-500/15 p-2.5">
            <LayoutDashboard className="h-5 w-5 text-indigo-300" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold text-foreground">Dashboards</h1>
            <p className="text-sm text-muted-foreground">Build and share custom analytics dashboards.</p>
          </div>
        </div>
        <Button onClick={() => setOpen(true)}>
          <Plus className="mr-2 h-4 w-4" /> Create New Dashboard
        </Button>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[240px]">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search dashboards"
            className="pl-9"
          />
        </div>
      </div>

      {loading ? (
        <div className="glass-card rounded-2xl border border-white/10 bg-gradient-to-br from-white/5 to-white/0 p-6 text-sm text-muted-foreground">
          Loading dashboards...
        </div>
      ) : filtered.length === 0 ? (
        <div className="glass-card flex flex-col items-center gap-3 rounded-2xl border border-white/10 bg-gradient-to-br from-white/5 to-white/0 p-10 text-center">
          <div className="rounded-full bg-indigo-500/15 p-3">
            <LayoutDashboard className="h-6 w-6 text-indigo-300" />
          </div>
          <div>
            <p className="text-sm font-semibold text-foreground">No dashboards yet</p>
            <p className="mt-1 text-sm text-muted-foreground">Create your first dashboard to start composing widgets.</p>
          </div>
          <Button onClick={() => setOpen(true)} size="sm">
            <Plus className="mr-2 h-4 w-4" /> Create Dashboard
          </Button>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filtered.map((dashboard) => (
            <Link
              key={dashboard.id}
              href={`/dashboards/${dashboard.id}`}
              className="glass-card group rounded-2xl border border-white/10 bg-gradient-to-br from-white/5 to-white/0 p-5 transition hover:border-indigo-400/40"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="text-base font-semibold text-foreground">{dashboard.name}</h3>
                  <p className="mt-1 text-sm text-muted-foreground line-clamp-2">{dashboard.description || "No description"}</p>
                </div>
                <div className="rounded-full bg-indigo-500/10 px-2 py-1 text-xs text-indigo-300">
                  {dashboard.widget_count} widgets
                </div>
              </div>
              <div className="mt-4 text-xs text-muted-foreground">
                Updated {new Date(dashboard.updated_at).toLocaleString()}
              </div>
            </Link>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Create dashboard</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4">
            <div>
              <label className="text-xs text-muted-foreground">Name</label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Growth Metrics" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Description</label>
              <Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Monthly pipeline KPIs" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreate} disabled={!name.trim()}>
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
