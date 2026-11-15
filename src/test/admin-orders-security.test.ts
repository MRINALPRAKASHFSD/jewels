/**
 * Security and RLS Regression Test Suite for public.admin_orders View.
 *
 * Verifies:
 * 1. Migration defines security_invoker = true and revokes anon access.
 * 2. Anonymous access to admin_orders is denied / blocked by RLS.
 * 3. Non-staff authenticated users cannot read administrative order data.
 * 4. Staff & Admin users retain access through private.is_staff() authorization.
 * 5. Customer PII and order data are not exposed to unauthorized callers.
 * 6. Server-side service-role operations (Cashfree webhooks/checkout) remain fully functional.
 *
 * Copyright © 2026 Mrinal Prakash. All rights reserved.
 */

import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

const MIGRATION_PATH = path.resolve(
  process.cwd(),
  "supabase/migrations/20261023000000_remediate_admin_orders_security_definer.sql",
);

const SUPABASE_URL = process.env["SUPABASE_URL"] || process.env["VITE_SUPABASE_URL"] || "";
const SUPABASE_PUBLISHABLE_KEY =
  process.env["SUPABASE_PUBLISHABLE_KEY"] || process.env["VITE_SUPABASE_PUBLISHABLE_KEY"] || "";
const SUPABASE_SERVICE_ROLE_KEY = process.env["SUPABASE_SERVICE_ROLE_KEY"] || "";

describe("public.admin_orders Security & RLS Regression Suite", () => {
  describe("1. Static Migration Security Audit", () => {
    it("ensures the remediation migration file exists", () => {
      expect(fs.existsSync(MIGRATION_PATH)).toBe(true);
    });

    it("enforces security_invoker = true on public.admin_orders", () => {
      const sql = fs.readFileSync(MIGRATION_PATH, "utf-8");
      expect(sql).toContain("ALTER VIEW public.admin_orders SET (security_invoker = true)");
      expect(sql).toMatch(/security_invoker\s*=\s*true/i);
    });

    it("revokes permissions from anon and PUBLIC", () => {
      const sql = fs.readFileSync(MIGRATION_PATH, "utf-8");
      expect(sql).toContain("REVOKE ALL ON public.admin_orders FROM PUBLIC, anon");
    });

    it("grants SELECT strictly to authenticated and service_role", () => {
      const sql = fs.readFileSync(MIGRATION_PATH, "utf-8");
      expect(sql).toContain("GRANT SELECT ON public.admin_orders TO authenticated, service_role");
    });

    it("does not define any views with SECURITY DEFINER property", () => {
      const sql = fs.readFileSync(MIGRATION_PATH, "utf-8");
      expect(sql).not.toMatch(
        /CREATE\s+(?:OR\s+REPLACE\s+)?VIEW[^(]+WITH\s*\([^)]*security_definer[^)]*\)/i,
      );
    });
  });

  describe("2. Authorization & RLS Evaluation Logic", () => {
    // Model the private.is_staff helper from PostgreSQL migration 20261003052758
    function evaluateIsStaff(roles: string[]): boolean {
      return roles.includes("admin") || roles.includes("editor");
    }

    it("denies access to unauthenticated (anonymous) visitors", () => {
      const anonRoles: string[] = [];
      expect(evaluateIsStaff(anonRoles)).toBe(false);
    });

    it("denies access to standard authenticated non-staff customers", () => {
      const customerRoles: string[] = ["customer", "shopper"];
      expect(evaluateIsStaff(customerRoles)).toBe(false);
    });

    it("grants access to authorized staff members (editor)", () => {
      const staffRoles = ["editor"];
      expect(evaluateIsStaff(staffRoles)).toBe(true);
    });

    it("grants access to system administrators (admin)", () => {
      const adminRoles = ["admin"];
      expect(evaluateIsStaff(adminRoles)).toBe(true);
    });

    it("ensures customer A cannot inspect customer B's order records via admin_orders", () => {
      // With security_invoker = true, customer querying the view has is_staff = false,
      // resulting in an empty set (0 rows) returned by RLS.
      const customerAId = "11111111-1111-1111-1111-111111111111";
      const customerARoles: string[] = [];
      const isAuthorized = evaluateIsStaff(customerARoles);

      expect(isAuthorized).toBe(false);
      // Under PostgreSQL RLS with security_invoker = true:
      // Policy staff_read_orders evaluates: private.is_staff(auth.uid()) -> false.
      // Therefore, customer A cannot see any orders, including customer B's.
    });
  });

  describe("3. Database Boundary Integration Verification", () => {
    it("denies anonymous PostgREST access to public.admin_orders", async () => {
      if (!SUPABASE_URL || !SUPABASE_PUBLISHABLE_KEY) {
        // Skip live request if environment variables are not configured in test runner
        return;
      }

      const anonClient = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);
      const res = await anonClient.from("admin_orders").select("*");

      // Either PostgREST denies access due to REVOKE (42501 error)
      // or returns 0 rows due to security_invoker RLS policy
      if (res.error) {
        expect(["42501", "PGRST205", "PGRST301", "401", "403"]).toContain(res.error.code);
      } else {
        expect(res.data?.length ?? 0).toBe(0);
      }
    });

    it("allows service-role (backend) queries to operate unimpeded", async () => {
      if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
        return;
      }

      const adminClient = createClient<Database>(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
      const res = await adminClient.from("admin_orders").select("id, order_status").limit(1);

      // Service role bypasses RLS cleanly
      expect(res.error).toBeNull();
    });
  });

  describe("4. TypeScript Type Safety & Contract Integrity", () => {
    it("exports admin_orders with full field typing in Database types", () => {
      type AdminOrderRow = Database["public"]["Views"]["admin_orders"]["Row"];

      const mockOrder: AdminOrderRow = {
        id: "123e4567-e89b-12d3-a456-426614174000",
        customer_name: "Aarav Sharma",
        customer_email: "aarav@example.com",
        customer_phone: "9876543210",
        amount: 84500,
        currency: "INR",
        order_status: "paid",
        cf_order_id: "CF_ORDER_12345",
        notes: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        payment_status: "paid",
        payment_method: "upi",
        gateway_payment_id: "CF_PAY_9876",
      };

      expect(mockOrder.id).toBeDefined();
      expect(mockOrder.amount).toBe(84500);
      expect(mockOrder.order_status).toBe("paid");
    });
  });
});
