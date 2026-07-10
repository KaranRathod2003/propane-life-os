import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";
import { queryClient } from "@/lib/queryClient";
import {
  expireAccount,
  forgetAccount,
  getAccount,
  listAccounts,
  rememberSession,
  type VaultAccount,
} from "./vault";

/** Thrown when a stored refresh token is no longer accepted by Supabase. */
export class SessionExpiredError extends Error {
  constructor(readonly email: string) {
    super("Session expired");
    this.name = "SessionExpiredError";
  }
}

interface AuthContextValue {
  session: Session | null;
  user: User | null;
  loading: boolean;
  /** True while swapping sessions — routes should hold still, not redirect. */
  switching: boolean;
  accounts: VaultAccount[];
  switchTo: (userId: string) => Promise<void>;
  removeAccount: (userId: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [switching, setSwitching] = useState(false);
  const [accounts, setAccounts] = useState<VaultAccount[]>(() => listAccounts());
  const activeId = useRef<string | null>(null);

  useEffect(() => {
    const adopt = (next: Session | null) => {
      const nextId = next?.user.id ?? null;
      // Every query key is user-agnostic, so a stale cache would leak one
      // account's rows into another. Drop it the instant the identity changes.
      if (activeId.current !== nextId) queryClient.clear();
      activeId.current = nextId;

      if (next) rememberSession(next);
      setSession(next);
      setAccounts(listAccounts());
    };

    supabase.auth.getSession().then(({ data }) => {
      adopt(data.session);
      setLoading(false);
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, next) => {
      adopt(next);
    });

    return () => sub.subscription.unsubscribe();
  }, []);

  const switchTo = useCallback(async (userId: string) => {
    if (userId === activeId.current) return;

    const target = getAccount(userId);
    if (!target) throw new Error("That account isn't on this device anymore.");
    if (!target.refreshToken) throw new SessionExpiredError(target.email);

    const fallback = activeId.current ? getAccount(activeId.current) : null;
    setSwitching(true);
    try {
      const { error } = await supabase.auth.setSession({
        access_token: target.accessToken,
        refresh_token: target.refreshToken,
      });
      if (error) {
        expireAccount(userId);
        // A rejected setSession can leave the client signed out entirely, so
        // put the account we came from back before surfacing the failure.
        if (fallback?.refreshToken) {
          await supabase.auth.setSession({
            access_token: fallback.accessToken,
            refresh_token: fallback.refreshToken,
          });
        }
        setAccounts(listAccounts());
        throw new SessionExpiredError(target.email);
      }
    } finally {
      setSwitching(false);
    }
  }, []);

  const signOut = useCallback(async () => {
    const current = activeId.current;
    const next = listAccounts().find(
      (a) => a.userId !== current && a.refreshToken
    );

    setSwitching(true);
    try {
      // `local` — signing out here must not kill this user's other devices.
      await supabase.auth.signOut({ scope: "local" });
      if (current) forgetAccount(current);
      setAccounts(listAccounts());

      if (next) {
        const { error } = await supabase.auth.setSession({
          access_token: next.accessToken,
          refresh_token: next.refreshToken,
        });
        if (error) {
          expireAccount(next.userId);
          setAccounts(listAccounts());
        }
      }
    } finally {
      setSwitching(false);
    }
  }, []);

  const removeAccount = useCallback(
    async (userId: string) => {
      if (userId === activeId.current) {
        await signOut();
        return;
      }
      // We aren't authenticated as this user, so the token can only be dropped
      // locally, not revoked server-side.
      forgetAccount(userId);
      setAccounts(listAccounts());
    },
    [signOut]
  );

  return (
    <AuthContext.Provider
      value={{
        session,
        user: session?.user ?? null,
        loading,
        switching,
        accounts,
        switchTo,
        removeAccount,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
