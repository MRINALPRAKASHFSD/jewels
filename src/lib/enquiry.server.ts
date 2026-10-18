/**
 * Server-side enquiry submission and anti-abuse validation.
 *
 * Enforces rate limiting, honeypot detection, input sanitization,
 * and database insertion using service-role supabaseAdmin.
 *
 * Copyright © 2026 Mrinal Prakash. All rights reserved.
 */
import { z } from "zod";
import crypto from "node:crypto";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

export const ENQUIRY_SOURCES = ["whatsapp", "contact_form", "appointment", "product_page"] as const;
export type EnquirySource = (typeof ENQUIRY_SOURCES)[number];

export const enquiryInputSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(1, "Please enter your name.")
      .max(120, "Name cannot exceed 120 characters."),
    email: z
      .string()
      .trim()
      .email("Please provide a valid email address.")
      .max(255, "Email cannot exceed 255 characters.")
      .optional()
      .or(z.literal("")),
    phone: z
      .string()
      .trim()
      .max(30, "Phone number cannot exceed 30 characters.")
      .regex(/^[\d\s+().-]*$/, "Please enter a valid phone number.")
      .optional()
      .or(z.literal("")),
    message: z
      .string()
      .trim()
      .max(2000, "Message cannot exceed 2,000 characters.")
      .optional()
      .or(z.literal("")),
    productId: z
      .string()
      .uuid("Invalid product identifier.")
      .optional()
      .nullable()
      .or(z.literal("")),
    source: z.enum(ENQUIRY_SOURCES).default("contact_form"),
    // Honeypot field: must be empty for legitimate users
    hp: z.string().optional().default(""),
  })
  .refine(
    (data) => (data.email && data.email.length > 0) || (data.phone && data.phone.length > 0),
    {
      message: "Please provide either an email address or a phone number so our atelier can contact you.",
      path: ["email"],
    },
  );

export type EnquiryInput = z.infer<typeof enquiryInputSchema>;

export type EnquirySubmissionResult =
  | { ok: true; id: string; message: string }
  | { ok: false; error: string; retryAfter?: number };

/**
 * Derives a privacy-conscious salted hash from the client IP and optional contact info.
 * Raw IP addresses are NEVER persisted into the database.
 */
export function computeAbuseKey(ip: string, contact?: string | null): string {
  const salt = process.env["ABUSE_KEY_SALT"] || "elan-jewels-enquiry-salt-v1";
  const cleanIp = ip.trim().toLowerCase();
  const cleanContact = contact ? contact.trim().toLowerCase() : "";
  return crypto
    .createHash("sha256")
    .update(`${salt}:${cleanIp}:${cleanContact}`)
    .digest("hex");
}

/**
 * Persistent, database-backed rate limit and cooldown check.
 * Max 5 submissions per 15 minutes (900 seconds) + 15 seconds cooldown between consecutive submissions.
 */
export async function checkEnquiryRateLimit(
  abuseKey: string,
  options: { maxRequests?: number; windowSeconds?: number; cooldownSeconds?: number } = {},
): Promise<{ allowed: boolean; reason?: "cooldown" | "rate_limit"; retryAfter?: number }> {
  const { maxRequests = 5, windowSeconds = 900, cooldownSeconds = 15 } = options;

  const { data, error } = await supabaseAdmin.rpc("check_and_record_enquiry_rate_limit", {
    p_abuse_key: abuseKey,
    p_max_requests: maxRequests,
    p_window_seconds: windowSeconds,
    p_cooldown_seconds: cooldownSeconds,
  });

  if (error) {
    console.error("[enquiry.server] Rate limit evaluation error:", error);
    // If the database rate-limit procedure encounters an unexpected error,
    // fail securely rather than allowing an unmonitored flood.
    return {
      allowed: false,
      reason: "rate_limit",
      retryAfter: 60,
    };
  }

  const res = data as { allowed: boolean; reason?: "cooldown" | "rate_limit"; retry_after?: number };
  return {
    allowed: !!res?.allowed,
    reason: res?.reason,
    retryAfter: res?.retry_after,
  };
}

/**
 * Main server-side handler for public enquiry submissions.
 */
export async function processEnquirySubmission(
  rawInput: unknown,
  explicitIp?: string,
): Promise<EnquirySubmissionResult> {
  // 1. Validate fields with Zod
  const parseResult = enquiryInputSchema.safeParse(rawInput);
  if (!parseResult.success) {
    const firstError = parseResult.error.errors[0]?.message || "Invalid submission parameters.";
    return { ok: false, error: firstError };
  }

  const data = parseResult.data;

  // 2. Honeypot check: reject if filled
  if (data.hp && data.hp.trim().length > 0) {
    return { ok: false, error: "Invalid submission." };
  }

  // 3. Resolve requester IP
  let ip = explicitIp;
  if (!ip) {
    try {
      const { getRequest } = await import("@tanstack/react-start/server");
      const req = getRequest();
      const xForwarded = req?.headers?.get("x-forwarded-for");
      ip = (xForwarded ? xForwarded.split(",")[0]?.trim() : null)
        || req?.headers?.get("cf-connecting-ip")
        || req?.headers?.get("x-real-ip")
        || "127.0.0.1";
    } catch {
      ip = "127.0.0.1";
    }
  }

  // 4. Compute privacy-preserving abuse key
  const abuseKey = computeAbuseKey(ip, data.email || data.phone);

  // 5. Evaluate persistent rate limiting
  const rateLimitResult = await checkEnquiryRateLimit(abuseKey);
  if (!rateLimitResult.allowed) {
    return {
      ok: false,
      error: "You have submitted too many enquiries recently. Please wait a few minutes before trying again.",
      retryAfter: rateLimitResult.retryAfter,
    };
  }

  // 6. Insert enquiry into public.enquiries via supabaseAdmin (service role)
  const insertPayload = {
    name: data.name,
    email: data.email ? data.email : null,
    phone: data.phone ? data.phone : null,
    message: data.message ? data.message : null,
    product_id: data.productId ? data.productId : null,
    source: data.source,
    status: "new" as const,
  };

  const { data: inserted, error: insertError } = await supabaseAdmin
    .from("enquiries")
    .insert(insertPayload)
    .select("id")
    .single();

  if (insertError || !inserted) {
    console.error("[enquiry.server] Insert error:", insertError);
    return {
      ok: false,
      error: "We could not process your enquiry right now. Please try again or contact us directly on WhatsApp.",
    };
  }

  return {
    ok: true,
    id: inserted.id,
    message: "Thank you. Your enquiry has been received. Our atelier will be in touch shortly.",
  };
}
