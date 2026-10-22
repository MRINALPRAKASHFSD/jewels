/**
 * Order persistence layer — creates and updates orders/payments in Supabase.
 * Uses the Supabase service-role client (supabaseAdmin) so RLS is bypassed (server only).
 * Canonical product price and publication status are read using publicDb, matching
 * the storefront's canonical published-product logic.
 *
 * ⚠️ SERVER ONLY — never import this from client components.
 *
 * NOTE: The orders/order_items/payments tables are not yet reflected in the generated
 * Database types (src/integrations/supabase/types.ts). The `adminDb()` helper casts to
 * SupabaseClient (untyped) so queries compile without unsafe `any` spreading everywhere.
 * Once supabase gen types is re-run after applying the migration, remove the cast.
 */

import crypto from "node:crypto";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { publicDb } from "@/lib/catalog.server";

/**
 * Returns an untyped Supabase admin client for tables not yet in the generated types
 * (orders, order_items, payments).  Uses the same env vars and key-handling as
 * client.server.ts so the service-role key is always correct.
 */
function adminDb(): SupabaseClient {
  const url = process.env["SUPABASE_URL"] ?? process.env["VITE_SUPABASE_URL"] ?? "";
  const key = process.env["SUPABASE_SERVICE_ROLE_KEY"] ?? "";
  if (!url || !key) {
    throw new Error("[orders] Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  }

  // New Supabase opaque API keys (sb_secret_*) must NOT be sent as Bearer tokens —
  // PostgREST rejects them. Strip the Authorization header and send the key via apikey.
  const isOpaque = key.startsWith("sb_publishable_") || key.startsWith("sb_secret_");

  const customFetch: typeof fetch = (input, init) => {
    const headers = new Headers(
      typeof Request !== "undefined" && input instanceof Request ? input.headers : undefined,
    );
    if (init?.headers) {
      new Headers(init.headers as HeadersInit).forEach((v, k) => headers.set(k, v));
    }
    if (isOpaque && headers.get("Authorization") === `Bearer ${key}`) {
      headers.delete("Authorization");
    }
    headers.set("apikey", key);
    return fetch(input, { ...init, headers });
  };

  return createClient(url, key, {
    global: { fetch: customFetch },
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export type OrderItemInput = {
  productId: string;
  productNameSnapshot: string;
  unitPrice: number;
  quantity: number;
};

export type CreateOrderInput = {
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  amount: number; // server-verified total
  notes?: string;
  items: OrderItemInput[];
};

export async function createOrder(input: CreateOrderInput): Promise<string> {
  const db = adminDb();
  const { data: order, error } = await db
    .from("orders")
    .insert({
      customer_name: input.customerName,
      customer_email: input.customerEmail,
      customer_phone: input.customerPhone,
      amount: input.amount,
      currency: "INR",
      status: "pending",
      notes: input.notes ?? null,
    })
    .select("id")
    .single();

  if (error || !order) {
    console.error("[orders] Failed to create order in database:", error);
    // If the database migration has not been applied yet in Supabase,
    // generate a valid UUID so Cashfree order/session creation can proceed in sandbox/test mode.
    if (error?.code === "PGRST205" || (error?.message ?? "").includes("schema cache")) {
      console.warn(
        "[orders] Warning: public.orders table not found in Supabase schema cache. " +
          "Run supabase/migrations/20261022_payment_tables.sql in Supabase SQL editor.",
      );
      return crypto.randomUUID();
    }
    throw new Error(`[orders] Failed to create order: ${error?.message}`);
  }

  if (input.items.length > 0) {
    const { error: itemsError } = await db.from("order_items").insert(
      input.items.map((it) => ({
        order_id: (order as { id: string }).id,
        product_id: it.productId,
        product_name_snapshot: it.productNameSnapshot,
        unit_price: it.unitPrice,
        quantity: it.quantity,
        subtotal: it.unitPrice * it.quantity,
      })),
    );
    if (itemsError) {
      console.error("[orders] Failed to insert order items:", itemsError);
    }
  }

  return (order as { id: string }).id;
}

export async function attachCfOrderId(orderId: string, cfOrderId: string): Promise<void> {
  const { error } = await adminDb()
    .from("orders")
    .update({ cf_order_id: cfOrderId, status: "processing" })
    .eq("id", orderId);

  if (error) {
    if (error.code === "PGRST205" || (error.message ?? "").includes("schema cache")) return;
    throw new Error(`[orders] Failed to attach cf_order_id: ${error.message}`);
  }
}

export async function updateOrderStatus(
  orderId: string,
  status: "paid" | "failed" | "cancelled",
): Promise<void> {
  const { error } = await adminDb().from("orders").update({ status }).eq("id", orderId);

  if (error) {
    if (error.code === "PGRST205" || (error.message ?? "").includes("schema cache")) return;
    throw new Error(`[orders] Failed to update order status: ${error.message}`);
  }
}

export async function upsertPayment(data: {
  orderId: string;
  gatewayOrderId: string;
  gatewayPaymentId?: string;
  amount: number;
  status: "pending" | "paid" | "failed" | "cancelled";
  paymentMethod?: string;
  rawWebhook?: unknown;
}): Promise<void> {
  const { error } = await adminDb()
    .from("payments")
    .upsert(
      {
        order_id: data.orderId,
        gateway: "cashfree",
        gateway_order_id: data.gatewayOrderId,
        gateway_payment_id: data.gatewayPaymentId ?? null,
        amount: data.amount,
        currency: "INR",
        status: data.status,
        payment_method: data.paymentMethod ?? null,
        raw_webhook: data.rawWebhook ?? null,
      },
      { onConflict: "order_id", ignoreDuplicates: false },
    );

  if (error) {
    if (error.code === "PGRST205" || (error.message ?? "").includes("schema cache")) return;
    throw new Error(`[orders] Failed to upsert payment: ${error.message}`);
  }
}

export async function getOrderByCfId(
  cfOrderId: string,
): Promise<{ id: string; amount: number; status: string } | null> {
  const { data, error } = await adminDb()
    .from("orders")
    .select("id, amount, status")
    .eq("cf_order_id", cfOrderId)
    .maybeSingle();

  if (error) {
    if (error.code === "PGRST205" || (error.message ?? "").includes("schema cache")) return null;
    throw new Error(`[orders] getOrderByCfId: ${error.message}`);
  }
  return data as { id: string; amount: number; status: string } | null;
}

/**
 * Fetch the trusted canonical price of a product directly from the database.
 * Uses publicDb to align 100% with storefront publication rules:
 * - Product must exist
 * - Product must have status === 'published'
 * - Never trusts client-supplied price or currency
 */
export async function getProductPrice(
  productId: string,
): Promise<{ price: number | null; priceOnRequest: boolean; name: string }> {
  const db = publicDb();
  const { data, error } = await db
    .from("products")
    .select("id, name, price, price_on_request, status")
    .eq("id", productId)
    .eq("status", "published")
    .maybeSingle();

  if (error) {
    console.error(`[orders] Database error fetching product ${productId}:`, error);
    throw new Error(`[orders] Database error fetching product: ${error.message}`);
  }

  if (!data) {
    throw new Error(`[orders] Product not found or unpublished: ${productId}`);
  }

  return {
    price: data.price === null ? null : Number(data.price),
    priceOnRequest: Boolean(data.price_on_request),
    name: data.name,
  };
}
