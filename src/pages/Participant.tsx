import { useEffect, useState } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { useSession, useStageElapsed } from "@/hooks/useSession";
import type { SessionState } from "@/hooks/useSession";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Author } from "@/components/shared/Author";
import { StageChip, Timer } from "@/components/shared/StageChip";
import { Advisory } from "@/components/shared/Advisory";
import { STAGES } from "@/components/shared/StageProgress";
import {
  addIdea,
  askQuestion,
  joinAsParticipant,
  processUtterance,
} from "@/lib/actions";
import { cn } from "@/lib/utils";

export default function ParticipantPage() {
  const { id } = useParams<{ id: string }>();
  const [params] = useSearchParams();
  const initialName = params.get("name") ?? "";
  const [name, setName] = useState(initialName);
  const [joined, setJoined] = useState(false);
  const [joinErr, setJoinErr] = useState<string | null>(null);

  const { state, loading, error } = useSession(joined ? id : undefined);
  const elapsed = useStageElapsed(state?.session);

  // авто-вступление, если имя в URL
  useEffect(() => {
    if (initialName && id && !joined) {
      joinAsParticipant(id, initialName)
        .then(() => setJoined(true))
        .catch((e) => setJoinErr((e as Error)?.message || String(e)));
    }
  }, [initialName, id, joined]);

  if (!joined) {
    return (
      <div className="flex min-h-screen items-center justify-center px-4 py-6">
        <Card className="w-full max-w-[400px] px-6 py-6">
          <h2 className="mb-2 text-xl font-medium">Вход в мастермайнд</h2>
          <p className="mb-4 text-sm text-text-2">Сессия: <code className="font-mono">{id}</code></p>
          <label className="mb-1.5 block text-[11px] uppercase tracking-wider text-text-3">Ваше имя</label>
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="как вас называть в этой сессии"
            autoFocus
          />
          <div className="mt-4">
            <Button
              variant="primary"
              onClick={async () => {
                if (!name.trim() || !id) return;
                setJoinErr(null);
                try {
                  await joinAsParticipant(id, name.trim());
                  setJoined(true);
                } catch (e) {
                  setJoinErr((e as Error)?.message || String(e));
                }
              }}
            >
              Войти
            </Button>
          </div>
          {joinErr && <div className="mt-3 text-sm text-rose-ink">{joinErr}</div>}
        </Card>
      </div>
    );
  }

  if (loading || !state) {
    return <div className="px-5 py-10 text-text-3">подключаюсь к сессии {id}…</div>;
  }
  if (error) {
    return <div className="m-4 rounded-md border border-rose-bd bg-rose-bg px-4 py-3 text-rose-ink">{error}</div>;
  }

  const stage = state.session.stage;

  return (
    <div className="mx-auto max-w-2xl px-4 pb-32 pt-5">
      <div className="mb-4 flex items-center justify-between gap-3 border-b border-border-soft pb-3">
        <StageChip owner={state.session.owner_name} />
        <Timer elapsedMs={elapsed} totalMin={STAGES[stage - 1].min} label={STAGES[stage - 1].label.toLowerCase()} />
      </div>
      <div className="mb-4 text-xs text-text-3">
        вы: <Author name={name} />
      </div>

      {stage === 1 && <P1 state={state} />}
      {stage === 2 && <P2 state={state} name={name} />}
      {stage === 3 && <P3 state={state} name={name} />}
      {stage === 4 && <P4 state={state} />}
      {stage === 5 && <P5 state={state} />}
    </div>
  );
}

// ───────── Подэтап 1: только смотреть ─────────
function P1({ state }: { state: SessionState }) {
  return (
    <>
      <h2 className="mb-2 text-lg font-medium">
        Говорит <Author name={state.session.owner_name} />
      </h2>
      <p className="mb-4 text-sm text-text-2">
        Сейчас идёт изложение запроса. Слушайте — вопросы и идеи будут на следующих подэтапах.
      </p>
      <div className="flex flex-col gap-3">
        {state.slots.map((s) => (
          <Card
            key={s.n}
            variant={s.state === "done" ? "teal" : s.state === "active" ? "amber" : "flat"}
            className={cn(s.state === "wait" && "opacity-55")}
          >
            <div className="text-[11px] uppercase tracking-wider opacity-70">
              слот {s.n} · {s.title}
            </div>
            <div className="mt-1.5 text-[14px] leading-relaxed">
              {s.summary || (s.transcript ? "…идёт изложение…" : "ожидает")}
            </div>
          </Card>
        ))}
      </div>
    </>
  );
}

