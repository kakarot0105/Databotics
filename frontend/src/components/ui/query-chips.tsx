"use client";

import { Button } from "@/components/ui/button";

interface QueryChipsProps {
  examples: string[];
  onSelect: (query: string) => void;
}

export function QueryChips({ examples, onSelect }: QueryChipsProps) {
  return (
    <div className="flex flex-wrap gap-2">
      {examples.map((example) => (
        <Button
          key={example}
          type="button"
          variant="outline"
          size="sm"
          onClick={() => onSelect(example)}
          className="rounded-full border-white/10 bg-white/5 text-xs text-muted-foreground hover:border-indigo-500/40 hover:text-foreground"
        >
          {example}
        </Button>
      ))}
    </div>
  );
}
