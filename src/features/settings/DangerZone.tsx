import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Trash2, Loader2, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { useAuth } from "@/features/auth/AuthProvider";
import { clearAllData, isOwner } from "./reset";

const CONFIRM_WORD = "RESET";

/**
 * Owner-only "nuke all my data" control. Renders nothing for anyone else.
 * Used to wipe test data after deploy and start fresh with real data.
 */
export function DangerZone() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [typed, setTyped] = useState("");

  const wipe = useMutation({
    mutationFn: clearAllData,
    onSuccess: async () => {
      await queryClient.invalidateQueries();
      toast.success("Clean slate. Go make real data now.");
      setOpen(false);
      setTyped("");
    },
    onError: (e: unknown) =>
      toast.error(e instanceof Error ? e.message : "Couldn't wipe data."),
  });

  if (!isOwner(user?.email)) return null;

  return (
    <Card className="mt-3 border-destructive/30">
      <CardContent className="flex items-center gap-3 p-4">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-destructive/10 text-destructive">
          <AlertTriangle className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium">Danger zone (just you)</p>
          <p className="text-xs text-muted-foreground">
            Wipe all test data and start fresh.
          </p>
        </div>
        <Button
          variant="destructive"
          size="sm"
          className="shrink-0"
          onClick={() => setOpen(true)}
        >
          <Trash2 className="h-4 w-4" /> Clear all
        </Button>
      </CardContent>

      <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) setTyped(""); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Wipe everything?</DialogTitle>
            <DialogDescription>
              Deletes ALL your expenses, plans, habit logs, journal entries and
              goals — across every month. Habits reset to the starter 7. This
              cannot be undone. Type{" "}
              <span className="font-semibold text-foreground">{CONFIRM_WORD}</span>{" "}
              to confirm.
            </DialogDescription>
          </DialogHeader>

          <Input
            autoFocus
            placeholder={CONFIRM_WORD}
            value={typed}
            onChange={(e) => setTyped(e.target.value)}
          />

          <div className="flex justify-end gap-2">
            <Button
              variant="ghost"
              onClick={() => setOpen(false)}
              disabled={wipe.isPending}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => wipe.mutate()}
              disabled={typed.trim().toUpperCase() !== CONFIRM_WORD || wipe.isPending}
            >
              {wipe.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Trash2 className="h-4 w-4" />
              )}
              Wipe it all
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
