// src/lib/supabase.ts
// Клиент Supabase. Параметры подтянутся из env, которые Lovable
// автоматически выставит после привязки Supabase-проекта.

import { supabase as typedClient } from "@/integrations/supabase/client";

// Схема БД ещё не сгенерирована — приводим к any, чтобы существующий
// код с таблицами sessions/slots/ideas/... компилировался.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const supabase = typedClient as any;

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
