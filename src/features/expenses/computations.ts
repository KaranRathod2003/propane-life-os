import { addDays, differenceInCalendarDays, format, parseISO } from "date-fns";
import type { Account, BudgetCategory, Cycle, Transaction } from "@/types";

// Money IN vs OUT of an account.
export const INFLOW_TYPES: Transaction["type"][] = [
  "income",
  "borrowed_repayment",
  "transfer_in",
];
export const OUTFLOW_TYPES: Transaction["type"][] = [
  "expense",
  "lent",
  "transfer_out",
];

function flow(t: Transaction): number {
  const amt = Number(t.amount);
  if (INFLOW_TYPES.includes(t.type)) return amt;
  if (OUTFLOW_TYPES.includes(t.type)) return -amt;
  return 0;
}

// ---------------------------------------------------------------------------
// ACCOUNT BALANCES (persistent, all-time)
// ---------------------------------------------------------------------------

export interface AccountBalance {
  account: Account;
  balance: number;
}

export function computeBalances(
  accounts: Account[],
  transactions: Transaction[]
): AccountBalance[] {
  const delta = new Map<string, number>();
  for (const t of transactions) {
    if (!t.account_id) continue;
    delta.set(t.account_id, (delta.get(t.account_id) ?? 0) + flow(t));
  }
  return accounts.map((a) => ({
    account: a,
    balance: Number(a.opening_balance) + (delta.get(a.id) ?? 0),
  }));
}

export function mainBalanceOf(balances: AccountBalance[]): number {
  return balances.find((b) => b.account.kind === "main")?.balance ?? 0;
}

// ---------------------------------------------------------------------------
// CURRENT CYCLE SUMMARY (planning for the Main account)
// ---------------------------------------------------------------------------

export interface BucketSpend {
  category: BudgetCategory;
  spent: number;
  estimate: number;
  remaining: number;
  overBy: number;
}

export interface DailyPoint {
  date: string;
  label: string;
  amount: number;
}

export interface CycleSummary {
  cycle: Cycle | null;
  /** The hero — Main account's running balance. Never resets. */
  mainBalance: number;
  cycleSpend: number;
  cycleIncome: number;
  savingTarget: number;
  plannedRemaining: number;
  projectedSavings: number;
  freeToSpend: number;
  savingsAtRisk: boolean;
  riskAmount: number;
  perBucket: BucketSpend[];
  dailySpend: DailyPoint[];
}

export function computeCycleSummary(
  cycle: Cycle | null,
  mainBalance: number,
  categories: BudgetCategory[],
  transactions: Transaction[]
): CycleSummary {
  const cycleTxns = cycle
    ? transactions.filter((t) => t.cycle_id === cycle.id)
    : [];

  const spentByCat = new Map<string, number>();
  const spentByDay = new Map<string, number>();
  let cycleSpend = 0;
  let cycleIncome = 0;

  for (const t of cycleTxns) {
    const amt = Number(t.amount);
    if (t.type === "expense") {
      cycleSpend += amt;
      spentByDay.set(t.date, (spentByDay.get(t.date) ?? 0) + amt);
      if (t.category_id)
        spentByCat.set(t.category_id, (spentByCat.get(t.category_id) ?? 0) + amt);
    } else if (t.type === "income") {
      cycleIncome += amt;
    }
  }

  const cycleCats = cycle
    ? categories.filter((c) => c.cycle_id === cycle.id)
    : [];

  const perBucket: BucketSpend[] = cycleCats.map((c) => {
    const spent = spentByCat.get(c.id) ?? 0;
    const estimate = Number(c.planned_amount);
    return {
      category: c,
      spent,
      estimate,
      remaining: estimate - spent,
      overBy: Math.max(0, spent - estimate),
    };
  });

  const plannedRemaining = perBucket.reduce(
    (sum, b) => sum + Math.max(0, b.remaining),
    0
  );
  const savingTarget = Number(cycle?.saving_target ?? 0);
  const projectedSavings = mainBalance - plannedRemaining;
  const freeToSpend = projectedSavings - savingTarget;
  const riskAmount = Math.max(0, -freeToSpend);

  return {
    cycle,
    mainBalance,
    cycleSpend,
    cycleIncome,
    savingTarget,
    plannedRemaining,
    projectedSavings,
    freeToSpend,
    savingsAtRisk: riskAmount > 0,
    riskAmount,
    perBucket,
    dailySpend: buildDailySpend(cycle, spentByDay),
  };
}

