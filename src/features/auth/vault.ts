import type { Session } from "@supabase/supabase-js";

/**
 * Supabase keeps exactly one session per client, so "logged into two accounts"
 * is an illusion we maintain ourselves: every account's refresh token lives
 * here, and switching means feeding one back via `supabase.auth.setSession`.
 *
 * Passwords are never stored. If a refresh token dies the account stays in the
 * list, flagged, and the user re-enters their password — same as Instagram.
 */
const KEY = "lifeos.accounts.v1";

/** Which shape of the app this account runs. Chosen during onboarding (step 2). */
export type SetupKind = "salary" | "custom";

export interface VaultAccount {
  userId: string;
  email: string;
  displayName: string;
  setupKind: SetupKind | null;
  accessToken: string;
  refreshToken: string;
  lastUsedAt: number;
}

function read(): VaultAccount[] {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (a): a is VaultAccount =>
        !!a && typeof a.userId === "string" && typeof a.email === "string"
    );
  } catch {
    return [];
  }
}

function write(list: VaultAccount[]): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(list));
  } catch {
    // Quota exceeded or private mode — switching degrades, the app still works.
  }
}

/** Most recently used first, which is the order Instagram shows them in. */
export function listAccounts(): VaultAccount[] {
  return read().sort((a, b) => b.lastUsedAt - a.lastUsedAt);
}

export function getAccount(userId: string): VaultAccount | null {
  return read().find((a) => a.userId === userId) ?? null;
}

/** An account whose tokens are gone can only come back via a password. */
export function needsReauth(account: VaultAccount): boolean {
  return !account.refreshToken;
}

function nameOf(session: Session, fallback: string): string {
  const meta = session.user.user_metadata as { display_name?: unknown };
  const name = typeof meta?.display_name === "string" ? meta.display_name.trim() : "";
  if (name) return name;
  const email = session.user.email ?? fallback;
  return email.split("@")[0] || "account";
}

/**
 * Upsert the signed-in account with its freshest tokens. Called on every auth
 * state change so the active account's refresh token is never stale.
 */
export function rememberSession(session: Session): void {
  const list = read();
  const i = list.findIndex((a) => a.userId === session.user.id);
  const prev = i >= 0 ? list[i] : null;

  const next: VaultAccount = {
    userId: session.user.id,
    email: session.user.email ?? prev?.email ?? "",
    displayName: nameOf(session, prev?.email ?? ""),
    setupKind: prev?.setupKind ?? null,
    accessToken: session.access_token,
    refreshToken: session.refresh_token,
    lastUsedAt: Date.now(),
  };

  if (i >= 0) list[i] = next;
  else list.push(next);
  write(list);
}

/** Tokens rejected by the server — keep the account so it can be re-authed. */
export function expireAccount(userId: string): void {
  const list = read();
  const i = list.findIndex((a) => a.userId === userId);
  if (i < 0) return;
  list[i] = { ...list[i], accessToken: "", refreshToken: "" };
  write(list);
}

export function forgetAccount(userId: string): void {
  write(read().filter((a) => a.userId !== userId));
}
