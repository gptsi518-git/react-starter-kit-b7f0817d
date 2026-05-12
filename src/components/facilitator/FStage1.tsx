import { useState } from "react";
import type { SessionState } from "@/hooks/useSession";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Author } from "@/components/shared/Author";
import { StageChip, formatTime } from "@/components/shared/StageChip";
import { SlotTab } from "@/components/shared/SlotTab";
import { RecBtn } from "@/components/shared/RecBtn";
import { SimulateBox } from "@/components/shared/SimulateBox";
import { Advisory, AdvisoryLabel } from "@/components/shared/Advisory";
import {
  appendSlotTranscript,
  nextSlot,
  nextStage,
  togglePause,
  summarizeSlotAndSave,
  setSlotSummary,
} from "@/lib/actions";
import { cn } from "@/lib/utils";

export function FStage1({ state, elapsedMs }: { state: SessionState; elapsedMs: number }) {
  const { session, slots, participants } = state;
  const recTime = formatTime(elapsedMs);
  const [editing, setEditing] = useState<Record<number, string>>({});

  const onSimulate = ({ text }: { text: string }) => {
    const slot = slots.find((s) => s.n === session.active_slot);
    if (!slot) return;
    appendSlotTranscript(session.id, slot.n, text, slot.transcript);
  };

  const handleNextSlot = async () => {
    const closing = slots.find((s) => s.n === session.active_slot);
    await nextSlot(session.id);
    if (closing && closing.transcript && !closing.summary) {
      summarizeSlotAndSave(session.id, closing, session.owner_name).catch(console.error);
    }
  };

  const saveEditedSummary = (slotN: number) => {
    setSlotSummary(session.id, slotN, editing[slotN]);
    setEditing((e) => {
      const c = { ...e };
      delete c[slotN];
      return c;
    });
  };

  return (
    <>
      <div className="mb-6 flex items-start justify-between gap-6 border-b border-border-soft pb-5">
        <div>
          <div className="mb-2.5 flex items-center gap-3">
            <StageChip owner={session.owner_name} />
            <span className="text-meta">пульт фасилитатора</span>
          </div>
          <div className="text-[22px] font-medium leading-tight">
            Изложение запроса · говорит <Author name={session.owner_name} />
          </div>
        </div>
        <div className="flex flex-col items-end gap-2.5">
          <RecBtn on time={recTime} hint="ИИ структурирует слот после закрытия" />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-7 lg:grid-cols-[1fr_320px]">
        <div>
          <h3 className="mb-2.5 text-[11px] font-medium uppercase tracking-[0.12em] text-text-3">слоты</h3>
          <div className="grid grid-cols-3 gap-3">
            {slots.map((s) => (
              <SlotTab
                key={s.n}
                n={s.n}
                label={s.title}
                state={s.state}
                hint={
                  s.state === "done"
                    ? "готово · саммари ниже"
                    : s.state === "active"
                    ? `идёт · ${formatTime(elapsedMs)}`
                    : "ожидает"
                }
              />
            ))}
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            <Button onClick={() => togglePause(session.id)}>
              {session.paused ? "▶ Продолжить" : "⏸ Пауза"}
            </Button>
            <Button variant="ghost" onClick={handleNextSlot}>
              {session.active_slot < 3 ? "Следующий слот →" : "Закрыть последний слот"}
            </Button>
            <Button variant="go" onClick={() => nextStage(session.id)}>
              К уточняющим вопросам →
            </Button>
          </div>

          <SimulateBox
            title={`имитация: что говорит ${session.owner_name}`}
            placeholder="вставьте сюда то, что произнёс владелец…"
            onSend={onSimulate}
            showAuthor={false}
          />

          <h3 className="mb-2.5 mt-7 text-[11px] font-medium uppercase tracking-[0.12em] text-text-3">
            стикеры по слотам
          </h3>
          <div className="flex flex-col gap-3">
            {slots.map((s) => (
              <Card
                key={s.n}
                variant={s.state === "done" ? "teal" : s.state === "active" ? "amber" : "flat"}
              >
                <div className="flex justify-between gap-2.5">
                  <div className="flex-1">
                    <span className="text-[11px] uppercase tracking-wider opacity-75">
                      слот {s.n} · {s.title}
                    </span>
                    <div className="mt-2 text-sm leading-relaxed">
                      {s.summary ? (
                        s.summary
                      ) : s.transcript ? (
                        <span className="italic opacity-70">будет суммировано после закрытия слота…</span>
                      ) : (
                        <span className="opacity-50">пока пусто</span>
                      )}
                    </div>
                    {editing[s.n] !== undefined && (
                      <div className="mt-2.5">
                        <Textarea
                          value={editing[s.n]}
                          onChange={(e) => setEditing((p) => ({ ...p, [s.n]: e.target.value }))}
                        />
                        <div className="mt-2 flex gap-2">
                          <Button size="sm" onClick={() => saveEditedSummary(s.n)}>Сохранить</Button>
                          <Button size="sm" variant="ghost" onClick={() => setEditing((p) => { const c = { ...p }; delete c[s.n]; return c; })}>
                            Отмена
                          </Button>
                        </div>
                      </div>
                    )}
                    {s.transcript && (
                      <details className="mt-2">
                        <summary className="cursor-pointer text-[11px] text-text-3">показать расшифровку</summary>
                        <div className="mt-1.5 text-xs leading-relaxed text-text-2">{s.transcript}</div>
                      </details>
                    )}
                  </div>
                  <div className="flex gap-1.5">
                    {s.summary && editing[s.n] === undefined && (
                      <Button size="sm" onClick={() => setEditing((p) => ({ ...p, [s.n]: s.summary }))}>
                        Редактировать
                      </Button>
                    )}
                    {s.transcript && (
                      <Button
                        size="sm"
                        onClick={() =>
                          summarizeSlotAndSave(session.id, s, session.owner_name).catch(console.error)
                        }
                      >
                        ↻ ИИ
                      </Button>
                    )}
                  </div>
                </div>
              </Card>
            ))}
          </div>

          <Advisory tone="amber" className="mt-5">
            <AdvisoryLabel>Методическая подсказка</AdvisoryLabel>
            Если владелец застрял на проблеме — мягко верните:{" "}
            <span className="italic opacity-90">«напомни, какой запрос у тебя к группе?»</span>
          </Advisory>
        </div>

        <div>
          <h3 className="mb-2.5 text-[11px] font-medium uppercase tracking-[0.12em] text-text-3">участники</h3>
          <Card className="px-3.5 py-3.5">
            <div className="flex flex-col gap-2.5">
              {participants.length === 0 && (
                <div className="text-xs text-text-3">пока никого. поделитесь ссылкой</div>
              )}
              {participants.map((p) => (
                <div key={p.id} className="flex items-center justify-between">
                  <Author name={p.name} />
                  <span className="text-meta">подключён</span>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </>
  );
}
