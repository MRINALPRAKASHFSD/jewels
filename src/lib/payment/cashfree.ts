/**
 * Cashfree Payment Gateway — Server-Side Abstraction
 * API version: 2023-08-01
 *
 * ⚠️ SERVER ONLY — never import this from client components.
 * The CASHFREE_SECRET_KEY is a server-only secret (no VITE_ prefix).
 */

import crypto from "node:crypto";

// ─── Config ──────────────────────────────────────────────────────────────────

function env(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`[cashfree] Missing required env var: ${name}`);
  return v;
}

function getConfig() {
  const mode = (process.env["CASHFREE_ENVIRONMENT"] ?? "sandbox").toLowerCase();
  const baseUrl =
    mode === "production" ? "https://api.cashfree.com/pg" : "https://sandbox.cashfree.com/pg";
  return {
    appId: env("CASHFREE_APP_ID"),
    secretKey: env("CASHFREE_SECRET_KEY"),
    baseUrl,
    mode,
    apiVersion: "2023-08-01",
  };
}

// ─── Types ───────────────────────────────────────────────────────────────────

export type CashfreeOrderInput = {
  orderId: string;
  amount: number; // INR, server-derived — never from client input
  currency?: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  returnUrl: string;
  expiresIn?: number; // seconds, default 1800
  notes?: Record<string, string>;
};

export type CashfreeOrderResponse = {
  cfOrderId: string;
  paymentSessionId: string;
  orderStatus: string;
  expiresAt: string;
};

export type CashfreeOrderStatus = {
  cfOrderId: string;
  orderStatus: "ACTIVE" | "PAID" | "EXPIRED" | "TERMINATED" | string;
  orderAmount: number;
  orderCurrency: string;
};

export type CashfreeWebhookPayload = {
  type: string;
  data: {
    order: {
      order_id: string;
      order_amount: number;
      order_currency: string;
      order_status: string;
      order_tags?: Record<string, string>;
    };
    payment: {
      cf_payment_id: string | number;
      payment_status: string;
      payment_amount: number;
      payment_currency: string;
      payment_message: string;
      payment_time: string;
      bank_reference: string | null;
      auth_id: string | null;
      payment_method: Record<string, unknown>;
      payment_group: string;
    };
    customer_details: {
      customer_name: string;
      customer_id: string;
      customer_email: string;
      customer_phone: string;
    };
  };
};

// ─── Internal fetch helper ───────────────────────────────────────────────────

async function cfFetch<T>(path: string, method: "GET" | "POST", body?: unknown): Promise<T> {
  const cfg = getConfig();
  const res = await fetch(`${cfg.baseUrl}${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      "x-api-version": cfg.apiVersion,
      "x-client-id": cfg.appId,
      "x-client-secret": cfg.secretKey,
    },
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "(no body)");
    throw new Error(`[cashfree] ${method} ${path} → HTTP ${res.status}: ${text}`);
  }
  return res.json() as Promise<T>;
}

// ─── Public API ──────────────────────────────────────────────────────────────

export async function createCashfreeOrder(
  input: CashfreeOrderInput,
): Promise<CashfreeOrderResponse> {
  const expiresAt = new Date(Date.now() + (input.expiresIn ?? 1800) * 1000)
    .toISOString()
    .replace(/\.\d{3}Z$/, "+05:30");

  const data = await cfFetch<{
    order_id: string;
    payment_session_id: string;
    order_status: string;
    order_expiry_time: string;
  }>("/orders", "POST", {
    order_id: input.orderId,
    order_amount: Number(input.amount.toFixed(2)),
    order_currency: input.currency ?? "INR",
    order_expiry_time: expiresAt,
    customer_details: {
      customer_id: `guest_${input.orderId}`,
      customer_name: input.customerName,
      customer_email: input.customerEmail,
      customer_phone: input.customerPhone,
    },
    order_meta: {
      return_url: input.returnUrl,
      ...(process.env["CASHFREE_WEBHOOK_URL"]
        ? { notify_url: process.env["CASHFREE_WEBHOOK_URL"] }
        : {}),
    },
    ...(input.notes ? { order_tags: input.notes } : {}),
  });

  return {
    cfOrderId: data.order_id,
    paymentSessionId: data.payment_session_id,
    orderStatus: data.order_status,
    expiresAt: data.order_expiry_time,
  };
}

export async function getCashfreeOrderStatus(cfOrderId: string): Promise<CashfreeOrderStatus> {
  const data = await cfFetch<{
    order_id: string;
    order_status: string;
    order_amount: number;
    order_currency: string;
  }>(`/orders/${encodeURIComponent(cfOrderId)}`, "GET");

  return {
    cfOrderId: data.order_id,
    orderStatus: data.order_status,
    orderAmount: data.order_amount,
    orderCurrency: data.order_currency,
  };
}

export async function getCashfreePayments(cfOrderId: string) {
  return cfFetch<
    Array<{
      cf_payment_id: string | number;
      payment_status: string;
      payment_amount: number;
      payment_group: string;
      payment_method: Record<string, unknown>;
      bank_reference: string | null;
    }>
  >(`/orders/${encodeURIComponent(cfOrderId)}/payments`, "GET");
}

/**
 * Verify webhook: Base64(HMAC-SHA256(timestamp + rawBody, secretKey))
 * rawBody must be the unparsed string — do not JSON.parse first.
 */
export function verifyCashfreeWebhook(
  rawBody: string,
  timestamp: string,
  signature: string,
): boolean {
  const cfg = getConfig();
  const expected = crypto
    .createHmac("sha256", cfg.secretKey)
    .update(timestamp + rawBody)
    .digest("base64");
  try {
    return crypto.timingSafeEqual(
      Buffer.from(expected, "base64"),
      Buffer.from(signature, "base64"),
    );
  } catch {
    return false;
  }
}

export function extractPaymentMethod(paymentMethod: Record<string, unknown>): string {
  if (!paymentMethod || typeof paymentMethod !== "object") return "unknown";
  const key = Object.keys(paymentMethod)[0] ?? "unknown";
  const map: Record<string, string> = {
    upi: "upi",
    card: "card",
    netbanking: "netbanking",
    app: "wallet",
    cardless_emi: "cardless_emi",
    paylater: "paylater",
    emi: "emi",
  };
  return map[key] ?? key;
}
