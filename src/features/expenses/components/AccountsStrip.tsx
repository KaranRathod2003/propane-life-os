import { useEffect, useState } from "react";
import { Wallet, PiggyBank, ArrowLeftRight, Loader2, Pencil } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { formatINR } from "@/lib/format";
import { todayISO } from "@/lib/date";
import { copy } from "../copy";
import type { AccountBalance } from "../computations";
import { useUpdateAccountOpening, useCreateTransfer } from "../hooks";

export function AccountsStrip({ balances }: { balances: AccountBalance[] }) {
  const [editId, setEditId] = useState<string | null>(null);
  const [transferOpen, setTransferOpen] = useState(false);
  const editing = balances.find((b) => b.account.id === editId) ?? null;

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-2 gap-3">
        {balances.map((b) => {
          const isMain = b.account.kind === "main";
          const Icon = isMain ? Wallet : PiggyBank;
          return (
            <Card
              key={b.account.id}
              role="button"
              onClick={() => setEditId(b.account.id)}
              className="cursor-pointer transition-transform active:scale-[0.99]"
            >
              <CardContent className="p-4">
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span className="flex items-center gap-1.5">
                    <Icon className="h-3.5 w-3.5" /> {b.account.name}
                  </span>
                  <Pencil className="h-3 w-3 opacity-50" />
                </div>
                <p
                  className={cn(
                    "mt-1 text-2xl font-bold tabular-nums",
                    b.balance < 0 && "text-destructive"
                  )}
                >
                  {formatINR(b.balance)}
                </p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {balances.length >= 2 && (
        <Button
          variant="outline"
          size="sm"
          className="w-full"
          onClick={() => setTransferOpen(true)}
        >
          <ArrowLeftRight className="h-4 w-4" /> {copy.accounts.transfer}
        </Button>
      )}

      <BalanceEditSheet
        editing={editing}
        onClose={() => setEditId(null)}
      />
      <TransferSheet
        open={transferOpen}
        onOpenChange={setTransferOpen}
        balances={balances}
      />
    </div>
  );
}

function BalanceEditSheet({
  editing,
  onClose,
}: {
  editing: AccountBalance | null;
  onClose: () => void;
}) {
  const update = useUpdateAccountOpening();
  const [value, setValue] = useState("");

  useEffect(() => {
    if (editing) setValue(String(editing.balance));
  }, [editing]);

  const save = () => {
    if (!editing) return;
    const target = Number(value);
    if (Number.isNaN(target)) return;
    // Adjust the anchor so the running balance shows exactly `target`.
    const opening_balance =
      Number(editing.account.opening_balance) + (target - editing.balance);
    update.mutate({ id: editing.account.id, opening_balance }, { onSuccess: onClose });
  };

  return (
    <Sheet open={!!editing} onOpenChange={(o) => !o && onClose()}>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>
            {copy.accounts.editTitle}
            {editing ? ` · ${editing.account.name}` : ""}
          </SheetTitle>
          <SheetDescription>{copy.accounts.editHint}</SheetDescription>
        </SheetHeader>
        <div className="space-y-1.5">
          <Label htmlFor="bal">Real balance</Label>
          <Input
            id="bal"
            type="number"
            inputMode="decimal"
            autoFocus
            value={value}
            onChange={(e) => setValue(e.target.value)}
          />
        </div>
        <Button onClick={save} disabled={update.isPending}>
          {update.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
          {copy.accounts.editSave}
        </Button>
      </SheetContent>
    </Sheet>
  );
}

function TransferSheet({
  open,
  onOpenChange,
  balances,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  balances: AccountBalance[];
}) {
  const transfer = useCreateTransfer();
  const accounts = balances.map((b) => b.account);
  const [fromId, setFromId] = useState("");
  const [toId, setToId] = useState("");
  const [amount, setAmount] = useState("");

  useEffect(() => {
    if (open && accounts.length >= 2) {
      const main = accounts.find((a) => a.kind === "main") ?? accounts[0];
      const other = accounts.find((a) => a.id !== main.id) ?? accounts[1];
      setFromId(main.id);
      setToId(other.id);
      setAmount("");
    }
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  const amt = Number(amount);
  const canSave = amt > 0 && fromId && toId && fromId !== toId && !transfer.isPending;

  const save = () =>
    transfer.mutate(
      {
        fromAccountId: fromId,
        toAccountId: toId,
        amount: amt,
        date: todayISO(),
        note: null,
      },
      { onSuccess: () => onOpenChange(false) }
    );

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>{copy.transfer.title}</SheetTitle>
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

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label>{copy.transfer.fromLabel}</Label>
            <AccountPicker
              accounts={accounts}
              value={fromId}
              onChange={setFromId}
            />
          </div>
          <div className="space-y-1.5">
            <Label>{copy.transfer.toLabel}</Label>
            <AccountPicker accounts={accounts} value={toId} onChange={setToId} />
          </div>
        </div>

        {fromId === toId && (
          <p className="text-xs text-destructive">{copy.transfer.sameAccount}</p>
        )}

        <Button onClick={save} disabled={!canSave}>
          {transfer.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
          {copy.transfer.move}
          {amt > 0 ? ` · ${formatINR(amt)}` : ""}
        </Button>
      </SheetContent>
    </Sheet>
  );
}

function AccountPicker({
  accounts,
  value,
  onChange,
}: {
  accounts: { id: string; name: string }[];
  value: string;
  onChange: (id: string) => void;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      {accounts.map((a) => (
        <button
          key={a.id}
          onClick={() => onChange(a.id)}
          className={cn(
            "rounded-lg border px-3 py-2 text-sm font-medium transition-colors",
            value === a.id
              ? "border-primary bg-primary/15 text-primary"
              : "border-border text-muted-foreground"
          )}
        >
          {a.name}
        </button>
      ))}
    </div>
  );
}
