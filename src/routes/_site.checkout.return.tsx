/**
 * /checkout/return — Post-payment return page.
 * Cashfree redirects here with ?order_id=<id>
 */

import { createFileRoute, Link } from "@tanstack/react-router";
import { z } from "zod";
import { useEffect, useState } from "react";
import { Container, LuxButton, Reveal } from "@/components/site/primitives";
import { verifyPaymentStatus } from "@/lib/payment/payment.functions";
import { CheckCircle2, XCircle, Loader2 } from "lucide-react";

const searchSchema = z.object({
  order_id: z.string().optional(),
});

export const Route = createFileRoute("/_site/checkout/return")({
  validateSearch: searchSchema,
  head: () => ({
    meta: [
      { title: "Order Confirmation — Élan Jewellery" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: CheckoutReturnPage,
});

type VerifyState =
  | { phase: "loading" }
  | { phase: "paid"; amount: number }
  | { phase: "pending" }
  | { phase: "failed" }
  | { phase: "no-order" };

function CheckoutReturnPage() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { order_id } = Route.useSearch() as any;
  const [state, setState] = useState<VerifyState>({ phase: "loading" });

  useEffect(() => {
    if (!order_id) {
      setState({ phase: "no-order" });
      return;
    }

    verifyPaymentStatus({ data: { orderId: order_id as string } })
      .then((result) => {
        if (result.status === "paid") {
          setState({ phase: "paid", amount: result.amount });
        } else if (result.status === "pending") {
          setState({ phase: "pending" });
        } else {
          setState({ phase: "failed" });
        }
      })
      .catch(() => setState({ phase: "failed" }));
  }, [order_id]);

  return (
    <main className="min-h-screen bg-background pt-24 md:pt-32">
      <Container className="max-w-2xl py-24">
        {state.phase === "loading" && (
          <div className="flex flex-col items-center gap-6 py-20">
            <Loader2 className="h-10 w-10 animate-spin text-muted-foreground" />
            <p className="text-muted-foreground">Verifying your payment…</p>
          </div>
        )}

        {state.phase === "paid" && (
          <Reveal className="text-center">
            <CheckCircle2 className="mx-auto h-14 w-14 text-green-600 mb-6" strokeWidth={1.25} />
            <h1 className="font-display text-5xl sm:text-6xl">Thank you.</h1>
            <p className="mt-6 text-muted-foreground max-w-md mx-auto leading-relaxed">
              Your payment of{" "}
              <span className="font-medium text-foreground">
                ₹{state.amount.toLocaleString("en-IN")}
              </span>{" "}
              has been received. We'll send a confirmation to your email and reach out within 24
              hours to arrange delivery.
            </p>
            <p className="mt-3 text-sm text-muted-foreground">
              Order reference: <span className="font-mono">{order_id}</span>
            </p>
            <div className="mt-12 flex flex-col sm:flex-row gap-4 justify-center">
              <Link to="/jewellery">
                <LuxButton variant="secondary">Continue browsing</LuxButton>
              </Link>
              <Link to="/">
                <LuxButton variant="tertiary">Return home</LuxButton>
              </Link>
            </div>
          </Reveal>
        )}

        {state.phase === "pending" && (
          <Reveal className="text-center">
            <Loader2 className="mx-auto h-14 w-14 text-warning mb-6" strokeWidth={1.25} />
            <h1 className="font-display text-4xl">Payment pending</h1>
            <p className="mt-6 text-muted-foreground max-w-md mx-auto leading-relaxed">
              Your payment is still being processed. If you've completed the UPI or net banking
              flow, please wait a moment — we'll confirm by email.
            </p>
            <p className="mt-3 text-sm text-muted-foreground">
              Order reference: <span className="font-mono">{order_id}</span>
            </p>
            <div className="mt-10">
              <Link to="/">
                <LuxButton variant="secondary">Return home</LuxButton>
              </Link>
            </div>
          </Reveal>
        )}

        {(state.phase === "failed" || state.phase === "no-order") && (
          <Reveal className="text-center">
            <XCircle className="mx-auto h-14 w-14 text-destructive mb-6" strokeWidth={1.25} />
            <h1 className="font-display text-4xl">Payment was not completed</h1>
            <p className="mt-6 text-muted-foreground max-w-md mx-auto leading-relaxed">
              {state.phase === "no-order"
                ? "We couldn't find your order details. Please try again."
                : "Your payment was cancelled or failed. No charge has been made to your account."}
            </p>
            <div className="mt-10 flex flex-col sm:flex-row gap-4 justify-center">
              <Link to="/jewellery">
                <LuxButton variant="primary">Browse jewellery</LuxButton>
              </Link>
              <Link to="/contact">
                <LuxButton variant="secondary">Contact us</LuxButton>
              </Link>
            </div>
          </Reveal>
        )}
      </Container>
    </main>
  );
}
