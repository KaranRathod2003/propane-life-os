import { useEffect, useState } from "react";
import { PartyPopper, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { formatINR } from "@/lib/format";
import { copy } from "../copy";
import type { Account, Cycle } from "@/types";
import { useStartSalaryCycle } from "../hooks";

export function SalaryButton({
  currentCycle,
  mainAccount,
  hasBuckets,
}: {
  currentCycle: Cycle | null;
  mainAccount: Account | null;
  hasBuckets: boolean;
}) {
  const [open, setOpen] = useState(false);
  const start = useStartSalaryCycle();

  const [amount, setAmount] = useState("");
  const [target, setTarget] = useState("");
  const [carry, setCarry] = useState(true);

  useEffect(() => {
    if (open) {
      setAmount("");
      setTarget(currentCycle ? String(currentCycle.saving_target || "") : "");
      setCarry(hasBuckets);
    }
  }, [open, currentCycle, hasBuckets]);

  const salary = Number(amount);
  const canStart = !!mainAccount && salary > 0 && !start.isPending;

  const go = () => {
    if (!mainAccount) return;
    start.mutate(
      {
        mainAccountId: mainAccount.id,
        salaryAmount: salary,
        savingTarget: Number(target) || 0,
        carryBucketsFromCycleId: carry && currentCycle ? currentCycle.id : null,
      },
      { onSuccess: () => setOpen(false) }
    );
  };

  return (
    <>
      <Button
        variant="secondary"
        className="w-full border border-primary/30 bg-primary/10 text-foreground hover:bg-primary/15"
        onClick={() => setOpen(true)}
      >
        <PartyPopper className="h-4 w-4 text-primary" /> {copy.salary.button}
      </Button>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent className="max-h-[92vh] overflow-y-auto no-scrollbar">
          <SheetHeader>
            <SheetTitle>{copy.salary.title}</SheetTitle>
            <SheetDescription>{copy.salary.sub}</SheetDescription>
          </SheetHeader>

          <div className="flex items-center justify-center gap-1 py-1">
            <span className="text-2xl font-semibold text-muted-foreground">₹</span>
            <Input
              type="number"
              inputMode="decimal"
              autoFocus
              placeholder="0"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="h-14 border-0 bg-transparent text-center text-4xl font-bold tabular-nums focus-visible:ring-0"
            />
          </div>
          <p className="-mt-1 text-center text-xs text-muted-foreground">
            {copy.salary.amountHint}
          </p>

          <div className="space-y-1.5">
            <Label htmlFor="target">{copy.salary.targetLabel}</Label>
            <Input
              id="target"
              type="number"
              inputMode="numeric"
              placeholder="5000"
              value={target}
              onChange={(e) => setTarget(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">{copy.salary.targetHint}</p>
          </div>

          <label className="flex items-center justify-between rounded-xl border border-border px-3 py-2.5">
            <span className="text-sm font-medium">{copy.salary.carryLabel}</span>
            <Switch checked={carry} onCheckedChange={setCarry} />
          </label>

          <Button onClick={go} disabled={!canStart}>
            {start.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            {copy.salary.start}
            {salary > 0 ? ` · ${formatINR(salary)}` : ""}
          </Button>
        </SheetContent>
      </Sheet>
    </>
  );
}
