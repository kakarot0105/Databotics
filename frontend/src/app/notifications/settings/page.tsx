"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Bell, Mail, MessageSquare, Smartphone, Plus, Trash2, ChevronDown, Save, Check, X, Zap, Shield, Settings, ArrowLeft, Eye, EyeOff, FlaskConical, Code, Filter, Layers, Calendar, Sun, Moon, Info, GripVertical, Clock, AlertTriangle, Database, Globe2 } from "lucide-react";
import Link from "next/link";

type Channel = "email" | "slack" | "webhook" | "sms" | "in_app";
type EventType = "data_quality" | "pipeline_success" | "pipeline_failure" | "anomaly" | "schema_drift" | "threshold_breach" | "storage_warning" | "collaboration" | "scheduled_report";
type Severity = "info" | "warning" | "error" | "critical";
type DigestFrequency = "realtime" | "hourly" | "daily" | "weekly" | "never";

interface RuleCondition { id: string; field: string; operator: string; value: string; }
interface NotificationRule { id: string; name: string; enabled: boolean; events: EventType[]; channels: Channel[]; severity: Severity[]; conditions: RuleCondition[]; schedule: { quietHoursEnabled: boolean; quietStart: string; quietEnd: string; timezone: string; daysOfWeek: number[] }; throttle: { enabled: boolean; maxPerHour: number; groupSimilar: boolean }; template: { useCustom: boolean; subject: string; bodyTemplate: string }; }

const EVENT_META: Record<EventType, { label: string; icon: React.ReactNode; color: string }> = {
  data_quality: { label: "Data Quality", icon: <AlertTriangle className="w-3.5 h-3.5" />, color: "text-amber-400 bg-amber-500/10" },
  pipeline_success: { label: "Pipeline Success", icon: <Check className="w-3.5 h-3.5" />, color: "text-emerald-400 bg-emerald-500/10" },
  pipeline_failure: { label: "Pipeline Failure", icon: <X className="w-3.5 h-3.5" />, color: "text-red-400 bg-red-500/10" },
  anomaly: { label: "Anomaly", icon: <Zap className="w-3.5 h-3.5" />, color: "text-purple-400 bg-purple-500/10" },
  schema_drift: { label: "Schema Drift", icon: <Database className="w-3.5 h-3.5" />, color: "text-blue-400 bg-blue-500/10" },
  threshold_breach: { label: "Threshold Breach", icon: <AlertTriangle className="w-3.5 h-3.5" />, color: "text-red-400 bg-red-500/10" },
  storage_warning: { label: "Storage Warning", icon: <Database className="w-3.5 h-3.5" />, color: "text-orange-400 bg-orange-500/10" },
  collaboration: { label: "Collaboration", icon: <MessageSquare className="w-3.5 h-3.5" />, color: "text-indigo-400 bg-indigo-500/10" },
  scheduled_report: { label: "Scheduled Report", icon: <Calendar className="w-3.5 h-3.5" />, color: "text-cyan-400 bg-cyan-500/10" },
};

const CHANNEL_META: Record<Channel, { label: string; icon: React.ReactNode }> = {
  email: { label: "Email", icon: <Mail className="w-3.5 h-3.5" /> },
  slack: { label: "Slack", icon: <MessageSquare className="w-3.5 h-3.5" /> },
  webhook: { label: "Webhook", icon: <Globe2 className="w-3.5 h-3.5" /> },
  sms: { label: "SMS", icon: <Smartphone className="w-3.5 h-3.5" /> },
  in_app: { label: "In-App", icon: <Bell className="w-3.5 h-3.5" /> },
};

const SEV_META: Record<Severity, { label: string; color: string }> = {
  info: { label: "Info", color: "bg-blue-500/20 text-blue-400 border-blue-500/30" },
  warning: { label: "Warning", color: "bg-amber-500/20 text-amber-400 border-amber-500/30" },
  error: { label: "Error", color: "bg-red-500/20 text-red-400 border-red-500/30" },
  critical: { label: "Critical", color: "bg-red-600/30 text-red-300 border-red-500/40" },
};

