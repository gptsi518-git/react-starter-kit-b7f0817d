import { Fragment } from "react";
import { useParams } from "react-router-dom";
import { useSession, useStageElapsed } from "@/hooks/useSession";
import type { SessionState } from "@/hooks/useSession";
import { Author } from "@/components/shared/Author";
import { StageChip, Timer } from "@/components/shared/StageChip";
import { Sticker } from "@/components/shared/Sticker";
import { STAGES, StageProgress } from "@/components/shared/StageProgress";
import { Advisory, AdvisoryRules } from "@/components/shared/Advisory";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export default function GroupPage() {
  const { id } = useParams<{ id: string }>();
  const { state, loading, error } = useSession(id);
  const elapsed = useStageElapsed(state?.session);

  if (loading || !state) {
    return <div className="container mx-auto pb-10 pt-6"><div className="px-10 py-10 text-text-3">подключаюсь к сессии {id}…</div></div>;
  }
  if (error) {
    return <div className="container mx-auto pb-10 pt-6"><div className="rounded-md border border-rose-bd bg-rose-bg px-5 py-4 text-rose-ink">{error}</div></div>;
  }

  const stage = state.session.stage;
  return (
    <div className="container mx-auto pb-14 pt-6">
      {stage === 1 && <G1 state={state} elapsedMs={elapsed} />}
      {stage === 2 && <G2 state={state} elapsedMs={elapsed} />}
      {stage === 3 && <G3 state={state} elapsedMs={elapsed} />}
      {stage === 4 && <G4 state={state} elapsedMs={elapsed} />}
      {stage === 5 && <G5 state={state} elapsedMs={elapsed} />}
      <StageProgress current={stage} elapsedMs={elapsed} />
    </div>
  );
}

function GHeader({
  state,
  title,
  subtitle,
  timerMin,
  timerLabel,
  elapsedMs,
}: {
  state: SessionState;
  title: React.ReactNode;
  subtitle?: string;
  timerMin: number;
  timerLabel: string;
  elapsedMs: number;
}) {
  return (
    <div className="mb-6 flex items-start justify-between gap-6 border-b border-border-soft pb-5">
      <div>
        <div className="mb-2.5"><StageChip owner={state.session.owner_name} /></div>
        <div className="text-[22px] font-medium leading-tight">{title}</div>
        {subtitle && <div className="mt-1.5 text-[13px] text-text-2">{subtitle}</div>}
      </div>
      <Timer elapsedMs={elapsedMs} totalMin={timerMin} label={timerLabel} />
    </div>
  );
}

// ───────── Подэтап 1 ─────────
function G1({ state, elapsedMs }: { state: SessionState; elapsedMs: number }) {
  return (
    <>
      <GHeader
        state={state}
        title={<>Изложение запроса · говорит <Author name={state.session.owner_name} /></>}
        subtitle="3 слота по структуре · стикеры появляются после закрытия слота"
        timerMin={STAGES[0].min}
        timerLabel={`слот ${state.session.active_slot}`}
        elapsedMs={elapsedMs}
      />
      <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
        {state.slots.map((s) => (
          <Sticker
            key={s.n}
            state={s.state}
            n={s.n}
            title={s.title}
            body={s.summary || null}
            sub={s.state === "done" && !s.summary ? "(саммари не сформировано)" : null}
          >
            {s.state === "active" && !s.summary && (
              <div className="mt-auto text-[13px] opacity-75">
                {s.transcript ? "…идёт изложение…" : "…ждёт начала…"}
              </div>
            )}
          </Sticker>
        ))}
      </div>
    </>
  );
}

// ───────── Подэтап 2 ─────────
function G2({ state, elapsedMs }: { state: SessionState; elapsedMs: number }) {
  return (
    <>
      <GHeader
        state={state}
        title={<>Уточняющие вопросы к <Author name={state.session.owner_name} /></>}
        subtitle={`задают участники · отвечает ${state.session.owner_name}`}
        timerMin={STAGES[1].min}
        timerLabel="уточнения"
        elapsedMs={elapsedMs}
      />
      <Advisory tone="blue">
        <AdvisoryRules
          left={{ title: "✓ сейчас — только уточнения", body: <>«Что ты имеешь в виду…?»<br />«Как именно это происходит?»<br />«Сколько раз это было?»</> }}
          right={{ title: "— идеи отложим на следующий подэтап", body: <>«А ты не думал…?»<br />«А почему бы не…?»<br />«Я бы на твоём месте…»</>, muted: true }}
        />
      </Advisory>
      <div className="mt-7">
        <h3 className="mb-3 text-[11px] font-medium uppercase tracking-[0.12em] text-text-3">запрос — помним всё время</h3>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {state.slots.map((s) => (
            <Sticker key={s.n} state="done" n={s.n} title={s.title} body={s.summary || s.transcript || "—"} />
          ))}
        </div>
      </div>
    </>
  );
}

