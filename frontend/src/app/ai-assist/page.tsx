"use client";

import { useMemo, useState } from "react";
import { generateSql, type GenerateSqlResponse } from "../../lib/api";
import { useAppStore } from "../../lib/store";
import { FileRequiredAlert } from "../../components/shared/file-required-alert";
import { Button } from "../../components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../components/ui/card";
import { Input } from "../../components/ui/input";

export default function AiAssistPage() {
  const { profile } = useAppStore();
  const [question, setQuestion] = useState("Show top 100 rows");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<GenerateSqlResponse | null>(null);

  const schema = useMemo(() => {
    if (!profile) return {};
    return Object.fromEntries(profile.columns.map((c) => [c.name, c.type]));
  }, [profile]);

  if (!profile) return <FileRequiredAlert />;

  const run = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await generateSql({
        question,
        table: "loaded_table",
        schema,
        sample_rows: profile.sample_rows,
      });
      setResult(response);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to generate SQL");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>AI Assist</CardTitle>
        <CardDescription>Natural language to SQL via /generate_sql endpoint.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Input value={question} onChange={(e) => setQuestion(e.target.value)} placeholder="Ask a question about your data" />
        <Button onClick={run} disabled={loading}>{loading ? "Generating..." : "Generate SQL"}</Button>
        {error && <p className="text-sm text-red-600">{error}</p>}
        {result && (
          <div className="space-y-2 rounded border bg-white p-3">
            <p className="text-sm font-medium">SQL</p>
            <pre className="text-xs">{result.sql}</pre>
            <p className="text-sm font-medium">Explanation</p>
            <p className="text-sm">{result.explanation}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
