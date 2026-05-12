// src/lib/supabase.ts
// Клиент Supabase. Параметры подтянутся из env, которые Lovable
// автоматически выставит после привязки Supabase-проекта.

export { supabase } from "@/integrations/supabase/client";
import { supabase } from "@/integrations/supabase/client";

// ───────── вызов Edge Function llm ─────────
export async function callLLM<T = unknown>(
  task: string,
  payload: unknown,
): Promise<T> {
  const { data, error } = await supabase.functions.invoke("llm", {
    body: { task, payload },
  });
  if (error) throw error;
  if (data && (data as any).error) throw new Error((data as any).error);
  return data as T;
}
