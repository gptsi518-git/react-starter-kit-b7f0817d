import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { createSession } from "@/lib/actions";

export default function Start() {
  const nav = useNavigate();
  const [ownerName, setOwnerName] = useState("Михаил");
  const [facName, setFacName] = useState("Фасилитатор");
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const create = async () => {
    setBusy(true);
    setErr(null);
    try {
      const s = await createSession({ ownerName, facilitatorName: facName });
      nav(`/f/${s.id}`);
    } catch (e) {
      setErr((e as Error)?.message || String(e));
    } finally {
      setBusy(false);
    }
  };

  const joinAs = (role: "f" | "g" | "p") => {
    if (!code.trim()) return;
    const c = code.trim().toUpperCase();
    if (role === "p") {
      if (!name.trim()) {
        setErr("Введите имя");
        return;
      }
      nav(`/p/${c}?name=${encodeURIComponent(name.trim())}`);
    } else if (role === "g") {
      nav(`/g/${c}`);
    } else {
      nav(`/f/${c}`);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center px-5 py-8">
      <Card className="w-full max-w-[480px] px-9 py-8">
        <h1 className="mb-2 text-2xl font-medium">Мастермайнд · горячее кресло</h1>
        <p className="mb-6 text-text-2">Создайте новую сессию или подключитесь по коду.</p>

        <div className="mb-3.5">
          <Label>Владелец сессии</Label>
          <Input value={ownerName} onChange={(e) => setOwnerName(e.target.value)} />
        </div>
        <div className="mb-3.5">
          <Label>Ваше имя (фасилитатор)</Label>
          <Input value={facName} onChange={(e) => setFacName(e.target.value)} />
        </div>
        <div className="mt-5">
          <Button variant="primary" onClick={create} disabled={busy}>
            {busy ? "Создаю…" : "Создать сессию"}
          </Button>
        </div>

        <div className="my-7 h-px bg-border-soft" />

        <div className="mb-3.5">
          <Label>Подключиться по коду</Label>
          <Input
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            placeholder="напр. K4P9XR"
            className="font-mono tracking-[0.1em]"
          />
        </div>
        <div className="mb-3.5">
          <Label>Имя участника (если идёте как участник)</Label>
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Аня, Игорь, …" />
        </div>
        <div className="mt-5 flex gap-2 flex-wrap">
          <Button onClick={() => joinAs("f")}>Я — фасилитатор</Button>
          <Button onClick={() => joinAs("p")}>Я — участник</Button>
          <Button variant="ghost" onClick={() => joinAs("g")}>Экран группы</Button>
        </div>

        {err && (
          <div className="mt-4 rounded-md border border-rose-bd bg-rose-bg px-3 py-2 text-sm text-rose-ink">
            {err}
          </div>
        )}
      </Card>
    </div>
  );
}