// ───────── Подэтап 3 ─────────
function G3({ state, elapsedMs }: { state: SessionState; elapsedMs: number }) {
  return (
    <>
      <GHeader
        state={state}
        title={<>Идеи для <Author name={state.session.owner_name} /> · без критики</>}
        subtitle={`количество важнее качества · ${state.session.owner_name} молчит и слушает`}
        timerMin={STAGES[2].min}
        timerLabel="идеи без критики"
        elapsedMs={elapsedMs}
      />
      <Advisory tone="teal">
        <AdvisoryRules
          left={{ title: "✓ сейчас — только идеи", body: "Любые — даже сырые и безумные. Количество важнее качества." }}
          right={{ title: "— без критики и обсуждений", body: `${state.session.owner_name} молчит и слушает. Его очередь — в следующем подэтапе.`, muted: true }}
        />
      </Advisory>
      <div className="mt-6">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-[11px] font-medium uppercase tracking-[0.12em] text-text-3">стена идей · {state.ideas.length}</h3>
          <span className="text-meta">новые появляются по мере поступления</span>
        </div>
        {state.ideas.length === 0 ? (
          <Card variant="flat" className="px-7 py-7 text-center text-text-3">идеи пока не записаны</Card>
        ) : (
          <div className="grid grid-cols-1 gap-3.5 md:grid-cols-3">
            {state.ideas.map((i) => (
              <Card key={i.id} className="flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <Author name={i.author} />
                  <span className="text-meta">#{i.n}</span>
                </div>
                <div className="text-[14px] leading-relaxed">{i.text}</div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </>
  );
}

// ───────── Подэтап 4 ─────────
function G4({ state, elapsedMs }: { state: SessionState; elapsedMs: number }) {
  const sparks = state.ideas.filter((i) => i.mark === "spark").length;
  const questions = state.ideas.filter((i) => i.mark === "q").length;

  return (
    <>
      <GHeader
        state={state}
        title={state.session.clusters ? "Идеи сгруппированы по темам" : "Все идеи · ход слова владельца"}
        subtitle={`говорит ${state.session.owner_name} — что зацепило`}
        timerMin={STAGES[3].min}
        timerLabel="слово владельца"
        elapsedMs={elapsedMs}
      />
      <Advisory tone="purple">
        <AdvisoryRules
          left={{ title: "скажи, что зацепило — не «сработает»", body: "Можно уточнить у автора, что он имел в виду. Критика — мимо." }}
          right={{ title: "не надо решать прямо сейчас", body: "«Что беру в работу» — это следующий подэтап.", muted: true }}
        />
      </Advisory>

      {state.session.clusters && state.session.clusters.length > 0 ? (
        <div
          className="mt-6 grid gap-4"
          style={{ gridTemplateColumns: `repeat(${Math.min(state.session.clusters.length, 3)}, minmax(0, 1fr))` }}
        >
          {state.session.clusters.map((c, idx) => (
            <div key={idx} className="flex flex-col gap-2.5 rounded-lg border border-dashed border-border-strong bg-background-soft px-3.5 py-3.5">
              <div>
                <div className="text-[10px] uppercase tracking-wider text-text-3">кластер {String.fromCharCode(65 + idx)}</div>
                <div className="text-sm font-medium">{c.title}</div>
              </div>
              {c.ideaIds.map((n) => {
                const idea = state.ideas.find((i) => i.n === n);
                if (!idea) return null;
                return (
                  <Fragment key={n}>
                    <IdeaTile idea={idea} />
                  </Fragment>
                );
              })}
            </div>
          ))}
        </div>
      ) : (
        <div className="mt-6 grid grid-cols-1 gap-3.5 md:grid-cols-3">
          {state.ideas.map((i) => <IdeaTile key={i.id} idea={i} />)}
        </div>
      )}

      <div className="mt-4 flex flex-wrap items-center gap-6 text-xs text-text-3">
        <span><span className="font-medium text-amber-ink">✦</span> зацепило · {sparks}</span>
        <span><span className="font-medium text-blue-ink">?</span> вопрос к автору · {questions}</span>
        {state.session.clusters && <span className="ml-auto">кластеры собрал ИИ</span>}
      </div>
    </>
  );
}

function IdeaTile({ idea }: { idea: SessionState["ideas"][number] }) {
  return (
    <Card
      className={cn(
        "flex flex-col gap-2",
        idea.mark === "spark" && "bg-amber-bg border-amber-bd",
        idea.mark === "q" && "bg-blue-bg border-blue-bd",
      )}
    >
      <div className="flex items-center justify-between">
        <Author name={idea.author} />
        <span className="text-meta">
          #{idea.n}
          {idea.mark === "spark" && <span className="ml-2 text-amber-ink">✦</span>}
          {idea.mark === "q" && <span className="ml-2 text-blue-ink">?</span>}
        </span>
      </div>
      <div className="text-[14px] leading-relaxed">{idea.text}</div>
    </Card>
  );
}

// ───────── Подэтап 5 ─────────
function G5({ state, elapsedMs }: { state: SessionState; elapsedMs: number }) {
  return (
    <>
      <GHeader
        state={state}
        title={<>Что <Author name={state.session.owner_name} /> берёт в работу</>}
        subtitle="социальный контракт · видит вся группа"
        timerMin={STAGES[4].min}
        timerLabel="финальный подэтап"
        elapsedMs={elapsedMs}
      />
      <Advisory tone="teal">
        <div className="flex flex-wrap items-center gap-4">
          <div className="text-[15px] font-medium">Максимум 3 шага. Лучше 1–2.</div>
          <div className="text-[13px] opacity-85">Группа видит обязательства — это социальный контракт.</div>
        </div>
      </Advisory>

      <div className="mt-6 grid grid-cols-1 gap-5 md:grid-cols-3">
        {[1, 2, 3].map((slot) => {
          const step = state.steps[slot - 1];
          if (!step) {
            return (
              <Card key={slot} variant="flat" className="flex min-h-[240px] flex-col items-center justify-center gap-3 border-dashed border-border-strong text-center shadow-none">
                <span className="text-[11px] uppercase tracking-wider text-text-3">Шаг {slot}</span>
                <div className="max-w-[220px] text-[14px] leading-relaxed text-text-3">
                  {slot === 3 ? "Место для третьего шага — или оставить 2." : "Ожидает формулировки."}
                </div>
                <div className="text-meta opacity-70">Лучше меньше, но честно.</div>
              </Card>
            );
          }
          return (
            <Card key={slot} className="flex min-h-[240px] flex-col gap-3 px-5 py-5">
              <div className="flex items-start justify-between">
                <span className="text-[11px] font-medium uppercase tracking-[0.12em] text-text-2">Шаг {step.n}</span>
                {step.due && <span className="text-xs text-text-3">{step.due}</span>}
              </div>
              <div className="text-base font-medium leading-snug">{step.title}</div>
              {step.detail && <div className="text-[13px] leading-relaxed text-text-2">{step.detail}</div>}
              {step.first_step && (
                <div className="rounded-r-md border-l-[3px] border-teal-ink bg-background-soft px-3 py-2.5 text-[13px] leading-relaxed">
                  <span className="mb-1 block text-[11px] text-text-3">первый шаг · сегодня</span>
                  {step.first_step}
                </div>
              )}
              {step.idea_refs && step.idea_refs.length > 0 && (
                <div className="mt-auto border-t border-border-soft pt-2.5">
                  <div className="mb-1.5 text-meta">по следам идей</div>
                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    {step.idea_refs.map((n) => {
                      const i = state.ideas.find((x) => x.n === n);
                      if (!i) return null;
                      return (
                        <Fragment key={n}>
                          <Author name={i.author} /><span className="text-meta">#{n}</span>
                        </Fragment>
                      );
                    })}
                  </div>
                </div>
              )}
            </Card>
          );
        })}
      </div>
    </>
  );
}
