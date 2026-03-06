"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Bell, Mail, MessageSquare, AlertTriangle, CheckCircle2, Clock, Filter, Settings, Trash2, Search, BellOff, Volume2, VolumeX, Star, StarOff, X } from "lucide-react";
import Link from "next/link";
import { useNotifications, type NotificationItem } from "@/lib/notification-store";

const typeColors: Record<string, string> = { data_quality: "text-amber-400 bg-amber-500/10", pipeline: "text-emerald-400 bg-emerald-500/10", alert: "text-red-400 bg-red-500/10", system: "text-blue-400 bg-blue-500/10" };
const priorityColors: Record<string, string> = { low: "bg-slate-500/20 text-slate-400", medium: "bg-blue-500/20 text-blue-400", high: "bg-amber-500/20 text-amber-400", critical: "bg-red-500/20 text-red-400" };
const typeIcons: Record<string, React.ReactNode> = { data_quality: <AlertTriangle className="w-4 h-4" />, pipeline: <CheckCircle2 className="w-4 h-4" />, alert: <Bell className="w-4 h-4" />, system: <Settings className="w-4 h-4" /> };

function timeAgo(iso: string) { const d = new Date(iso); const s = Math.floor((Date.now() - d.getTime()) / 1000); if (s < 60) return "just now"; const m = Math.floor(s / 60); if (m < 60) return `${m}m`; const h = Math.floor(m / 60); if (h < 24) return `${h}h`; return `${Math.floor(h / 24)}d`; }

export default function NotificationsPage() {
  const { notifications, markAllRead, markRead, toggleStar, remove } = useNotifications();
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<NotificationItem | null>(null);

  const filtered = notifications.filter((n) => {
    if (filter === "unread" && n.read) return false;
    if (filter === "starred" && !n.starred) return false;
    if (search && !n.title.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white">
      <div className="border-b border-white/5 bg-[#0a0a0f]/80 backdrop-blur-xl sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-gradient-to-br from-indigo-500/20 to-purple-500/20 border border-indigo-500/10"><Bell className="w-5 h-5 text-indigo-400" /></div>
              <div><h1 className="text-xl font-semibold">Notifications</h1><p className="text-sm text-white/40">{notifications.filter((n) => !n.read).length} unread</p></div>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={markAllRead} className="px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-sm text-white/60 hover:text-white">Mark all read</button>
              <Link href="/notifications/settings" className="p-2 rounded-lg bg-white/5 border border-white/10 text-white/60 hover:text-white"><Settings className="w-4 h-4" /></Link>
            </div>
          </div>
          <div className="mt-4 flex gap-3">
            <div className="relative flex-1"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" /><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search..." className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-sm placeholder:text-white/30 focus:outline-none focus:border-indigo-500/50" /></div>
            <div className="flex gap-1">{["all", "unread", "starred"].map((f) => <button key={f} onClick={() => setFilter(f)} className={`px-3 py-2 rounded-lg text-xs font-medium border ${filter === f ? "bg-indigo-500/20 text-indigo-400 border-indigo-500/30" : "bg-white/5 text-white/50 border-white/10"}`}>{f[0].toUpperCase() + f.slice(1)}</button>)}</div>
          </div>
        </div>
      </div>
      <div className="max-w-7xl mx-auto px-6 py-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-2">
          {filtered.map((n, i) => (
            <motion.div key={n.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }} onClick={() => { setSelected(n); markRead(n.id); }} className={`group p-4 rounded-xl border cursor-pointer transition-all ${selected?.id === n.id ? "bg-indigo-500/5 border-indigo-500/20" : n.read ? "bg-white/[0.02] border-white/5 hover:bg-white/[0.04]" : "bg-white/[0.04] border-white/10 hover:bg-white/[0.06]"}`}>
              <div className="flex items-start gap-3">
                {!n.read && <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 mt-2" />}
                <div className={`p-2 rounded-lg ${typeColors[n.type]}`}>{typeIcons[n.type]}</div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2"><h3 className={`text-sm font-medium truncate ${n.read ? "text-white/70" : "text-white"}`}>{n.title}</h3><span className={`px-1.5 py-0.5 rounded text-[10px] ${priorityColors[n.priority]}`}>{n.priority}</span></div>
                  <p className="text-xs text-white/40 mt-1 line-clamp-2">{n.message}</p>
                  <div className="flex items-center gap-2 mt-2"><span className="text-[10px] text-white/30">{n.source}</span><span className="text-white/10">·</span><span className="text-[10px] text-white/30">{timeAgo(n.timestamp)}</span></div>
                </div>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100">
                  <button onClick={(e) => { e.stopPropagation(); toggleStar(n.id); }} className="p-1.5 rounded-lg hover:bg-white/10">{n.starred ? <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" /> : <StarOff className="w-3.5 h-3.5 text-white/30" />}</button>
                  <button onClick={(e) => { e.stopPropagation(); remove(n.id); }} className="p-1.5 rounded-lg hover:bg-red-500/10 text-white/30 hover:text-red-400"><Trash2 className="w-3.5 h-3.5" /></button>
                </div>
              </div>
            </motion.div>
          ))}
          {filtered.length === 0 && <div className="text-center py-20"><BellOff className="w-12 h-12 text-white/10 mx-auto mb-4" /><p className="text-white/30 text-sm">No notifications</p></div>}
        </div>
        <div className="hidden lg:block">
          {selected ? (
            <motion.div key={selected.id} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="p-6 rounded-2xl bg-white/[0.03] border border-white/10 sticky top-32">
              <div className={`p-2.5 rounded-xl border ${typeColors[selected.type]} inline-block mb-4`}>{typeIcons[selected.type]}</div>
              <h2 className="text-lg font-semibold mb-2">{selected.title}</h2>
              <p className="text-sm text-white/50 leading-relaxed mb-4">{selected.message}</p>
              <div className="space-y-2 text-xs">
                <div className="flex justify-between py-2 border-t border-white/5"><span className="text-white/30">Source</span><span className="text-white/60">{selected.source}</span></div>
                <div className="flex justify-between py-2 border-t border-white/5"><span className="text-white/30">Priority</span><span className={`px-2 py-0.5 rounded ${priorityColors[selected.priority]}`}>{selected.priority}</span></div>
                <div className="flex justify-between py-2 border-t border-white/5"><span className="text-white/30">Time</span><span className="text-white/60">{new Date(selected.timestamp).toLocaleString()}</span></div>
              </div>
            </motion.div>
          ) : (
            <div className="p-6 rounded-2xl bg-white/[0.02] border border-white/5 text-center"><Mail className="w-10 h-10 text-white/10 mx-auto mb-3" /><p className="text-sm text-white/30">Select a notification</p></div>
          )}
        </div>
      </div>
    </div>
  );
}
