import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

interface CartItem {
  productId: string;
  name: string;
  barcode: string;
  price: number;
  qty: number;
}

interface Payment {
  method: "cash" | "qris";
  cashReceived?: number;
}

interface CheckoutRequest {
  cart: CartItem[];
  payment: Payment;
  cashierName: string;
}

function validateInput(body: CheckoutRequest): string | null {
  if (!body || typeof body !== "object") return "Invalid request body";
  if (!Array.isArray(body.cart) || body.cart.length === 0) return "Cart is empty";
  if (!body.payment || !body.payment.method) return "Payment method is required";
  if (body.payment.method !== "cash" && body.payment.method !== "qris") {
    return "Payment method must be cash or qris";
  }
  if (!body.cashierName || !String(body.cashierName).trim()) return "Cashier name is required";

  for (const item of body.cart) {
    if (!item.productId) return "Cart item missing productId";
    if (!item.name) return "Cart item missing name";
    if (!item.barcode) return "Cart item missing barcode";
    if (Number(item.price) < 1 || Number.isNaN(Number(item.price))) return `${item.name}: price must be at least 1`;
    if (Number(item.qty) < 1 || Number.isNaN(Number(item.qty))) return `${item.name}: quantity must be at least 1`;
  }

  return null;
}

Deno.serve(async (req: Request) => {
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ ok: false, error: "Method not allowed" }), {
      status: 405,
      headers: { "Content-Type": "application/json" },
    });
  }

  const authHeader = req.headers.get("Authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return new Response(JSON.stringify({ ok: false, error: "Missing auth token" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  const token = authHeader.replace("Bearer ", "");

  let orgId: string | null = null;
  try {
    const payload = JSON.parse(atob(token.split(".")[1]));
    orgId = payload.org_id || payload["org_id"] || null;
  } catch {
    return new Response(JSON.stringify({ ok: false, error: "Invalid auth token" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  if (!orgId) {
    return new Response(JSON.stringify({ ok: false, error: "No org_id in token" }), {
      status: 403,
      headers: { "Content-Type": "application/json" },
    });
  }

  let body: CheckoutRequest;
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ ok: false, error: "Invalid JSON body" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const validationError = validateInput(body);
  if (validationError) {
    return new Response(JSON.stringify({ ok: false, error: validationError }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const cashReceived = body.payment.method === "cash" ? Number(body.payment.cashReceived ?? 0) : 0;

  const { data: result, error: rpcError } = await supabase.rpc("checkout", {
    p_org_id: orgId,
    p_cart: body.cart,
    p_payment_method: body.payment.method,
    p_cash_received: cashReceived,
    p_cashier_name: body.cashierName,
  });

  if (rpcError) {
    return new Response(JSON.stringify({ ok: false, error: rpcError.message || "Checkout failed" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }

  return new Response(JSON.stringify(result), {
    headers: { "Content-Type": "application/json" },
  });
});
