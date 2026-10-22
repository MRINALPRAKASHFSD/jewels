import { describe, it, expect, vi, beforeEach } from "vitest";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { z } from "zod";
import {
  verifyCashfreeWebhook,
  extractPaymentMethod,
  type CashfreeOrderInput,
} from "../lib/payment/cashfree";
import { handleCashfreeWebhook } from "../lib/payment/webhook";

// ─── Input Schemas (mirroring payment.functions.ts) ──────────────────────────
const initiateCheckoutSchema = z.object({
  productId: z.string().uuid(),
  customerName: z.string().min(1).max(120),
  customerEmail: z.string().email(),
  customerPhone: z.string().regex(/^[0-9]{10,15}$/),
  returnOrigin: z.string().url(),
});

describe("Payment Gateway — Input Validation", () => {
  it("accepts valid checkout inputs", () => {
    const valid = {
      productId: "123e4567-e89b-12d3-a456-426614174000",
      customerName: "Aarav Sharma",
      customerEmail: "aarav@example.com",
      customerPhone: "9876543210",
      returnOrigin: "https://elan.luxury",
    };
    const parsed = initiateCheckoutSchema.safeParse(valid);
    expect(parsed.success).toBe(true);
  });

  it("rejects invalid email formats", () => {
    const invalid = {
      productId: "123e4567-e89b-12d3-a456-426614174000",
      customerName: "Aarav Sharma",
      customerEmail: "not-an-email",
      customerPhone: "9876543210",
      returnOrigin: "https://elan.luxury",
    };
    const parsed = initiateCheckoutSchema.safeParse(invalid);
    expect(parsed.success).toBe(false);
  });

  it("rejects non-numeric phone numbers", () => {
    const invalid = {
      productId: "123e4567-e89b-12d3-a456-426614174000",
      customerName: "Aarav Sharma",
      customerEmail: "aarav@example.com",
      customerPhone: "98765abcde",
      returnOrigin: "https://elan.luxury",
    };
    const parsed = initiateCheckoutSchema.safeParse(invalid);
    expect(parsed.success).toBe(false);
  });

  it("rejects phone numbers shorter than 10 digits", () => {
    const invalid = {
      productId: "123e4567-e89b-12d3-a456-426614174000",
      customerName: "Aarav Sharma",
      customerEmail: "aarav@example.com",
      customerPhone: "9876543",
      returnOrigin: "https://elan.luxury",
    };
    const parsed = initiateCheckoutSchema.safeParse(invalid);
    expect(parsed.success).toBe(false);
  });

  it("rejects empty customer name", () => {
    const invalid = {
      productId: "123e4567-e89b-12d3-a456-426614174000",
      customerName: "",
      customerEmail: "aarav@example.com",
      customerPhone: "9876543210",
      returnOrigin: "https://elan.luxury",
    };
    const parsed = initiateCheckoutSchema.safeParse(invalid);
    expect(parsed.success).toBe(false);
  });

  it("rejects invalid UUID for product ID", () => {
    const invalid = {
      productId: "invalid-uuid-1234",
      customerName: "Aarav Sharma",
      customerEmail: "aarav@example.com",
      customerPhone: "9876543210",
      returnOrigin: "https://elan.luxury",
    };
    const parsed = initiateCheckoutSchema.safeParse(invalid);
    expect(parsed.success).toBe(false);
  });

  it("rejects invalid origin URL", () => {
    const invalid = {
      productId: "123e4567-e89b-12d3-a456-426614174000",
      customerName: "Aarav Sharma",
      customerEmail: "aarav@example.com",
      customerPhone: "9876543210",
      returnOrigin: "not-a-valid-url",
    };
    const parsed = initiateCheckoutSchema.safeParse(invalid);
    expect(parsed.success).toBe(false);
  });
});

