import { supabase } from "@/integrations/supabase/client";
import type { AdminRole } from "./permissions";

export type AdminSession =
  | { status: "signed-out" }
  | { status: "error" }
  | { status: "no-profile"; email: string }
  | { status: "forbidden"; email: string }
  | { status: "ok"; userId: string; email: string; name: string; role: AdminRole };

/** Browser-only. Validates the session with the auth server, then reads profile + role (RLS-protected). */
export async function loadAdminSession(): Promise<AdminSession> {
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) return { status: "signed-out" };
  const user = data.user;
  const email = user.email ?? "";

  const [profile, roles] = await Promise.all([
    supabase.from("profiles").select("full_name, email").eq("id", user.id).maybeSingle(),
    supabase.from("user_roles").select("role").eq("user_id", user.id),
  ]);
  if (profile.error || roles.error) {
    console.error("[admin] session", profile.error ?? roles.error);
    return { status: "error" };
  }
  if (!profile.data) return { status: "no-profile", email };
  const list = (roles.data ?? []).map((r) => r.role as string);
  const role: AdminRole | null = list.includes("admin") ? "admin" : list.includes("editor") ? "editor" : null;
  if (!role) return { status: "forbidden", email };
  return { status: "ok", userId: user.id, email, name: profile.data.full_name || email.split("@")[0]!, role };
}

/** Only allow same-origin admin paths as post-login destinations. */
export function safeAdminRedirect(target: unknown): string {
  if (typeof target !== "string") return "/admin";
  try {
    const u = new URL(target, "http://x");
    if (u.origin !== "http://x" || !u.pathname.startsWith("/admin") || u.pathname.startsWith("/admin/login")) return "/admin";
    return u.pathname + u.search;
  } catch {
    return "/admin";
  }
}
