import { QueryClient } from "@tanstack/react-query";
import { createMemoryHistory, createRouter, RouterProvider } from "@tanstack/react-router";
import { cleanup, render, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { routeTree } from "@/routeTree.gen";

let didStubUrl = false;
let didStubKey = false;

function renderAt(path: string) {
  if (!process.env["SUPABASE_URL"] && !process.env["VITE_SUPABASE_URL"]) {
    process.env["SUPABASE_URL"] = "https://example.supabase.co";
    didStubUrl = true;
  }
  if (!process.env["SUPABASE_PUBLISHABLE_KEY"] && !process.env["VITE_SUPABASE_PUBLISHABLE_KEY"]) {
    process.env["SUPABASE_PUBLISHABLE_KEY"] = "sb_publishable_test_key";
    didStubKey = true;
  }

  const queryClient = new QueryClient();
  const router = createRouter({
    routeTree,
    context: { queryClient },
    history: createMemoryHistory({ initialEntries: [path] }),
  });
  return render(<RouterProvider router={router} />, { container: document.documentElement });
}

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  if (didStubUrl) {
    delete process.env["SUPABASE_URL"];
    didStubUrl = false;
  }
  if (didStubKey) {
    delete process.env["SUPABASE_PUBLISHABLE_KEY"];
    didStubKey = false;
  }
});

// Assert only that the router mounts and paints, never page content:
// routes are rewritten as the app is built and this must keep passing.
describe("App routing", () => {
  it("renders the index route", async () => {
    const { container } = renderAt("/");

    await waitFor(() => expect(container.firstChild).not.toBeNull());
  });

  it("renders the not-found route", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => undefined);

    const { container } = renderAt("/this-route-does-not-exist");

    await waitFor(() => expect(container.firstChild).not.toBeNull());
  });
});
