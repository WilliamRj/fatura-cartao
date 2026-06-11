"use client";

import * as React from "react";
import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const emptySubscribe = () => () => {};

export function ThemeToggle({ className }: { className?: string }) {
  const { resolvedTheme, setTheme } = useTheme();
  const transitionTimer = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const mounted = React.useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false
  );

  const isDark = mounted && resolvedTheme === "dark";
  const label = isDark ? "Ativar tema claro" : "Ativar tema escuro";

  React.useEffect(() => {
    return () => {
      if (transitionTimer.current) {
        clearTimeout(transitionTimer.current);
      }
    };
  }, []);

  const handleThemeChange = () => {
    const root = document.documentElement;

    if (transitionTimer.current) {
      clearTimeout(transitionTimer.current);
    }

    root.classList.add("theme-transition");
    setTheme(isDark ? "light" : "dark");

    transitionTimer.current = setTimeout(() => {
      root.classList.remove("theme-transition");
      transitionTimer.current = null;
    }, 950);
  };

  return (
    <Button
      aria-label={label}
      className={cn("h-9 w-9", className)}
      disabled={!mounted}
      onClick={handleThemeChange}
      size="icon"
      title={label}
      variant="ghost"
    >
      {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
    </Button>
  );
}
