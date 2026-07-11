const DAY_MS = 24 * 60 * 60 * 1000;

function startOfLocalDay(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function addDays(date, amount) {
  const next = new Date(date);
  next.setDate(next.getDate() + amount);
  return next;
}

function dateKey(value) {
  const date = startOfLocalDay(value);
  if (!date) return "";
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function isInWindow(transaction, start, end) {
  if (transaction?.status !== "completed") return false;
  const createdAt = new Date(transaction?.createdAt);
  const total = Number(transaction?.total);
  return (
    !Number.isNaN(createdAt.getTime()) &&
    Number.isFinite(total) &&
    total >= 0 &&
    createdAt >= start &&
    createdAt < end
  );
}

function sumRevenue(transactions) {
  return transactions.reduce((sum, transaction) => sum + Number(transaction.total), 0);
}

function comparison(current, previous) {
  if (!previous) return { direction: "neutral", percent: null };
  const percent = Math.round(((current - previous) / previous) * 1000) / 10;
  return {
    direction: percent > 0 ? "up" : percent < 0 ? "down" : "neutral",
    percent,
  };
}

function buildRevenueTrend(transactions, start, days) {
  const revenueByDate = new Map();
  for (const transaction of transactions) {
    const key = dateKey(transaction.createdAt);
    revenueByDate.set(key, (revenueByDate.get(key) || 0) + Number(transaction.total));
  }

  return Array.from({ length: days }, (_, index) => {
    const date = addDays(start, index);
    return {
      date,
      label: new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "short" }).format(date),
      revenue: revenueByDate.get(dateKey(date)) || 0,
    };
  });
}

function normalizePaymentMethod(value) {
  const method = String(value || "").trim().toLowerCase();
  if (method === "cash") return "Cash";
  if (method === "qris") return "QRIS";
  return "Other";
}

function buildPaymentMix(transactions) {
  const colors = {
    Cash: "var(--color-chart-cash)",
    QRIS: "var(--color-chart-qris)",
    Other: "var(--color-chart-other)",
  };
  const totals = new Map();
  for (const transaction of transactions) {
    const label = normalizePaymentMethod(transaction.paymentMethod);
    totals.set(label, (totals.get(label) || 0) + Number(transaction.total));
  }
  const totalRevenue = [...totals.values()].reduce((sum, value) => sum + value, 0);

  return ["Cash", "QRIS", "Other"]
    .filter((label) => totals.has(label))
    .map((label) => ({
      label,
      value: totals.get(label),
      percentage: totalRevenue ? Math.round((totals.get(label) / totalRevenue) * 1000) / 10 : 0,
      color: colors[label],
    }));
}

function buildTopProducts(transactions) {
  const products = new Map();
  for (const transaction of transactions) {
    for (const item of Array.isArray(transaction.items) ? transaction.items : []) {
      const quantity = Number(item?.qty);
      const price = Number(item?.price);
      if (!item?.productId || !Number.isFinite(quantity) || quantity <= 0) continue;
      const current = products.get(item.productId) || {
        productId: item.productId,
        label: String(item.name || "Unnamed product"),
        quantity: 0,
        revenue: 0,
      };
      current.quantity += quantity;
      current.revenue += Number.isFinite(price) ? price * quantity : 0;
      products.set(item.productId, current);
    }
  }

  return [...products.values()]
    .sort((a, b) => b.quantity - a.quantity || b.revenue - a.revenue || a.label.localeCompare(b.label))
    .slice(0, 5);
}

function buildLowStock(products) {
  return (Array.isArray(products) ? products : [])
    .filter((product) => product?.active && Number.isFinite(Number(product.stock)) && Number(product.stock) <= 10)
    .sort((a, b) => Number(a.stock) - Number(b.stock) || String(a.name).localeCompare(String(b.name)));
}

export function buildDashboardAnalytics({ transactions = [], products = [], days = 7, now = new Date() } = {}) {
  const periodDays = days === 30 ? 30 : 7;
  const today = startOfLocalDay(now) || startOfLocalDay(new Date());
  const currentStart = addDays(today, -(periodDays - 1));
  const currentEnd = addDays(today, 1);
  const previousStart = addDays(currentStart, -periodDays);
  const source = Array.isArray(transactions) ? transactions : [];
  const currentTransactions = source.filter((transaction) => isInWindow(transaction, currentStart, currentEnd));
  const previousTransactions = source.filter((transaction) => isInWindow(transaction, previousStart, currentStart));
  const revenue = sumRevenue(currentTransactions);
  const previousRevenue = sumRevenue(previousTransactions);
  const transactionCount = currentTransactions.length;
  const previousCount = previousTransactions.length;
  const averageTransactionValue = transactionCount ? revenue / transactionCount : 0;
  const previousAverage = previousCount ? previousRevenue / previousCount : 0;
  const lowStock = buildLowStock(products);

  return {
    revenue,
    transactionCount,
    averageTransactionValue,
    lowStockCount: lowStock.length,
    comparisons: {
      revenue: comparison(revenue, previousRevenue),
      transactions: comparison(transactionCount, previousCount),
      average: comparison(averageTransactionValue, previousAverage),
    },
    revenueTrend: buildRevenueTrend(currentTransactions, currentStart, periodDays),
    paymentMix: buildPaymentMix(currentTransactions),
    topProducts: buildTopProducts(currentTransactions),
    lowStock: lowStock.slice(0, 5),
  };
}

export const dashboardInternals = { DAY_MS, comparison, dateKey, normalizePaymentMethod };
