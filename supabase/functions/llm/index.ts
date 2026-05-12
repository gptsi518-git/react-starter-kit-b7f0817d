// supabase/functions/llm/index.ts
// Единая Edge Function для всех LLM-задач в Мастермайнде.
// Принимает { task, payload }, маршрутизирует к одному из 5 промптов,
// возвращает результат. Ключ Anthropic — в Supabase Secrets.
//
// Развёртывание: supabase functions deploy llm
// Установка ключа: supabase secrets set ANTHROPIC_API_KEY=sk-ant-...

// deno-lint-ignore-file no-explicit-any
import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY");
const MODEL = "claude-sonnet-4-5-20250929";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// ───────── вспомогательные ─────────

function parseJSON(raw: string): any {
  let s = (raw || "").trim();
  s = s.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();
  const candidates = ["{", "["].map((c) => s.indexOf(c)).filter((i) => i !== -1);
  const firstBrace = candidates.length ? Math.min(...candidates) : -1;
  if (firstBrace > 0) s = s.slice(firstBrace);
  const lastBrace = Math.max(s.lastIndexOf("}"), s.lastIndexOf("]"));
  if (lastBrace !== -1) s = s.slice(0, lastBrace + 1);
  return JSON.parse(s);
}

async function anthropicCall({
  system,
  user,
  max_tokens = 1024,
}: {
  system: string;
  user: string;
  max_tokens?: number;
}): Promise<string> {
  if (!ANTHROPIC_API_KEY) {
    throw new Error("ANTHROPIC_API_KEY is not set in Supabase Secrets");
  }
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": ANTHROPIC_API_KEY,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens,
      system,
      messages: [{ role: "user", content: user }],
    }),
  });
  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`anthropic ${res.status}: ${txt}`);
  }
  const data = await res.json();
  return (data.content || [])
    .filter((b: any) => b.type === "text")
    .map((b: any) => b.text)
    .join("\n")
    .trim();
}

// ───────── задачи ─────────

async function summarizeSlot(
  payload: { slotTitle: string; transcript: string; ownerName: string },
) {
  if (!payload.transcript || payload.transcript.trim().length < 10) {
    return { summary: "(пока нечего резюмировать — мало текста)" };
  }
  const system =
    `Ты — помощник фасилитатора в формате «мастермайнд». Владелец сессии (${payload.ownerName}) рассказывает свою бизнес-ситуацию в слоте «${payload.slotTitle}». Твоя задача — сжать его рассказ в 1–2 коротких предложения по существу. Без вводных, без оценок, без вопросов. Только факты в нейтральном тоне. Отвечай простой строкой текста, без кавычек, без префиксов.`;
  const user =
    `Расшифровка слота «${payload.slotTitle}»:\n\n${payload.transcript}\n\nСожми в 1–2 предложения.`;
  const summary = await anthropicCall({ system, user, max_tokens: 220 });
  return { summary };
}

async function generateClarifyingQuestions(
  payload: {
    slots: Array<{ title: string; summary: string; transcript: string }>;
    ownerName: string;
  },
) {
  const ctx = payload.slots
    .map((s) => `[${s.title}] ${s.summary || s.transcript || "—"}`)
    .join("\n");
  const system =
    `Ты помогаешь фасилитатору мастермайнда. Владелец (${payload.ownerName}) изложил запрос. Сейчас подэтап «уточняющие вопросы» — участники должны лучше понять контекст, прежде чем предлагать идеи. Твоя задача — сгенерировать 4 коротких уточняющих вопроса, которые помогли бы группе глубже разобраться в ситуации владельца. Вопросы должны быть конкретными, по существу, без советов и без скрытых рекомендаций. Отвечай строго JSON-массивом из 4 строк, без обёртки, без комментариев.`;
  const user = `Запрос владельца:\n${ctx}\n\nСгенерируй 4 уточняющих вопроса.`;
  const raw = await anthropicCall({ system, user, max_tokens: 600 });
  const arr = parseJSON(raw);
  return { questions: Array.isArray(arr) ? arr.slice(0, 4).map(String) : [] };
}

