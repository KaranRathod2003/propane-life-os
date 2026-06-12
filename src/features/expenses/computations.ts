import { format } from "date-fns";
import { daysInMonth, elapsedDaysInMonth, totalDaysInMonth } from "@/lib/date";
import type { BudgetCategory, MonthlyBudget, Transaction } from "@/types";

export interface BucketSpend {
  category: BudgetCategory;
  /** Actual expense logged against this bucket. */
  spent: number;
  /** Estimated/planned amount for the month (planned_amount). */
  estimate: number;
  /** estimate − spent (negative when overspent). */
  remaining: number;
  /** max(0, spent − estimate). */
  overBy: number;
}

export interface DailyPoint {
  date: string;
  label: string;
  amount: number;
}

export interface ExpenseSummary {
  /** Real bank balance after salary credit. */
  openingBalance: number;
  /** Extra money in this month (repayments, bonus) logged as income. */
  incomeAdded: number;
  /** expense + lent + borrowed_repayment. */
  totalOutflow: number;
  /** expense-type transactions only. */
  totalExpense: number;
  /** The hero number — mirrors the actual bank balance. */
  currentBalance: number;
  savingTarget: number;
  /** Money still expected to leave for unfinished plan buckets. */
  plannedRemaining: number;
  /** currentBalance − plannedRemaining (what's left once plans are done). */
  projectedSavings: number;
  /** projectedSavings − savingTarget. Negative ⇒ savings floor at risk. */
  freeToSpend: number;
  savingsAtRisk: boolean;
  riskAmount: number;
  perBucket: BucketSpend[];
  dailySpend: DailyPoint[];
  elapsedDays: number;
  totalDays: number;
}

// Money OUT of the account vs money IN.
const OUTFLOW_TYPES: Transaction["type"][] = ["expense", "lent"];
const INFLOW_TYPES: Transaction["type"][] = ["income", "borrowed_repayment"];

export function computeSummary(
  month: string,
  budget: MonthlyBudget | null,
  categories: BudgetCategory[],
  transactions: Transaction[]
): ExpenseSummary {
  const openingBalance = budget?.opening_balance ?? 0;
  const savingTarget = budget?.saving_target ?? 0;

  let incomeAdded = 0;
  let totalOutflow = 0;
  let totalExpense = 0;

  const spentByCat = new Map<string, number>();
  const spentByDay = new Map<string, number>();

  for (const t of transactions) {
    const amt = Number(t.amount);
    if (INFLOW_TYPES.includes(t.type)) {
      incomeAdded += amt;
      continue;
    }
    if (!OUTFLOW_TYPES.includes(t.type)) continue;

    totalOutflow += amt;
    if (t.type === "expense") {
      totalExpense += amt;
      spentByDay.set(t.date, (spentByDay.get(t.date) ?? 0) + amt);
      if (t.category_id) {
        spentByCat.set(
          t.category_id,
          (spentByCat.get(t.category_id) ?? 0) + amt
        );
      }
    }
  }

  const currentBalance = openingBalance + incomeAdded - totalOutflow;

  const perBucket: BucketSpend[] = categories.map((c) => {
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

  // Money you still expect to spend to finish your plans.
  const plannedRemaining = perBucket.reduce(
    (sum, b) => sum + Math.max(0, b.remaining),
    0
  );

  const projectedSavings = currentBalance - plannedRemaining;
  const freeToSpend = projectedSavings - savingTarget;
  const riskAmount = Math.max(0, -freeToSpend);
  const savingsAtRisk = riskAmount > 0;

  const dailySpend: DailyPoint[] = daysInMonth(month).map((d) => {
    const key = format(d, "yyyy-MM-dd");
    return { date: key, label: format(d, "d"), amount: spentByDay.get(key) ?? 0 };
  });

  return {
    openingBalance,
    incomeAdded,
    totalOutflow,
    totalExpense,
    currentBalance,
    savingTarget,
    plannedRemaining,
    projectedSavings,
    freeToSpend,
    savingsAtRisk,
    riskAmount,
    perBucket,
    dailySpend,
    elapsedDays: Math.max(1, elapsedDaysInMonth(month)),
    totalDays: totalDaysInMonth(month),
  };
}

export interface TransactionRisk {
  atRisk: boolean;
  hurtBy: number;
  reason: string;
}

/**
 * Pure-logic red flag for a single transaction. Only fires when the savings
 * floor is actually at risk AND this spend sits in an over-budget (or
 * plan-less) bucket. Highlights, never preaches.
 */
export function transactionRisk(
  t: Transaction,
  summary: ExpenseSummary
): TransactionRisk {
  const safe: TransactionRisk = { atRisk: false, hurtBy: 0, reason: "" };
  // Only real spending gets the red treatment — not income, lending or repayments.
  if (t.type !== "expense") return safe;
  if (!summary.savingsAtRisk) return safe;

  const bucket = summary.perBucket.find(
    (b) => b.category.id === t.category_id
  );

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

  // No bucket attached while the floor is already cracking.
  return { atRisk: true, hurtBy: summary.riskAmount, reason: "no plan, no mercy" };
}
