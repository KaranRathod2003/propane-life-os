import { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Check, Loader2, LogOut, Plus, TriangleAlert, X } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Avatar } from "@/components/common/Avatar";
import { cn } from "@/lib/utils";
import { SessionExpiredError, useAuth } from "./AuthProvider";
import { needsReauth } from "./vault";

const LONG_PRESS_MS = 450;

/**
 * Instagram-style: tap the avatar for the account sheet, or long-press it as a
 * shortcut. Long-press alone would be undiscoverable, so tap does the same job.
 */
export function AccountSwitcher() {
  const [open, setOpen] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const { user, accounts, switchTo, removeAccount, signOut } = useAuth();
  const navigate = useNavigate();
  const holdTimer = useRef<number | null>(null);

  const activeName =
    accounts.find((a) => a.userId === user?.id)?.displayName ??
    user?.email?.split("@")[0] ??
    "you";

  const startHold = () => {
    holdTimer.current = window.setTimeout(() => {
      holdTimer.current = null;
      setOpen(true);
    }, LONG_PRESS_MS);
  };
  const cancelHold = () => {
    if (holdTimer.current !== null) {
      clearTimeout(holdTimer.current);
      holdTimer.current = null;
    }
  };

  const reauth = (email: string) => {
    setOpen(false);
    navigate(`/auth?add=1&email=${encodeURIComponent(email)}`);
  };

  const onPick = async (userId: string) => {
    if (userId === user?.id) {
      setOpen(false);
      return;
    }
    const account = accounts.find((a) => a.userId === userId);
    if (account && needsReauth(account)) {
      reauth(account.email);
      return;
    }

    setBusyId(userId);
    try {
      await switchTo(userId);
      setOpen(false);
      navigate("/", { replace: true });
    } catch (err) {
      if (err instanceof SessionExpiredError) {
        toast.error("That session expired. Sign in again.");
        reauth(err.email);
      } else {
        toast.error(err instanceof Error ? err.message : "Couldn't switch.");
      }
    } finally {
      setBusyId(null);
    }
  };

  const onRemove = async (userId: string) => {
    setBusyId(userId);
    try {
      await removeAccount(userId);
    } catch {
      toast.error("Couldn't remove that account.");
    } finally {
      setBusyId(null);
    }
  };

  const onSignOut = async () => {
    try {
      await signOut();
      setOpen(false);
    } catch {
      setOpen(false);
      toast.error("Signed out, but the next account needs a password.");
    }
  };

  return (
    <>
      <button
        type="button"
        aria-label="Accounts"
        className="touch-none rounded-full ring-offset-background transition-transform active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        onPointerDown={startHold}
        onPointerUp={cancelHold}
        onPointerLeave={cancelHold}
        onPointerCancel={cancelHold}
        onContextMenu={(e) => e.preventDefault()}
        onClick={() => setOpen(true)}
      >
        <Avatar seed={user?.id ?? "anon"} name={activeName} size={34} />
      </button>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>Accounts</SheetTitle>
            <SheetDescription>
              Tap to switch. Nobody sees anybody else's data.
            </SheetDescription>
          </SheetHeader>

          <div className="-mx-1 max-h-[50vh] space-y-1 overflow-y-auto px-1">
            {accounts.map((account) => {
              const isActive = account.userId === user?.id;
              const stale = needsReauth(account);
              const busy = busyId === account.userId;

              return (
                <div
                  key={account.userId}
                  className={cn(
                    "flex items-center gap-3 rounded-2xl border p-3 transition-colors",
                    isActive ? "border-primary/40 bg-primary/5" : "border-border"
                  )}
                >
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => onPick(account.userId)}
                    className="flex min-w-0 flex-1 items-center gap-3 text-left disabled:opacity-60"
                  >
                    <Avatar
                      seed={account.userId}
                      name={account.displayName}
                      size={40}
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold capitalize">
                        {account.displayName}
                      </p>
                      <p className="truncate text-xs text-muted-foreground">
                        {stale ? "Session expired · tap to sign in" : account.email}
                      </p>
                    </div>
                    {busy ? (
                      <Loader2 className="h-4 w-4 shrink-0 animate-spin text-muted-foreground" />
                    ) : stale ? (
                      <TriangleAlert className="h-4 w-4 shrink-0 text-destructive" />
                    ) : isActive ? (
                      <Check className="h-4 w-4 shrink-0 text-primary" />
                    ) : null}
                  </button>

                  {!isActive && (
                    <button
                      type="button"
                      aria-label={`Remove ${account.email}`}
                      disabled={busy}
                      onClick={() => onRemove(account.userId)}
                      className="shrink-0 rounded-lg p-1 text-muted-foreground/60 transition-colors hover:text-foreground"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>
              );
            })}
          </div>

          <div className="space-y-2">
            <Button
              variant="secondary"
              size="lg"
              className="w-full"
              onClick={() => {
                setOpen(false);
                navigate("/auth?add=1");
              }}
            >
              <Plus className="h-4 w-4" /> Add account
            </Button>
            <Button
              variant="ghost"
              size="lg"
              className="w-full text-destructive hover:text-destructive"
              onClick={onSignOut}
            >
              <LogOut className="h-4 w-4" /> Log out of {activeName}
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
