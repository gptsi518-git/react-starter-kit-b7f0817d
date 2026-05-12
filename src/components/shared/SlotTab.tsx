import { cn } from "@/lib/utils";
import type { SlotState } from "@/types/database";

export const SlotTab = ({
  n,
  label,
  state,
  hint,
}: {
  n: number;
  label: string;
  state: SlotState;
  hint?: string;
}) => (
  <div
    className={cn(
      "relative rounded-md border px-4 py-3.5",
      state === "done" && "bg-teal-bg border-teal-bd text-teal-ink",
      state === "active" && "bg-amber-bg border-amber-bd ring-[3px] ring-amber-bd/25",
      state === "wait" && "bg-paper border-border opacity-55",
    )}
  >
    <div className="mb-1 text-[11px] uppercase tracking-wider text-text-3">слот {n}</div>
    <div className="text-sm font-medium">
      {label}
      {state === "done" && " ✓"}
      {state === "active" && " · идёт"}
      {state === "wait" && " · ожидает"}
    </div>
    {hint && <div className="mt-1.5 text-[11px] leading-snug text-text-3">{hint}</div>}
  </div>
);
