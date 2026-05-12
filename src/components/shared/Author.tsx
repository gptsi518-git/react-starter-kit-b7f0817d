import { cn } from "@/lib/utils";

const AUTHOR_COLOR: Record<string, string> = {
  "Аня": "bg-author-anya",
  "Игорь": "bg-author-igor",
  "Виктор": "bg-author-viktor",
  "Марина": "bg-author-marina",
  "Дима": "bg-author-dima",
  "Михаил": "bg-author-mikh",
};

export const Author = ({ name, className }: { name: string; className?: string }) => (
  <span className={cn("inline-flex items-center gap-1.5 whitespace-nowrap text-[13px] font-medium text-text-1", className)}>
    <span className={cn("h-2.5 w-2.5 shrink-0 rounded-full", AUTHOR_COLOR[name] ?? "bg-author-mikh")} />
    {name}
  </span>
);
