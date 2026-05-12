import { useParams } from "react-router-dom";
import { useSession, useStageElapsed } from "@/hooks/useSession";
import { Timer } from "@/components/shared/StageChip";
import { STAGES, StageProgress } from "@/components/shared/StageProgress";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { setNotes } from "@/lib/actions";
import { FStage1 } from "@/components/facilitator/FStage1";
import { FStage2 } from "@/components/facilitator/FStage2";
import { FStage3 } from "@/components/facilitator/FStage3";
import { FStage4 } from "@/components/facilitator/FStage4";
import { FStage5 } from "@/components/facilitator/FStage5";

export default function FacilitatorPage() {
  const { id } = useParams<{ id: string }>();
  const { state, loading, error } = useSession(id);
  const elapsed = useStageElapsed(state?.session);

  if (loading) return <Loading id={id} />;
  if (error) return <ErrorView error={error} />;
  if (!state) return <Loading id={id} />;

  const stage = state.session.stage;
  const stageInfo = STAGES[stage - 1];

  return (
    <div className="container mx-auto pb-14 pt-6">
      <ShareBar id={state.session.id} />

      <div className="mb-2 flex justify-end">
        <Timer elapsedMs={elapsed} totalMin={stageInfo.min} label={stageInfo.label.toLowerCase()} />
      </div>

      {stage === 1 && <FStage1 state={state} elapsedMs={elapsed} />}
      {stage === 2 && <FStage2 state={state} />}
      {stage === 3 && <FStage3 state={state} elapsedMs={elapsed} />}
      {stage === 4 && <FStage4 state={state} />}
      {stage === 5 && <FStage5 state={state} />}

      <div className="mt-6">
        <Label>Мои заметки по встрече</Label>
        <Textarea
          defaultValue={state.session.notes}
          onBlur={(e) => setNotes(state.session.id, e.target.value).catch(console.error)}
          placeholder="Записывайте сюда всё, что заметите — вернёмся к этому в дебрифе…"
        />
      </div>

      <StageProgress current={stage} elapsedMs={elapsed} />
    </div>
  );
}

function ShareBar({ id }: { id: string }) {
  const baseUrl = window.location.origin;
  const groupUrl = `${baseUrl}/g/${id}`;
  const partUrl = `${baseUrl}/p/${id}`;

  const copy = (url: string) => {
    navigator.clipboard?.writeText(url).catch(() => prompt("скопируйте:", url));
  };

  return (
    <div className="mb-4 flex flex-wrap items-center gap-3 rounded-md bg-background-soft px-3.5 py-2.5 text-xs">
      <span className="text-text-2">код сессии:</span>
      <code className="num-tabular text-sm font-medium tracking-[0.1em]">{id}</code>
      <span className="flex-1" />
      <Button size="sm" onClick={() => copy(groupUrl)}>📺 Экран группы</Button>
      <Button size="sm" onClick={() => copy(partUrl)}>👥 Ссылка участникам</Button>
    </div>
  );
}

function Loading({ id }: { id?: string }) {
  return (
    <div className="container mx-auto pb-14 pt-6">
      <div className="px-10 py-12 text-text-3">подключаюсь к сессии {id}…</div>
    </div>
  );
}

function ErrorView({ error }: { error: string }) {
  return (
    <div className="container mx-auto pb-14 pt-6">
      <div className="rounded-md border border-rose-bd bg-rose-bg px-5 py-4 text-rose-ink">
        Ошибка: {error}
      </div>
    </div>
  );
}
