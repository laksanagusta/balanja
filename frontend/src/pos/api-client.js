export class APIError extends Error {
  constructor({ code = "UNKNOWN_ERROR", message = "Request failed", requestId = "", status = 0 }) {
    super(message);
    this.name = "APIError";
    Object.assign(this, { code, requestId, status });
  }
}

function normalizePage(envelope) {
  return {
    items: Array.isArray(envelope?.data) ? envelope.data : [],
    nextCursor: envelope?.meta?.nextCursor || "",
    hasNextPage: envelope?.meta?.hasNextPage === true,
  };
}

function listQuery(filters, keys) {
  const params = new URLSearchParams();
  for (const key of keys) {
    const value = filters[key];
    if (value !== undefined && value !== null && value !== "") params.set(key, String(value));
  }
  const query = params.toString();
  return query ? `?${query}` : "";
}

export function createAPIClient({
  baseURL = "",
  getToken,
  fetchImpl = fetch,
  randomUUID = () => crypto.randomUUID(),
  timeoutMs = 10_000,
}) {
  async function fetchResponse(path, { method = "GET", body, headers = {}, signal } = {}) {
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

    return response;
  }

  async function responseError(response) {
    let envelope;
    try {
      envelope = await response.json();
    } catch {
      return new APIError({ code: "INVALID_RESPONSE", message: "Server returned an invalid response", status: response.status });
    }
    return new APIError({ ...envelope?.error, status: response.status });
  }

  async function request(path, options = {}) {
    const response = await fetchResponse(path, options);
    if (response.status === 204) return { data: null, meta: {} };
    if (!response.ok) throw await responseError(response);
    let envelope;
    try {
      envelope = await response.json();
    } catch {
      throw new APIError({ code: "INVALID_RESPONSE", message: "Server returned an invalid response", status: response.status });
    }
    if (envelope?.error) throw new APIError({ ...envelope.error, status: response.status });
    return envelope;
  }

  function attachmentFilename(response, filters, kind) {
    const disposition = response.headers.get("Content-Disposition") || "";
    const match = disposition.match(/filename\*?=(?:UTF-8''|)["']?([^"';]+)["']?/i);
    let candidate = "";
    try {
      candidate = match?.[1] ? decodeURIComponent(match[1]) : "";
    } catch {
      candidate = "";
    }
    const basename = candidate.split(/[\\/]/).pop()?.replace(/[^\w.()-]/g, "-") || "";
    if (basename.toLowerCase().endsWith(".csv")) return basename;
    const label = kind === "transactions" ? "transaksi" : "harian";
    return `laporan-penjualan-${label}-${filters.dateFrom || "awal"}_${filters.dateTo || "akhir"}.csv`;
  }

  return {
    async listProducts({ signal, ...filters } = {}) {
      const query = listQuery(filters, ["q", "category", "active", "limit", "sort", "dir", "cursor"]);
      return normalizePage(await request(`/api/v1/products${query}`, { signal }));
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
    async listTransactions({ signal, ...filters } = {}) {
      const query = listQuery(filters, ["q", "paymentMethod", "dateFrom", "dateTo", "limit", "sort", "dir", "cursor"]);
      return normalizePage(await request(`/api/v1/transactions${query}`, { signal }));
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
    async getSalesReport({ signal, ...filters } = {}) {
      const query = listQuery(filters, ["dateFrom", "dateTo", "paymentMethod", "cashierUserId"]);
      return (await request(`/api/v1/reports/sales${query}`, { signal })).data;
    },
    async downloadSalesReport(filters = {}, kind = "daily", { signal } = {}) {
      const query = listQuery({ ...filters, kind }, ["dateFrom", "dateTo", "paymentMethod", "cashierUserId", "kind"]);
      const response = await fetchResponse(`/api/v1/reports/sales/export${query}`, { signal });
      if (!response.ok) throw await responseError(response);
      return { blob: await response.blob(), filename: attachmentFilename(response, filters, kind) };
    },
    async listStockMovements(filters = {}, options = {}) {
      const { signal = options.signal, ...queryFilters } = filters;
      const query = listQuery(queryFilters, ["q", "type", "productId", "dateFrom", "dateTo", "limit", "sort", "dir", "cursor"]);
      return normalizePage(await request(`/api/v1/stock/movements${query}`, { ...options, signal }));
    },
    async createStockMovement(input, options = {}) {
      return (await request("/api/v1/stock/movements", { ...options, method: "POST", body: input })).data;
    },
    async checkout({ cart, payment, cashierName = "", idempotencyKey = randomUUID(), signal }) {
      return (await request("/api/v1/checkouts", {
        method: "POST",
        signal,
        headers: { "Idempotency-Key": idempotencyKey },
        body: {
          items: cart.map((item) => ({ productId: item.productId, quantity: item.qty })),
          payment,
          ...(cashierName ? { cashierName } : {}),
        },
      })).data;
    },
  };
}
