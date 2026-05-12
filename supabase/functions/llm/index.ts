// Edge Function: единая точка LLM-задач для Мастермайнда.
// Использует Lovable AI Gateway (LOVABLE_API_KEY уже есть в Cloud).

// deno-lint-ignore-file no-explicit-any
import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
const MODEL = "google/gemini-2.5-flash";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function parseJSON(raw: string): any {
  let s = (raw || "").trim();
  s = s.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();
  const cands = ["{", "["].map((c) => s.indexOf(c)).filter((i) => i !== -1);
  const first = cands.length ? Math.min(...cands) : -1;
  if (first > 0) s = s.slice(first);
  const last = Math.max(s.lastIndexOf("}"), s.lastIndexOf("]"));
  if (last !== -1) s = s.slice(0, last + 1);
  return JSON.parse(s);
}

async function llmCall({ system, user, max_tokens = 1024 }: { system: string; user: string; max_tokens?: number }): Promise<string> {
  if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not set");
  const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${LOVABLE_API_KEY}`,
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens,
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
    }),
  });
  if (!res.ok) {
    const txt = await res.text();
    if (res.status === 429) throw new Error("Rate limit exceeded — попробуйте позже");
    if (res.status === 402) throw new Error("Payment required — пополните Lovable AI кредиты");
    throw new Error(`AI gateway ${res.status}: ${txt}`);
  }
  const data = await res.json();
  return (data.choices?.[0]?.message?.content || "").trim();
}

async function summarizeSlot(p: { slotTitle: string; transcript: string; ownerName: string }) {
  if (!p.transcript || p.transcript.trim().length < 10) {
    return { summary: "(пока нечего резюмировать — мало текста)" };
  }
  const system = `Ты — помощник фасилитатора в формате «мастермайнд». Владелец сессии (${p.ownerName}) рассказывает свою бизнес-ситуацию в слоте «${p.slotTitle}». Сожми его рассказ в 1–2 коротких предложения по существу. Без вводных, без оценок, без вопросов. Только факты в нейтральном тоне. Отвечай простой строкой текста, без кавычек, без префиксов.`;
  const user = `Расшифровка слота «${p.slotTitle}»:\n\n${p.transcript}\n\nСожми в 1–2 предложения.`;
  const summary = await llmCall({ system, user, max_tokens: 220 });
  return { summary };
}

async function generateClarifyingQuestions(p: { slots: Array<{ title: string; summary: string; transcript: string }>; ownerName: string }) {
  const ctx = p.slots.map((s) => `[${s.title}] ${s.summary || s.transcript || "—"}`).join("\n");
  const system = `Ты помогаешь фасилитатору мастермайнда. Владелец (${p.ownerName}) изложил запрос. Подэтап «уточняющие вопросы» — участники должны лучше понять контекст. Сгенерируй 4 коротких уточняющих вопроса, конкретных, по существу, без советов. Отвечай строго JSON-массивом из 4 строк, без обёртки.`;
  const user = `Запрос владельца:\n${ctx}\n\nСгенерируй 4 уточняющих вопроса.`;
  const raw = await llmCall({ system, user, max_tokens: 600 });
  const arr = parseJSON(raw);
  return { questions: Array.isArray(arr) ? arr.slice(0, 4).map(String) : [] };
}

async function extractIdeaCandidates(p: { transcriptChunk: string; ownerSummary: string; knownAuthors: string[] }) {
  if (!p.transcriptChunk || p.transcriptChunk.trim().length < 10) return { candidates: [] };
  const authorsLine = p.knownAuthors.length ? `Известные участники: ${p.knownAuthors.join(", ")}.` : "";
  const system = `Ты — помощник фасилитатора мастермайнда на подэтапе «идеи без критики». Выдели из расшифровки реплик все идеи-предложения для владельца. Идея — конкретное предложение действия, обращённое к владельцу.

${authorsLine}

Правила:
- 1 короткое предложение, 8–18 слов, в инфинитиве или повелительном наклонении.
- Если автор ясен — указывай имя; иначе author: null.
- confidence: 0.5 нечётко, 0.7 ясно, 0.9 прямо без шума.
- Не выдумывай. Лучше пустой массив.
- Вопросы/обсуждение/согласие/критику пропускай.

Отвечай строго JSON-массивом: [{"text":"...","author":"Имя"|null,"confidence":0.7}]. Без обёртки.`;
  const user = `Контекст запроса владельца:\n${p.ownerSummary}\n\nСвежие реплики:\n${p.transcriptChunk}\n\nВыдели идеи.`;
  const raw = await llmCall({ system, user, max_tokens: 800 });
  const arr = parseJSON(raw);
  if (!Array.isArray(arr)) return { candidates: [] };
  return {
    candidates: arr
      .filter((x: any) => x && typeof x.text === "string" && x.text.length > 5)
      .map((x: any) => ({
        text: String(x.text).trim(),
        author: typeof x.author === "string" ? x.author : null,
        confidence: typeof x.confidence === "number" ? x.confidence : 0.7,
      })),
  };
}

async function clusterIdeas(p: { ideas: Array<{ n: number; author: string; text: string }>; ownerSummary: string }) {
  if (!p.ideas || p.ideas.length < 3) return { clusters: null };
  const list = p.ideas.map((i) => `#${i.n} (${i.author}): ${i.text}`).join("\n");
  const system = `Группируй идеи мастермайнда по смысловым кластерам. 2–4 кластера. Каждый: короткое название (2–4 слова) и список номеров идей. Каждая идея ровно в один кластер. JSON: {"clusters":[{"title":"...","ideaIds":[1,2]}]}. Без обёртки.`;
  const user = `Запрос:\n${p.ownerSummary}\n\nИдеи:\n${list}\n\nСгруппируй.`;
  const raw = await llmCall({ system, user, max_tokens: 800 });
  const obj = parseJSON(raw);
  if (!obj || !Array.isArray(obj.clusters)) return { clusters: null };
  return {
    clusters: obj.clusters
      .filter((c: any) => c && typeof c.title === "string" && Array.isArray(c.ideaIds))
      .map((c: any) => ({ title: c.title, ideaIds: c.ideaIds.filter(Number.isInteger) })),
  };
}

