import { lazy, Suspense, useEffect } from "react";
import {
  createBrowserRouter,
  RouterProvider,
  Navigate,
} from "react-router-dom";
import { QueryClientProvider } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { queryClient } from "@/lib/queryClient";
import { AuthProvider } from "@/features/auth/AuthProvider";
import { ProtectedRoute } from "@/components/layout/ProtectedRoute";
import { AppLayout } from "@/components/layout/AppLayout";
import { Toaster } from "@/components/ui/sonner";
import { useUIStore } from "@/stores/ui";
import LoginPage from "@/features/auth/LoginPage";

// Lazy-load route pages so the initial app shell (and charts) load on demand.
const DashboardPage = lazy(() => import("@/features/dashboard/DashboardPage"));
const ExpensesPage = lazy(() => import("@/features/expenses/ExpensesPage"));
const HabitsPage = lazy(() => import("@/features/habits/HabitsPage"));
const JournalPage = lazy(() => import("@/features/journal/JournalPage"));

function PageFallback() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
    </div>
  );
}

const page = (el: React.ReactNode) => (
  <Suspense fallback={<PageFallback />}>{el}</Suspense>
);

const router = createBrowserRouter([
  { path: "/auth", element: <LoginPage /> },
  {
    element: <ProtectedRoute />,
    children: [
      {
        element: <AppLayout />,
        children: [
          { path: "/", element: page(<DashboardPage />) },
          { path: "/expenses", element: page(<ExpensesPage />) },
          { path: "/habits", element: page(<HabitsPage />) },
          { path: "/journal", element: page(<JournalPage />) },
        ],
      },
    ],
  },
  { path: "*", element: <Navigate to="/" replace /> },
]);

function ThemeApplier() {
  const theme = useUIStore((s) => s.theme);
  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle("dark", theme === "dark");
    document
      .querySelector('meta[name="theme-color"]')
      ?.setAttribute("content", theme === "dark" ? "#0b0f1a" : "#f7f7fb");
  }, [theme]);
  return null;
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <ThemeApplier />
        <RouterProvider router={router} />
        <Toaster />
      </AuthProvider>
    </QueryClientProvider>
  );
}