const TIMEZONES = ["UTC", "America/New_York", "America/Chicago", "America/Denver", "America/Los_Angeles", "Europe/London", "Europe/Berlin", "Asia/Tokyo", "Asia/Shanghai", "Asia/Kolkata", "Australia/Sydney"];
const COND_FIELDS = ["dataset_name", "column_name", "null_percentage", "row_count", "deviation_sigma", "pipeline_name", "duration_seconds", "error_message"];
const COND_OPS = ["equals", "not_equals", "contains", "greater_than", "less_than", "regex_match"];

function Toggle({ enabled, onChange, size = "md" }: { enabled: boolean; onChange: () => void; size?: "sm" | "md" }) {
  const w = size === "sm" ? "w-9 h-5" : "w-11 h-6"; const dot = size === "sm" ? "w-3.5 h-3.5" : "w-4 h-4"; const travel = size === "sm" ? 16 : 20;
  return <button onClick={onChange} className={`relative ${w} rounded-full transition-colors ${enabled ? "bg-indigo-500" : "bg-white/10"}`}><motion.div animate={{ x: enabled ? travel : 2 }} transition={{ type: "spring", stiffness: 500, damping: 30 }} className={`absolute top-0.5 ${dot} rounded-full bg-white shadow-lg`} /></button>;
}