describe("Payment Gateway — Security & Webhook Signature Verification", () => {
  const secretKey = "test_secret_key_mock_123456789";

  beforeEach(() => {
    process.env["CASHFREE_APP_ID"] = "test_app_id";
    process.env["CASHFREE_SECRET_KEY"] = secretKey;
    process.env["CASHFREE_ENVIRONMENT"] = "sandbox";
  });

  it("verifies a valid webhook HMAC-SHA256 signature", () => {
    const timestamp = "1729579200";
    const rawBody = JSON.stringify({
      type: "PAYMENT_SUCCESS_WEBHOOK",
      data: { order: { order_id: "order_123" } },
    });

    const validSignature = crypto
      .createHmac("sha256", secretKey)
      .update(timestamp + rawBody)
      .digest("base64");

    const verified = verifyCashfreeWebhook(rawBody, timestamp, validSignature);
    expect(verified).toBe(true);
  });

  it("rejects an invalid webhook signature", () => {
    const timestamp = "1729579200";
    const rawBody = JSON.stringify({
      type: "PAYMENT_SUCCESS_WEBHOOK",
      data: { order: { order_id: "order_123" } },
    });

    const forgedSignature = Buffer.from("forged_signature_bytes").toString("base64");

    const verified = verifyCashfreeWebhook(rawBody, timestamp, forgedSignature);
    expect(verified).toBe(false);
  });

  it("rejects when rawBody was tampered with", () => {
    const timestamp = "1729579200";
    const originalBody = JSON.stringify({ amount: 1000 });
    const tamperedBody = JSON.stringify({ amount: 10 });

    const validSignatureForOriginal = crypto
      .createHmac("sha256", secretKey)
      .update(timestamp + originalBody)
      .digest("base64");

    const verified = verifyCashfreeWebhook(tamperedBody, timestamp, validSignatureForOriginal);
    expect(verified).toBe(false);
  });

  it("rejects webhook request when headers are missing", async () => {
    const request = new Request("http://localhost:5173/api/webhook/cashfree", {
      method: "POST",
      body: JSON.stringify({ foo: "bar" }),
    });

    const response = await handleCashfreeWebhook(request);
    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toContain("Missing signature or timestamp");
  });

  it("rejects webhook request with invalid signature with 401 Unauthorized", async () => {
    const timestamp = "1729579200";
    const rawBody = JSON.stringify({ test: "data" });
    const invalidSig = Buffer.from("wrong-signature").toString("base64");

    const request = new Request("http://localhost:5173/api/webhook/cashfree", {
      method: "POST",
      headers: {
        "x-webhook-signature": invalidSig,
        "x-webhook-timestamp": timestamp,
        "content-type": "application/json",
      },
      body: rawBody,
    });

    const response = await handleCashfreeWebhook(request);
    expect(response.status).toBe(401);
    const body = await response.json();
    expect(body.error).toBe("Invalid webhook signature");
  });
});

describe("Payment Gateway — Payment Method Extraction", () => {
  it("extracts UPI method accurately", () => {
    expect(extractPaymentMethod({ upi: { vpa: "user@okaxis" } })).toBe("upi");
  });

  it("extracts Card method accurately", () => {
    expect(extractPaymentMethod({ card: { channel: "visa" } })).toBe("card");
  });

  it("extracts Netbanking method accurately", () => {
    expect(extractPaymentMethod({ netbanking: { channel: "hdfc" } })).toBe("netbanking");
  });

  it("returns unknown for empty or undefined payload", () => {
    expect(extractPaymentMethod({})).toBe("unknown");
    expect(extractPaymentMethod(null as unknown as Record<string, unknown>)).toBe("unknown");
  });
});

describe("Payment Gateway — Client Bundle Secret Leak Audit", () => {
  it("ensures CASHFREE_SECRET_KEY never appears in the client bundle", () => {
    const clientDir = path.resolve(process.cwd(), "dist/client");
    if (!fs.existsSync(clientDir)) {
      // Build directory not present in dry test runs
      return;
    }

    const checkDir = (dir: string): string[] => {
      let files: string[] = [];
      for (const item of fs.readdirSync(dir, { withFileTypes: true })) {
        const fullPath = path.join(dir, item.name);
        if (item.isDirectory()) {
          files = files.concat(checkDir(fullPath));
        } else if (item.name.endsWith(".js") || item.name.endsWith(".map")) {
          files.push(fullPath);
        }
      }
      return files;
    };

    const jsFiles = checkDir(clientDir);
    expect(jsFiles.length).toBeGreaterThan(0);

    for (const filePath of jsFiles) {
      const content = fs.readFileSync(filePath, "utf-8");
      expect(content).not.toContain("CASHFREE_SECRET_KEY");
      expect(content).not.toContain("SUPABASE_SERVICE_ROLE_KEY");
      expect(content).not.toContain("x-client-secret");
    }
  });

  it("ensures Cashfree secret configuration has no VITE_ prefix", () => {
    const cashfreeContent = fs.readFileSync(
      path.resolve(process.cwd(), "src/lib/payment/cashfree.ts"),
      "utf-8",
    );
    expect(cashfreeContent).not.toContain("VITE_CASHFREE_SECRET");
    expect(cashfreeContent).toContain("CASHFREE_SECRET_KEY");
  });
});
