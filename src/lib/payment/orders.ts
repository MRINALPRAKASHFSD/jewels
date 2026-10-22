/**
 * Order persistence layer — creates and updates orders/payments in Supabase.
 * Uses the Supabase service-role client so RLS is bypassed (server only).
 * The amount written to the DB always comes from the server (product table),
 * never from client-supplied values.
 */

import { createClient } from "@supabase/supabase-js";

function serviceDb() {
  const url = process.env["SUPABASE_URL"];
  const key = process.env["SUPABASE_SERVICE_ROLE_KEY"];
  if (!url || !key) {
    throw new Error(
      "[orders] Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY",
    );
  }
  return createClient(url, key, {
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
  const db = serviceDb();

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
    throw new Error(`[orders] Failed to create order: ${error?.message}`);
  }

  if (input.items.length > 0) {
    const { error: itemsError } = await db.from("order_items").insert(
      input.items.map((it) => ({
        order_id: order.id,
        product_id: it.productId,
        product_name_snapshot: it.productNameSnapshot,
        unit_price: it.unitPrice,
        quantity: it.quantity,
        subtotal: it.unitPrice * it.quantity,
      })),
    );
    if (itemsError) {
      throw new Error(
        `[orders] Failed to insert order items: ${itemsError.message}`,
      );
    }
  }

  return order.id;
}

export async function attachCfOrderId(
  orderId: string,
  cfOrderId: string,
): Promise<void> {
  const db = serviceDb();
  const { error } = await db
    .from("orders")
    .update({ cf_order_id: cfOrderId, status: "processing" })
    .eq("id", orderId);
  if (error) {
    throw new Error(
      `[orders] Failed to attach cf_order_id: ${error.message}`,
    );
  }
}

export async function updateOrderStatus(
  orderId: string,
  status: "paid" | "failed" | "cancelled",
): Promise<void> {
  const db = serviceDb();
  const { error } = await db
    .from("orders")
    .update({ status })
    .eq("id", orderId);
  if (error) {
    throw new Error(
      `[orders] Failed to update order status: ${error.message}`,
    );
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
  const db = serviceDb();
  const { error } = await db.from("payments").upsert(
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
    throw new Error(`[orders] Failed to upsert payment: ${error.message}`);
  }
}

export async function getOrderByCfId(
  cfOrderId: string,
): Promise<{ id: string; amount: number; status: string } | null> {
  const db = serviceDb();
  const { data, error } = await db
    .from("orders")
    .select("id, amount, status")
    .eq("cf_order_id", cfOrderId)
    .maybeSingle();
  if (error) throw new Error(`[orders] getOrderByCfId: ${error.message}`);
  return data;
}

/** Fetch the trusted price of a product directly from DB */
export async function getProductPrice(
  productId: string,
): Promise<{ price: number | null; priceOnRequest: boolean; name: string }> {
  const db = serviceDb();
  const { data, error } = await db
    .from("products")
    .select("price, price_on_request, name")
    .eq("id", productId)
    .eq("status", "published")
    .single();
  if (error || !data) {
    throw new Error(
      `[orders] Product not found or unpublished: ${productId}`,
    );
  }
  return {
    price: data.price,
    priceOnRequest: data.price_on_request,
    name: data.name,
  };
}
