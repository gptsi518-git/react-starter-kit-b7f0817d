import { cn } from "@/lib/utils";

export const RecBtn = ({
  on = false,
  time = "00:00",
  hint,
  onToggle,
}: {
  on?: boolean;
  time?: string;
  hint?: string;
  onToggle?: () => void;
}) => (
  <div className="flex flex-col items-end gap-1">
    <button
      onClick={onToggle}
      className={cn(
        "inline-flex items-center gap-2 rounded-full border px-3.5 py-2 text-[13px]",
        on
          ? "border-rose-bd bg-rose-bg text-rose-ink"
          : "border-border-strong bg-paper text-text-2",
      )}
    >
      {on ? (
        <>
          <span className="h-2 w-2 rounded-full bg-rose-ink animate-pulse-dot" />
          <span>Идёт запись</span>
          <span className="num-tabular opacity-85">{time}</span>
        </>
      ) : (
        <>
          <span className="h-2 w-2 rounded-full border-[1.5px] border-current" />
          <span>Включить запись</span>
        </>
      )}
    </button>
    {hint && <div className="max-w-[240px] text-right text-[11px] text-text-3">{hint}</div>}
  </div>
);