function MultiSelect<T extends string>({ options, selected, onChange, render }: { options: T[]; selected: T[]; onChange: (v: T[]) => void; render: (v: T) => React.ReactNode }) {
  return <div className="flex flex-wrap gap-2">{options.map((o) => <button key={o} onClick={() => onChange(selected.includes(o) ? selected.filter((s) => s !== o) : [...selected, o])} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${selected.includes(o) ? "bg-indigo-500/15 text-indigo-400 border-indigo-500/30" : "bg-white/[0.03] text-white/40 border-white/5 hover:text-white/60"}`}>{render(o)}</button>)}</div>;
}

function RuleEditor({ rule, onChange, onDelete }: { rule: NotificationRule; onChange: (r: NotificationRule) => void; onDelete: () => void }) {
  const [expanded, setExpanded] = useState(false);
  const [tab, setTab] = useState<"events" | "channels" | "conditions" | "schedule" | "throttle" | "template">("events");
  const upd = (p: Partial<NotificationRule>) => onChange({ ...rule, ...p });
  const tabs = [{ id: "events" as const, label: "Events", icon: <Zap className="w-3 h-3" /> }, { id: "channels" as const, label: "Channels", icon: <Layers className="w-3 h-3" /> }, { id: "conditions" as const, label: "Conditions", icon: <Filter className="w-3 h-3" /> }, { id: "schedule" as const, label: "Schedule", icon: <Clock className="w-3 h-3" /> }, { id: "throttle" as const, label: "Throttle", icon: <Shield className="w-3 h-3" /> }, { id: "template" as const, label: "Template", icon: <Code className="w-3 h-3" /> }];

  return (
    <motion.div layout className={`rounded-xl border transition-all ${rule.enabled ? "bg-white/[0.02] border-white/10" : "bg-white/[0.01] border-white/5 opacity-60"}`}>
      <div className="flex items-center gap-3 p-4">
        <GripVertical className="w-4 h-4 text-white/20" />
        <Toggle size="sm" enabled={rule.enabled} onChange={() => upd({ enabled: !rule.enabled })} />
        <button onClick={() => setExpanded(!expanded)} className="flex-1 text-left">
          <span className="text-sm font-medium">{rule.name}</span>
          <div className="flex items-center gap-2 mt-0.5"><span className="text-[10px] text-white/30">{rule.events.length} events · {rule.conditions.length} conditions</span></div>
        </button>
        <button onClick={() => setExpanded(!expanded)} className="p-1.5 rounded-lg hover:bg-white/5 text-white/30"><ChevronDown className={`w-4 h-4 transition-transform ${expanded ? "rotate-180" : ""}`} /></button>
        <button onClick={onDelete} className="p-1.5 rounded-lg hover:bg-red-500/10 text-white/30 hover:text-red-400"><Trash2 className="w-3.5 h-3.5" /></button>
      </div>
      <AnimatePresence>{expanded && (
        <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
          <div className="px-4 pb-4 space-y-4">
            <input value={rule.name} onChange={(e) => upd({ name: e.target.value })} className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-sm focus:outline-none focus:border-indigo-500/50" />
            <div className="flex gap-1 overflow-x-auto pb-1">{tabs.map((t) => <button key={t.id} onClick={() => setTab(t.id)} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap border ${tab === t.id ? "bg-indigo-500/15 text-indigo-400 border-indigo-500/30" : "text-white/40 border-transparent"}`}>{t.icon}{t.label}</button>)}</div>
            <div className="min-h-[100px]">
              {tab === "events" && <div className="space-y-3"><p className="text-xs text-white/30">Events:</p><MultiSelect options={Object.keys(EVENT_META) as EventType[]} selected={rule.events} onChange={(events) => upd({ events })} render={(e) => <span className="flex items-center gap-1"><span className={`p-0.5 rounded ${EVENT_META[e].color}`}>{EVENT_META[e].icon}</span>{EVENT_META[e].label}</span>} /><p className="text-xs text-white/30 mt-2">Severity:</p><MultiSelect options={["info", "warning", "error", "critical"] as Severity[]} selected={rule.severity} onChange={(severity) => upd({ severity })} render={(s) => <span className={`px-1.5 py-0.5 rounded border text-[10px] ${SEV_META[s].color}`}>{SEV_META[s].label}</span>} /></div>}
              {tab === "channels" && <div className="space-y-3"><p className="text-xs text-white/30">Deliver to:</p><MultiSelect options={Object.keys(CHANNEL_META) as Channel[]} selected={rule.channels} onChange={(channels) => upd({ channels })} render={(ch) => <span className="flex items-center gap-1.5">{CHANNEL_META[ch].icon}{CHANNEL_META[ch].label}</span>} /></div>}
              {tab === "conditions" && <div className="space-y-3"><div className="flex justify-between"><p className="text-xs text-white/30">Match ALL:</p><button onClick={() => upd({ conditions: [...rule.conditions, { id: `c-${Date.now()}`, field: "dataset_name", operator: "equals", value: "" }] })} className="text-xs text-indigo-400"><Plus className="w-3 h-3 inline" /> Add</button></div>{rule.conditions.length === 0 && <div className="p-4 rounded-lg border border-dashed border-white/10 text-center text-xs text-white/20">No conditions — all events trigger</div>}{rule.conditions.map((c) => <div key={c.id} className="flex gap-2"><select value={c.field} onChange={(e) => upd({ conditions: rule.conditions.map((x) => x.id === c.id ? { ...x, field: e.target.value } : x) })} className="px-2 py-1.5 rounded-lg bg-white/5 border border-white/10 text-xs">{COND_FIELDS.map((f) => <option key={f} value={f}>{f.replace(/_/g, " ")}</option>)}</select><select value={c.operator} onChange={(e) => upd({ conditions: rule.conditions.map((x) => x.id === c.id ? { ...x, operator: e.target.value } : x) })} className="px-2 py-1.5 rounded-lg bg-white/5 border border-white/10 text-xs">{COND_OPS.map((o) => <option key={o} value={o}>{o.replace(/_/g, " ")}</option>)}</select><input value={c.value} onChange={(e) => upd({ conditions: rule.conditions.map((x) => x.id === c.id ? { ...x, value: e.target.value } : x) })} className="flex-1 px-2 py-1.5 rounded-lg bg-white/5 border border-white/10 text-xs" /><button onClick={() => upd({ conditions: rule.conditions.filter((x) => x.id !== c.id) })} className="text-white/30 hover:text-red-400"><X className="w-3.5 h-3.5" /></button></div>)}</div>}
              {tab === "schedule" && <div className="space-y-4"><div className="flex justify-between"><div><p className="text-sm font-medium">Quiet Hours</p><p className="text-xs text-white/30">Suppress during off-hours</p></div><Toggle size="sm" enabled={rule.schedule.quietHoursEnabled} onChange={() => upd({ schedule: { ...rule.schedule, quietHoursEnabled: !rule.schedule.quietHoursEnabled } })} /></div>{rule.schedule.quietHoursEnabled && <div className="p-3 rounded-lg bg-white/[0.03] border border-white/5 space-y-3"><div className="grid grid-cols-2 gap-3"><div><label className="text-xs text-white/40 mb-1 block">Start</label><input type="time" value={rule.schedule.quietStart} onChange={(e) => upd({ schedule: { ...rule.schedule, quietStart: e.target.value } })} className="px-2 py-1.5 rounded-lg bg-white/5 border border-white/10 text-xs" /></div><div><label className="text-xs text-white/40 mb-1 block">End</label><input type="time" value={rule.schedule.quietEnd} onChange={(e) => upd({ schedule: { ...rule.schedule, quietEnd: e.target.value } })} className="px-2 py-1.5 rounded-lg bg-white/5 border border-white/10 text-xs" /></div></div><div><label className="text-xs text-white/40 mb-1 block">Timezone</label><select value={rule.schedule.timezone} onChange={(e) => upd({ schedule: { ...rule.schedule, timezone: e.target.value } })} className="w-full px-2 py-1.5 rounded-lg bg-white/5 border border-white/10 text-xs">{TIMEZONES.map((tz) => <option key={tz}>{tz}</option>)}</select></div><div><label className="text-xs text-white/40 mb-1.5 block">Active days</label><div className="flex gap-1.5">{["S","M","T","W","T","F","S"].map((d,i) => <button key={i} onClick={() => { const days = rule.schedule.daysOfWeek.includes(i) ? rule.schedule.daysOfWeek.filter((x) => x !== i) : [...rule.schedule.daysOfWeek, i]; upd({ schedule: { ...rule.schedule, daysOfWeek: days } }); }} className={`w-8 h-8 rounded-lg text-xs font-medium ${rule.schedule.daysOfWeek.includes(i) ? "bg-indigo-500/20 text-indigo-400 border border-indigo-500/30" : "bg-white/5 text-white/30 border border-white/5"}`}>{d}</button>)}</div></div></div>}</div>}
              {tab === "throttle" && <div className="space-y-4"><div className="flex justify-between"><div><p className="text-sm font-medium">Rate Limiting</p><p className="text-xs text-white/30">Prevent floods</p></div><Toggle size="sm" enabled={rule.throttle.enabled} onChange={() => upd({ throttle: { ...rule.throttle, enabled: !rule.throttle.enabled } })} /></div>{rule.throttle.enabled && <div className="space-y-3"><div><label className="text-xs text-white/40 mb-1 block">Max per hour</label><input type="range" min="1" max="100" value={rule.throttle.maxPerHour} onChange={(e) => upd({ throttle: { ...rule.throttle, maxPerHour: parseInt(e.target.value) } })} className="w-full accent-indigo-500" /><div className="flex justify-between text-[10px] text-white/20 mt-1"><span>1</span><span className="text-indigo-400">{rule.throttle.maxPerHour}/hr</span><span>100</span></div></div><div className="flex justify-between p-3 rounded-lg bg-white/[0.03] border border-white/5"><div><p className="text-xs font-medium">Group Similar</p><p className="text-[10px] text-white/30">Batch similar alerts</p></div><Toggle size="sm" enabled={rule.throttle.groupSimilar} onChange={() => upd({ throttle: { ...rule.throttle, groupSimilar: !rule.throttle.groupSimilar } })} /></div></div>}</div>}
              {tab === "template" && <div className="space-y-4"><div className="flex justify-between"><div><p className="text-sm font-medium">Custom Template</p><p className="text-xs text-white/30">Handlebars syntax</p></div><Toggle size="sm" enabled={rule.template.useCustom} onChange={() => upd({ template: { ...rule.template, useCustom: !rule.template.useCustom } })} /></div>{rule.template.useCustom && <div className="space-y-3"><div><label className="text-xs text-white/40 mb-1 block">Subject</label><input value={rule.template.subject} onChange={(e) => upd({ template: { ...rule.template, subject: e.target.value } })} placeholder="[Databotics] {{event_type}}: {{title}}" className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-xs font-mono focus:outline-none focus:border-indigo-500/50" /></div><div><label className="text-xs text-white/40 mb-1 block">Body</label><textarea value={rule.template.bodyTemplate} onChange={(e) => upd({ template: { ...rule.template, bodyTemplate: e.target.value } })} placeholder={"{{message}}\n\nDataset: {{dataset_name}}\nSeverity: {{severity}}"} className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-xs font-mono focus:outline-none focus:border-indigo-500/50 resize-none h-28" /></div><div className="p-3 rounded-lg bg-indigo-500/5 border border-indigo-500/10"><div className="flex items-center gap-1.5 mb-2"><Info className="w-3.5 h-3.5 text-indigo-400" /><span className="text-xs text-indigo-400 font-medium">Variables</span></div><div className="flex flex-wrap gap-1.5">{["event_type","title","message","severity","dataset_name","pipeline_name","timestamp","action_url","row_count","error","duration"].map((v) => <code key={v} className="px-1.5 py-0.5 rounded bg-white/5 text-[10px] text-white/50 font-mono">{`{{${v}}}`}</code>)}</div></div></div>}</div>}
            </div>
          </div>
        </motion.div>
      )}</AnimatePresence>
    </motion.div>
  );
}

