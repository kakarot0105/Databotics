"use client";

import { useState } from "react";
import { Button } from "./button";
import { Input } from "./input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./select";

export interface AlertCondition {
  type: "threshold" | "new_rows" | "count_changes";
  field?: string;
  op?: ">" | ">=" | "<" | "<=" | "==";
  value?: number;
  min?: number;
  min_changes?: number;
  webhook_url?: string;
}

interface AlertBuilderProps {
  onCreate: (condition: AlertCondition) => void;
}

export function AlertBuilder({ onCreate }: AlertBuilderProps) {
  const [type, setType] = useState<AlertCondition["type"]>("threshold");
  const [field, setField] = useState("");
  const [op, setOp] = useState<AlertCondition["op"]>(">");
  const [value, setValue] = useState(0);
  const [min, setMin] = useState(1);
  const [minChanges, setMinChanges] = useState(1);
  const [webhookUrl, setWebhookUrl] = useState("");

  const handleCreate = () => {
    const condition: AlertCondition = { type };
    if (type === "threshold") {
      condition.field = field;
      condition.op = op;
      condition.value = value;
    }
    if (type === "new_rows") {
      condition.min = min;
    }
    if (type === "count_changes") {
      condition.min_changes = minChanges;
    }
    if (webhookUrl) {
      condition.webhook_url = webhookUrl;
    }
    onCreate(condition);
  };

  return (
    <div className="space-y-3 rounded-lg border border-white/10 bg-white/[0.03] p-4">
      <div className="grid gap-3 md:grid-cols-3">
        <div>
          <label className="text-xs text-slate-400">Condition Type</label>
          <Select value={type} onValueChange={(v) => setType(v as AlertCondition["type"])}>
            <SelectTrigger className="mt-1">
              <SelectValue placeholder="Select" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="threshold">Threshold</SelectItem>
              <SelectItem value="new_rows">New Rows</SelectItem>
              <SelectItem value="count_changes">Count Changes</SelectItem>
            </SelectContent>
          </Select>
        </div>
        {type === "threshold" && (
          <>
            <div>
              <label className="text-xs text-slate-400">Field</label>
              <Input className="mt-1" value={field} onChange={(e) => setField(e.target.value)} placeholder="column" />
            </div>
            <div className="flex items-end gap-2">
              <Select value={op} onValueChange={(v) => setOp(v as AlertCondition["op"])}>
                <SelectTrigger className="mt-1 w-20">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value=">">&gt;</SelectItem>
                  <SelectItem value=">=">&gt;=</SelectItem>
                  <SelectItem value="<">&lt;</SelectItem>
                  <SelectItem value="<=">&lt;=</SelectItem>
                  <SelectItem value="==">==</SelectItem>
                </SelectContent>
              </Select>
              <Input
                className="mt-1"
                type="number"
                value={value}
                onChange={(e) => setValue(Number(e.target.value))}
                placeholder="value"
              />
            </div>
          </>
        )}
        {type === "new_rows" && (
          <div>
            <label className="text-xs text-slate-400">Minimum rows</label>
            <Input className="mt-1" type="number" value={min} onChange={(e) => setMin(Number(e.target.value))} />
          </div>
        )}
        {type === "count_changes" && (
          <div>
            <label className="text-xs text-slate-400">Minimum changes</label>
            <Input className="mt-1" type="number" value={minChanges} onChange={(e) => setMinChanges(Number(e.target.value))} />
          </div>
        )}
      </div>
      <div>
        <label className="text-xs text-slate-400">Webhook URL (optional)</label>
        <Input className="mt-1" value={webhookUrl} onChange={(e) => setWebhookUrl(e.target.value)} placeholder="https://..." />
      </div>
      <Button onClick={handleCreate} className="w-full">
        Create Alert
      </Button>
    </div>
  );
}
