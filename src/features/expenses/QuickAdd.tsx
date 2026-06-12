import { useEffect, useMemo, useState } from "react";
import { Plus, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { formatINR } from "@/lib/format";
import { todayISO } from "@/lib/date";
import { useUIStore } from "@/stores/ui";
import { useCategories, useCreateTransaction } from "./hooks";
import { copy } from "./copy";
import type { TransactionType } from "@/types";

const TYPE_OPTIONS: { value: TransactionType; label: string }[] = [
  { value: "expense", label: copy.quickAdd.types.expense },
  { value: "income", label: copy.quickAdd.types.income },
  { value: "lent", label: copy.quickAdd.types.lent },
  { value: "borrowed_repayment", label: copy.quickAdd.types.borrowed_repayment },
];

/** The floating action button, mounted once in AppLayout. */
export function QuickAddButton() {
  const setOpen = useUIStore((s) => s.setQuickAddOpen);
  return (
    <>
      <button
        onClick={() => setOpen(true)}
        aria-label="Quick add transaction"
        className="fixed bottom-20 right-4 z-40 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-lg shadow-primary/30 transition-transform active:scale-95"
      >
        <Plus className="h-7 w-7" strokeWidth={2.5} />
      </button>
      <QuickAddSheet />
    </>
  );
}

function QuickAddSheet() {
  const open = useUIStore((s) => s.quickAddOpen);
  const setOpen = useUIStore((s) => s.setQuickAddOpen);
  const month = useUIStore((s) => s.selectedMonth);

  const { data: categories } = useCategories(month);
  const createTx = useCreateTransaction(month);

  const [amount, setAmount] = useState("");
  const [type, setType] = useState<TransactionType>("expense");
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [note, setNote] = useState("");

  // Reset on open so logging always starts clean.
  useEffect(() => {
    if (open) {
      setAmount("");
      setType("expense");
      setCategoryId(null);
      setNote("");
    }
  }, [open]);

  const sortedCategories = useMemo(
    () =>
      [...(categories ?? [])].sort((a, b) => a.name.localeCompare(b.name)),
    [categories]
  );

  const numericAmount = Number(amount);
  const canSave = numericAmount > 0 && !createTx.isPending;

  const onSave = async () => {
    if (!canSave) {
      toast.error(copy.quickAdd.needAmount);
      return;
    }
    await createTx.mutateAsync({
      amount: numericAmount,
      category_id: type === "expense" ? categoryId : null,
      note: note.trim() || null,
      type,
      date: todayISO(),
    });
    setOpen(false);
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>{copy.quickAdd.title}</SheetTitle>
        </SheetHeader>

        {/* Big amount input */}
        <div className="flex items-center justify-center gap-1 py-2">
          <span className="text-3xl font-semibold text-muted-foreground">₹</span>
          <Input
            type="number"
            inputMode="decimal"
            autoFocus
            placeholder="0"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="h-16 border-0 bg-transparent text-center text-5xl font-bold tabular-nums focus-visible:ring-0"
          />
        </div>

        {/* Type segmented control */}
        <div className="grid grid-cols-4 gap-1 rounded-xl bg-secondary p-1">
          {TYPE_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setType(opt.value)}
              className={cn(
                "rounded-lg py-2 text-xs font-medium transition-colors",
                type === opt.value
                  ? "bg-card text-foreground shadow"
                  : "text-muted-foreground"
              )}
            >
              {opt.label}
            </button>
          ))}
        </div>

        {/* Category chips (only for expenses) */}
        {type === "expense" && (
          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground">
              {copy.quickAdd.bucketLabel}
            </p>
            <div className="flex flex-wrap gap-2">
              {sortedCategories.length === 0 && (
                <p className="text-sm text-muted-foreground">
                  {copy.quickAdd.noBuckets}
                </p>
              )}
              {sortedCategories.map((c) => (
                <button
                  key={c.id}
                  onClick={() =>
                    setCategoryId((prev) => (prev === c.id ? null : c.id))
                  }
                  className={cn(
                    "rounded-full border px-3.5 py-1.5 text-sm transition-colors",
                    categoryId === c.id
                      ? "border-primary bg-primary/15 text-primary"
                      : "border-border text-muted-foreground hover:bg-secondary"
                  )}
                >
                  {c.name}
                </button>
              ))}
            </div>
          </div>
        )}

        <Input
          placeholder={copy.quickAdd.notePlaceholder}
          value={note}
          onChange={(e) => setNote(e.target.value)}
        />

        <Button size="lg" className="w-full" onClick={onSave} disabled={!canSave}>
          {createTx.isPending ? (
            <Loader2 className="animate-spin" />
          ) : (
            <>
              {copy.quickAdd.saveByType[type]}
              {numericAmount > 0 ? ` · ${formatINR(numericAmount)}` : ""}
            </>
          )}
        </Button>
      </SheetContent>
    </Sheet>
  );
}
