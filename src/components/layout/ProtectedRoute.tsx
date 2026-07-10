import { Navigate, Outlet } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/features/auth/AuthProvider";

export function ProtectedRoute() {
  const { session, loading, switching } = useAuth();

  // Mid-switch the client is briefly session-less; bouncing to /auth would
  // throw the user out of an account swap that is about to succeed.
  if (loading || switching) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-background">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!session) return <Navigate to="/auth" replace />;

  return <Outlet />;
}
