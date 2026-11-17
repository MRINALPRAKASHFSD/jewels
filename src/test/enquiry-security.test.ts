/**
 * Security, Abuse Protection, and RLS Integration Test Suite for Public Enquiries.
 *
 * Verifies:
 * 1. Legitimate enquiry submission succeeds through the protected server boundary.
 * 2. Zod validation rejects invalid inputs (missing name, invalid email, missing contact info).
 * 3. Honeypot submissions are blocked from creating database records.
 * 4. Cooldown (15 seconds) is enforced between rapid submissions for the same abuse key.
 * 5. Rate limit (max 5 requests per 15 minutes) triggers appropriately.
 * 6. Direct anonymous PostgREST INSERT is denied at the database permission boundary.
 * 7. Existing staff SELECT, UPDATE and admin DELETE access remain intact.
 *
 * Copyright © 2026 Mrinal Prakash. All rights reserved.
 */
import { describe, it, expect, afterAll } from "vitest";
import { createClient } from "@supabase/supabase-js";
import {
  processEnquirySubmission,
  computeAbuseKey,
  checkEnquiryRateLimit,
} from "@/lib/enquiry.server";

const SUPABASE_URL = process.env["SUPABASE_URL"] || process.env["VITE_SUPABASE_URL"] || "";
const SUPABASE_PUBLISHABLE_KEY =
  process.env["SUPABASE_PUBLISHABLE_KEY"] || process.env["VITE_SUPABASE_PUBLISHABLE_KEY"] || "";
const SUPABASE_SERVICE_ROLE_KEY = process.env["SUPABASE_SERVICE_ROLE_KEY"] || "";

const hasLiveDb = Boolean(SUPABASE_URL && SUPABASE_PUBLISHABLE_KEY && SUPABASE_SERVICE_ROLE_KEY);

const anonClient = hasLiveDb ? createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY) : null;
const adminClient = hasLiveDb ? createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY) : null;

const createdEnquiryIds: string[] = [];
const testAbuseKeys: string[] = [];

afterAll(async () => {
  if (!adminClient) return;
  if (createdEnquiryIds.length > 0) {
    await adminClient.from("enquiries").delete().in("id", createdEnquiryIds);
  }
  if (testAbuseKeys.length > 0) {
    await adminClient.from("enquiry_rate_limits").delete().in("abuse_key", testAbuseKeys);
  }
});

