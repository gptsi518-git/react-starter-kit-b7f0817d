import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

type Tone = "amber" | "purple" | "blue" | "teal";

const TONE: Record<Tone, string> = {
  amber: "bg-amber-bg border-amber-bd text-amber-ink",
  purple: "bg-purple-bg border-purple-bd text-purple-ink",
  blue: "bg-blue-bg border-blue-bd text-blue-ink",
  teal: "bg-teal-bg border-teal-bd text-teal-ink",
};

export const Advisory = ({
  tone,
  children,
  className,
}: {
  tone: Tone;
  children: ReactNode;
  className?: string;
}) => (
  <div className={cn("rounded-lg border px-4 py-4 text-[13px] leading-relaxed", TONE[tone], className)}>
    {children}
  </div>
);

export const AdvisoryLabel = ({ children }: { children: ReactNode }) => (
  <span className="mr-2 inline-block text-[10px] font-medium uppercase tracking-[0.12em] opacity-75">
    {children}
  </span>
);

export const AdvisoryRules = ({
  left,
  right,
}: {
  left: { title: string; body: ReactNode };
  right: { title: string; body: ReactNode; muted?: boolean };
}) => (
  <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
    <div>
      <div className="mb-1.5 text-sm font-medium">{left.title}</div>
      <div className="text-[13px] leading-relaxed">{left.body}</div>
    </div>
    <div className={cn(right.muted && "opacity-75")}>
      <div className="mb-1.5 text-sm font-medium">{right.title}</div>
      <div className="text-[13px] leading-relaxed">{right.body}</div>
    </div>
  </div>
);
