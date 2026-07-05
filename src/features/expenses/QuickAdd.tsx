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
import { useExpenses, useCreateTransaction } from "./hooks";
import { copy } from "./copy";
// Quick-add only handles single-account types; transfers use their own sheet.
type QuickType = "expense" | "income" | "lent" | "borrowed_repayment";

const TYPE_OPTIONS: { value: QuickType; label: string }[] = [
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

  const { accounts, categories, currentCycle } = useExpenses();
  const createTx = useCreateTransaction();

  const accountList = accounts.data ?? [];
  const mainAccount = accountList.find((a) => a.kind === "main") ?? accountList[0];
  const cycleCats = useMemo(
    () =>
      (categories.data ?? [])
        .filter((c) => currentCycle && c.cycle_id === currentCycle.id)
        .sort((a, b) => a.name.localeCompare(b.name)),
    [categories.data, currentCycle]
  );

  const [amount, setAmount] = useState("");
  const [type, setType] = useState<QuickType>("expense");
  const [accountId, setAccountId] = useState<string>("");
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [source, setSource] = useState("");
  const [note, setNote] = useState("");

  // Reset on open so logging always starts clean.
  useEffect(() => {
    if (open) {
      setAmount("");
      setType("expense");
      setAccountId(mainAccount?.id ?? "");
      setCategoryId(null);
      setSource("");
      setNote("");
    }
  }, [open, mainAccount?.id]);

  const numericAmount = Number(amount);
  const canSave = numericAmount > 0 && !!accountId && !createTx.isPending;
  const isMain = mainAccount && accountId === mainAccount.id;

  const onSave = async () => {
    if (!canSave) {
      toast.error(copy.quickAdd.needAmount);
      return;
    }
    await createTx.mutateAsync({
      amount: numericAmount,
      account_id: accountId,
      // Only Main-account spending/income counts toward the salary cycle plan.
      cycle_id: isMain && currentCycle ? currentCycle.id : null,
      category_id: type === "expense" ? categoryId : null,
      tag: type === "income" ? source.trim() || null : null,
      note: note.trim() || null,
      type,
      date: todayISO(),
    });
    setOpen(false);
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetContent className="max-h-[92vh] overflow-y-auto no-scrollbar">
        <SheetHeader>
          <SheetTitle>{copy.quickAdd.title}</SheetTitle>
        </SheetHeader>

        {/* Big amount input */}
        <div className="flex items-center justify-center gap-1 py-1">
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

        {/* Account picker */}
        {accountList.length > 1 && (
          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground">
              {copy.quickAdd.accountLabel}
            </p>
            <div className="grid grid-cols-2 gap-2">
              {accountList.map((a) => (
                <button
                  key={a.id}
                  onClick={() => setAccountId(a.id)}
                  className={cn(
                    "rounded-lg border px-3 py-2 text-sm font-medium transition-colors",
                    accountId === a.id
                      ? "border-primary bg-primary/15 text-primary"
                      : "border-border text-muted-foreground"
                  )}
                >
                  {a.name}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Category chips (only for expenses) */}
        {type === "expense" && (
          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground">
              {copy.quickAdd.bucketLabel}
            </p>
            <div className="flex flex-wrap gap-2">
              {cycleCats.length === 0 && (
                <p className="text-sm text-muted-foreground">
                  {copy.quickAdd.noBuckets}
                </p>
              )}
              {cycleCats.map((c) => (
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

        {/* Income source */}
        {type === "income" && (
          <div className="space-y-1.5">
            <p className="text-xs font-medium text-muted-foreground">
              {copy.quickAdd.sourceLabel}
            </p>
            <Input
              placeholder={copy.quickAdd.sourcePlaceholder}
              value={source}
              onChange={(e) => setSource(e.target.value)}
            />
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
