import { describe, it, expect, vi, beforeEach } from "vitest";

const mockGetUser = vi.fn();

type MockQueryResult = { data: unknown; error: unknown };

interface MockQueryBuilder {
  select: (cols?: string) => MockQueryBuilder;
  or: (filters: string) => MockQueryBuilder;
  limit: (count: number) => MockQueryBuilder;
  like: (col: string, pattern: string) => MockQueryBuilder;
  insert: (data: unknown) => Promise<MockQueryResult>;
  then: <TResult1 = MockQueryResult, TResult2 = never>(
    onfulfilled?: ((value: MockQueryResult) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null,
  ) => Promise<TResult1 | TResult2>;
}

const mockTables: Record<string, unknown> = {};

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    auth: {
      getUser: () => mockGetUser(),
    },
    from: (table: string) => {
      if (mockTables[table]) return mockTables[table];
      const query: MockQueryBuilder = {
        select: vi.fn(() => query),
        or: vi.fn(() => query),
        limit: vi.fn(() => query),
        like: vi.fn(() => query),
        insert: vi.fn(() => Promise.resolve({ data: null, error: null })),
        then: (resolve, reject) => Promise.resolve({ data: [], error: null }).then(resolve, reject),
      };
      return query;
    },
  },
}));

import { addEnquiryNote, findReferences } from "@/lib/admin/cms";

describe("CMS Hardening & Regression Suite (Issue #8)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    for (const key of Object.keys(mockTables)) {
      delete mockTables[key];
    }
  });

  describe("1. addEnquiryNote - Null-user handling", () => {
    it("throws a friendly error when user is null without throwing unhandled TypeError", async () => {
      mockGetUser.mockResolvedValue({ data: { user: null }, error: null });

      const insertFn = vi.fn();
      mockTables["enquiry_notes"] = {
        insert: insertFn,
      };

      await expect(addEnquiryNote("enq-1", "Test note", "staff@elan.com")).rejects.toThrow(
        "You must be signed in to add an internal note.",
      );

      expect(insertFn).not.toHaveBeenCalled();
    });

    it("throws a friendly error when auth.getUser returns an error", async () => {
      mockGetUser.mockResolvedValue({
        data: { user: null },
        error: new Error("Auth session missing"),
      });

      const insertFn = vi.fn();
      mockTables["enquiry_notes"] = {
        insert: insertFn,
      };

      await expect(addEnquiryNote("enq-1", "Test note", "staff@elan.com")).rejects.toThrow(
        "You must be signed in to add an internal note.",
      );

      expect(insertFn).not.toHaveBeenCalled();
    });

    it("successfully creates note with author_id and author_email when authenticated", async () => {
      mockGetUser.mockResolvedValue({
        data: { user: { id: "staff-uuid-123" } },
        error: null,
      });

      const insertFn = vi.fn().mockResolvedValue({ data: { id: "note-1" }, error: null });
      mockTables["enquiry_notes"] = {
        insert: insertFn,
      };

      await addEnquiryNote("enq-1", "  Followed up with client via phone.  ", "staff@elan.com");

      expect(insertFn).toHaveBeenCalledWith({
        enquiry_id: "enq-1",
        body: "Followed up with client via phone.",
        author_email: "staff@elan.com",
        author_id: "staff-uuid-123",
      });
    });
  });

  describe("2. findReferences - Media reference detection with homepage drafts", () => {
    const file = {
      bucket: "homepage",
      path: "hero-autumn.jpg",
      url: "https://example.supabase.co/storage/v1/object/public/homepage/hero-autumn.jpg",
    };

    function setupTableQuery(rows: unknown[]): MockQueryBuilder {
      const query: MockQueryBuilder = {
        select: vi.fn(() => query),
        or: vi.fn(() => query),
        limit: vi.fn(() => query),
        like: vi.fn(() => query),
        insert: vi.fn(() => Promise.resolve({ data: null, error: null })),
        then: (resolve, reject) =>
          Promise.resolve({ data: rows, error: null }).then(resolve, reject),
      };
      return query;
    }

    it("detects image reference stored in homepage_drafts", async () => {
      mockTables["product_images"] = setupTableQuery([]);
      mockTables["collections"] = setupTableQuery([]);
      mockTables["lookbook_items"] = setupTableQuery([]);
      mockTables["homepage_sections"] = setupTableQuery([]);
      mockTables["homepage_drafts"] = setupTableQuery([
        { section_key: "hero", content: { banner: "/homepage/hero-autumn.jpg" } },
      ]);

      const refs = await findReferences(file);
      expect(refs).toContain("Homepage draft: hero");
      expect(refs.length).toBe(1);
    });

    it("detects image references in both published homepage_sections and homepage_drafts", async () => {
      mockTables["product_images"] = setupTableQuery([]);
      mockTables["collections"] = setupTableQuery([]);
      mockTables["lookbook_items"] = setupTableQuery([]);
      mockTables["homepage_sections"] = setupTableQuery([
        { section_key: "hero", content: { banner: "/homepage/hero-autumn.jpg" } },
      ]);
      mockTables["homepage_drafts"] = setupTableQuery([
        { section_key: "hero", content: { banner: "/homepage/hero-autumn.jpg" } },
        { section_key: "craftsmanship", content: { step1: "/homepage/hero-autumn.jpg" } },
      ]);

      const refs = await findReferences(file);
      expect(refs).toContain("Homepage: hero");
      expect(refs).toContain("Homepage draft: hero");
      expect(refs).toContain("Homepage draft: craftsmanship");
      expect(refs.length).toBe(3);
    });

    it("returns empty array when image is not referenced anywhere", async () => {
      mockTables["product_images"] = setupTableQuery([]);
      mockTables["collections"] = setupTableQuery([]);
      mockTables["lookbook_items"] = setupTableQuery([]);
      mockTables["homepage_sections"] = setupTableQuery([
        { section_key: "hero", content: { banner: "/homepage/other.jpg" } },
      ]);
      mockTables["homepage_drafts"] = setupTableQuery([
        { section_key: "hero", content: { banner: "/homepage/draft-other.jpg" } },
      ]);

      const refs = await findReferences(file);
      expect(refs).toEqual([]);
    });
  });
});
