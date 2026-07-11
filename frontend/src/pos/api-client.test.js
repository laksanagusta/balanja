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
  assert.deepEqual(products, [{ id: "product-1" }]);
  assert.equal(request.url, "https://api.example.com/api/v1/products");
  assert.equal(request.options.headers.Authorization, "Bearer clerk-token");
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
