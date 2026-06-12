// All the sarcastic voice lives here so it's trivial to re-tune later.
// Keep headings funny, keep the small subtitles actually informative.

export const copy = {
  hero: {
    title: "💸 What's Left",
    sub: "before you do something stupid",
    okBadge: "lol still okay",
    riskBadge: "you're cooked",
    negativeSub: "you are literally in the negative. impressive.",
  },
  free: {
    label: "Yours to waste",
    hint: "after plans & savings are set aside",
    none: "nothing. sit down.",
  },
  savings: {
    label: "Future You's Money",
    targetLabel: "the floor you swore not to touch",
    onTrack: "Future You says thanks",
    atRiskPrefix: "below the floor by",
  },
  tabs: {
    receipts: "The Receipts",
    plans: "Damage Control",
    charts: "The Breakdown",
  },
  receipts: {
    empty: "No receipts yet. Suspiciously clean.",
    emptyHint: "Hit the + and confess your spending. Takes 5 seconds.",
    hurtsBadge: "this hurt",
  },
  plans: {
    title: "Damage Control",
    hint: "what you PLANNED to spend vs what actually left your account",
    overSuffix: "over. classic.",
    leftSuffix: "left in the tank",
    noChunks: "Nothing spent here yet. Tap + and log against this bucket.",
    empty: "No plans yet. Living dangerously, I see.",
    emptyHint: "Add buckets like Food, Rickshaw, Medical so the app can judge you properly.",
  },
  charts: {
    donut: "Where it all went",
    daily: "Daily damage",
    donutEmpty: "Nothing logged. The donut is sad and empty.",
    dailyEmpty: "No expenses this month. Suspicious, but okay.",
  },
  setup: {
    title: "Money setup",
    sub: "Be honest. The app already knows.",
    balanceLabel: "Bank balance after salary",
    balanceHint: "your REAL number, post-credit. no rounding up to feel rich.",
    targetLabel: "Don't-touch savings",
    targetHint: "the floor. spend less than your plans and this grows.",
    saveBalance: "Save the damage",
    bucketsLabel: "Plan buckets",
    addBucket: "Add a bucket",
    bucketNamePlaceholder: "Name (e.g. Food)",
    bucketAmountPlaceholder: "₹ guess",
  },
  quickAdd: {
    title: "Confess a transaction",
    types: {
      expense: "Spent",
      income: "Got money",
      lent: "Lent",
      borrowed_repayment: "Got it back",
    },
    notePlaceholder: "Note (what was it this time?)",
    // Button text changes with type — income/repayment ADD money, others deduct.
    saveByType: {
      expense: "Done, deduct it",
      income: "Add it in",
      lent: "Out it goes",
      borrowed_repayment: "Add it back",
    },
    needAmount: "Put a number first.",
    bucketLabel: "Which bucket?",
    noBuckets: "No buckets yet — add some in Damage Control.",
  },
  empty: {
    title: "No money setup for this month",
    hint: "Drop your bank balance + a saving floor and the app will start keeping score.",
    seed: "Quick start (sample setup)",
    manual: "Set it up myself",
  },
} as const;
