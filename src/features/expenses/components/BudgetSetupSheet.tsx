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
import type { BudgetCategory, MonthlyBudget } from "@/types";
import { copy } from "../copy";
import {
  useCreateCategory,
  useDeleteCategory,
  useUpsertBudget,
} from "../hooks";

export function BudgetSetupSheet({
  open,
  onOpenChange,
  month,
  budget,
  categories,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  month: string;
  budget: MonthlyBudget | null;
  categories: BudgetCategory[];
}) {
  const upsert = useUpsertBudget(month);
  const createCat = useCreateCategory(month);
  const delCat = useDeleteCategory(month);

  const [balance, setBalance] = useState("");
  const [target, setTarget] = useState("");

  const [newName, setNewName] = useState("");
  const [newAmount, setNewAmount] = useState("");

  useEffect(() => {
    if (open) {
      setBalance(budget ? String(budget.opening_balance) : "");
      setTarget(budget ? String(budget.saving_target) : "");
    }
  }, [open, budget]);

  const saveBudget = () =>
    upsert.mutate({
      opening_balance: Number(balance) || 0,
      saving_target: Number(target) || 0,
    });

  const addBucket = () => {
    if (!newName.trim()) return;
    createCat.mutate(
      {
        name: newName.trim(),
        planned_amount: Number(newAmount) || 0,
        type: "flexible",
        month,
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
          <Label htmlFor="balance">{copy.setup.balanceLabel}</Label>
          <Input
            id="balance"
            type="number"
            inputMode="numeric"
            placeholder="35000"
            value={balance}
            onChange={(e) => setBalance(e.target.value)}
          />
          <p className="text-xs text-muted-foreground">
            {copy.setup.balanceHint}
          </p>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="target">{copy.setup.targetLabel}</Label>
          <Input
            id="target"
            type="number"
            inputMode="numeric"
            placeholder="5000"
            value={target}
            onChange={(e) => setTarget(e.target.value)}
          />
          <p className="text-xs text-muted-foreground">{copy.setup.targetHint}</p>
        </div>

        <Button onClick={saveBudget} disabled={upsert.isPending}>
          {upsert.isPending && <Loader2 className="animate-spin" />}
          {copy.setup.saveBalance}
        </Button>

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
              disabled={createCat.isPending || !newName.trim()}
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
