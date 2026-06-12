import { Outlet } from "react-router-dom";
import { BottomNav } from "./BottomNav";
import { QuickAddButton } from "@/features/expenses/QuickAdd";

export function AppLayout() {
  return (
    <div className="min-h-dvh bg-background">
      <main className="mx-auto w-full max-w-lg px-4 pt-safe pb-28">
        <Outlet />
      </main>
      <QuickAddButton />
      <BottomNav />
    </div>
  );
}
