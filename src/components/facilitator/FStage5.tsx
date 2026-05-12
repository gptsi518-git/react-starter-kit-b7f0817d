import { useState } from "react";
import type { SessionState } from "@/hooks/useSession";
import type { StepRow } from "@/types/database";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Author } from "@/components/shared/Author";
import { StageChip } from "@/components/shared/StageChip";
import { Advisory, AdvisoryLabel } from "@/components/shared/Advisory";
import {
  addStep,
  removeStep,
  suggestSteps,
  togglePause,
  updateStep,
} from "@/lib/actions";

export function FStage5({ state }: { state: SessionState }) {
  const { session, slots, ideas, steps } = state;
  const sparks = ideas.filter((i) => i.mark === "spark");
  const ownerSummary = slots.map((s) => s.summary).filter(Boolean).join(" ");

  const [showNew, setShowNew] = useState(false);
  const [suggestions, setSuggestions] = useState<
    { title: string; detail: string; firstStep: string; ideaRefs: number[] }[] | null
  >(null);

  const askAI = async () => {
    setSuggestions(null);
    try {
      const res = await suggestSteps(sparks, ownerSummary);
      setSuggestions(res.steps);
    } catch (e) {
      console.error(e);
    }
  };

  const acceptSuggestion = (s: { title: string; detail: string; firstStep: string; ideaRefs: number[] }) => {
    addStep(session.id, {
      title: s.title,
      detail: s.detail,
      firstStep: s.firstStep,
      due: "",
      ideaRefs: s.ideaRefs ?? [],
    }).catch(console.error);
  };

  return (
    <>
      <div className="mb-6 flex items-start justify-between gap-6 border-b border-border-soft pb-5">
        <div>
          <div className="mb-2.5 flex items-center gap-3">
            <StageChip owner={session.owner_name} />
            <span className="text-meta">пульт · финальный подэтап</span>
          </div>
          <div className="text-[22px] font-medium leading-tight">
            Что <Author name={session.owner_name} /> берёт в работу
          </div>
        </div>
      </div>

      <div className="mb-5 grid grid-cols-3 gap-3.5">
        <div className="rounded-md border border-border bg-paper px-4 py-3.5">
          <div className="text-[22px] font-medium leading-none text-teal-ink">{steps.length} / 3</div>
          <div className="mt-1.5 text-[11px] uppercase tracking-wider text-text-3">шагов записано · максимум 3</div>
        </div>
        <div className="rounded-md border border-border bg-paper px-4 py-3.5">
          <div className="text-[22px] font-medium leading-none">{sparks.length}</div>
          <div className="mt-1.5 text-[11px] uppercase tracking-wider text-text-3">идей помечено ✦</div>
        </div>
        <div className="rounded-md border border-border bg-paper px-4 py-3.5">
          <div className="text-base font-medium">после этапа</div>
          <div className="mt-1.5 text-[11px] uppercase tracking-wider text-text-3">протокол можно скопировать</div>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button onClick={() => togglePause(session.id)}>
          {session.paused ? "▶ Продолжить" : "⏸ Пауза"}
        </Button>
        <Button variant="primary" onClick={() => setShowNew(true)} disabled={steps.length >= 3}>
          + Новый шаг
        </Button>
        <Button
          className="border-purple-bd text-purple-ink"
          onClick={askAI}
          disabled={sparks.length === 0}
        >
          ИИ предложит шаги
        </Button>
        <Button variant="ghost" className="ml-auto" onClick={() => copyProtocol(state)}>
          📋 Копировать протокол
        </Button>
      </div>

      {suggestions && suggestions.length > 0 && (
        <Advisory tone="purple" className="mt-5">
          <AdvisoryLabel>Предложения ИИ · по помеченным идеям</AdvisoryLabel>
          <div className="mt-2.5 flex flex-col gap-2.5">
            {suggestions.map((sug, i) => (
              <div key={i} className="rounded-md bg-white/55 px-3 py-2.5">
                <div className="mb-1 font-medium">{sug.title}</div>
                <div className="text-[13px] opacity-90">{sug.detail}</div>
                {sug.firstStep && <div className="mt-1 text-xs opacity-70">первый шаг: {sug.firstStep}</div>}
                <div className="mt-2">
                  <Button size="sm" variant="ok" onClick={() => acceptSuggestion(sug)}>
                    + Добавить как шаг
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </Advisory>
      )}

      {showNew && <NewStepForm state={state} onClose={() => setShowNew(false)} />}

      <h3 className="mt-6 mb-3 text-[11px] font-medium uppercase tracking-[0.12em] text-text-3">
        созданные шаги · {steps.length}
      </h3>
      {steps.length === 0 ? (
        <Card variant="flat" className="px-5 py-5 text-center text-text-3">
          пока нет шагов — добавьте вручную или попросите ИИ
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {steps.map((step) => (
            <StepCard key={step.id} step={step} state={state} />
          ))}
        </div>
      )}

      <Advisory tone="amber" className="mt-5">
        <AdvisoryLabel>Методическая подсказка</AdvisoryLabel>
        Если владелец хочет 3-й шаг — спросите:
        <span className="italic opacity-90"> «уверен, что сделаешь все 3? лучше 1–2 честных».</span>
      </Advisory>
    </>
  );
}

function NewStepForm({
  state,
  onClose,
}: {
  state: SessionState;
  onClose: () => void;
}) {
  const sparks = state.ideas.filter((i) => i.mark === "spark");
  const [title, setTitle] = useState("");
  const [detail, setDetail] = useState("");
  const [firstStep, setFirstStep] = useState("");
  const [due, setDue] = useState("");
  const [refs, setRefs] = useState<number[]>([]);

  const submit = () => {
    if (!title.trim()) return;
    addStep(state.session.id, {
      title: title.trim(),
      detail: detail.trim(),
      firstStep: firstStep.trim(),
      due: due.trim(),
      ideaRefs: refs,
    }).then(onClose).catch(console.error);
  };

  return (
    <Card className="mt-4">
      <Label>Новый шаг</Label>
      <div className="flex flex-col gap-3">
        <Input placeholder="что именно — короткий заголовок" value={title} onChange={(e) => setTitle(e.target.value)} />
        <Textarea placeholder="описание — 1 предложение" value={detail} onChange={(e) => setDetail(e.target.value)} />
        <Input placeholder="первый микро-шаг сегодня — 5–15 минут работы" value={firstStep} onChange={(e) => setFirstStep(e.target.value)} />
        <Input placeholder="срок (например: до 10 мая)" value={due} onChange={(e) => setDue(e.target.value)} />
        {sparks.length > 0 && (
          <div>
            <Label>по следам идей · ✦</Label>
            <div className="flex flex-wrap gap-1.5">
              {sparks.map((i) => (
                <button
                  key={i.n}
                  onClick={() => setRefs((r) => (r.includes(i.n) ? r.filter((x) => x !== i.n) : [...r, i.n]))}
                  className={
                    refs.includes(i.n)
                      ? "rounded-md border border-teal-bd bg-teal-bg px-2.5 py-1 text-xs text-teal-ink"
                      : "rounded-md border border-border-strong bg-paper px-2.5 py-1 text-xs text-text-1 hover:bg-background-soft"
                  }
                >
                  #{i.n} {i.text.slice(0, 30)}{i.text.length > 30 ? "…" : ""}
                </button>
              ))}
            </div>
          </div>
        )}
        <div className="flex gap-2">
          <Button variant="primary" onClick={submit}>Сохранить</Button>
          <Button variant="ghost" onClick={onClose}>Отмена</Button>
        </div>
      </div>
    </Card>
  );
}

function StepCard({ step, state }: { step: StepRow; state: SessionState }) {
  const [editing, setEditing] = useState(false);
  const [d, setD] = useState({ title: step.title, detail: step.detail, first_step: step.first_step, due: step.due });

  const save = () => {
    updateStep(step.id, d).then(() => setEditing(false)).catch(console.error);
  };

  return (
    <Card>
      <div className="flex items-start justify-between gap-2.5">
        <span className="text-[11px] font-medium uppercase tracking-[0.12em]">
          Шаг {step.n}{step.due && ` · ${step.due}`}
        </span>
        <div className="flex gap-1">
          {!editing && <Button size="sm" onClick={() => setEditing(true)}>Редактировать</Button>}
          <Button size="sm" variant="ghost" onClick={() => removeStep(step.id).catch(console.error)}>×</Button>
        </div>
      </div>

      {editing ? (
        <div className="mt-2.5 flex flex-col gap-2.5">
          <Input value={d.title} onChange={(e) => setD({ ...d, title: e.target.value })} placeholder="заголовок" />
          <Textarea value={d.detail} onChange={(e) => setD({ ...d, detail: e.target.value })} placeholder="описание" />
          <Input value={d.first_step} onChange={(e) => setD({ ...d, first_step: e.target.value })} placeholder="первый шаг" />
          <Input value={d.due} onChange={(e) => setD({ ...d, due: e.target.value })} placeholder="срок" />
          <div className="flex gap-2">
            <Button size="sm" variant="primary" onClick={save}>Сохранить</Button>
            <Button size="sm" variant="ghost" onClick={() => setEditing(false)}>Отмена</Button>
          </div>
        </div>
      ) : (
        <>
          <div className="mt-2.5 text-[15px] font-medium leading-snug">{step.title}</div>
          {step.detail && <div className="mt-2 text-[13px] leading-relaxed text-text-2">{step.detail}</div>}
          {step.first_step && (
            <div className="mt-2.5 rounded-r-md border-l-[3px] border-teal-ink bg-background-soft px-3 py-2.5 text-[13px] leading-relaxed">
              <span className="mb-1 block text-[11px] text-text-3">первый шаг · сегодня</span>
              {step.first_step}
            </div>
          )}
          {step.idea_refs && step.idea_refs.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {step.idea_refs.map((n) => {
                const i = state.ideas.find((x) => x.n === n);
                if (!i) return null;
                return (
                  <span key={n} className="inline-flex items-center gap-1 text-xs">
                    <Author name={i.author} /><span className="text-meta">#{n}</span>
                  </span>
                );
              })}
            </div>
          )}
        </>
      )}
    </Card>
  );
}

function copyProtocol(state: SessionState) {
  const { session, slots, ideas, steps } = state;
  const lines: string[] = [];
  lines.push(`ПРОТОКОЛ МАСТЕРМАЙНДА · сессия ${session.id}`);
  lines.push(`Владелец: ${session.owner_name}`);
  lines.push("");
  lines.push("ЗАПРОС:");
  slots.forEach((s) => {
    if (s.summary || s.transcript) lines.push(`  ${s.title}: ${s.summary || s.transcript}`);
  });
  lines.push("");
  if (ideas.length > 0) {
    lines.push("ИДЕИ ОТ ГРУППЫ:");
    ideas.forEach((i) => {
      const m = i.mark === "spark" ? " ✦" : i.mark === "q" ? " ?" : "";
      lines.push(`  #${i.n} (${i.author}): ${i.text}${m}`);
    });
    lines.push("");
  }
  if (steps.length > 0) {
    lines.push("ЧТО БЕРУ В РАБОТУ:");
    steps.forEach((s) => {
      lines.push(`  Шаг ${s.n}${s.due ? ` · ${s.due}` : ""}: ${s.title}`);
      if (s.detail) lines.push(`    ${s.detail}`);
      if (s.first_step) lines.push(`    Первый шаг: ${s.first_step}`);
    });
  }
  if (session.notes) {
    lines.push("");
    lines.push("ЗАМЕТКИ ФАСИЛИТАТОРА:");
    lines.push(session.notes);
  }
  const text = lines.join("\n");
  navigator.clipboard?.writeText(text).then(
    () => alert("Протокол скопирован в буфер"),
    () => prompt("Скопируйте протокол:", text),
  );
}
