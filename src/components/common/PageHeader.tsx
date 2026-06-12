import type { ReactNode } from "react";
import { ThemeToggle } from "@/components/layout/ThemeToggle";

export function PageHeader({
  title,
  subtitle,
  action,
  showThemeToggle = true,
}: {
  title: string;
  subtitle?: string;
  action?: ReactNode;
  showThemeToggle?: boolean;
}) {
  return (
    <header className="flex items-start justify-between gap-3 pt-3 pb-4">
      <div className="min-w-0">
        <h1 className="truncate text-2xl font-bold tracking-tight">{title}</h1>
        {subtitle && (
          <p className="mt-0.5 text-sm text-muted-foreground">{subtitle}</p>
        )}
      </div>
      <div className="flex shrink-0 items-center gap-1">
        {action}
        {showThemeToggle && <ThemeToggle />}
      </div>
    </header>
  );
}
