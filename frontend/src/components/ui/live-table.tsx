"use client";

import { useMemo } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./table";

interface LiveTableProps {
  rows: Record<string, any>[];
  paused?: boolean;
  filter?: string;
  maxRows?: number;
}

export function LiveTable({ rows, paused = false, filter = "", maxRows = 200 }: LiveTableProps) {
  const filteredRows = useMemo(() => {
    const data = paused ? [] : rows;
    if (!filter) return data.slice(-maxRows);
    const query = filter.toLowerCase();
    return data
      .filter((row) => JSON.stringify(row).toLowerCase().includes(query))
      .slice(-maxRows);
  }, [filter, maxRows, paused, rows]);

  const columns = useMemo(() => {
    const keys = new Set<string>();
    filteredRows.forEach((row) => Object.keys(row).forEach((k) => keys.add(k)));
    return Array.from(keys);
  }, [filteredRows]);

  if (!filteredRows.length) {
    return <div className="rounded-lg border border-white/10 bg-white/[0.02] p-6 text-sm text-slate-400">No live data yet.</div>;
  }

  return (
    <div className="overflow-auto rounded-lg border border-white/10">
      <Table>
        <TableHeader className="bg-white/5">
          <TableRow>
            {columns.map((col) => (
              <TableHead key={col} className="text-xs uppercase tracking-wide text-slate-400">
                {col}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {filteredRows.map((row, index) => (
            <TableRow key={index}>
              {columns.map((col) => (
                <TableCell key={col} className="text-xs text-slate-300">
                  {row[col] !== undefined && row[col] !== null ? String(row[col]) : "—"}
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
