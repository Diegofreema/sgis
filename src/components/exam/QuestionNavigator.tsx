"use client";

import { cn } from "@/lib/utils";

type QuestionNavigatorProps = {
  total: number;
  current: number;
  answeredIds: Set<string>;
  flaggedIds: Set<string>;
  questionIds: string[];
  onSelect: (index: number) => void;
};

export function QuestionNavigator({
  total,
  current,
  answeredIds,
  flaggedIds,
  questionIds,
  onSelect,
}: QuestionNavigatorProps) {
  return (
    <div className="space-y-3">
      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
        Questions
      </p>
      <div className="flex flex-wrap gap-1.5">
        {questionIds.map((id, i) => {
          const isAnswered = answeredIds.has(id);
          const isFlagged = flaggedIds.has(id);
          const isCurrent = i === current;

          return (
            <button
              key={id}
              onClick={() => onSelect(i)}
              className={cn(
                "flex h-8 w-8 items-center justify-center rounded-lg text-xs font-semibold transition-all",
                isCurrent
                  ? "bg-primary text-primary-foreground shadow-brand-sm ring-2 ring-primary ring-offset-1"
                  : isFlagged
                  ? "bg-warning/20 text-warning border border-warning/40"
                  : isAnswered
                  ? "bg-success/20 text-success border border-success/40"
                  : "bg-muted text-muted-foreground hover:bg-accent hover:text-foreground"
              )}
              aria-label={`Question ${i + 1}${isAnswered ? " (answered)" : ""}${isFlagged ? " (flagged)" : ""}`}
              aria-current={isCurrent ? "true" : undefined}
            >
              {i + 1}
            </button>
          );
        })}
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-3 pt-1">
        {[
          { color: "bg-success/20 border-success/40", label: "Answered" },
          { color: "bg-warning/20 border-warning/40", label: "Flagged" },
          { color: "bg-muted", label: "Unanswered" },
        ].map((item) => (
          <span key={item.label} className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
            <span className={`h-3 w-3 rounded ${item.color} border`} />
            {item.label}
          </span>
        ))}
      </div>
    </div>
  );
}
