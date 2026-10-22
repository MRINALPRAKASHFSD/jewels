declare module "@cashfreepayments/cashfree-js" {
  export type CashfreeMode = "sandbox" | "production";
  export type CheckoutOptions = {
    paymentSessionId: string;
    redirectTarget?: "_self" | "_blank" | "_modal";
  };
  export type CheckoutResult = {
    error?: { message: string; code?: string };
    redirect?: boolean;
  };
  export type CashfreeInstance = {
    checkout(options: CheckoutOptions): Promise<CheckoutResult>;
  };
  export function load(config: { mode: CashfreeMode }): Promise<CashfreeInstance>;
}
