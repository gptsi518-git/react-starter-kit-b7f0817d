import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

export const SimulateBox = ({
  title = "имитация реплики (вместо микрофона)",
  placeholder = "что произнёс участник…",
  onSend,
  knownAuthors = [],
  showAuthor = true,
}: {
  title?: string;
  placeholder?: string;
  onSend: (data: { author: string; text: string }) => void;
  knownAuthors?: string[];
  showAuthor?: boolean;
}) => {
  const [text, setText] = useState("");
  const [author, setAuthor] = useState(knownAuthors[0] ?? "");

  useEffect(() => {
    if (!author && knownAuthors.length > 0) setAuthor(knownAuthors[0]);
  }, [knownAuthors.join(",")]);

  const submit = () => {
    if (!text.trim()) return;
    onSend({ author, text: text.trim() });
    setText("");
  };

  return (
    <Card variant="flat" className="mt-4">
      <Label>{title}</Label>
      <div className="flex items-end gap-2">
        {showAuthor && (
          <div className="min-w-[140px]">
            <Select value={author} onChange={(e) => setAuthor(e.target.value)}>
              {knownAuthors.length === 0 && <option value="">—</option>}
              {knownAuthors.map((n) => (
                <option key={n} value={n}>{n}</option>
              ))}
            </Select>
          </div>
        )}
        <Input
          placeholder={placeholder}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && submit()}
          className="flex-1"
        />
        <Button variant="primary" onClick={submit}>+ Добавить</Button>
      </div>
    </Card>
  );
};