const defaultRules: NotificationRule[] = [
  { id: "rule-1", name: "Critical Data Quality Alerts", enabled: true, events: ["data_quality", "threshold_breach"], channels: ["email", "slack", "in_app"], severity: ["error", "critical"], conditions: [{ id: "c1", field: "null_percentage", operator: "greater_than", value: "10" }], schedule: { quietHoursEnabled: false, quietStart: "22:00", quietEnd: "08:00", timezone: "America/New_York", daysOfWeek: [0,1,2,3,4,5,6] }, throttle: { enabled: true, maxPerHour: 10, groupSimilar: true }, template: { useCustom: false, subject: "", bodyTemplate: "" } },
  { id: "rule-2", name: "Pipeline Monitoring", enabled: true, events: ["pipeline_success", "pipeline_failure"], channels: ["email", "in_app"], severity: ["info", "warning", "error", "critical"], conditions: [], schedule: { quietHoursEnabled: true, quietStart: "23:00", quietEnd: "07:00", timezone: "America/New_York", daysOfWeek: [1,2,3,4,5] }, throttle: { enabled: false, maxPerHour: 50, groupSimilar: false }, template: { useCustom: true, subject: "[Databotics] Pipeline {{pipeline_name}} {{status}}", bodyTemplate: "Pipeline **{{pipeline_name}}** → **{{status}}**\nRows: {{row_count}} · Duration: {{duration}}" } },
];

