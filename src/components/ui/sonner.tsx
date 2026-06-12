import { Toaster as Sonner } from "sonner";
import { useUIStore } from "@/stores/ui";

export function Toaster() {
  const theme = useUIStore((s) => s.theme);
  return (
    <Sonner
      theme={theme}
      position="top-center"
      richColors
      toastOptions={{
        classNames: {
          toast:
            "rounded-2xl border border-border bg-card text-card-foreground",
        },
      }}
    />
  );
}