// ───────── Подэтап 2: задать уточняющий вопрос ─────────
function P2({ state, name }: { state: SessionState; name: string }) {
  const [text, setText] = useState("");

  const submit = () => {
    const t = text.trim();
    if (!t) return;
    askQuestion(state.session.id, name, t)
      .then(() => setText(""))
      .catch(console.error);
  };

  return (
    <>
      <h2 className="mb-2 text-lg font-medium">Уточняющие вопросы</h2>
      <Advisory tone="blue">
        Сейчас — <b>только уточнения</b>: «Что ты имеешь в виду…?», «Как часто это происходит?».
        Свои идеи и советы отложите — для них следующий подэтап.
      </Advisory>

      {state.session.ai_questions && state.session.ai_questions.length > 0 && (
        <>
          <h3 className="mb-2 mt-5 text-[11px] font-medium uppercase tracking-[0.12em] text-text-3">
            подсказки от ИИ
          </h3>
          <div className="flex flex-col gap-2">
            {state.session.ai_questions.map((q, i) => (
              <button
                key={i}
                onClick={() => setText(q)}
                className="rounded-md border border-border bg-paper px-3 py-2 text-left text-[13px] leading-relaxed text-text-1 hover:bg-background-soft"
              >
                {q}
              </button>
            ))}
          </div>
        </>
      )}

      {state.questions.length > 0 && (
        <>
          <h3 className="mb-2 mt-5 text-[11px] font-medium uppercase tracking-[0.12em] text-text-3">
            уже спросили
          </h3>
          <div className="flex flex-col gap-2">
            {state.questions.map((q) => (
              <Card key={q.id} variant="flat" className="px-3 py-2.5">
                <div className="text-[12px]"><Author name={q.author} /></div>
                <div className="mt-1 text-[13px] leading-relaxed">{q.text}</div>
              </Card>
            ))}
          </div>
        </>
      )}

      <BottomBar>
        <Textarea
          placeholder="ваш вопрос к владельцу…"
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={2}
        />
        <Button variant="primary" onClick={submit} disabled={!text.trim()}>
          Задать
        </Button>
      </BottomBar>
    </>
  );
}

// ───────── Подэтап 3: предложить идею ─────────
function P3({ state, name }: { state: SessionState; name: string }) {
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);

  const ownerSummary = state.slots.map((s) => s.summary).filter(Boolean).join(" ");
  const knownAuthors = state.participants.map((p) => p.name);

  const submitDirect = async () => {
    const t = text.trim();
    if (!t) return;
    setBusy(true);
    try {
      await addIdea(state.session.id, name, t);
      setText("");
    } catch (e) {
      console.error(e);
    } finally {
      setBusy(false);
    }
  };

  // если хочется отправить через ИИ-распознавание
  const submitViaAI = async () => {
    const t = text.trim();
    if (!t) return;
    setBusy(true);
    try {
      await processUtterance(state.session.id, name, t, ownerSummary, knownAuthors);
      setText("");
    } catch (e) {
      console.error(e);
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <h2 className="mb-2 text-lg font-medium">Идеи без критики</h2>
      <Advisory tone="teal">
        Любые идеи — даже сырые. <b>Количество важнее качества.</b> Владелец молчит и слушает.
      </Advisory>

      <h3 className="mb-2 mt-5 text-[11px] font-medium uppercase tracking-[0.12em] text-text-3">
        идеи в общей стене · {state.ideas.length}
      </h3>
      <div className="flex max-h-[40vh] flex-col gap-2 overflow-y-auto pb-1">
        {state.ideas.length === 0 && (
          <div className="text-xs text-text-3">пока пусто — будьте первым</div>
        )}
        {state.ideas.map((i) => (
          <Card key={i.id} className="px-3 py-2.5">
            <div className="flex items-center justify-between">
              <Author name={i.author} />
              <span className="text-meta">#{i.n}</span>
            </div>
            <div className="mt-1 text-[13px] leading-relaxed">{i.text}</div>
          </Card>
        ))}
      </div>

      <BottomBar>
        <Textarea
          placeholder="ваша идея — 1–2 предложения"
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={2}
          disabled={busy}
        />
        <div className="flex gap-1.5">
          <Button variant="primary" onClick={submitDirect} disabled={!text.trim() || busy}>
            Добавить
          </Button>
          <Button onClick={submitViaAI} disabled={!text.trim() || busy} title="ИИ выделит идею из вашей реплики">
            через ИИ
          </Button>
        </div>
      </BottomBar>
    </>
  );
}

