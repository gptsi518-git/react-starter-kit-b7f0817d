import { Fragment } from "react";
import { cn } from "@/lib/utils";

export const STAGES = [
  { n: 1, label: "Изложение запроса",  min: 8 },
  { n: 2, label: "Уточняющие вопросы", min: 7 },
  { n: 3, label: "Идеи без критики",   min: 12 },
  { n: 4, label: "Слово владельца",    min: 7 },
  { n: 5, label: "Что беру в работу",  min: 5 },
] as const;

export const STAGES_TOTAL = STAGES.reduce((s, x) => s + x.min, 0);

export const StageProgress = ({
  current = 1,
  elapsedMs = 0,
}: {
  current?: number;
  elapsedMs?: number;
}) => {
  const minutes = elapsedMs / 60000;
  const cap = Math.min(minutes, STAGES[current - 1].min);
  const nowPct = (cap / STAGES[current - 1].min) * 100;

  return (
    <div className="mt-9 border-t border-border-soft pt-6" aria-label={`Подэтап ${current} из ${STAGES.length}`}>
      <div className="mb-3.5 flex items-center justify-between">
        <div className="text-xs text-text-3">
          <span className="font-medium text-text-2">Горячее кресло №1</span>
          <span className="mx-2 opacity-50">›</span>
        </div>
        <div className="flex items-baseline gap-2">
          <span className="text-meta">всего на кресло</span>
          <span className="text-sm font-medium text-text-1">{STAGES_TOTAL} мин</span>
        </div>
      </div>

      <div className="stage-prog-rail">
        <Node state="done" label="0" />
        {STAGES.map((s, i) => {
          const state: "done" | "now" | "next" =
            s.n < current ? "done" : s.n === current ? "now" : "next";
          const cumulative = STAGES.slice(0, i + 1).reduce((a, x) => a + x.min, 0);
          const isLast = i === STAGES.length - 1;
          return (
            <Fragment key={s.n}>
              <Segment state={state} stage={s} fillPct={state === "now" ? nowPct : 0} />
              <Node state={state} label={isLast ? "" : `${cumulative} мин`} />
            </Fragment>
          );
        })}
      </div>
    </div>
  );
};

const Node = ({ state, label }: { state: "done" | "now" | "next"; label: string }) => (
  <div
    className={cn(
      "relative h-3 w-3 shrink-0 self-center rounded-full border-2",
      state === "done" && "bg-teal-ink border-teal-ink",
      state === "now"  && "bg-amber-ink border-amber-ink ring-4 ring-amber-ink/20",
      state === "next" && "bg-paper border-border-strong",
    )}
    aria-hidden
  >
    {label && <span className="absolute left-1/2 top-[18px] -translate-x-1/2 whitespace-nowrap text-[10px] text-text-3">{label}</span>}
  </div>
);

const Segment = ({
  state,
  stage,
  fillPct,
}: {
  state: "done" | "now" | "next";
  stage: { n: number; label: string; min: number };
  fillPct: number;
}) => (
  <div className={cn("flex-1 px-1 pb-6", state === "next" && "opacity-55")}>
    <div className={cn("mt-1 h-[3px] overflow-hidden rounded-full relative", state === "done" ? "bg-teal-ink" : "bg-border-soft")}>
      {state === "now" && (
        <div className="absolute left-0 top-0 h-full bg-amber-ink transition-[width] duration-500" style={{ width: `${fillPct}%` }} />
      )}
    </div>
    <div className="mt-2.5 flex flex-col gap-0.5">
      <div className="flex justify-between">
        <span className="text-[10px] uppercase tracking-wider text-text-3">Подэтап {stage.n} ({stage.min} мин)</span>
      </div>
      <div className={cn("text-xs", state === "now" ? "font-medium text-text-1" : "text-text-2")}>
        {stage.label}
      </div>
    </div>
  </div>
);