async function extractIdeaCandidates(payload: {
  transcriptChunk: string;
  ownerSummary: string;
  knownAuthors: string[];
}) {
  if (!payload.transcriptChunk || payload.transcriptChunk.trim().length < 10) {
    return { candidates: [] };
  }
  const authorsLine = payload.knownAuthors.length
    ? `Известные участники: ${payload.knownAuthors.join(", ")}.`
    : "";
  const system = `Ты — помощник фасилитатора мастермайнда на подэтапе «идеи без критики». Участники наперебой подкидывают владельцу идеи. Твоя задача — выделить из свежей расшифровки реплик все идеи-предложения для владельца. Идея — это конкретное предложение действия или подхода, обращённое к владельцу.

${authorsLine}

Правила:
- Каждая идея — 1 короткое предложение, 8–18 слов, в инфинитиве или повелительном наклонении.
- Если у реплики ясен автор — указывай его имя в author. Если непонятно — author: null.
- confidence: 0.5 если нечётко, 0.7 если ясно, 0.9 если сказано прямо и без шума.
- Не выдумывай идеи, которых нет в тексте. Лучше пустой массив, чем фантазии.
- Если реплика — вопрос, обсуждение, согласие или критика — пропусти её.

Отвечай строго JSON-массивом: [{"text":"...","author":"Имя"|null,"confidence":0.7}]. Без обёртки.`;
  const user =
    `Контекст запроса владельца:\n${payload.ownerSummary}\n\nСвежие реплики:\n${payload.transcriptChunk}\n\nВыдели идеи.`;
  const raw = await anthropicCall({ system, user, max_tokens: 800 });
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

async function clusterIdeas(payload: {
  ideas: Array<{ n: number; author: string; text: string }>;
  ownerSummary: string;
}) {
  if (!payload.ideas || payload.ideas.length < 3) return { clusters: null };
  const list = payload.ideas
    .map((i) => `#${i.n} (${i.author}): ${i.text}`)
    .join("\n");
  const system =
    `Ты группируешь идеи мастермайнда по смысловым кластерам. Сгруппируй в 2–4 кластера. Каждый кластер — короткое название (2–4 слова) и список номеров идей. Каждая идея ровно в один кластер. Отвечай JSON: {"clusters":[{"title":"...","ideaIds":[1,2]},...]}. Без обёртки.`;
  const user = `Запрос:\n${payload.ownerSummary}\n\nИдеи:\n${list}\n\nСгруппируй.`;
  const raw = await anthropicCall({ system, user, max_tokens: 800 });
  const obj = parseJSON(raw);
  if (!obj || !Array.isArray(obj.clusters)) return { clusters: null };
  return {
    clusters: obj.clusters
      .filter(
        (c: any) =>
          c && typeof c.title === "string" && Array.isArray(c.ideaIds),
      )
      .map((c: any) => ({
        title: c.title,
        ideaIds: c.ideaIds.filter(Number.isInteger),
      })),
  };
}

async function suggestSteps(payload: {
  markedIdeas: Array<{ n: number; author: string; text: string }>;
  ownerSummary: string;
}) {
  if (!payload.markedIdeas || payload.markedIdeas.length === 0) {
    return { steps: [] };
  }
  const list = payload.markedIdeas
    .map((i) => `#${i.n} (${i.author}): ${i.text}`)
    .join("\n");
  const system =
    `Ты помогаешь владельцу мастермайнда сформулировать шаги «что беру в работу» из идей, которые его зацепили. Для каждой группы близких идей предложи 1 конкретный шаг: короткий заголовок (5–10 слов), описание (1 предложение), первый микро-шаг на сегодня (5–15 минут работы), и список номеров идей. Не дублируй идеи — синтезируй. Максимум 3 шага. Отвечай JSON: [{"title":"...","detail":"...","firstStep":"...","ideaRefs":[1,2]}]. Без обёртки.`;
  const user =
    `Запрос:\n${payload.ownerSummary}\n\nЗацепившие идеи:\n${list}\n\nПредложи шаги.`;
  const raw = await anthropicCall({ system, user, max_tokens: 1000 });
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

// ───────── маршрутизатор ─────────

const TASKS: Record<string, (p: any) => Promise<any>> = {
  summarizeSlot,
  generateClarifyingQuestions,
  extractIdeaCandidates,
  clusterIdeas,
  suggestSteps,
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }
  try {
    const { task, payload } = await req.json();
    const handler = TASKS[task];
    if (!handler) {
      return new Response(
        JSON.stringify({ error: `unknown task: ${task}` }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }
    const result = await handler(payload || {});
    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("[llm error]", e);
    return new Response(
      JSON.stringify({ error: String((e as Error)?.message || e) }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
