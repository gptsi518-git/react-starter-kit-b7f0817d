// src/lib/supabase.ts
// Клиент Supabase. Параметры подтянутся из env, которые Lovable
// автоматически выставит после привязки Supabase-проекта.

import { createClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL as string;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

if (!url || !anonKey) {
  console.warn(
    "[supabase] VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY не заданы.\n" +
      "В Lovable: подключите Supabase-проект, переменные подтянутся автоматически.\n" +
      "Локально: создайте .env с этими ключами.",
  );
}

export const supabase = createClient(
  url || "https://placeholder.supabase.co",
  anonKey || "placeholder-anon-key",
  {
    realtime: { params: { eventsPerSecond: 10 } },
  },
);

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