// ───────── Подэтап 4: только смотреть ─────────
function P4({ state }: { state: SessionState }) {
  const sparks = state.ideas.filter((i) => i.mark === "spark");
  const qs = state.ideas.filter((i) => i.mark === "q");

  return (
    <>
      <h2 className="mb-2 text-lg font-medium">
        Слово <Author name={state.session.owner_name} />
      </h2>
      <p className="mb-4 text-sm text-text-2">
        Владелец говорит, что зацепило. Не обсуждайте — слушайте. Можно ответить на вопрос, если он касается вашей идеи.
      </p>

      {sparks.length > 0 && (
        <>
          <h3 className="mb-2 text-[11px] font-medium uppercase tracking-[0.12em] text-text-3">
            ✦ зацепило · {sparks.length}
          </h3>
          <div className="mb-4 flex flex-col gap-2">
            {sparks.map((i) => (
              <Card key={i.id} variant="amber" className="px-3 py-2.5">
                <div className="flex items-center justify-between">
                  <Author name={i.author} />
                  <span className="text-meta">#{i.n} ✦</span>
                </div>
                <div className="mt-1 text-[13px] leading-relaxed">{i.text}</div>
              </Card>
            ))}
          </div>
        </>
      )}

      {qs.length > 0 && (
        <>
          <h3 className="mb-2 text-[11px] font-medium uppercase tracking-[0.12em] text-text-3">
            ? вопрос к автору · {qs.length}
          </h3>
          <div className="flex flex-col gap-2">
            {qs.map((i) => (
              <Card key={i.id} variant="blue" className="px-3 py-2.5">
                <div className="flex items-center justify-between">
                  <Author name={i.author} />
                  <span className="text-meta">#{i.n} ?</span>
                </div>
                <div className="mt-1 text-[13px] leading-relaxed">{i.text}</div>
              </Card>
            ))}
          </div>
        </>
      )}
    </>
  );
}

// ───────── Подэтап 5: смотреть итоги ─────────
function P5({ state }: { state: SessionState }) {
  return (
    <>
      <h2 className="mb-2 text-lg font-medium">
        Что <Author name={state.session.owner_name} /> берёт в работу
      </h2>
      <p className="mb-4 text-sm text-text-2">
        Финальные обязательства владельца. Группа — свидетели.
      </p>
      {state.steps.length === 0 && (
        <Card variant="flat" className="px-5 py-5 text-center text-text-3">
          формулировка ещё идёт…
        </Card>
      )}
      <div className="flex flex-col gap-3">
        {state.steps.map((s) => (
          <Card key={s.id} variant="teal" className="px-4 py-4">
            <div className="flex items-center justify-between">
              <span className="text-[11px] uppercase tracking-wider opacity-75">шаг {s.n}</span>
              {s.due && <span className="text-xs opacity-75">{s.due}</span>}
            </div>
            <div className="mt-1.5 text-base font-medium">{s.title}</div>
            {s.detail && <div className="mt-1.5 text-[13px] leading-relaxed">{s.detail}</div>}
            {s.first_step && (
              <div className="mt-2 rounded-r-md border-l-[3px] border-teal-ink bg-white/60 px-3 py-2 text-[13px]">
                <div className="mb-0.5 text-[11px] opacity-75">первый шаг · сегодня</div>
                {s.first_step}
              </div>
            )}
          </Card>
        ))}
      </div>
    </>
  );
}

// ───────── Закреплённая нижняя панель ввода ─────────
function BottomBar({ children }: { children: React.ReactNode }) {
  return (
    <div className="fixed inset-x-0 bottom-0 z-10 border-t border-border bg-paper px-4 py-3 shadow-card">
      <div className="mx-auto flex max-w-2xl flex-col gap-2">{children}</div>
    </div>
  );
}
