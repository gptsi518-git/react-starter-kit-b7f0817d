// src/lib/actions.ts
// Доменные действия. Все мутации БД и LLM-вызовы — здесь.
// Компоненты импортируют отсюда, не лезут в supabase напрямую.

import { supabase, callLLM } from "@/lib/supabase";
import type {
  SessionRow,
  SlotRow,
  IdeaRow,
  IdeaCandidateRow,
} from "@/types/database";

// ───────── создание / приглашение ─────────

const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
function makeShortId(): string {
  let s = "";
  for (let i = 0; i < 6; i++) s += ALPHABET[Math.floor(Math.random() * ALPHABET.length)];
  return s;
}

export async function createSession(opts: {
  ownerName: string;
  facilitatorName: string;
}): Promise<SessionRow> {
  // несколько попыток, если коллизия по короткому id
  for (let i = 0; i < 5; i++) {
    const id = makeShortId();
    const { data, error } = await supabase.rpc("create_session", {
      p_id: id,
      p_owner_name: opts.ownerName,
      p_facilitator_name: opts.facilitatorName,
    });
    if (!error && data) return data as SessionRow;
    // если коллизия — повторяем; иначе бросаем
    if (error && !error.message.includes("duplicate")) throw error;
  }
  throw new Error("failed to create session id");
}

export async function joinAsParticipant(sessionId: string, name: string) {
  const { data, error } = await supabase
    .from("participants")
    .insert({ session_id: sessionId, name })
    .select()
    .single();
  if (error) throw error;
  return data;
}

// ───────── навигация ─────────

export async function nextStage(sessionId: string) {
  const { error } = await supabase.rpc("next_stage", { p_session_id: sessionId });
  if (error) throw error;
}
export async function togglePause(sessionId: string) {
  const { error } = await supabase.rpc("toggle_pause", { p_session_id: sessionId });
  if (error) throw error;
}
export async function nextSlot(sessionId: string) {
  const { error } = await supabase.rpc("next_slot", { p_session_id: sessionId });
  if (error) throw error;
}
export async function setNotes(sessionId: string, notes: string) {
  const { error } = await supabase.from("sessions").update({ notes }).eq("id", sessionId);
  if (error) throw error;
}

// ───────── подэтап 1 ─────────

export async function appendSlotTranscript(
  sessionId: string,
  slotN: number,
  text: string,
  currentTranscript: string,
) {
  const newTranscript = (currentTranscript ? currentTranscript + " " : "") + text;
  const { error } = await supabase
    .from("slots")
    .update({ transcript: newTranscript })
    .eq("session_id", sessionId)
    .eq("n", slotN);
  if (error) throw error;
}

export async function summarizeSlotAndSave(
  sessionId: string,
  slot: SlotRow,
  ownerName: string,
) {
  const result = await callLLM<{ summary: string }>("summarizeSlot", {
    slotTitle: slot.title,
    transcript: slot.transcript,
    ownerName,
  });
  const { error } = await supabase
    .from("slots")
    .update({ summary: result.summary })
    .eq("session_id", sessionId)
    .eq("n", slot.n);
  if (error) throw error;
  return result.summary;
}

export async function setSlotSummary(sessionId: string, slotN: number, summary: string) {
  const { error } = await supabase
    .from("slots")
    .update({ summary })
    .eq("session_id", sessionId)
    .eq("n", slotN);
  if (error) throw error;
}

// ───────── подэтап 2 ─────────

export async function refreshAIQuestions(sessionId: string, slots: SlotRow[], ownerName: string) {
  const result = await callLLM<{ questions: string[] }>("generateClarifyingQuestions", {
    slots: slots.map((s) => ({ title: s.title, summary: s.summary, transcript: s.transcript })),
    ownerName,
  });
  const { error } = await supabase
    .from("sessions")
    .update({ ai_questions: result.questions })
    .eq("id", sessionId);
  if (error) throw error;
}

