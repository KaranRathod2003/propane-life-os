import { useState } from "react";
import { Navigate, useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { ArrowLeft, Loader2 } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "./AuthProvider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

type Mode = "signin" | "signup";

export default function LoginPage() {
  const { session, loading: authLoading } = useAuth();
  const [params] = useSearchParams();
  const navigate = useNavigate();

  /** Reached from the account switcher: sign in *alongside* the current session. */
  const adding = params.get("add") === "1";
  const [mode, setMode] = useState<Mode>("signin");
  const [email, setEmail] = useState(params.get("email") ?? "");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // While adding, an existing session is expected — don't bounce off this page.
  if (!authLoading && session && !adding) return <Navigate to="/" replace />;

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      toast.error("Enter your email and password.");
      return;
    }
    setSubmitting(true);
    try {
      if (mode === "signup") {
        const { data, error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        toast.success(
          "Account created. If email confirmation is on, check your inbox."
        );
        // With confirmation on there's no session yet, so nowhere to go.
        if (adding && data.session) navigate("/", { replace: true });
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
        // The redirect guard above is disabled while adding — go there ourselves.
        if (adding) navigate("/", { replace: true });
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Authentication failed.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-dvh items-center justify-center bg-background p-4">
      <div className="w-full max-w-sm space-y-6">
        {adding && (
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" /> Back
          </button>
        )}

        <div className="space-y-2 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-500 text-2xl font-bold text-white shadow-lg">
            L
          </div>
          <h1 className="text-2xl font-bold tracking-tight">LifeOS</h1>
          <p className="text-sm text-muted-foreground">
            Your personal life management portal.
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>
              {adding
                ? mode === "signin"
                  ? "Add another account"
                  : "Create another account"
                : mode === "signin"
                  ? "Welcome back"
                  : "Create your account"}
            </CardTitle>
            <CardDescription>
              {adding
                ? "Your current account stays signed in — switch anytime."
                : mode === "signin"
                  ? "Sign in to continue."
                  : "Sign up to get started."}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={onSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  inputMode="email"
                  autoComplete="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  autoComplete={
                    mode === "signin" ? "current-password" : "new-password"
                  }
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
              <Button
                type="submit"
                className="w-full"
                size="lg"
                disabled={submitting}
              >
                {submitting && <Loader2 className="animate-spin" />}
                {mode === "signin" ? "Sign in" : "Sign up"}
              </Button>
            </form>

            <div className="mt-4 text-center text-sm text-muted-foreground">
              {mode === "signin" ? (
                <>
                  No account?{" "}
                  <button
                    className="font-medium text-primary hover:underline"
                    onClick={() => setMode("signup")}
                  >
                    Sign up
                  </button>
                </>
              ) : (
                <>
                  Already have an account?{" "}
                  <button
                    className="font-medium text-primary hover:underline"
                    onClick={() => setMode("signin")}
                  >
                    Sign in
                  </button>
                </>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
