import type { SessionState } from "@/hooks/useSession";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Author } from "@/components/shared/Author";
import { StageChip } from "@/components/shared/StageChip";
import { Advisory, AdvisoryLabel } from "@/components/shared/Advisory";
import {
  clusterIdeas,
  flattenClusters,
  nextStage,
  toggleIdeaMark,
  togglePause,
} from "@/lib/actions";
import { cn } from "@/lib/utils";

export function FStage4({ state }: { state: SessionState }) {
  const { session, slots, ideas } = state;
  const sparks = ideas.filter((i) => i.mark === "spark").length;
  const questions = ideas.filter((i) => i.mark === "q").length;
  const ownerSummary = slots.map((s) => s.summary).filter(Boolean).join(" ");

  return (
    <>
      <div className="mb-6 flex items-start justify-between gap-6 border-b border-border-soft pb-5">
        <div>
          <div className="mb-2.5 flex items-center gap-3">
            <StageChip owner={session.owner_name} />
            <span className="text-meta">пульт фасилитатора · ставьте метки по словам владельца</span>
          </div>
          <div className="text-[22px] font-medium leading-tight">
            Подэтап 4 · слово <Author name={session.owner_name} />
          </div>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button onClick={() => togglePause(session.id)}>
          {session.paused ? "▶ Продолжить" : "⏸ Пауза"}
        </Button>
        {session.clusters ? (
          <Button onClick={() => flattenClusters(session.id)}>Вернуть плоский вид</Button>
        ) : (
          <Button
            className="border-purple-bd text-purple-ink"
            onClick={() => clusterIdeas(session.id, ideas, ownerSummary).catch(console.error)}
            disabled={ideas.length < 3}
          >
            Кластеризовать ИИ
          </Button>
        )}
        <Button variant="go" onClick={() => nextStage(session.id)}>К «что беру» →</Button>
      </div>

      <div className="mx-1 my-6 grid grid-cols-3 gap-3.5">
        <div className="rounded-md border border-border bg-paper px-4 py-3.5">
          <div className="text-[22px] font-medium leading-none text-amber-ink">✦ {sparks}</div>
          <div className="mt-1.5 text-[11px] uppercase tracking-wider text-text-3">зацепило</div>
        </div>
        <div className="rounded-md border border-border bg-paper px-4 py-3.5">
          <div className="text-[22px] font-medium leading-none text-blue-ink">? {questions}</div>
          <div className="mt-1.5 text-[11px] uppercase tracking-wider text-text-3">вопрос к автору</div>
        </div>
        <div className="rounded-md border border-border bg-paper px-4 py-3.5">
          <div className="text-[22px] font-medium leading-none text-text-2">{ideas.length}</div>
          <div className="mt-1.5 text-[11px] uppercase tracking-wider text-text-3">идей всего</div>
        </div>
      </div>

      <h3 className="mb-2.5 text-[11px] font-medium uppercase tracking-[0.12em] text-text-3">
        ставьте метки — ✦ зацепило, ? вопрос к автору
      </h3>
      <div className="grid grid-cols-1 gap-2.5 md:grid-cols-2">
        {ideas.map((i) => (
          <div
            key={i.id}
            className={cn(
              "flex items-center gap-3 rounded-md border px-3.5 py-3",
              i.mark === "spark" && "bg-amber-bg border-amber-bd",
              i.mark === "q" && "bg-blue-bg border-blue-bd",
              !i.mark && "bg-paper border-border",
            )}
          >
            <span className="text-meta min-w-[20px]">#{i.n}</span>
            <div className="flex flex-1 flex-col gap-1">
              <div className="text-[13px]">{i.text}</div>
              <Author name={i.author} />
            </div>
            <div className="flex gap-1">
              <MarkBtn on={i.mark === "spark"} onClick={() => toggleIdeaMark(i.id, "spark")} kind="spark" />
              <MarkBtn on={i.mark === "q"} onClick={() => toggleIdeaMark(i.id, "q")} kind="q" />
            </div>
          </div>
        ))}
      </div>

      {session.clusters && session.clusters.length > 0 && (
        <>
          <h3 className="mt-7 mb-3 text-[11px] font-medium uppercase tracking-[0.12em] text-text-3">кластеры от ИИ</h3>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            {session.clusters.map((c, idx) => (
              <div key={idx} className="flex flex-col gap-2.5 rounded-lg border border-dashed border-border-strong bg-background-soft px-3.5 py-3.5">
                <div>
                  <div className="text-[10px] uppercase tracking-wider text-text-3">кластер {String.fromCharCode(65 + idx)}</div>
                  <div className="text-sm font-medium">{c.title}</div>
                </div>
                {c.ideaIds.map((n) => {
                  const idea = ideas.find((i) => i.n === n);
                  if (!idea) return null;
                  return (
                    <div
                      key={n}
                      className={cn(
                        "rounded-md border bg-paper px-3 py-2.5 shadow-card",
                        idea.mark === "spark" && "bg-amber-bg border-amber-bd",
                        idea.mark === "q" && "bg-blue-bg border-blue-bd",
                      )}
                    >
                      <div className="flex items-center justify-between">
                        <Author name={idea.author} />
                        <span className="text-meta">#{idea.n}</span>
                      </div>
                      <div className="mt-1.5 text-[13px]">{idea.text}</div>
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </>
      )}

      <Advisory tone="amber" className="mt-5">
        <AdvisoryLabel>Методическая подсказка</AdvisoryLabel>
        Если владелец начал объяснять <i>почему идея не сработает</i> — мягко верните:
        <span className="italic opacity-90"> «давай не „сработает / не сработает“, а что зацепило?»</span>
      </Advisory>
    </>
  );
}

function MarkBtn({
  on,
  onClick,
  kind,
}: {
  on: boolean;
  onClick: () => void;
  kind: "spark" | "q";
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "inline-flex h-7 w-7 items-center justify-center rounded-full border border-border-strong bg-paper text-sm text-text-3 transition-colors hover:bg-background-soft",
        on && kind === "spark" && "bg-amber-ink text-white border-amber-ink hover:bg-amber-ink",
        on && kind === "q" && "bg-blue-ink text-white border-blue-ink hover:bg-blue-ink",
      )}
      title={kind === "spark" ? "зацепило" : "вопрос к автору"}
    >
      {kind === "spark" ? "✦" : "?"}
    </button>
  );
}
