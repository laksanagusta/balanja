import test from "node:test";
import assert from "node:assert/strict";
import { APIError, createAPIClient } from "./api-client.js";

test("attaches a fresh Clerk token and parses the data envelope", async () => {
  let request;
  const api = createAPIClient({
    baseURL: "https://api.example.com",
    getToken: async () => "clerk-token",
    fetchImpl: async (url, options) => {
      request = { url, options };
      return new Response(JSON.stringify({ data: [{ id: "product-1" }] }), { status: 200 });
    },
  });

	const products = await api.listProducts();
	assert.deepEqual(products, { items: [{ id: "product-1" }], nextCursor: "", hasNextPage: false });
  assert.equal(request.url, "https://api.example.com/api/v1/products");
  assert.equal(request.options.headers.Authorization, "Bearer clerk-token");
});

test("listProducts sends product search filters", async () => {
  let requestURL;
  const api = createAPIClient({
    baseURL: "",
    getToken: async () => "token",
    fetchImpl: async (url) => {
      requestURL = url;
      return new Response(JSON.stringify({ data: [] }), { status: 200 });
    },
  });

  await api.listProducts({ q: "tea", limit: 6 });

  assert.equal(requestURL, "/api/v1/products?q=tea&limit=6");
});

test("listProducts preserves cursor metadata and serializes catalog filters", async () => {
  const requests = [];
  const api = createAPIClient({
    getToken: async () => "token",
    fetchImpl: async (url) => {
      requests.push(url);
      return new Response(JSON.stringify({ data: [{ id: "p1" }], meta: { nextCursor: "next", hasNextPage: true } }), { status: 200 });
    },
  });

  const page = await api.listProducts({ q: "tea", category: "Drinks", active: true, limit: 20, sort: "name", dir: "asc", cursor: "current" });

  assert.equal(requests[0], "/api/v1/products?q=tea&category=Drinks&active=true&limit=20&sort=name&dir=asc&cursor=current");
  assert.deepEqual(page, { items: [{ id: "p1" }], nextCursor: "next", hasNextPage: true });
});

test("listTransactions serializes server filters and sorting", async () => {
  let requestURL;
  const api = createAPIClient({
    getToken: async () => "token",
    fetchImpl: async (url) => {
      requestURL = url;
      return new Response(JSON.stringify({ data: [], meta: { nextCursor: "", hasNextPage: false } }), { status: 200 });
    },
  });

  await api.listTransactions({ q: "TRX", paymentMethod: "cash", dateFrom: "2026-07-01T00:00:00Z", dateTo: "2026-07-13T23:59:59Z", limit: 20, sort: "total", dir: "desc", cursor: "c1" });

  assert.equal(requestURL, "/api/v1/transactions?q=TRX&paymentMethod=cash&dateFrom=2026-07-01T00%3A00%3A00Z&dateTo=2026-07-13T23%3A59%3A59Z&limit=20&sort=total&dir=desc&cursor=c1");
});

test("listStockMovements preserves server pagination metadata", async () => {
  let requestURL;
  const api = createAPIClient({
    getToken: async () => "token",
    fetchImpl: async (url) => {
      requestURL = url;
      return new Response(JSON.stringify({ data: [], meta: { nextCursor: "n2", hasNextPage: true } }), { status: 200 });
    },
  });

  const page = await api.listStockMovements({ q: "tea", type: "restock", limit: 20, sort: "stockAfter", dir: "asc", cursor: "c1" });

  assert.equal(requestURL, "/api/v1/stock/movements?q=tea&type=restock&limit=20&sort=stockAfter&dir=asc&cursor=c1");
  assert.deepEqual(page, { items: [], nextCursor: "n2", hasNextPage: true });
});

test("throws a stable APIError from an error envelope", async () => {
  const api = createAPIClient({
    baseURL: "",
    getToken: async () => "token",
    fetchImpl: async () => new Response(JSON.stringify({ error: { code: "INSUFFICIENT_STOCK", message: "Stock changed", requestId: "req-1" } }), { status: 409 }),
  });

  await assert.rejects(api.listProducts(), (error) => {
    assert.ok(error instanceof APIError);
    assert.equal(error.code, "INSUFFICIENT_STOCK");
    assert.equal(error.status, 409);
    assert.equal(error.requestId, "req-1");
    return true;
  });
});

test("checkout sends only product identifiers and quantities with an idempotency key", async () => {
  let request;
  const api = createAPIClient({
    baseURL: "",
    getToken: async () => "token",
    randomUUID: () => "checkout-request-id",
    fetchImpl: async (_url, options) => {
      request = options;
      return new Response(JSON.stringify({ data: { transaction: { id: "transaction-1" }, products: [] } }), { status: 201 });
    },
  });

  await api.checkout({
    cart: [{ productId: "product-1", name: "Untrusted", price: 1, qty: 2 }],
    payment: { method: "cash", cashReceived: 10000 },
  });

  assert.equal(request.headers["Idempotency-Key"], "checkout-request-id");
  assert.deepEqual(JSON.parse(request.body), {
    items: [{ productId: "product-1", quantity: 2 }],
    payment: { method: "cash", cashReceived: 10000 },
  });
});

test("listStockMovements sends stock movement filters", async () => {
  let requestURL;
  const api = createAPIClient({
    baseURL: "",
    getToken: async () => "token",
    fetchImpl: async (url) => {
      requestURL = url;
      return new Response(JSON.stringify({ data: [], meta: { nextCursor: "next" } }), { status: 200 });
    },
  });

  const page = await api.listStockMovements({
    q: "tea",
    type: "restock",
    productId: "product-1",
    dateFrom: "2026-07-01T00:00:00Z",
    dateTo: "2026-07-13T23:59:59Z",
    cursor: "cursor-1",
    limit: 25,
  });

	assert.equal(requestURL, "/api/v1/stock/movements?q=tea&type=restock&productId=product-1&dateFrom=2026-07-01T00%3A00%3A00Z&dateTo=2026-07-13T23%3A59%3A59Z&limit=25&cursor=cursor-1");
	assert.deepEqual(page, { items: [], nextCursor: "next", hasNextPage: false });
});

test("createStockMovement posts manual movement payload", async () => {
  let request;
  const api = createAPIClient({
    baseURL: "",
    getToken: async () => "token",
    fetchImpl: async (url, options) => {
      request = { url, options };
      return new Response(JSON.stringify({ data: { movement: { id: "movement-1" }, product: { id: "product-1", stock: 14 } } }), { status: 201 });
    },
  });

  await api.createStockMovement({
    productId: "product-1",
    type: "restock",
    quantity: 4,
    reason: "Supplier delivery",
  });

  assert.equal(request.url, "/api/v1/stock/movements");
  assert.equal(request.options.method, "POST");
  assert.deepEqual(JSON.parse(request.options.body), {
    productId: "product-1",
    type: "restock",
    quantity: 4,
    reason: "Supplier delivery",
  });
});
