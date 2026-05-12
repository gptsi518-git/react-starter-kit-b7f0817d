import { cn } from "@/lib/utils";
import type { ReactNode } from "react";
import type { SlotState } from "@/types/database";

export const Sticker = ({
  state,
  n,
  title,
  body,
  sub,
  children,
}: {
  state: SlotState;
  n: number;
  title: string;
  body?: string | null;
  sub?: string | null;
  children?: ReactNode;
}) => (
  <div
    className={cn(
      "flex min-h-[180px] flex-col rounded-lg border px-4 py-4",
      state === "done" && "bg-teal-bg border-teal-bd text-teal-ink",
      state === "active" && "bg-amber-bg border-amber-bd text-amber-ink",
      state === "wait" && "bg-paper border-border opacity-50",
    )}
  >
    <div className="mb-2 flex justify-between">
      <span className="text-[11px] font-medium uppercase tracking-[0.12em] opacity-75">
        слот {n}
      </span>
      {state === "done"   && <span className="text-[11px] font-medium uppercase tracking-[0.12em] opacity-75">✓ готово</span>}
      {state === "active" && <span className="text-[11px] font-medium uppercase tracking-[0.08em] animate-pulse-text opacity-80">структурирую…</span>}
      {state === "wait"   && <span className="text-[11px] font-medium uppercase tracking-[0.12em] opacity-75">ожидает</span>}
    </div>
    <div className="mb-3 text-base font-medium">{title}</div>
    {body && <div className="text-sm leading-relaxed">{body}</div>}
    {sub && <div className="text-[13px] leading-relaxed opacity-75">{sub}</div>}
    {children}
  </div>
);
