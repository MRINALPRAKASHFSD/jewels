/**
 * /checkout — Checkout page.
 * Query param: ?productId=<uuid>
 * Flow:
 *   1. Customer fills in name, email, phone
 *   2. POST initiateCheckout → get paymentSessionId
 *   3. Load Cashfree JS SDK → cashfree.checkout({ paymentSessionId, redirectTarget: "_self" })
 *   4. Cashfree redirects to /checkout/return?order_id=<id>
 */

import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { z } from "zod";
import { useState, useEffect, useRef } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Container, LuxButton, Reveal } from "@/components/site/primitives";
import { productQuery } from "@/lib/catalog.queries";
import { useSuspenseQuery } from "@tanstack/react-query";
import { initiateCheckout } from "@/lib/payment/payment.functions";
import { formatProductPrice } from "@/data/catalog";
import { ArrowLeft, Lock, ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";

const searchSchema = z.object({
  productId: z.string().uuid().optional(),
  slug: z.string().optional(),
});

export const Route = createFileRoute("/_site/checkout")({
  validateSearch: searchSchema,
  head: () => ({
    meta: [{ title: "Secure Checkout — Élan Jewellery" }, { name: "robots", content: "noindex" }],
  }),
  component: CheckoutPage,
});

const formSchema = z.object({
  name: z.string().min(1, "Name is required").max(120),
  email: z.string().email("Please enter a valid email"),
  phone: z.string().regex(/^[6-9][0-9]{9}$/, "Please enter a valid 10-digit Indian mobile number"),
});
type FormData = z.infer<typeof formSchema>;

// ─── Load Cashfree JS SDK lazily ─────────────────────────────────────────────
type CashfreeSDK = {
  checkout: (opts: {
    paymentSessionId: string;
    redirectTarget?: "_self" | "_blank" | "_modal";
  }) => Promise<{ error?: { message: string }; redirect?: boolean }>;
};

async function loadCashfreeSDK(): Promise<CashfreeSDK> {
  const mode =
    import.meta.env["VITE_CASHFREE_ENVIRONMENT"] === "production" ? "production" : "sandbox";

  // Dynamically import the Cashfree JS SDK (client side only)
  const { load } = await import("@cashfreepayments/cashfree-js");
  return load({ mode }) as Promise<CashfreeSDK>;
}

function CheckoutPage() {
  const { productId, slug } = Route.useSearch();
  const navigate = useNavigate();

  const [step, setStep] = useState<"form" | "loading" | "redirect">("form");
  const [error, setError] = useState<string | null>(null);
  const sdkRef = useRef<CashfreeSDK | null>(null);

  // Preload the SDK on mount
  useEffect(() => {
    loadCashfreeSDK()
      .then((sdk) => {
        sdkRef.current = sdk;
      })
      .catch(() => {
        /* non-critical at this stage */
      });
  }, []);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({ resolver: zodResolver(formSchema) });

  if (!productId || !slug) {
    return (
      <Container className="py-40 text-center">
        <p className="font-display text-4xl">No product selected.</p>
        <Link to="/jewellery" className="mt-8 inline-block underline text-muted-foreground">
          Browse jewellery →
        </Link>
      </Container>
    );
  }

  const onSubmit = async (values: FormData) => {
    setError(null);
    setStep("loading");

    try {
      // Load SDK if not yet ready
      if (!sdkRef.current) {
        sdkRef.current = await loadCashfreeSDK();
      }

      const result = await initiateCheckout({
        data: {
          productId,
          customerName: values.name,
          customerEmail: values.email,
          customerPhone: values.phone,
          returnOrigin: window.location.origin,
        },
      });

      setStep("redirect");

      // Open Cashfree secure checkout
      const checkoutResult = await sdkRef.current.checkout({
        paymentSessionId: result.paymentSessionId,
        redirectTarget: "_self",
      });

      if (checkoutResult?.error) {
        setError(checkoutResult.error.message);
        setStep("form");
      }
    } catch (err) {
      setError((err as Error).message ?? "An unexpected error occurred. Please try again.");
      setStep("form");
    }
  };

  return (
    <main className="min-h-screen bg-background pt-24 md:pt-32">
      <Container className="max-w-5xl py-16">
        <Link
          to="/jewellery/$slug"
          params={{ slug: slug }}
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-12"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to product
        </Link>

        <div className="grid grid-cols-1 gap-16 lg:grid-cols-[1fr_400px]">
          {/* ── Left: Form ─────────────────────────────── */}
          <Reveal>
            <h1 className="font-display text-4xl sm:text-5xl mb-10">Complete your order</h1>

            <CheckoutProductCard productId={productId} slug={slug} />

            <form onSubmit={handleSubmit(onSubmit)} className="mt-12 space-y-7" noValidate>
              <div className="space-y-1.5">
                <label htmlFor="checkout-name" className="eyebrow text-muted-foreground block">
                  Full name
                </label>
                <input
                  id="checkout-name"
                  type="text"
                  autoComplete="name"
                  className={cn(
                    "w-full border bg-transparent px-4 py-3 text-sm outline-none transition-colors focus:border-foreground",
                    errors.name ? "border-destructive" : "border-border",
                  )}
                  {...register("name")}
                />
                {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
              </div>

              <div className="space-y-1.5">
                <label htmlFor="checkout-email" className="eyebrow text-muted-foreground block">
                  Email address
                </label>
                <input
                  id="checkout-email"
                  type="email"
                  autoComplete="email"
                  className={cn(
                    "w-full border bg-transparent px-4 py-3 text-sm outline-none transition-colors focus:border-foreground",
                    errors.email ? "border-destructive" : "border-border",
                  )}
                  {...register("email")}
                />
                {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
              </div>

              <div className="space-y-1.5">
                <label htmlFor="checkout-phone" className="eyebrow text-muted-foreground block">
                  Mobile number
                </label>
                <div className="flex">
                  <span className="inline-flex items-center border border-r-0 border-border px-4 text-sm text-muted-foreground">
                    +91
                  </span>
                  <input
                    id="checkout-phone"
                    type="tel"
                    inputMode="numeric"
                    maxLength={10}
                    autoComplete="tel"
                    className={cn(
                      "min-w-0 flex-1 border bg-transparent px-4 py-3 text-sm outline-none transition-colors focus:border-foreground",
                      errors.phone ? "border-destructive" : "border-border",
                    )}
                    {...register("phone")}
                  />
                </div>
                {errors.phone && <p className="text-xs text-destructive">{errors.phone.message}</p>}
              </div>

              {error && (
                <div className="border border-destructive/50 bg-destructive/5 px-4 py-3 text-sm text-destructive">
                  {error}
                </div>
              )}

              <div className="pt-2">
                <LuxButton
                  type="submit"
                  variant="primary"
                  className="w-full"
                  disabled={isSubmitting || step === "loading" || step === "redirect"}
                  id="checkout-submit-btn"
                >
                  {step === "loading" || step === "redirect"
                    ? "Opening secure payment…"
                    : "Pay securely with Cashfree"}
                </LuxButton>
              </div>

              <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground pt-1">
                <Lock className="h-3 w-3" />
                <span>Your payment is encrypted and secured by Cashfree Payments</span>
              </div>
            </form>
          </Reveal>

          {/* ── Right: Order summary sidebar ────────────── */}
          <Reveal delay={0.1} className="lg:sticky lg:top-28 lg:self-start">
            <OrderSummary productId={productId} slug={slug} />
          </Reveal>
        </div>
      </Container>
    </main>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function CheckoutProductCard({ productId, slug }: { productId: string; slug: string }) {
  const { data } = useSuspenseQuery(productQuery(slug));
  if (!data?.product) return null;
  const p = data.product;
  const img = p.images[0] ?? p.thumbnail;
  return (
    <div className="flex items-start gap-5 border border-border p-4">
      {img && <img src={img} alt={p.name} className="h-20 w-16 object-cover flex-shrink-0" />}
      <div className="min-w-0">
        <p className="font-display text-xl leading-snug">{p.name}</p>
        <p className="mt-1 text-sm text-muted-foreground">
          {p.metal}
          {p.stone && p.stone !== "Other" ? ` · ${p.stone}` : ""}
        </p>
        <p className="mt-2 text-base">{formatProductPrice(p)}</p>
      </div>
    </div>
  );
}

function OrderSummary({ productId, slug }: { productId: string; slug: string }) {
  const { data } = useSuspenseQuery(productQuery(slug));
  if (!data?.product) return null;
  const p = data.product;
  const price = p.price ?? 0;
  return (
    <div className="bg-secondary p-8">
      <p className="eyebrow text-muted-foreground mb-6">Order summary</p>
      <div className="space-y-4 text-sm">
        <div className="flex justify-between gap-4">
          <span className="text-muted-foreground">{p.name}</span>
          <span className="tabular-nums">{formatProductPrice(p)}</span>
        </div>
        <div className="flex justify-between gap-4">
          <span className="text-muted-foreground">Shipping</span>
          <span className="text-green-700 font-medium">Complimentary</span>
        </div>
        <div className="flex justify-between gap-4">
          <span className="text-muted-foreground">Insurance</span>
          <span className="text-green-700 font-medium">Included</span>
        </div>
        <div className="border-t border-border pt-4 flex justify-between gap-4 font-medium">
          <span>Total</span>
          <span className="tabular-nums">₹{price.toLocaleString("en-IN")}</span>
        </div>
      </div>

      <div className="mt-8 space-y-3">
        <div className="flex items-start gap-3 text-xs text-muted-foreground">
          <ShieldCheck className="h-4 w-4 mt-0.5 flex-shrink-0 text-foreground/60" />
          <span>Fully insured delivery across India</span>
        </div>
        <div className="flex items-start gap-3 text-xs text-muted-foreground">
          <ShieldCheck className="h-4 w-4 mt-0.5 flex-shrink-0 text-foreground/60" />
          <span>Exchange within 14 days in original condition</span>
        </div>
        <div className="flex items-start gap-3 text-xs text-muted-foreground">
          <ShieldCheck className="h-4 w-4 mt-0.5 flex-shrink-0 text-foreground/60" />
          <span>BIS Hallmarked & certified</span>
        </div>
      </div>

      <div className="mt-8 border-t border-border pt-6">
        <p className="text-xs text-muted-foreground">
          We accept UPI, Credit Cards, Debit Cards, and Net Banking via Cashfree — a PCI-DSS
          compliant payment gateway.
        </p>
      </div>
    </div>
  );
}
