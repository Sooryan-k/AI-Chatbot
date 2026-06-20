"use client";

import { useEffect, useState } from "react";
import { Cpu } from "lucide-react";
import { cn } from "@/lib/utils";

type Health = { ok: boolean; model: string };

export function ModelBadge() {
  const [health, setHealth] = useState<Health | null>(null);

  useEffect(() => {
    let active = true;
    fetch("/api/health")
      .then((r) => r.json())
      .then((d: Health) => {
        if (active) setHealth({ ok: d.ok, model: d.model });
      })
      .catch(() => {
        if (active) setHealth({ ok: false, model: "unknown" });
      });
    return () => {
      active = false;
    };
  }, []);

  const model = health?.model ?? "…";
  const ok = health?.ok;

  return (
    <div
      title={
        ok === false
          ? "Model provider is not reachable. Check your API key and model name."
          : `Using model: ${model}`
      }
      className="flex items-center gap-2 rounded-full border border-border px-3 py-1 text-sm"
    >
      <span
        className={cn(
          "h-2 w-2 rounded-full",
          ok == null
            ? "bg-muted-foreground/40"
            : ok
              ? "bg-emerald-500"
              : "bg-red-500",
        )}
      />
      <Cpu size={14} className="text-muted-foreground" />
      <span className="max-w-[10rem] truncate font-medium">{model}</span>
    </div>
  );
}
