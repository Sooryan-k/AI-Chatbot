"use client";

import { useTheme } from "next-themes";
import { Moon, Sun } from "lucide-react";
import { useMounted } from "@/lib/use-mounted";

export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const mounted = useMounted();
  const isDark = (mounted ? resolvedTheme : "dark") === "dark";

  return (
    <button
      type="button"
      onClick={() => setTheme(isDark ? "light" : "dark")}
      className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors hover:bg-emerald-500/10"
    >
      {mounted && !isDark ? <Moon size={16} /> : <Sun size={16} />}
      <span>{mounted && isDark ? "Light mode" : "Dark mode"}</span>
    </button>
  );
}
