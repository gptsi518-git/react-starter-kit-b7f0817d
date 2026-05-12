import type { SessionState } from "@/hooks/useSession";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Author } from "@/components/shared/Author";
import { StageChip } from "@/components/shared/StageChip";
import { Advisory, AdvisoryLabel } from "@/components/shared/Advisory";
import { nextStage, refreshAIQuestions, togglePause } from "@/lib/actions";

export function FStage2({ state }: { state: SessionState }) {
  const { session, slots, questions } = state;

  const copy = (q: string) => {
    navigator.clipboard?.writeText(q).catch(() => {});
  };

  return (
    <>
      <div className="mb-6 flex items-start justify-between gap-6 border-b border-border-soft pb-5">
        <div>
          <div className="mb-2.5 flex items-center gap-3">
            <StageChip owner={session.owner_name} />
            <span className="text-meta">пульт фасилитатора</span>
          </div>
          <div className="text-[22px] font-medium leading-tight">Подэтап 2 · уточняющие вопросы</div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-7 lg:grid-cols-[1fr_320px]">
        <div>
          <div className="flex flex-wrap gap-2">
            <Button onClick={() => togglePause(session.id)}>
              {session.paused ? "▶ Продолжить" : "⏸ Пауза"}
            </Button>
            <Button variant="go" onClick={() => nextStage(session.id)}>К идеям без критики →</Button>
          </div>

          <Advisory tone="purple" className="mt-5">
            <div className="mb-2.5 flex items-center justify-between">
              <h3 className="m-0 text-sm font-medium">ИИ-подсказка · хорошие вопросы к запросу</h3>
              <Button
                size="sm"
                className="border-purple-bd text-purple-ink"
                onClick={() => refreshAIQuestions(session.id, slots, session.owner_name).catch(console.error)}
              >
                ↻ Сгенерировать
              </Button>
            </div>
            {(session.ai_questions ?? []).length === 0 ? (
              <div className="text-[13px] opacity-75">
                Нажмите «↻ Сгенерировать» — ИИ предложит 4 уточняющих вопроса по запросу владельца.
              </div>
            ) : (
              <div className="mt-1 flex flex-col gap-2.5">
                {session.ai_questions.map((q, i) => (
                  <div
                    key={i}
                    className="flex items-start gap-2.5 rounded-md bg-white/60 px-3 py-2.5"
                  >
                    <span className="mt-0.5 min-w-[14px] text-[11px] opacity-65">{i + 1}</span>
                    <span className="flex-1 leading-relaxed">{q}</span>
                    <button
                      onClick={() => copy(q)}
                      className="text-[12px] text-purple-ink opacity-80 hover:opacity-100"
                    >
                      Скопировать
                    </button>
                  </div>
                ))}
              </div>
            )}
          </Advisory>

          <Advisory tone="amber" className="mt-5">
            <AdvisoryLabel>Методическая подсказка</AdvisoryLabel>
            Если участник задаёт совет вместо вопроса («А ты не думал…?») — мягко скажите:
            <span className="italic opacity-90"> «отложи — выскажешь на следующем подэтапе».</span>
          </Advisory>
        </div>

        <div>
          <h3 className="mb-2.5 text-[11px] font-medium uppercase tracking-[0.12em] text-text-3">контекст · запрос владельца</h3>
          <div className="flex flex-col gap-2.5">
            {slots.map((s) => (
              <Card key={s.n} variant="teal" className="px-3.5 py-3 min-h-0">
                <div className="text-[10px] uppercase tracking-wider">слот {s.n} · {s.title}</div>
                <div className="mt-1 text-[13px] leading-relaxed">
                  {s.summary || s.transcript || <em className="opacity-60">пусто</em>}
                </div>
              </Card>
            ))}
          </div>

          <h3 className="mb-2.5 mt-6 text-[11px] font-medium uppercase tracking-[0.12em] text-text-3">вопросы прозвучали</h3>
          <Card variant="flat" className="px-3.5 py-3.5">
            {questions.length === 0 && (
              <div className="text-xs text-text-3">участники могут задавать вопросы со своих экранов</div>
            )}
            <div className="flex flex-col gap-2.5 text-[13px]">
              {questions.map((q) => (
                <div key={q.id}>
                  <Author name={q.author} /> <span className="text-text-2">— {q.text}</span>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </>
  );
}
