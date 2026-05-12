export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      idea_candidates: {
        Row: {
          author: string | null
          confidence: number
          created_at: string
          id: string
          session_id: string
          text: string
        }
        Insert: {
          author?: string | null
          confidence?: number
          created_at?: string
          id?: string
          session_id: string
          text: string
        }
        Update: {
          author?: string | null
          confidence?: number
          created_at?: string
          id?: string
          session_id?: string
          text?: string
        }
        Relationships: [
          {
            foreignKeyName: "idea_candidates_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      ideas: {
        Row: {
          author: string
          created_at: string
          id: string
          mark: string | null
          n: number
          session_id: string
          text: string
        }
        Insert: {
          author?: string
          created_at?: string
          id?: string
          mark?: string | null
          n: number
          session_id: string
          text: string
        }
        Update: {
          author?: string
          created_at?: string
          id?: string
          mark?: string | null
          n?: number
          session_id?: string
          text?: string
        }
        Relationships: [
          {
            foreignKeyName: "ideas_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      participants: {
        Row: {
          id: string
          joined_at: string
          name: string
          session_id: string
        }
        Insert: {
          id?: string
          joined_at?: string
          name: string
          session_id: string
        }
        Update: {
          id?: string
          joined_at?: string
          name?: string
          session_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "participants_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      questions: {
        Row: {
          author: string
          created_at: string
          id: string
          session_id: string
          text: string
        }
        Insert: {
          author?: string
          created_at?: string
          id?: string
          session_id: string
          text: string
        }
        Update: {
          author?: string
          created_at?: string
          id?: string
          session_id?: string
          text?: string
        }
        Relationships: [
          {
            foreignKeyName: "questions_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      sessions: {
        Row: {
          active_slot: number
          ai_questions: Json
          clusters: Json | null
          created_at: string
          facilitator_name: string
          id: string
          notes: string
          owner_name: string
          paused: boolean
          paused_accum_ms: number
          paused_at: string | null
          pending_chunk: string
          stage: number
          stage_started_at: string
        }
        Insert: {
          active_slot?: number
          ai_questions?: Json
          clusters?: Json | null
          created_at?: string
          facilitator_name?: string
          id: string
          notes?: string
          owner_name?: string
          paused?: boolean
          paused_accum_ms?: number
          paused_at?: string | null
          pending_chunk?: string
          stage?: number
          stage_started_at?: string
        }
        Update: {
          active_slot?: number
          ai_questions?: Json
          clusters?: Json | null
          created_at?: string
          facilitator_name?: string
          id?: string
          notes?: string
          owner_name?: string
          paused?: boolean
          paused_accum_ms?: number
          paused_at?: string | null
          pending_chunk?: string
          stage?: number
          stage_started_at?: string
        }
        Relationships: []
      }
      slots: {
        Row: {
          n: number
          session_id: string
          state: string
          summary: string
          title: string
          transcript: string
        }
        Insert: {
          n: number
          session_id: string
          state?: string
          summary?: string
          title?: string
          transcript?: string
        }
        Update: {
          n?: number
          session_id?: string
          state?: string
          summary?: string
          title?: string
          transcript?: string
        }
        Relationships: [
          {
            foreignKeyName: "slots_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      steps: {
        Row: {
          created_at: string
          detail: string
          due: string
          first_step: string
          id: string
          idea_refs: Json
          n: number
          session_id: string
          title: string
        }
        Insert: {
          created_at?: string
          detail?: string
          due?: string
          first_step?: string
          id?: string
          idea_refs?: Json
          n: number
          session_id: string
          title: string
        }
        Update: {
          created_at?: string
          detail?: string
          due?: string
          first_step?: string
          id?: string
          idea_refs?: Json
          n?: number
          session_id?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "steps_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      accept_candidate: {
        Args: { p_author?: string; p_candidate_id: string; p_text?: string }
        Returns: {
          author: string
          created_at: string
          id: string
          mark: string | null
          n: number
          session_id: string
          text: string
        }
        SetofOptions: {
          from: "*"
          to: "ideas"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      add_idea: {
        Args: { p_author: string; p_session_id: string; p_text: string }
        Returns: {
          author: string
          created_at: string
          id: string
          mark: string | null
          n: number
          session_id: string
          text: string
        }
        SetofOptions: {
          from: "*"
          to: "ideas"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      add_step: {
        Args: {
          p_detail?: string
          p_due?: string
          p_first_step?: string
          p_idea_refs?: Json
          p_session_id: string
          p_title: string
        }
        Returns: {
          created_at: string
          detail: string
          due: string
          first_step: string
          id: string
          idea_refs: Json
          n: number
          session_id: string
          title: string
        }
        SetofOptions: {
          from: "*"
          to: "steps"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      create_session: {
        Args: {
          p_facilitator_name?: string
          p_id: string
          p_owner_name?: string
        }
        Returns: {
          active_slot: number
          ai_questions: Json
          clusters: Json | null
          created_at: string
          facilitator_name: string
          id: string
          notes: string
          owner_name: string
          paused: boolean
          paused_accum_ms: number
          paused_at: string | null
          pending_chunk: string
          stage: number
          stage_started_at: string
        }
        SetofOptions: {
          from: "*"
          to: "sessions"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      next_slot: { Args: { p_session_id: string }; Returns: boolean }
      next_stage: { Args: { p_session_id: string }; Returns: undefined }
      remove_step: { Args: { p_step_id: string }; Returns: undefined }
      toggle_idea_mark: {
        Args: { p_idea_id: string; p_mark: string }
        Returns: undefined
      }
      toggle_pause: { Args: { p_session_id: string }; Returns: undefined }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
