import test from "node:test";
import assert from "node:assert/strict";
import { buildDashboardAnalytics } from "./analytics.js";

const now = new Date("2026-07-10T12:00:00+07:00");

function transaction(overrides = {}) {
  return {
    id: "txn-1",
    createdAt: "2026-07-10T02:00:00.000Z",
    status: "completed",
    total: 100000,
    paymentMethod: "cash",
    items: [{ productId: "rice", name: "Rice", qty: 2, price: 50000 }],
    ...overrides,
  };
}

test("aggregates only completed transactions in the rolling window", () => {
  const transactions = [
    transaction(),
    transaction({
      id: "txn-2",
      createdAt: "2026-07-09T02:00:00.000Z",
      total: 50000,
      paymentMethod: "qris",
      items: [{ productId: "soap", name: "Soap", qty: 5, price: 10000 }],
    }),
    transaction({ id: "txn-3", status: "voided", total: 999999 }),
    transaction({ id: "txn-4", createdAt: "2026-06-01T02:00:00.000Z", total: 999999 }),
  ];

  const result = buildDashboardAnalytics({ transactions, products: [], days: 7, now });

  assert.equal(result.revenue, 150000);
  assert.equal(result.transactionCount, 2);
  assert.equal(result.averageTransactionValue, 75000);
  assert.deepEqual(
    result.paymentMix.map(({ label, value }) => [label, value]),
    [["Cash", 100000], ["QRIS", 50000]],
  );
  assert.deepEqual(
    result.topProducts.map(({ productId, quantity }) => [productId, quantity]),
    [["soap", 5], ["rice", 2]],
  );
});

test("fills missing trend dates and sorts active low stock", () => {
  const products = [
    { id: "a", name: "A", active: true, stock: 10, category: "Sembako", unit: "pcs" },
    { id: "b", name: "B", active: true, stock: 2, category: "Minuman", unit: "botol" },
    { id: "c", name: "C", active: false, stock: 0, category: "Snack", unit: "pcs" },
  ];

  const result = buildDashboardAnalytics({ transactions: [], products, days: 7, now });

  assert.equal(result.revenueTrend.length, 7);
  assert.ok(result.revenueTrend.every((day) => day.revenue === 0));
  assert.deepEqual(result.lowStock.map((product) => product.id), ["b", "a"]);
  assert.equal(result.lowStockCount, 2);
});

test("compares the selected period against the immediately previous period", () => {
  const transactions = [
    transaction({ createdAt: "2026-07-10T02:00:00.000Z", total: 150000 }),
    transaction({ id: "previous", createdAt: "2026-07-03T02:00:00.000Z", total: 100000 }),
  ];

  const result = buildDashboardAnalytics({ transactions, products: [], days: 7, now });

  assert.deepEqual(result.comparisons.revenue, { direction: "up", percent: 50 });
  assert.deepEqual(result.comparisons.transactions, { direction: "neutral", percent: 0 });
});

test("groups unknown methods under Other and ignores invalid records", () => {
  const transactions = [
    transaction({ paymentMethod: "card", total: "25000" }),
    transaction({ id: "broken-date", createdAt: "not-a-date" }),
    transaction({ id: "broken-total", total: "invalid" }),
  ];

  const result = buildDashboardAnalytics({ transactions, products: [], days: 7, now });

  assert.equal(result.revenue, 25000);
  assert.deepEqual(result.paymentMix.map(({ label, value }) => [label, value]), [["Other", 25000]]);
});

test("counts every low-stock product while limiting the action list to five", () => {
  const products = Array.from({ length: 7 }, (_, index) => ({
    id: `product-${index}`,
    name: `Product ${index}`,
    active: true,
    stock: index + 1,
    category: "Sembako",
    unit: "pcs",
  }));

  const result = buildDashboardAnalytics({ transactions: [], products, days: 7, now });

  assert.equal(result.lowStockCount, 7);
  assert.equal(result.lowStock.length, 5);
});
