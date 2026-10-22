/**
 * Cashfree Webhook Handler
 * API version: 2023-08-01
 *
 * Receives server-to-server POST notifications from Cashfree,
 * verifies the HMAC-SHA256 signature, and updates order/payment state idempotently.
 */

import {
  verifyCashfreeWebhook,
  extractPaymentMethod,
  type CashfreeWebhookPayload,
} from "./cashfree";
import { getOrderByCfId, updateOrderStatus, upsertPayment } from "./orders";

export async function handleCashfreeWebhook(request: Request): Promise<Response> {
  const signature = request.headers.get("x-webhook-signature");
  const timestamp = request.headers.get("x-webhook-timestamp");

  if (!signature || !timestamp) {
    return new Response(JSON.stringify({ error: "Missing signature or timestamp headers" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  let rawBody: string;
  try {
    rawBody = await request.text();
  } catch {
    return new Response(JSON.stringify({ error: "Failed to read request body" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  let isValid = false;
  try {
    isValid = verifyCashfreeWebhook(rawBody, timestamp, signature);
  } catch (err) {
    console.error("[cashfree-webhook] Verification error:", err);
    return new Response(JSON.stringify({ error: "Webhook verification configuration error" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }

  if (!isValid) {
    console.warn("[cashfree-webhook] Invalid signature rejected");
    return new Response(JSON.stringify({ error: "Invalid webhook signature" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  let payload: CashfreeWebhookPayload;
  try {
    payload = JSON.parse(rawBody) as CashfreeWebhookPayload;
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON body" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const cfOrderId = payload.data?.order?.order_id;
  if (!cfOrderId) {
    return new Response(JSON.stringify({ error: "Missing order_id in webhook data" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  try {
    const order = await getOrderByCfId(cfOrderId);
    if (!order) {
      console.warn(`[cashfree-webhook] Order not found for cf_order_id: ${cfOrderId}`);
      // Return 200 so Cashfree doesn't keep hammering if order belongs to another system or test
      return new Response(JSON.stringify({ status: "ignored_unknown_order" }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    const paymentStatus = payload.data?.payment?.payment_status?.toUpperCase();
    const orderStatus = payload.data?.order?.order_status?.toUpperCase();
    const paymentMethod = extractPaymentMethod(payload.data?.payment?.payment_method ?? {});
    const cfPaymentId = String(payload.data?.payment?.cf_payment_id ?? "");
    const paymentAmount = payload.data?.payment?.payment_amount ?? order.amount;

    if (paymentStatus === "SUCCESS" || orderStatus === "PAID") {
      await updateOrderStatus(order.id, "paid");
      await upsertPayment({
        orderId: order.id,
        gatewayOrderId: cfOrderId,
        gatewayPaymentId: cfPaymentId,
        amount: paymentAmount,
        status: "paid",
        paymentMethod,
        rawWebhook: payload,
      });
    } else if (
      paymentStatus === "FAILED" ||
      paymentStatus === "CANCELLED" ||
      orderStatus === "EXPIRED"
    ) {
      // Idempotency: do not overwrite a previously paid order
      if (order.status !== "paid") {
        await updateOrderStatus(order.id, "failed");
        await upsertPayment({
          orderId: order.id,
          gatewayOrderId: cfOrderId,
          gatewayPaymentId: cfPaymentId,
          amount: paymentAmount,
          status: "failed",
          paymentMethod,
          rawWebhook: payload,
        });
      }
    }

    return new Response(JSON.stringify({ status: "success" }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("[cashfree-webhook] Error processing webhook:", err);
    return new Response(JSON.stringify({ error: "Internal processing error" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
