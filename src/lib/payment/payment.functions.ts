/**
 * Payment TanStack Server Functions
 * All business logic that touches money runs here, server-side only.
 */

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { createCashfreeOrder, getCashfreeOrderStatus, getCashfreePayments, extractPaymentMethod } from "./cashfree";
import {
  createOrder,
  attachCfOrderId,
  getProductPrice,
  getOrderByCfId,
  updateOrderStatus,
  upsertPayment,
} from "./orders";

const initiateCheckoutSchema = z.object({
  productId: z.string().uuid(),
  customerName: z.string().min(1).max(120),
  customerEmail: z.string().email(),
  customerPhone: z.string().regex(/^[0-9]{10,15}$/),
  returnOrigin: z.string().url(), // e.g. "https://yoursite.com"
});

/**
 * Step 1: Create an order in our DB and in Cashfree.
 * Returns the paymentSessionId for the JS SDK checkout.
 * Amount is ALWAYS read from the DB — never trusted from the client.
 */
export const initiateCheckout = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => initiateCheckoutSchema.parse(d))
  .handler(async ({ data }) => {
    // 1. Verify product exists and is published; fetch canonical price
    const product = await getProductPrice(data.productId);

    if (product.priceOnRequest || product.price === null) {
      throw new Error(
        "This product is priced on request. Please use the enquiry form.",
      );
    }

    const amount = product.price;

    // 2. Create our internal order record
    const internalOrderId = await createOrder({
      customerName: data.customerName,
      customerEmail: data.customerEmail,
      customerPhone: data.customerPhone,
      amount,
      items: [
        {
          productId: data.productId,
          productNameSnapshot: product.name,
          unitPrice: amount,
          quantity: 1,
        },
      ],
    });

    // 3. Create Cashfree order (amount from DB, not client)
    const cfOrder = await createCashfreeOrder({
      orderId: internalOrderId,
      amount,
      customerName: data.customerName,
      customerEmail: data.customerEmail,
      customerPhone: data.customerPhone,
      returnUrl: `${data.returnOrigin}/checkout/return?order_id=${internalOrderId}`,
      notes: { product_id: data.productId, product_name: product.name },
    });

    // 4. Attach Cashfree order ID to our record
    await attachCfOrderId(internalOrderId, cfOrder.cfOrderId);

    // 5. Return only what the browser needs — no secret key, no full order details
    return {
      orderId: internalOrderId,
      paymentSessionId: cfOrder.paymentSessionId,
      amount,
      productName: product.name,
    };
  });

const verifyOrderSchema = z.object({
  orderId: z.string().uuid(),
});

/**
 * Step 2: Verify payment after the browser redirect from Cashfree.
 * Fetches the canonical order status from Cashfree's server.
 */
export const verifyPaymentStatus = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => verifyOrderSchema.parse(d))
  .handler(async ({ data }) => {
    // We use our internal orderId as the Cashfree order_id
    const cfOrderId = data.orderId;

    let cfStatus: Awaited<ReturnType<typeof getCashfreeOrderStatus>>;
    try {
      cfStatus = await getCashfreeOrderStatus(cfOrderId);
    } catch (err) {
      // Cashfree may not have the order if creation failed
      return { status: "error", message: (err as Error).message };
    }

    const orderStatus =
      cfStatus.orderStatus === "PAID"
        ? "paid"
        : cfStatus.orderStatus === "EXPIRED" || cfStatus.orderStatus === "TERMINATED"
          ? "failed"
          : "pending";

    if (cfStatus.orderStatus === "PAID") {
      // Fetch payment details
      let paymentMethod = "unknown";
      try {
        const payments = await getCashfreePayments(cfOrderId);
        const successfulPayment = payments.find(
          (p) => p.payment_status === "SUCCESS",
        );
        if (successfulPayment) {
          paymentMethod = extractPaymentMethod(successfulPayment.payment_method);
        }
      } catch {
        // non-critical; continue
      }

      // Update our DB
      const order = await getOrderByCfId(cfOrderId);
      if (order) {
        await updateOrderStatus(order.id, "paid");
        await upsertPayment({
          orderId: order.id,
          gatewayOrderId: cfOrderId,
          amount: order.amount,
          status: "paid",
          paymentMethod,
        });
      }
    }

    return {
      status: orderStatus,
      cfOrderStatus: cfStatus.orderStatus,
      amount: cfStatus.orderAmount,
    };
  });