export async function askQuestion(sessionId: string, author: string, text: string) {
  const { error } = await supabase
    .from("questions")
    .insert({ session_id: sessionId, author, text });
  if (error) throw error;
}

// ───────── подэтап 3 ─────────

export async function addIdea(sessionId: string, author: string, text: string) {
  const { error } = await supabase.rpc("add_idea", {
    p_session_id: sessionId,
    p_author: author,
    p_text: text,
  });
  if (error) throw error;
}

export async function processUtterance(
  sessionId: string,
  author: string,
  text: string,
  ownerSummary: string,
  knownAuthors: string[],
) {
  // делаем вызов LLM напрямую (без сохранения буфера) — реплики приходят
  // не очень часто, и нет смысла копить
  const result = await callLLM<{
    candidates: { text: string; author: string | null; confidence: number }[];
  }>("extractIdeaCandidates", {
    transcriptChunk: `${author}: ${text}`,
    ownerSummary,
    knownAuthors,
  });

  if (result.candidates.length === 0) return;
  const rows = result.candidates.map((c) => ({
    session_id: sessionId,
    text: c.text,
    author: c.author,
    confidence: c.confidence,
  }));
  const { error } = await supabase.from("idea_candidates").insert(rows);
  if (error) throw error;
}

export async function acceptCandidate(candidateId: string, author?: string, text?: string) {
  const { error } = await supabase.rpc("accept_candidate", {
    p_candidate_id: candidateId,
    p_author: author ?? null,
    p_text: text ?? null,
  });
  if (error) throw error;
}

export async function rejectCandidate(candidateId: string) {
  const { error } = await supabase.from("idea_candidates").delete().eq("id", candidateId);
  if (error) throw error;
}

// ───────── подэтап 4 ─────────

export async function toggleIdeaMark(ideaId: string, mark: "spark" | "q") {
  const { error } = await supabase.rpc("toggle_idea_mark", {
    p_idea_id: ideaId,
    p_mark: mark,
  });
  if (error) throw error;
}

export async function clusterIdeas(sessionId: string, ideas: IdeaRow[], ownerSummary: string) {
  const result = await callLLM<{
    clusters: { title: string; ideaIds: number[] }[] | null;
  }>("clusterIdeas", {
    ideas: ideas.map((i) => ({ n: i.n, author: i.author, text: i.text })),
    ownerSummary,
  });
  const { error } = await supabase
    .from("sessions")
    .update({ clusters: result.clusters })
    .eq("id", sessionId);
  if (error) throw error;
}

export async function flattenClusters(sessionId: string) {
  const { error } = await supabase
    .from("sessions")
    .update({ clusters: null })
    .eq("id", sessionId);
  if (error) throw error;
}

// ───────── подэтап 5 ─────────

export async function suggestSteps(markedIdeas: IdeaRow[], ownerSummary: string) {
  return await callLLM<{
    steps: { title: string; detail: string; firstStep: string; ideaRefs: number[] }[];
  }>("suggestSteps", {
    markedIdeas: markedIdeas.map((i) => ({ n: i.n, author: i.author, text: i.text })),
    ownerSummary,
  });
}

export async function addStep(
  sessionId: string,
  data: { title: string; detail?: string; firstStep?: string; due?: string; ideaRefs?: number[] },
) {
  const { error } = await supabase.rpc("add_step", {
    p_session_id: sessionId,
    p_title: data.title,
    p_detail: data.detail ?? "",
    p_first_step: data.firstStep ?? "",
    p_due: data.due ?? "",
    p_idea_refs: data.ideaRefs ?? [],
  });
  if (error) throw error;
}

export async function updateStep(
  stepId: string,
  patch: Partial<{ title: string; detail: string; first_step: string; due: string; idea_refs: number[] }>,
) {
  const { error } = await supabase.from("steps").update(patch).eq("id", stepId);
  if (error) throw error;
}

export async function removeStep(stepId: string) {
  const { error } = await supabase.rpc("remove_step", { p_step_id: stepId });
  if (error) throw error;
}
