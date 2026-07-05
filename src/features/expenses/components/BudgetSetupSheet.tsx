import { useEffect, useState } from "react";
import { Plus, Trash2, Loader2 } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { BudgetCategory, Cycle } from "@/types";
import { copy } from "../copy";
import { useCreateCategory, useDeleteCategory, useUpdateCycle } from "../hooks";

export function BudgetSetupSheet({
  open,
  onOpenChange,
  cycle,
  categories,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  cycle: Cycle | null;
  categories: BudgetCategory[];
}) {
  const updateCycle = useUpdateCycle();
  const createCat = useCreateCategory();
  const delCat = useDeleteCategory();

  const [target, setTarget] = useState("");
  const [newName, setNewName] = useState("");
  const [newAmount, setNewAmount] = useState("");

  useEffect(() => {
    if (open) setTarget(cycle ? String(cycle.saving_target || "") : "");
  }, [open, cycle]);

  const saveTarget = () => {
    if (!cycle) return;
    updateCycle.mutate({
      id: cycle.id,
      patch: { saving_target: Number(target) || 0 },
    });
  };

  const addBucket = () => {
    if (!newName.trim() || !cycle) return;
    createCat.mutate(
      {
        name: newName.trim(),
        planned_amount: Number(newAmount) || 0,
        type: "flexible",
        cycle_id: cycle.id,
      },
      {
        onSuccess: () => {
          setNewName("");
          setNewAmount("");
        },
      }
    );
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="max-h-[92vh] overflow-y-auto no-scrollbar">
        <SheetHeader>
          <SheetTitle>{copy.setup.title}</SheetTitle>
          <SheetDescription>{copy.setup.sub}</SheetDescription>
        </SheetHeader>

        <div className="space-y-1.5">
          <Label htmlFor="target">{copy.setup.targetLabel}</Label>
          <div className="flex gap-2">
            <Input
              id="target"
              type="number"
              inputMode="numeric"
              placeholder="5000"
              value={target}
              onChange={(e) => setTarget(e.target.value)}
            />
            <Button onClick={saveTarget} disabled={updateCycle.isPending || !cycle}>
              {updateCycle.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              Save
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">{copy.setup.targetHint}</p>
        </div>

        <div className="space-y-2 border-t border-border pt-4">
          <Label>{copy.setup.bucketsLabel}</Label>
          <div className="space-y-1.5">
            {categories.map((c) => (
              <div
                key={c.id}
                className="flex items-center gap-2 rounded-xl border border-border px-3 py-2 text-sm"
              >
                <span className="flex-1 truncate">{c.name}</span>
                <span className="tabular-nums text-muted-foreground">
                  ₹{Number(c.planned_amount).toLocaleString("en-IN")}
                </span>
                <button
                  onClick={() => delCat.mutate(c.id)}
                  aria-label={`Delete ${c.name}`}
                  className="text-muted-foreground hover:text-destructive"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>

          <div className="flex gap-2 rounded-xl bg-secondary/50 p-3">
            <Input
              placeholder={copy.setup.bucketNamePlaceholder}
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              className="flex-1 bg-background"
              onKeyDown={(e) => e.key === "Enter" && addBucket()}
            />
            <Input
              type="number"
              inputMode="numeric"
              placeholder={copy.setup.bucketAmountPlaceholder}
              value={newAmount}
              onChange={(e) => setNewAmount(e.target.value)}
              className="w-24 bg-background"
              onKeyDown={(e) => e.key === "Enter" && addBucket()}
            />
            <Button
              variant="outline"
              size="icon"
              onClick={addBucket}
              disabled={createCat.isPending || !newName.trim() || !cycle}
              aria-label={copy.setup.addBucket}
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
