import { cn } from "@/lib/utils";

export const StageChip = ({
  label = "горячее кресло №1",
  owner = "Михаил",
}: {
  label?: string;
  owner?: string;
}) => (
  <span className="inline-flex items-center gap-2 rounded-full border border-border bg-paper px-3 py-1 text-xs text-text-2 tracking-wide">
    <span className="h-1.5 w-1.5 rounded-full bg-teal-ink animate-pulse-dot" />
    <span>{label} · {owner}</span>
  </span>
);

const formatMS = (ms: number) => {
  const total = Math.max(0, Math.round(ms / 1000));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
};

export const Timer = ({
  elapsedMs = 0,
  totalMin = 0,
  label = "слот",
  className,
}: {
  elapsedMs?: number;
  totalMin?: number;
  label?: string;
  className?: string;
}) => (
  <div className={cn("min-w-[130px] text-right", className)}>
    <div className="text-[28px] font-medium leading-none num-tabular">{formatMS(elapsedMs)}</div>
    <div className="mt-1 text-[11px] text-text-3 tracking-wider">из {totalMin}:00 · {label}</div>
  </div>
);

export const formatTime = formatMS;
