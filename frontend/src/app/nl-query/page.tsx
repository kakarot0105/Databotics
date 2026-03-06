"use client";

import { useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { NLChatMessage } from "@/components/ui/nl-chat";
import { QueryChips } from "@/components/ui/query-chips";
import { AutoChart } from "@/components/ui/auto-chart";
import { getToken } from "@/lib/auth";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000";

interface QueryResult {
  columns: string[];
  rows: Array<Record<string, any>>;
  row_count: number;
}

interface QueryResponse {
  sql: string;
  results: QueryResult;
  chart?: { type: string; x?: string; y?: string } | null;
}

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  sql?: string;
  results?: QueryResult;
  chart?: { type: string; x?: string; y?: string } | null;
  error?: string | null;
}

interface HistoryItem {
  id: string;
  query: string;
  sql?: string;
  timestamp: string;
}

const EXAMPLES = [
  "Show me top 5 users by created_at",
  "Count of reports where name contains sales",
  "Average payload size by user_id",
  "Reports between 2024-01-01 and 2024-03-31",
  "Sum of webhook_threshold by profile_id",
];

export default function NLQueryPage() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canSend = input.trim().length > 0 && !loading;

  const sortedHistory = useMemo(() => {
    return [...history].sort((a, b) => (a.timestamp < b.timestamp ? 1 : -1));
  }, [history]);

  const handleSend = async () => {
    if (!canSend) return;
    const query = input.trim();
    const userMessage: ChatMessage = {
      id: crypto.randomUUID(),
      role: "user",
      content: query,
    };
    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setLoading(true);
    setError(null);

    try {
      const token = getToken();
      const response = await fetch(`${API_BASE_URL}/api/nl-query`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ query }),
      });

      if (!response.ok) {
        const text = await response.text();
        throw new Error(text || "Query failed");
      }

      const data = (await response.json()) as QueryResponse;
      const assistantMessage: ChatMessage = {
        id: crypto.randomUUID(),
        role: "assistant",
        content: data.results.row_count
          ? `I found ${data.results.row_count} rows. Here are the results:`
          : "No matching rows returned. Try adjusting the query.",
        sql: data.sql,
        results: data.results,
        chart: data.chart ?? null,
      };

      setMessages((prev) => [...prev, assistantMessage]);
      setHistory((prev) => [
        ...prev,
        {
          id: assistantMessage.id,
          query,
          sql: data.sql,
          timestamp: new Date().toISOString(),
        },
      ]);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unexpected error"
      setError(message);
      setMessages((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          role: "assistant",
          content: "Something went wrong while running that query.",
          error: message,
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const renderTable = (results: QueryResult) => {
    if (!results.row_count) {
      return <p className="text-sm text-muted-foreground">No data to display.</p>;
    }

    return (
      <div className="rounded-xl border border-white/10 bg-black/20">
        <Table>
          <TableHeader>
            <TableRow>
              {results.columns.map((column) => (
                <TableHead key={column} className="text-xs uppercase tracking-wide text-muted-foreground">
                  {column}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {results.rows.map((row, idx) => (
              <TableRow key={idx}>
                {results.columns.map((column) => (
                  <TableCell key={`${idx}-${column}`} className="text-xs text-foreground/90">
                    {String(row[column] ?? "")}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    );
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
      <Card className="glass flex min-h-[70vh] flex-col gap-6 border-white/10 bg-white/5 p-6">
        <div className="space-y-2">
          <h2 className="text-lg font-semibold text-foreground">Ask AI about your data</h2>
          <p className="text-sm text-muted-foreground">
            Describe the insights you need. We’ll translate it into SQL and show the results.
          </p>
        </div>

        <QueryChips examples={EXAMPLES} onSelect={(value) => setInput(value)} />

        <ScrollArea className="flex-1 rounded-xl border border-white/10 bg-black/10 p-4">
          <div className="space-y-4">
            {messages.length === 0 ? (
              <p className="text-sm text-muted-foreground">Start by asking a question about your tables.</p>
            ) : null}
            {messages.map((message) => (
              <div key={message.id} className="space-y-4">
                <NLChatMessage role={message.role} content={message.content} />
                {message.error ? (
                  <div className="rounded-lg border border-red-500/40 bg-red-500/10 p-3 text-sm text-red-200">
                    {message.error}
                  </div>
                ) : null}
                {message.results ? (
                  <div className="space-y-4 rounded-xl border border-white/10 bg-white/5 p-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-semibold text-foreground">Results</h3>
                      <span className="text-xs text-muted-foreground">{message.results.row_count} rows</span>
                    </div>
                    {renderTable(message.results)}
                    {message.chart ? (
                      <div>
                        <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                          Suggested chart ({message.chart.type})
                        </h4>
                        <AutoChart data={message.results.rows} suggestion={message.chart} />
                      </div>
                    ) : null}
                    {message.sql ? (
                      <details className="rounded-lg border border-white/10 bg-black/20 p-3">
                        <summary className="cursor-pointer text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                          Raw SQL
                        </summary>
                        <pre className="mt-2 whitespace-pre-wrap text-xs text-foreground/80">{message.sql}</pre>
                      </details>
                    ) : null}
                  </div>
                ) : null}
              </div>
            ))}
            {loading ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <span className="h-2 w-2 animate-pulse rounded-full bg-indigo-400" />
                Running query…
              </div>
            ) : null}
          </div>
        </ScrollArea>

        <div className="space-y-3">
          <Textarea
            value={input}
            onChange={(event) => setInput(event.target.value)}
            placeholder="Ask a question..."
            className="min-h-[90px]"
          />
          <div className="flex flex-wrap items-center justify-between gap-3">
            {error ? <p className="text-xs text-red-400">{error}</p> : <span />}
            <Button onClick={handleSend} disabled={!canSend} className="min-w-[120px]">
              {loading ? "Thinking..." : "Run query"}
            </Button>
          </div>
        </div>
      </Card>

      <Card className="glass border-white/10 bg-white/5 p-5">
        <div className="mb-4">
          <h3 className="text-sm font-semibold text-foreground">Query history</h3>
          <p className="text-xs text-muted-foreground">Review recent questions and SQL.</p>
        </div>
        <ScrollArea className="h-[60vh] pr-2">
          <div className="space-y-3">
            {sortedHistory.length === 0 ? (
              <p className="text-xs text-muted-foreground">No queries yet.</p>
            ) : null}
            {sortedHistory.map((item) => (
              <button
                key={item.id}
                className="w-full rounded-lg border border-white/10 bg-black/20 p-3 text-left text-xs text-foreground/90 transition hover:border-indigo-500/40"
                onClick={() => setInput(item.query)}
              >
                <p className="font-medium text-foreground/90">{item.query}</p>
                <p className="mt-1 truncate text-[10px] text-muted-foreground">{item.sql}</p>
              </button>
            ))}
          </div>
        </ScrollArea>
      </Card>
    </div>
  );
}
