export class APIError extends Error {
  constructor({ code = "UNKNOWN_ERROR", message = "Request failed", requestId = "", status = 0 }) {
    super(message);
    this.name = "APIError";
    Object.assign(this, { code, requestId, status });
  }
}

export function createAPIClient({
  baseURL = "",
  getToken,
  fetchImpl = fetch,
  randomUUID = () => crypto.randomUUID(),
  timeoutMs = 10_000,
}) {
  async function request(path, { method = "GET", body, headers = {}, signal } = {}) {
    const token = await getToken();
    if (!token) throw new APIError({ code: "AUTH_REQUIRED", message: "Authentication is required", status: 401 });

    const timeout = AbortSignal.timeout(timeoutMs);
    const combinedSignal = signal && AbortSignal.any ? AbortSignal.any([signal, timeout]) : timeout;
    let response;
    try {
      response = await fetchImpl(`${baseURL}${path}`, {
        method,
        signal: combinedSignal,
        headers: {
          Authorization: `Bearer ${token}`,
          ...(body === undefined ? {} : { "Content-Type": "application/json" }),
          ...headers,
        },
        ...(body === undefined ? {} : { body: JSON.stringify(body) }),
      });
    } catch (error) {
      if (error?.name === "AbortError" || error?.name === "TimeoutError") {
        throw new APIError({ code: "REQUEST_TIMEOUT", message: "Request timed out", status: 0 });
      }
      throw new APIError({ code: "NETWORK_ERROR", message: error?.message || "Network request failed", status: 0 });
    }

    if (response.status === 204) return { data: null, meta: {} };
    let envelope;
    try {
      envelope = await response.json();
    } catch {
      throw new APIError({ code: "INVALID_RESPONSE", message: "Server returned an invalid response", status: response.status });
    }
    if (!response.ok || envelope?.error) {
      throw new APIError({ ...envelope?.error, status: response.status });
    }
    return envelope;
  }

  function stockMovementQuery(filters = {}) {
    const params = new URLSearchParams();
    for (const key of ["q", "type", "productId", "dateFrom", "dateTo", "cursor", "limit"]) {
      const value = filters[key];
      if (value !== undefined && value !== null && value !== "") params.set(key, String(value));
    }
    const query = params.toString();
    return query ? `?${query}` : "";
  }

  function productQuery(filters = {}) {
    const params = new URLSearchParams();
    for (const key of ["q", "limit"]) {
      const value = filters[key];
      if (value !== undefined && value !== null && value !== "") params.set(key, String(value));
    }
    const query = params.toString();
    return query ? `?${query}` : "";
  }

  return {
    async listProducts({ q = "", limit = "", signal } = {}) {
      return (await request(`/api/v1/products${productQuery({ q, limit })}`, { signal })).data;
    },
    async createProduct(product, options = {}) {
      return (await request("/api/v1/products", { ...options, method: "POST", body: product })).data;
    },
    async updateProduct(id, product, options = {}) {
      return (await request(`/api/v1/products/${encodeURIComponent(id)}`, { ...options, method: "PUT", body: product })).data;
    },
    async deactivateProduct(id, options = {}) {
      return (await request(`/api/v1/products/${encodeURIComponent(id)}`, { ...options, method: "DELETE" })).data;
    },
    async listTransactions({ limit = 50, cursor = "", signal } = {}) {
      const params = new URLSearchParams({ limit: String(limit) });
      if (cursor) params.set("cursor", cursor);
      const envelope = await request(`/api/v1/transactions?${params}`, { signal });
      return { items: envelope.data, nextCursor: envelope.meta?.nextCursor || "" };
    },
    async getSettings(options = {}) {
      return (await request("/api/v1/settings", options)).data;
    },
    async updateSettings(settings, options = {}) {
      return (await request("/api/v1/settings", { ...options, method: "PUT", body: settings })).data;
    },
    async getDashboardSummary({ days = 7, signal } = {}) {
      return (await request(`/api/v1/dashboard/summary?days=${days}`, { signal })).data;
    },
    async listStockMovements(filters = {}, options = {}) {
      const envelope = await request(`/api/v1/stock/movements${stockMovementQuery(filters)}`, options);
      return { items: envelope.data, nextCursor: envelope.meta?.nextCursor || "" };
    },
    async createStockMovement(input, options = {}) {
      return (await request("/api/v1/stock/movements", { ...options, method: "POST", body: input })).data;
    },
    async checkout({ cart, payment, idempotencyKey = randomUUID(), signal }) {
      return (await request("/api/v1/checkouts", {
        method: "POST",
        signal,
        headers: { "Idempotency-Key": idempotencyKey },
        body: {
          items: cart.map((item) => ({ productId: item.productId, quantity: item.qty })),
          payment,
        },
      })).data;
    },
  };
}
