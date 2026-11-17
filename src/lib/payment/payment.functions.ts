/**
 * Payment TanStack Server Functions.
 * Order creation and payment verification run on the server.
 */

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import {
  createCashfreeOrder,
  getCashfreeOrderStatus,
  getCashfreePayments,
  extractPaymentMethod,
} from "./cashfree";
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
  returnOrigin: z.string().url(),
});

/**
 * Create an order in our database and in Cashfree, returning the paymentSessionId
 * for the browser SDK checkout. Price is read from the database on the server.
 */
export const initiateCheckout = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => initiateCheckoutSchema.parse(d))
  .handler(async ({ data }) => {
    const product = await getProductPrice(data.productId);

    if (product.priceOnRequest || product.price === null) {
      throw new Error("This product is priced on request. Please use the enquiry form.");
    }

    const amount = product.price;

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

    const cfOrder = await createCashfreeOrder({
      orderId: internalOrderId,
      amount,
      customerName: data.customerName,
      customerEmail: data.customerEmail,
      customerPhone: data.customerPhone,
      returnUrl: `${data.returnOrigin}/checkout/return?order_id=${internalOrderId}`,
      notes: { product_id: data.productId, product_name: product.name },
    });

    await attachCfOrderId(internalOrderId, cfOrder.cfOrderId);

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
 * Verify payment after the browser redirects back from Cashfree.
 */
export const verifyPaymentStatus = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => verifyOrderSchema.parse(d))
  .handler(async ({ data }) => {
    const cfOrderId = data.orderId;

    let cfStatus: Awaited<ReturnType<typeof getCashfreeOrderStatus>>;
    try {
      cfStatus = await getCashfreeOrderStatus(cfOrderId);
    } catch (err) {
      return { status: "error", message: (err as Error).message };
    }

    const orderStatus =
      cfStatus.orderStatus === "PAID"
        ? "paid"
        : cfStatus.orderStatus === "EXPIRED" || cfStatus.orderStatus === "TERMINATED"
          ? "failed"
          : "pending";

    if (cfStatus.orderStatus === "PAID") {
      let paymentMethod = "unknown";
      try {
        const payments = await getCashfreePayments(cfOrderId);
        const successfulPayment = payments.find((p) => p.payment_status === "SUCCESS");
        if (successfulPayment) {
          paymentMethod = extractPaymentMethod(successfulPayment.payment_method);
        }
      } catch {
        // Non-critical if payment method details cannot be fetched
      }

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