async function suggestSteps(p: { markedIdeas: Array<{ n: number; author: string; text: string }>; ownerSummary: string }) {
  if (!p.markedIdeas || p.markedIdeas.length === 0) return { steps: [] };
  const list = p.markedIdeas.map((i) => `#${i.n} (${i.author}): ${i.text}`).join("\n");
  const system = `Помогаешь владельцу мастермайнда сформулировать шаги «беру в работу» из зацепивших идей. Для каждой группы близких идей — 1 конкретный шаг: title (5–10 слов), detail (1 предложение), firstStep (5–15 минут на сегодня), ideaRefs (номера). Не дублируй — синтезируй. Максимум 3 шага. JSON: [{"title":"...","detail":"...","firstStep":"...","ideaRefs":[1,2]}]. Без обёртки.`;
  const user = `Запрос:\n${p.ownerSummary}\n\nЗацепившие идеи:\n${list}\n\nПредложи шаги.`;
  const raw = await llmCall({ system, user, max_tokens: 1000 });
  const arr = parseJSON(raw);
  if (!Array.isArray(arr)) return { steps: [] };
  return {
    steps: arr.slice(0, 3).map((s: any) => ({
      title: String(s.title || "").slice(0, 200),
      detail: String(s.detail || "").slice(0, 500),
      firstStep: String(s.firstStep || "").slice(0, 300),
      ideaRefs: Array.isArray(s.ideaRefs) ? s.ideaRefs.filter(Number.isInteger) : [],
    })),
  };
}

const TASKS: Record<string, (p: any) => Promise<any>> = {
  summarizeSlot,
  generateClarifyingQuestions,
  extractIdeaCandidates,
  clusterIdeas,
  suggestSteps,
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const { task, payload } = await req.json();
    const handler = TASKS[task];
    if (!handler) {
      return new Response(JSON.stringify({ error: `unknown task: ${task}` }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const result = await handler(payload || {});
    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("[llm error]", e);
    return new Response(JSON.stringify({ error: String((e as Error)?.message || e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