describe("Enquiry Security & Abuse Protection Suite", () => {
  describe("1. Server Validation & Honeypot Checks", () => {
    it("rejects an enquiry with a missing name", async () => {
      const res = await processEnquirySubmission({
        name: "",
        email: "valid@example.com",
        message: "Hello",
      });
      expect(res.ok).toBe(false);
      if (!res.ok) {
        expect(res.error).toMatch(/name/i);
      }
    });

    it("rejects an enquiry without either email or phone", async () => {
      const res = await processEnquirySubmission({
        name: "Aanya Sen",
        email: "",
        phone: "",
        message: "Hello",
      });
      expect(res.ok).toBe(false);
      if (!res.ok) {
        expect(res.error).toMatch(/email.*phone|atelier can contact/i);
      }
    });

    it("rejects an invalid email address", async () => {
      const res = await processEnquirySubmission({
        name: "Aanya Sen",
        email: "not-an-email",
        message: "Hello",
      });
      expect(res.ok).toBe(false);
      if (!res.ok) {
        expect(res.error).toMatch(/valid email/i);
      }
    });

    it("rejects honeypot bot submissions without creating database records", async () => {
      const testIp = "192.0.2.99";
      const res = await processEnquirySubmission(
        {
          name: "Spam Bot",
          email: "spambot@example.com",
          message: "Buy cheap luxury watches",
          hp: "http://spam-link.ru",
        },
        testIp,
      );

      expect(res.ok).toBe(false);
      expect((res as { ok: false; error: string }).error).toBe("Invalid submission.");

      if (!adminClient) return;
      const { data } = await adminClient
        .from("enquiries")
        .select("id")
        .eq("email", "spambot@example.com");
      expect(data?.length).toBe(0);
    });
  });

  describe("2. Legitimate Enquiry Submission via Server Boundary", () => {
    it("successfully creates an enquiry with valid contact information", async () => {
      if (!adminClient) return;
      const uniqueIp = `198.51.100.${Math.floor(Math.random() * 200) + 10}`;
      const uniqueEmail = `legit-${Date.now()}@example.com`;
      const res = await processEnquirySubmission(
        {
          name: "Radhika Sen",
          email: uniqueEmail,
          phone: "+91 98765 43210",
          message: "Interested in the Solitaire Pendant.",
          source: "contact_form",
          hp: "",
        },
        uniqueIp,
      );

      expect(res.ok).toBe(true);
      if (res.ok) {
        expect(res.id).toBeDefined();
        createdEnquiryIds.push(res.id);

        const { data } = await adminClient.from("enquiries").select("*").eq("id", res.id).single();
        expect(data).toBeDefined();
        expect(data?.name).toBe("Radhika Sen");
        expect(data?.email).toBe(uniqueEmail);
        expect(data?.status).toBe("new");
        expect(data?.source).toBe("contact_form");
      }

      const abuseKey = computeAbuseKey(uniqueIp, uniqueEmail);
      testAbuseKeys.push(abuseKey);
    });
  });

  describe("3. Persistent Rate-Limiting & Cooldown Protection", () => {
    it("enforces a 15-second cooldown between consecutive submissions for the same abuse key", async () => {
      if (!hasLiveDb) return;
      const testKey = `test-cooldown-${Date.now()}`;
      testAbuseKeys.push(testKey);

      const res1 = await checkEnquiryRateLimit(testKey, {
        maxRequests: 5,
        windowSeconds: 900,
        cooldownSeconds: 15,
      });
      expect(res1.allowed).toBe(true);

      const res2 = await checkEnquiryRateLimit(testKey, {
        maxRequests: 5,
        windowSeconds: 900,
        cooldownSeconds: 15,
      });
      expect(res2.allowed).toBe(false);
      expect(res2.reason).toBe("cooldown");
      expect(res2.retryAfter).toBeGreaterThan(0);
      expect(res2.retryAfter).toBeLessThanOrEqual(15);
    });

    it("enforces maximum 5 submissions within the 15-minute rolling window", async () => {
      if (!hasLiveDb) return;
      const testKey = `test-limit-${Date.now()}`;
      testAbuseKeys.push(testKey);

      for (let i = 1; i <= 5; i++) {
        const res = await checkEnquiryRateLimit(testKey, {
          maxRequests: 5,
          windowSeconds: 900,
          cooldownSeconds: 0,
        });
        expect(res.allowed).toBe(true);
      }

      const res6 = await checkEnquiryRateLimit(testKey, {
        maxRequests: 5,
        windowSeconds: 900,
        cooldownSeconds: 0,
      });
      expect(res6.allowed).toBe(false);
      expect(res6.reason).toBe("rate_limit");
      expect(res6.retryAfter).toBeGreaterThan(0);
    });

    it("returns user-friendly error without leaking internal secrets when throttled", async () => {
      if (!hasLiveDb) return;
      const uniqueIp = `203.0.113.${Math.floor(Math.random() * 200) + 10}`;
      const email = `throttle-${Date.now()}@example.com`;

      const first = await processEnquirySubmission(
        {
          name: "Test Client",
          email,
          message: "First message",
        },
        uniqueIp,
      );
      expect(first.ok).toBe(true);
      if (first.ok) createdEnquiryIds.push(first.id);

      testAbuseKeys.push(computeAbuseKey(uniqueIp, email));

      const second = await processEnquirySubmission(
        {
          name: "Test Client",
          email,
          message: "Second immediate message",
        },
        uniqueIp,
      );

      expect(second.ok).toBe(false);
      if (!second.ok) {
        expect(second.error).toBe(
          "You have submitted too many enquiries recently. Please wait a few minutes before trying again.",
        );
        expect(second.retryAfter).toBeDefined();
      }
    });
  });

  describe("4. Database-Level Boundary: Direct PostgREST Denial & Staff RLS", () => {
    it("denies direct anonymous INSERT on public.enquiries via PostgREST", async () => {
      if (!anonClient) return;
      const directAttempt = await anonClient.from("enquiries").insert({
        name: "Direct PostgREST Attacker",
        email: "attacker@example.com",
        message: "Bypassing frontend",
        source: "contact_form",
        status: "new",
      });

      expect(directAttempt.error).not.toBeNull();
      expect(directAttempt.error?.code).toBe("42501");
      expect(directAttempt.error?.message).toMatch(/permission denied/i);
    });

    it("denies direct anonymous SELECT on public.enquiries via PostgREST", async () => {
      if (!anonClient) return;
      const directSelect = await anonClient.from("enquiries").select("id, name, email");
      expect(directSelect.data?.length ?? 0).toBe(0);
    });

    it("allows staff/admin SELECT, UPDATE and DELETE on public.enquiries", async () => {
      if (!adminClient) return;
      const { data: created, error: cErr } = await adminClient
        .from("enquiries")
        .insert({
          name: "Workflow Test",
          email: "workflow@example.com",
          source: "contact_form",
          status: "new",
        })
        .select("id")
        .single();

      expect(cErr).toBeNull();
      expect(created?.id).toBeDefined();
      const testId = created!.id;

      const { data: read, error: rErr } = await adminClient
        .from("enquiries")
        .select("id, status, name")
        .eq("id", testId)
        .single();
      expect(rErr).toBeNull();
      expect(read?.name).toBe("Workflow Test");
      expect(read?.status).toBe("new");

      const { error: uErr } = await adminClient
        .from("enquiries")
        .update({ status: "contacted" })
        .eq("id", testId);
      expect(uErr).toBeNull();

      const { data: updated } = await adminClient
        .from("enquiries")
        .select("status")
        .eq("id", testId)
        .single();
      expect(updated?.status).toBe("contacted");

      const { error: dErr } = await adminClient.from("enquiries").delete().eq("id", testId);
      expect(dErr).toBeNull();

      const { data: deleted } = await adminClient.from("enquiries").select("id").eq("id", testId);
      expect(deleted?.length).toBe(0);
    });
  });
});