export default function NotificationSettingsPage() {
  const [rules, setRules] = useState(defaultRules);
  const [panel, setPanel] = useState<"rules" | "email" | "slack" | "webhooks" | "digest">("rules");
  const [saved, setSaved] = useState(false);
  const [testSent, setTestSent] = useState(false);

  const [emailCfg, setEmailCfg] = useState({ host: "smtp.gmail.com", port: 587, user: "", pass: "", fromName: "Databotics", fromEmail: "notifications@databotics.io", tls: true, replyTo: "" });
  const [slackCfg, setSlackCfg] = useState({ webhookUrl: "", channel: "#data-alerts", botName: "Databotics", emoji: ":bar_chart:", enabled: false });
  const [webhooks, setWebhooks] = useState([{ id: "wh-1", name: "PagerDuty", url: "https://events.pagerduty.com/v2/enqueue", method: "POST", secret: "", enabled: true }]);
  const [digestCfg, setDigestCfg] = useState({ frequency: "daily" as DigestFrequency, time: "09:00", timezone: "America/New_York", includeStats: true, includeTrends: true, includeTopIssues: true, recipients: "admin@databotics.io" });
  const [showPass, setShowPass] = useState(false);

  const save = () => { setSaved(true); setTimeout(() => setSaved(false), 2000); };
  const test = () => { setTestSent(true); setTimeout(() => setTestSent(false), 2000); };

  const panels = [
    { id: "rules" as const, label: "Rules", icon: <Layers className="w-4 h-4" />, count: rules.length },
    { id: "email" as const, label: "Email (SMTP)", icon: <Mail className="w-4 h-4" /> },
    { id: "slack" as const, label: "Slack", icon: <MessageSquare className="w-4 h-4" /> },
    { id: "webhooks" as const, label: "Webhooks", icon: <Globe2 className="w-4 h-4" />, count: webhooks.length },
    { id: "digest" as const, label: "Digest Reports", icon: <Calendar className="w-4 h-4" /> },
  ];

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white">
      <div className="border-b border-white/5 bg-[#0a0a0f]/80 backdrop-blur-xl sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/notifications" className="p-2 rounded-lg hover:bg-white/5 text-white/40"><ArrowLeft className="w-4 h-4" /></Link>
            <div className="p-2 rounded-xl bg-gradient-to-br from-indigo-500/20 to-purple-500/20 border border-indigo-500/10"><Settings className="w-5 h-5 text-indigo-400" /></div>
            <div><h1 className="text-xl font-semibold">Notification Settings</h1><p className="text-sm text-white/40">Rules, channels, delivery</p></div>
          </div>
          <div className="flex gap-2">
            <button onClick={test} className={`flex items-center gap-2 px-3 py-2 rounded-xl text-sm border ${testSent ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30" : "bg-white/5 text-white/60 border-white/10"}`}>{testSent ? <Check className="w-4 h-4" /> : <FlaskConical className="w-4 h-4" />}{testSent ? "Sent!" : "Test"}</button>
            <button onClick={save} className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium ${saved ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30" : "bg-indigo-500/20 text-indigo-400 border border-indigo-500/30"}`}>{saved ? <Check className="w-4 h-4" /> : <Save className="w-4 h-4" />}{saved ? "Saved!" : "Save"}</button>
          </div>
        </div>
      </div>
      <div className="max-w-6xl mx-auto px-6 py-6 grid grid-cols-1 lg:grid-cols-5 gap-6">
        <div className="lg:col-span-1 space-y-1">
          {panels.map((p) => (
            <button key={p.id} onClick={() => setPanel(p.id)} className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm ${panel === p.id ? "bg-indigo-500/10 text-indigo-400 border border-indigo-500/20" : "text-white/50 hover:text-white hover:bg-white/5 border border-transparent"}`}>
              <span className="flex items-center gap-2">{p.icon}{p.label}</span>
              {p.count !== undefined && <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-white/5">{p.count}</span>}
            </button>
          ))}
        </div>
        <div className="lg:col-span-4">
          <AnimatePresence mode="wait"><motion.div key={panel} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
            {panel === "rules" && <div className="space-y-4"><div className="flex justify-between"><div><h2 className="text-lg font-semibold">Rules</h2><p className="text-sm text-white/40">Control when and how you get notified</p></div><button onClick={() => setRules([...rules, { id: `rule-${Date.now()}`, name: "New Rule", enabled: true, events: [], channels: ["in_app"], severity: ["warning", "error", "critical"], conditions: [], schedule: { quietHoursEnabled: false, quietStart: "22:00", quietEnd: "08:00", timezone: "America/New_York", daysOfWeek: [0,1,2,3,4,5,6] }, throttle: { enabled: false, maxPerHour: 50, groupSimilar: false }, template: { useCustom: false, subject: "", bodyTemplate: "" } }])} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-500/20 text-indigo-400 text-sm font-medium border border-indigo-500/30"><Plus className="w-4 h-4" /> New Rule</button></div>{rules.map((r) => <RuleEditor key={r.id} rule={r} onChange={(u) => setRules(rules.map((x) => x.id === r.id ? u : x))} onDelete={() => setRules(rules.filter((x) => x.id !== r.id))} />)}</div>}
            {panel === "email" && <div className="space-y-4 rounded-2xl bg-white/[0.02] border border-white/5 p-5"><h3 className="text-sm font-semibold">SMTP Configuration</h3><div className="grid grid-cols-2 gap-3"><div><label className="text-xs text-white/40 mb-1 block">Host</label><input value={emailCfg.host} onChange={(e) => setEmailCfg({ ...emailCfg, host: e.target.value })} className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-sm focus:outline-none focus:border-indigo-500/50" /></div><div><label className="text-xs text-white/40 mb-1 block">Port</label><input type="number" value={emailCfg.port} onChange={(e) => setEmailCfg({ ...emailCfg, port: parseInt(e.target.value) })} className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-sm focus:outline-none" /></div></div><div className="grid grid-cols-2 gap-3"><div><label className="text-xs text-white/40 mb-1 block">Username</label><input value={emailCfg.user} onChange={(e) => setEmailCfg({ ...emailCfg, user: e.target.value })} className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-sm focus:outline-none" /></div><div><label className="text-xs text-white/40 mb-1 block">Password</label><div className="relative"><input type={showPass ? "text" : "password"} value={emailCfg.pass} onChange={(e) => setEmailCfg({ ...emailCfg, pass: e.target.value })} className="w-full px-3 py-2 pr-8 rounded-lg bg-white/5 border border-white/10 text-sm focus:outline-none" /><button onClick={() => setShowPass(!showPass)} className="absolute right-2 top-1/2 -translate-y-1/2 text-white/30">{showPass ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}</button></div></div></div><div className="grid grid-cols-2 gap-3"><div><label className="text-xs text-white/40 mb-1 block">From Name</label><input value={emailCfg.fromName} onChange={(e) => setEmailCfg({ ...emailCfg, fromName: e.target.value })} className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-sm focus:outline-none" /></div><div><label className="text-xs text-white/40 mb-1 block">From Email</label><input value={emailCfg.fromEmail} onChange={(e) => setEmailCfg({ ...emailCfg, fromEmail: e.target.value })} className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-sm focus:outline-none" /></div></div><div className="flex justify-between p-3 rounded-lg bg-white/[0.03] border border-white/5"><div><p className="text-xs font-medium">TLS</p><p className="text-[10px] text-white/30">Encrypt connection</p></div><Toggle size="sm" enabled={emailCfg.tls} onChange={() => setEmailCfg({ ...emailCfg, tls: !emailCfg.tls })} /></div></div>}
            {panel === "slack" && <div className="space-y-4 rounded-2xl bg-white/[0.02] border border-white/5 p-5"><div className="flex justify-between p-3 rounded-lg bg-white/[0.03] border border-white/5"><div className="flex items-center gap-3"><MessageSquare className="w-5 h-5 text-purple-400" /><div><p className="text-sm font-medium">Slack</p><p className="text-xs text-white/30">{slackCfg.enabled ? "Connected" : "Not connected"}</p></div></div><Toggle enabled={slackCfg.enabled} onChange={() => setSlackCfg({ ...slackCfg, enabled: !slackCfg.enabled })} /></div><div><label className="text-xs text-white/40 mb-1 block">Webhook URL</label><input value={slackCfg.webhookUrl} onChange={(e) => setSlackCfg({ ...slackCfg, webhookUrl: e.target.value })} placeholder="https://hooks.slack.com/..." className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-xs font-mono focus:outline-none" /></div><div className="grid grid-cols-3 gap-3"><div><label className="text-xs text-white/40 mb-1 block">Channel</label><input value={slackCfg.channel} onChange={(e) => setSlackCfg({ ...slackCfg, channel: e.target.value })} className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-sm focus:outline-none" /></div><div><label className="text-xs text-white/40 mb-1 block">Bot Name</label><input value={slackCfg.botName} onChange={(e) => setSlackCfg({ ...slackCfg, botName: e.target.value })} className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-sm focus:outline-none" /></div><div><label className="text-xs text-white/40 mb-1 block">Emoji</label><input value={slackCfg.emoji} onChange={(e) => setSlackCfg({ ...slackCfg, emoji: e.target.value })} className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-sm focus:outline-none" /></div></div></div>}
            {panel === "webhooks" && <div className="space-y-4"><div className="flex justify-between"><h2 className="text-lg font-semibold">Webhooks</h2><button onClick={() => setWebhooks([...webhooks, { id: `wh-${Date.now()}`, name: "New Webhook", url: "", method: "POST", secret: "", enabled: true }])} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-500/20 text-indigo-400 text-sm border border-indigo-500/30"><Plus className="w-4 h-4" /> Add</button></div>{webhooks.map((wh) => <div key={wh.id} className="rounded-xl bg-white/[0.02] border border-white/5 p-4 space-y-3"><div className="flex justify-between"><Toggle size="sm" enabled={wh.enabled} onChange={() => setWebhooks(webhooks.map((w) => w.id === wh.id ? { ...w, enabled: !w.enabled } : w))} /><button onClick={() => setWebhooks(webhooks.filter((w) => w.id !== wh.id))} className="text-white/30 hover:text-red-400"><Trash2 className="w-3.5 h-3.5" /></button></div><input value={wh.name} onChange={(e) => setWebhooks(webhooks.map((w) => w.id === wh.id ? { ...w, name: e.target.value } : w))} className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-sm focus:outline-none" /><div className="flex gap-2"><select value={wh.method} onChange={(e) => setWebhooks(webhooks.map((w) => w.id === wh.id ? { ...w, method: e.target.value } : w))} className="px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-sm"><option>POST</option><option>PUT</option></select><input value={wh.url} onChange={(e) => setWebhooks(webhooks.map((w) => w.id === wh.id ? { ...w, url: e.target.value } : w))} placeholder="https://..." className="flex-1 px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-xs font-mono focus:outline-none" /></div></div>)}</div>}
            {panel === "digest" && <div className="space-y-4 rounded-2xl bg-white/[0.02] border border-white/5 p-5"><h3 className="text-sm font-semibold">Digest Reports</h3><div><label className="text-xs text-white/40 mb-1.5 block">Frequency</label><div className="flex gap-2">{(["realtime","hourly","daily","weekly","never"] as DigestFrequency[]).map((f) => <button key={f} onClick={() => setDigestCfg({ ...digestCfg, frequency: f })} className={`px-3 py-2 rounded-lg text-xs font-medium border ${digestCfg.frequency === f ? "bg-indigo-500/15 text-indigo-400 border-indigo-500/30" : "bg-white/[0.03] text-white/40 border-white/5"}`}>{f[0].toUpperCase() + f.slice(1)}</button>)}</div></div>{digestCfg.frequency !== "never" && digestCfg.frequency !== "realtime" && <div className="grid grid-cols-2 gap-3"><div><label className="text-xs text-white/40 mb-1 block">Time</label><input type="time" value={digestCfg.time} onChange={(e) => setDigestCfg({ ...digestCfg, time: e.target.value })} className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-sm focus:outline-none" /></div><div><label className="text-xs text-white/40 mb-1 block">Timezone</label><select value={digestCfg.timezone} onChange={(e) => setDigestCfg({ ...digestCfg, timezone: e.target.value })} className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-sm focus:outline-none">{TIMEZONES.map((tz) => <option key={tz}>{tz}</option>)}</select></div></div>}<div><label className="text-xs text-white/40 mb-1 block">Recipients</label><textarea value={digestCfg.recipients} onChange={(e) => setDigestCfg({ ...digestCfg, recipients: e.target.value })} className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-xs font-mono focus:outline-none resize-none h-16" /></div>{[{ key: "includeStats", label: "Activity Stats" }, { key: "includeTrends", label: "Trends" }, { key: "includeTopIssues", label: "Top Issues" }].map((item) => <div key={item.key} className="flex justify-between p-3 rounded-lg bg-white/[0.03] border border-white/5"><p className="text-xs font-medium">{item.label}</p><Toggle size="sm" enabled={digestCfg[item.key as keyof typeof digestCfg] as boolean} onChange={() => setDigestCfg({ ...digestCfg, [item.key]: !digestCfg[item.key as keyof typeof digestCfg] })} /></div>)}</div>}
          </motion.div></AnimatePresence>
        </div>
      </div>
    </div>
  );
}
