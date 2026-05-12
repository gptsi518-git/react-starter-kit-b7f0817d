# Мастермайнд · фасилитаторский инструмент

Веб-приложение для проведения сессий «горячее кресло» по методу мастермайнд.
Три синхронизированных экрана: пульт фасилитатора, проекция для группы,
интерфейс участника. ИИ выделяет идеи из реплик, помогает с уточняющими
вопросами, группирует идеи в кластеры и предлагает шаги «что беру в работу».

**Стек:** Vite + React 18 + TypeScript + Tailwind + Supabase (Postgres + Realtime + Edge Functions) + Anthropic Claude.

## Архитектура

- **Пульт `/f/:id`** — фасилитатор управляет ходом сессии (5 подэтапов).
- **Группа `/g/:id`** — большой экран для проекции в комнате.
- **Участник `/p/:id`** — мобильный экран, задаёт вопросы и идеи.

Состояние сессии живёт в Supabase (7 таблиц с RLS). Все клиенты подписаны на изменения через Realtime — реакции долетают мгновенно.

LLM-вызовы идут в Supabase Edge Function `llm`, единая точка для 5 задач: суммирование слотов, генерация уточняющих вопросов, выделение идей из реплик, кластеризация, предложение шагов.

## Запуск в Lovable

### 1. Залить код на GitHub

```bash
git init
git add .
git commit -m "init"
git remote add origin https://github.com/USER/mastermind.git
git push -u origin main
```

### 2. Импорт в Lovable

1. На lovable.dev → New Project → Import from GitHub.
2. Выберите репозиторий, Lovable развернёт preview.

### 3. Привязать Supabase

1. В Lovable: Connect Supabase → создать новый проект или подключить существующий.
2. Lovable автоматически добавит `VITE_SUPABASE_URL` и `VITE_SUPABASE_ANON_KEY` в env.

### 4. Применить миграцию

Через Supabase Dashboard → SQL Editor:
- Скопировать содержимое `supabase/migrations/20250508000000_init.sql`
- Выполнить.

Или через CLI:
```bash
supabase link --project-ref YOUR_PROJECT_REF
supabase db push
```

После миграции в `Database → Replication → supabase_realtime` должны появиться все 7 таблиц.

### 5. Развернуть Edge Function `llm`

```bash
supabase functions deploy llm --project-ref YOUR_PROJECT_REF
```

### 6. Установить ключ Anthropic

```bash
supabase secrets set ANTHROPIC_API_KEY=sk-ant-... --project-ref YOUR_PROJECT_REF
```

Ключ получить на console.anthropic.com → API Keys.

### 7. Готово

В Lovable preview откроется главная — там «Создать сессию». После создания
вы получите 6-значный код и три ссылки: пульт, экран группы, участник.

## Локальный запуск

```bash
cp .env.example .env
# заполнить VITE_SUPABASE_URL и VITE_SUPABASE_ANON_KEY
npm install
npm run dev
# http://localhost:8080
```

Edge Function можно запускать локально через `supabase functions serve llm`.

## Стоимость

Одна полная сессия мастермайнда (5 подэтапов, ~15 LLM-вызовов) — около $0.10 на Claude Sonnet 4.5. Supabase free tier хватит на десятки сессий.

## Файловая структура

```
src/
  pages/             Start, Facilitator, Group, Participant
  components/
    facilitator/     5 подэтапов пульта (FStage1..5)
    shared/          Author, Sticker, StageProgress, Timer, ...
    ui/              shadcn-style базовые (Button, Card, Input, ...)
  hooks/
    useSession.ts    Realtime-подписки на все таблицы
  lib/
    supabase.ts      клиент Supabase + callLLM
    actions.ts       все доменные мутации БД и LLM
    utils.ts         cn() для классов
  types/
    database.ts      типы строк БД
supabase/
  migrations/        SQL-миграции
  functions/llm/     Edge Function для всех LLM-задач
```

## Подэтапы сессии

| № | Название | Что делает фасилитатор |
|---|---|---|
| 1 | Изложение запроса (8 мин) | 3 слота: ситуация → что пробовал → запрос. ИИ суммирует каждый слот. |
| 2 | Уточняющие вопросы (7 мин) | ИИ предлагает варианты вопросов. Участники задают свои. |
| 3 | Идеи без критики (12 мин) | ИИ распознаёт идеи из реплик. Фасилитатор принимает/правит. |
| 4 | Слово владельца (7 мин) | Метки ✦ и ? на идеях. ИИ группирует по кластерам. |
| 5 | Что беру в работу (5 мин) | До 3 шагов. ИИ предлагает на основе помеченных идей. |

## Заметки

- RLS-политики сейчас открытые. Перед продакшеном — заменить на проверки по anon-токену сессии или `auth.users`.
- Запись голоса в этой версии — заглушка (вводим реплики текстом). Для STT можно прикрутить Whisper или Deepgram отдельным сервисом.
- LLM-модель: `claude-sonnet-4-5-20250929`. Можно поменять в `supabase/functions/llm/index.ts`.
