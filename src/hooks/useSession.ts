// src/hooks/useSession.ts
// Подписывается на все 7 таблиц сессии через Supabase Realtime и
// собирает их в единое состояние. Точечные подписки — каждое изменение
// долетает быстро и не тащит за собой весь объект.

import { useEffect, useState, useRef } from "react";
import { supabase } from "@/lib/supabase";
import type {
  SessionRow,
  SlotRow,
  IdeaRow,
  IdeaCandidateRow,
  QuestionRow,
  StepRow,
  ParticipantRow,
} from "@/types/database";

export interface SessionState {
  session: SessionRow;
  slots: SlotRow[];
  ideas: IdeaRow[];
  candidates: IdeaCandidateRow[];
  questions: QuestionRow[];
  steps: StepRow[];
  participants: ParticipantRow[];
}

interface Result {
  state: SessionState | null;
  loading: boolean;
  error: string | null;
}

export function useSession(sessionId: string | undefined): Result {
  const [state, setState] = useState<SessionState | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const stateRef = useRef<SessionState | null>(null);

  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  useEffect(() => {
    if (!sessionId) return;

    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);
      try {
        const [
          { data: sess, error: e1 },
          { data: slots, error: e2 },
          { data: ideas, error: e3 },
          { data: cands, error: e4 },
          { data: qs, error: e5 },
          { data: steps, error: e6 },
          { data: ps, error: e7 },
        ] = await Promise.all([
          supabase.from("sessions").select("*").eq("id", sessionId).maybeSingle(),
          supabase.from("slots").select("*").eq("session_id", sessionId).order("n"),
          supabase.from("ideas").select("*").eq("session_id", sessionId).order("n"),
          supabase.from("idea_candidates").select("*").eq("session_id", sessionId).order("created_at"),
          supabase.from("questions").select("*").eq("session_id", sessionId).order("created_at"),
          supabase.from("steps").select("*").eq("session_id", sessionId).order("n"),
          supabase.from("participants").select("*").eq("session_id", sessionId).order("joined_at"),
        ]);
        const err = e1 || e2 || e3 || e4 || e5 || e6 || e7;
        if (err) throw err;
        if (!sess) throw new Error("session_not_found");
        if (cancelled) return;

        setState({
          session: sess as SessionRow,
          slots: (slots ?? []) as SlotRow[],
          ideas: (ideas ?? []) as IdeaRow[],
          candidates: (cands ?? []) as IdeaCandidateRow[],
          questions: (qs ?? []) as QuestionRow[],
          steps: (steps ?? []) as StepRow[],
          participants: (ps ?? []) as ParticipantRow[],
        });
      } catch (e) {
        if (!cancelled) setError((e as Error)?.message || String(e));
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();

    // ───────── Realtime ─────────
    const channel = supabase
      .channel(`session:${sessionId}`)

      // sessions
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "sessions", filter: `id=eq.${sessionId}` },
        (p) => {
          const cur = stateRef.current;
          if (!cur) return;
          if (p.eventType === "UPDATE" || p.eventType === "INSERT") {
            setState({ ...cur, session: p.new as SessionRow });
          }
        },
      )

      // slots
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "slots", filter: `session_id=eq.${sessionId}` },
        (p) => {
          const cur = stateRef.current;
          if (!cur) return;
          const row = p.new as SlotRow;
          if (p.eventType === "UPDATE" || p.eventType === "INSERT") {
            const next = cur.slots.filter((s) => s.n !== row.n).concat(row).sort((a, b) => a.n - b.n);
            setState({ ...cur, slots: next });
          }
        },
      )

      // ideas
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "ideas", filter: `session_id=eq.${sessionId}` },
        (p) => {
          const cur = stateRef.current;
          if (!cur) return;
          if (p.eventType === "DELETE") {
            const removed = (p.old as IdeaRow).id;
            setState({ ...cur, ideas: cur.ideas.filter((i) => i.id !== removed) });
          } else {
            const row = p.new as IdeaRow;
            const next = cur.ideas.filter((i) => i.id !== row.id).concat(row).sort((a, b) => a.n - b.n);
            setState({ ...cur, ideas: next });
          }
        },
      )

      // candidates
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "idea_candidates", filter: `session_id=eq.${sessionId}` },
        (p) => {
          const cur = stateRef.current;
          if (!cur) return;
          if (p.eventType === "DELETE") {
            const removed = (p.old as IdeaCandidateRow).id;
            setState({ ...cur, candidates: cur.candidates.filter((c) => c.id !== removed) });
          } else {
            const row = p.new as IdeaCandidateRow;
            const next = cur.candidates.filter((c) => c.id !== row.id).concat(row);
            setState({ ...cur, candidates: next });
          }
        },
      )

      // questions
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "questions", filter: `session_id=eq.${sessionId}` },
        (p) => {
          const cur = stateRef.current;
          if (!cur) return;
          if (p.eventType === "DELETE") {
            const removed = (p.old as QuestionRow).id;
            setState({ ...cur, questions: cur.questions.filter((q) => q.id !== removed) });
          } else {
            const row = p.new as QuestionRow;
            setState({ ...cur, questions: cur.questions.filter((q) => q.id !== row.id).concat(row) });
          }
        },
      )

      // steps
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "steps", filter: `session_id=eq.${sessionId}` },
        (p) => {
          const cur = stateRef.current;
          if (!cur) return;
          if (p.eventType === "DELETE") {
            const removed = (p.old as StepRow).id;
            setState({ ...cur, steps: cur.steps.filter((s) => s.id !== removed) });
          } else {
            const row = p.new as StepRow;
            const next = cur.steps.filter((s) => s.id !== row.id).concat(row).sort((a, b) => a.n - b.n);
            setState({ ...cur, steps: next });
          }
        },
      )

      // participants
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "participants", filter: `session_id=eq.${sessionId}` },
        (p) => {
          const cur = stateRef.current;
          if (!cur) return;
          if (p.eventType === "DELETE") {
            const removed = (p.old as ParticipantRow).id;
            setState({ ...cur, participants: cur.participants.filter((x) => x.id !== removed) });
          } else {
            const row = p.new as ParticipantRow;
            setState({ ...cur, participants: cur.participants.filter((x) => x.id !== row.id).concat(row) });
          }
        },
      )

      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, [sessionId]);

  return { state, loading, error };
}

// ───────── Локальный таймер ─────────
// Считается в браузере из stage_started_at и paused_accum_ms.
// Пишется на каждый рендер, обновляется раз в секунду.

export function useStageElapsed(session: SessionRow | undefined): number {
  const [, setTick] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setTick((x) => x + 1), 1000);
    return () => clearInterval(id);
  }, []);

  if (!session) return 0;
  const startedAt = new Date(session.stage_started_at).getTime();
  const now = Date.now();
  const base = now - startedAt - (session.paused_accum_ms || 0);
  if (session.paused && session.paused_at) {
    const pausedAt = new Date(session.paused_at).getTime();
    return Math.max(0, base - (now - pausedAt));
  }
  return Math.max(0, base);
}
