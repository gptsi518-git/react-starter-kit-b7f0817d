// src/types/database.ts
// Типы БД и доменные модели. Соответствуют SQL-миграции 20250508000000_init.sql.

export type SlotState = "wait" | "active" | "done";
export type IdeaMark = "spark" | "q" | null;

export interface SessionRow {
  id: string;
  owner_name: string;
  facilitator_name: string;
  stage: number;          // 1..5
  active_slot: number;    // 1..3
  paused: boolean;
  stage_started_at: string;
  paused_at: string | null;
  paused_accum_ms: number;
  notes: string;
  ai_questions: string[];
  clusters: { title: string; ideaIds: number[] }[] | null;
  pending_chunk: string;
  created_at: string;
}

export interface SlotRow {
  session_id: string;
  n: number;
  title: string;
  state: SlotState;
  transcript: string;
  summary: string;
}

export interface IdeaRow {
  id: string;
  session_id: string;
  n: number;
  author: string;
  text: string;
  mark: IdeaMark;
  created_at: string;
}

export interface IdeaCandidateRow {
  id: string;
  session_id: string;
  text: string;
  author: string | null;
  confidence: number;
  created_at: string;
}

export interface QuestionRow {
  id: string;
  session_id: string;
  author: string;
  text: string;
  created_at: string;
}

export interface StepRow {
  id: string;
  session_id: string;
  n: number;
  title: string;
  detail: string;
  first_step: string;
  due: string;
  idea_refs: number[];
  created_at: string;
}

export interface ParticipantRow {
  id: string;
  session_id: string;
  name: string;
  joined_at: string;
}

// ───────── Database (минимальная типизация для Supabase client) ─────────
// Полную можно сгенерировать через `supabase gen types typescript`,
// но для прототипа этого достаточно.

export interface Database {
  public: {
    Tables: {
      sessions:        { Row: SessionRow;        Insert: Partial<SessionRow>;        Update: Partial<SessionRow> };
      slots:           { Row: SlotRow;           Insert: Partial<SlotRow>;           Update: Partial<SlotRow> };
      ideas:           { Row: IdeaRow;           Insert: Partial<IdeaRow>;           Update: Partial<IdeaRow> };
      idea_candidates: { Row: IdeaCandidateRow;  Insert: Partial<IdeaCandidateRow>;  Update: Partial<IdeaCandidateRow> };
      questions:       { Row: QuestionRow;       Insert: Partial<QuestionRow>;       Update: Partial<QuestionRow> };
      steps:           { Row: StepRow;           Insert: Partial<StepRow>;           Update: Partial<StepRow> };
      participants:    { Row: ParticipantRow;    Insert: Partial<ParticipantRow>;    Update: Partial<ParticipantRow> };
    };
    Functions: {
      create_session: {
        Args: { p_id: string; p_owner_name?: string; p_facilitator_name?: string };
        Returns: SessionRow;
      };
      next_slot:    { Args: { p_session_id: string }; Returns: boolean };
      next_stage:   { Args: { p_session_id: string }; Returns: void };
      toggle_pause: { Args: { p_session_id: string }; Returns: void };
      toggle_idea_mark: { Args: { p_idea_id: string; p_mark: string }; Returns: void };
      accept_candidate: {
        Args: { p_candidate_id: string; p_author?: string | null; p_text?: string | null };
        Returns: IdeaRow;
      };
      add_idea: { Args: { p_session_id: string; p_author: string; p_text: string }; Returns: IdeaRow };
      add_step: {
        Args: {
          p_session_id: string;
          p_title: string;
          p_detail?: string;
          p_first_step?: string;
          p_due?: string;
          p_idea_refs?: number[];
        };
        Returns: StepRow;
      };
      remove_step: { Args: { p_step_id: string }; Returns: void };
    };
  };
}
