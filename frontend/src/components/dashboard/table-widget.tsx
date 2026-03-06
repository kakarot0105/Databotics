"use client";

interface TableWidgetProps {
  data: Record<string, any>[];
  columns: string[];
}

export function TableWidget({ data, columns }: TableWidgetProps) {
  if (!data.length) {
    return <div className="text-sm text-muted-foreground">No rows available.</div>;
  }

  const visibleColumns = columns.length ? columns : Object.keys(data[0] ?? {}).slice(0, 5);
  const rows = data.slice(0, 5);

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full text-xs">
        <thead>
          <tr className="text-left text-muted-foreground">
            {visibleColumns.map((col) => (
              <th key={col} className="pb-2 pr-3 font-medium">
                {col}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, idx) => (
            <tr key={idx} className="border-t border-white/5">
              {visibleColumns.map((col) => (
                <td key={col} className="py-2 pr-3 text-foreground/90">
                  {row[col] !== undefined && row[col] !== null ? String(row[col]) : "--"}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