function buildDailySpend(
  cycle: Cycle | null,
  spentByDay: Map<string, number>
): DailyPoint[] {
  if (!cycle) return [];
  const start = parseISO(cycle.started_on);
  const today = new Date();
  const span = Math.min(45, Math.max(0, differenceInCalendarDays(today, start)));
  const points: DailyPoint[] = [];
  for (let i = 0; i <= span; i++) {
    const d = addDays(start, i);
    const key = format(d, "yyyy-MM-dd");
    points.push({ date: key, label: format(d, "d"), amount: spentByDay.get(key) ?? 0 });
  }
  return points;
}

export interface TransactionRisk {
  atRisk: boolean;
  hurtBy: number;
  reason: string;
}

export function transactionRisk(
  t: Transaction,
  summary: CycleSummary
): TransactionRisk {
  const safe: TransactionRisk = { atRisk: false, hurtBy: 0, reason: "" };
  if (t.type !== "expense") return safe;
  if (!summary.savingsAtRisk) return safe;

  const bucket = summary.perBucket.find((b) => b.category.id === t.category_id);
  if (bucket) {
    if (bucket.overBy > 0) {
      return {
        atRisk: true,
        hurtBy: bucket.overBy,
        reason: `${bucket.category.name} blew past its ₹${Math.round(
          bucket.estimate
        )} plan by ₹${Math.round(bucket.overBy)}`,
      };
    }
    return safe;
  }
  return { atRisk: true, hurtBy: summary.riskAmount, reason: "no plan, no mercy" };
}

// ---------------------------------------------------------------------------
// MONTH-BY-MONTH ANALYTICS (across all cycles)
// ---------------------------------------------------------------------------

export interface Slice {
  name: string;
  value: number;
}

export interface MonthAnalytics {
  month: string; // yyyy-MM
  totalExpense: number;
  totalIncome: number;
  expenseByTag: Slice[];
  incomeByTag: Slice[];
}

/** Distinct yyyy-MM keys that have any transaction, newest first. */
export function transactionMonths(transactions: Transaction[]): string[] {
  const set = new Set<string>();
  for (const t of transactions) set.add(t.date.slice(0, 7));
  return [...set].sort((a, b) => (a < b ? 1 : -1));
}

export function computeMonthAnalytics(
  month: string, // yyyy-MM
  transactions: Transaction[],
  categories: BudgetCategory[]
): MonthAnalytics {
  const catName = new Map(categories.map((c) => [c.id, c.name]));
  const inMonth = transactions.filter((t) => t.date.slice(0, 7) === month);

  const expenseByTag = new Map<string, number>();
  const incomeByTag = new Map<string, number>();
  let totalExpense = 0;
  let totalIncome = 0;

  for (const t of inMonth) {
    const amt = Number(t.amount);
    if (t.type === "expense") {
      totalExpense += amt;
      const label =
        (t.category_id && catName.get(t.category_id)) ||
        t.tag ||
        "Uncategorised";
      expenseByTag.set(label, (expenseByTag.get(label) ?? 0) + amt);
    } else if (t.type === "income") {
      totalIncome += amt;
      const label = t.tag || "Other income";
      incomeByTag.set(label, (incomeByTag.get(label) ?? 0) + amt);
    }
  }

  return {
    month,
    totalExpense,
    totalIncome,
    expenseByTag: toSlices(expenseByTag),
    incomeByTag: toSlices(incomeByTag),
  };
}

function toSlices(m: Map<string, number>): Slice[] {
  return [...m.entries()]
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);
}
