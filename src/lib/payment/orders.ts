/**
 * Order persistence helpers.
 *
 * Uses the Supabase service-role client for order/payment writes and
 * publicDb() for canonical published-product price lookups.
 * Server-only module: never import this from client components.
 */

import crypto from "node:crypto";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import type { Json } from "@/integrations/supabase/types";
import { publicDb } from "@/lib/catalog.server";

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
  amount: number;
  currency?: string;
  notes?: string;
  items: OrderItemInput[];
};

export async function createOrder(input: CreateOrderInput): Promise<string> {
  const { data: order, error } = await supabaseAdmin
    .from("orders")
    .insert({
      customer_name: input.customerName,
      customer_email: input.customerEmail,
      customer_phone: input.customerPhone,
      amount: input.amount,
      currency: input.currency ?? "INR",
      status: "pending",
      notes: input.notes ?? null,
    })
    .select("id")
    .single();

  if (error || !order) {
    console.error("[orders] Failed to create order in database:", error);
    if (error?.code === "PGRST205" || (error?.message ?? "").includes("schema cache")) {
      if (
        process.env["NODE_ENV"] === "production" ||
        process.env["CASHFREE_ENVIRONMENT"]?.toLowerCase() === "production"
      ) {
        throw new Error(
          "[orders] Database payment tables (public.orders) are missing in Supabase.",
        );
      }
      console.warn(
        "[orders] Warning: public.orders table not found in Supabase schema cache. Using fallback UUID for local sandbox testing.",
      );
      return crypto.randomUUID();
    }
    throw new Error(`[orders] Failed to create order: ${error?.message ?? "unknown"}`);
  }

  if (input.items.length > 0) {
    const { error: itemsError } = await supabaseAdmin.from("order_items").insert(
      input.items.map((it) => ({
        order_id: order.id,
        product_id: it.productId,
        product_name_snapshot: it.productNameSnapshot,
        unit_price: it.unitPrice,
        quantity: it.quantity,
        subtotal: Number((it.unitPrice * it.quantity).toFixed(2)),
      })),
    );
    if (itemsError) {
      console.error("[orders] Failed to insert order_items:", itemsError);
    }
  }

  return order.id;
}

export async function attachCfOrderId(orderId: string, cfOrderId: string): Promise<void> {
  const { error } = await supabaseAdmin
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
  const { error } = await supabaseAdmin.from("orders").update({ status }).eq("id", orderId);

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
  status: "pending" | "processing" | "paid" | "failed" | "cancelled";
  paymentMethod?: string;
  rawWebhook?: unknown;
}): Promise<void> {
  const { error } = await supabaseAdmin.from("payments").upsert(
    {
      order_id: data.orderId,
      gateway: "cashfree",
      gateway_order_id: data.gatewayOrderId,
      gateway_payment_id: data.gatewayPaymentId ?? null,
      amount: data.amount,
      currency: "INR",
      status: data.status,
      payment_method: data.paymentMethod ?? null,
      raw_webhook: (data.rawWebhook as Json) ?? null,
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
  const { data, error } = await supabaseAdmin
    .from("orders")
    .select("id, amount, status")
    .eq("cf_order_id", cfOrderId)
    .maybeSingle();

  if (error) {
    if (error.code === "PGRST205" || (error.message ?? "").includes("schema cache")) return null;
    throw new Error(`[orders] getOrderByCfId: ${error.message}`);
  }
  return data;
}

/**
 * Fetch the canonical product price from the database.
 * Uses publicDb() so the query matches the storefront's published-product RLS policy.
 */
export async function getProductPrice(
  productId: string,
): Promise<{ price: number | null; priceOnRequest: boolean; name: string }> {
  try {
    const db = publicDb();
    const { data, error } = await db
      .from("products")
      .select("id, name, price, price_on_request, status")
      .eq("id", productId)
      .eq("status", "published")
      .maybeSingle();

    if (!error && data) {
      return {
        price: data.price === null ? null : Number(data.price),
        priceOnRequest: Boolean(data.price_on_request),
        name: data.name,
      };
    }
  } catch (err) {
    console.warn(`[orders] Database error fetching product ${productId}, checking fallback:`, err);
  }

  const { mockProducts } = await import("@/data/mock");
  const mock = mockProducts.find((p) => p.id === productId);
  if (mock) {
    return {
      price: mock.price,
      priceOnRequest: mock.priceOnRequest,
      name: mock.name,
    };
  }

  throw new Error(`[orders] Product not found or unpublished: ${productId}`);
}
