import { useState } from "react";
import type { SessionState } from "@/hooks/useSession";
import type { IdeaCandidateRow } from "@/types/database";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Author } from "@/components/shared/Author";
import { StageChip, formatTime } from "@/components/shared/StageChip";
import { RecBtn } from "@/components/shared/RecBtn";
import { SimulateBox } from "@/components/shared/SimulateBox";
import {
  acceptCandidate,
  addIdea,
  nextStage,
  processUtterance,
  rejectCandidate,
  togglePause,
} from "@/lib/actions";

export function FStage3({ state, elapsedMs }: { state: SessionState; elapsedMs: number }) {
  const { session, slots, ideas, candidates, participants } = state;
  const [manualText, setManualText] = useState("");
  const [manualAuthor, setManualAuthor] = useState("");

  const known = participants.map((p) => p.name);
  const authorList = known.length ? known : ["Аня", "Игорь", "Виктор", "Марина", "Дима"];
  const ownerSummary = slots.map((x) => x.summary).filter(Boolean).join(" ");

  const onSimulate = ({ author, text }: { author: string; text: string }) => {
    processUtterance(session.id, author, text, ownerSummary, known).catch(console.error);
  };

  const addManual = () => {
    if (!manualText.trim() || !manualAuthor.trim()) return;
    addIdea(session.id, manualAuthor, manualText.trim()).catch(console.error);
    setManualText("");
  };

  return (
    <>
      <div className="mb-6 flex items-start justify-between gap-6 border-b border-border-soft pb-5">
        <div>
          <div className="mb-2.5 flex items-center gap-3">
            <StageChip owner={session.owner_name} />
            <span className="text-meta">пульт фасилитатора</span>
          </div>
          <div className="text-[22px] font-medium leading-tight">Подэтап 3 · идеи без критики</div>
        </div>
        <RecBtn on time={formatTime(elapsedMs)} hint="ИИ выделяет идеи из реплик участников" />
      </div>

      <div className="mb-5 grid grid-cols-3 gap-3.5">
        <MetricCard v={ideas.length} k="идей записано" />
        <MetricCard v={candidates.length} k="кандидатов ждут решения" warn={candidates.length > 0} />
        <MetricCard v={participants.length} k="участников · владелец молчит" muted />
      </div>

      <div className="grid grid-cols-1 gap-7 lg:grid-cols-[1fr_320px]">
        <div>
          <div className="flex flex-wrap gap-2">
            <Button onClick={() => togglePause(session.id)}>
              {session.paused ? "▶ Продолжить" : "⏸ Пауза"}
            </Button>
            <Button variant="go" onClick={() => nextStage(session.id)}>К слову владельца →</Button>
          </div>

          <SimulateBox
            title="имитация: реплика участника (ИИ выделит идею)"
            placeholder="например: давай попробуем продавать только B2B…"
            onSend={onSimulate}
            knownAuthors={authorList}
          />

          {candidates.length > 0 && (
            <>
              <h3 className="mt-6 mb-3 text-[11px] font-medium uppercase tracking-[0.12em] text-text-3">
                ИИ услышал — принять?
              </h3>
              <div className="flex flex-col gap-3">
                {candidates.map((c) => (
                  <CandidateCard key={c.id} c={c} known={authorList} />
                ))}
              </div>
            </>
          )}

          <h3 className="mt-7 mb-3 text-[11px] font-medium uppercase tracking-[0.12em] text-text-3">
            добавить идею вручную
          </h3>
          <Card>
            <div className="grid grid-cols-1 items-end gap-2.5 md:grid-cols-[1fr_180px_auto]">
              <div>
                <Label>Идея</Label>
                <Input
                  placeholder="что именно сказали — 1–2 предложения"
                  value={manualText}
                  onChange={(e) => setManualText(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && addManual()}
                />
              </div>
              <div>
                <Label>Автор</Label>
                <Select value={manualAuthor} onChange={(e) => setManualAuthor(e.target.value)}>
                  <option value="" disabled>выбрать…</option>
                  {authorList.map((n) => <option key={n} value={n}>{n}</option>)}
                </Select>
              </div>
              <Button variant="primary" className="h-10" onClick={addManual}>+ Добавить</Button>
            </div>
          </Card>
        </div>

        <div>
          <h3 className="mb-2.5 text-[11px] font-medium uppercase tracking-[0.12em] text-text-3">
            уже записано · {ideas.length}
          </h3>
          <div className="flex max-h-[600px] flex-col gap-2 overflow-y-auto">
            {ideas.length === 0 && (
              <div className="px-3 py-3 text-xs text-text-3">
                идеи будут появляться здесь — ИИ распознаёт их из реплик или добавите вручную
              </div>
            )}
            {ideas.map((i) => (
              <Card key={i.id} className="flex items-start gap-2.5 px-3 py-2.5">
                <span className="text-meta min-w-[22px]">#{i.n}</span>
                <div className="flex-1">
                  <div className="text-[13px] leading-snug">{i.text}</div>
                  <div className="mt-1.5"><Author name={i.author} /></div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}

function MetricCard({ v, k, warn, muted }: { v: number; k: string; warn?: boolean; muted?: boolean }) {
  return (
    <div className="rounded-md border border-border bg-paper px-4 py-3.5">
      <div className={`text-[22px] font-medium leading-none ${warn ? "text-amber-ink" : muted ? "text-text-2" : ""}`}>
        {v}
      </div>
      <div className="mt-1.5 text-[11px] uppercase tracking-wider text-text-3">{k}</div>
    </div>
  );
}

function CandidateCard({ c, known }: { c: IdeaCandidateRow; known: string[] }) {
  const [author, setAuthor] = useState(c.author ?? "");
  const [text, setText] = useState(c.text);
  const [editing, setEditing] = useState(false);

  const accept = () => {
    if (!author && !c.author) {
      alert("Выберите автора");
      return;
    }
    acceptCandidate(c.id, author || c.author || undefined, text).catch(console.error);
  };

  const ago = Math.max(0, Math.round((Date.now() - new Date(c.created_at).getTime()) / 1000));
  const conf = Math.round((c.confidence ?? 0.7) * 100);

  return (
    <Card variant="purple" className="flex flex-col gap-2.5">
      <div className="flex items-center gap-1 text-[11px] opacity-70">
        ● услышал {ago} сек назад · уверенность {conf}%
      </div>
      {editing ? (
        <textarea
          className="rounded-sm border border-border-strong bg-paper px-3 py-2 text-sm text-text-1"
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={3}
        />
      ) : (
        <div className="text-sm leading-relaxed">«{text}»</div>
      )}
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-meta">автор:</span>
        {c.author ? (
          <Author name={c.author} />
        ) : (
          <select
            className="rounded-sm border border-border-strong bg-paper px-2 py-1 text-sm text-text-1"
            value={author}
            onChange={(e) => setAuthor(e.target.value)}
          >
            <option value="" disabled>выбрать</option>
            {known.map((n) => <option key={n} value={n}>{n}</option>)}
          </select>
        )}
        <div className="flex-1" />
        <Button size="sm" variant="ok" onClick={accept}>✓ Принять</Button>
        <Button size="sm" onClick={() => setEditing(!editing)}>{editing ? "Готово" : "Редактировать"}</Button>
        <Button size="sm" variant="ghost" onClick={() => rejectCandidate(c.id).catch(console.error)}>
          Отклонить
        </Button>
      </div>
    </Card>
  );
}
