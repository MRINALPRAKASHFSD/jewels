// Mirrors the database rules (RLS) so the UI can hide what a role can't do.
// The database remains the real enforcement layer — this is presentation only.
export type AdminRole = "admin" | "editor";
export type Resource =
  | "products" | "collections" | "media" | "lookbook" | "enquiries"
  | "content" | "settings" | "analytics" | "users";
export type Action = "create" | "read" | "update" | "delete" | "upload";

const MATRIX: Record<AdminRole, Partial<Record<Resource, Action[]>>> = {
  admin: {
    products: ["create", "read", "update", "delete"],
    collections: ["create", "read", "update", "delete"],
    media: ["upload", "read", "delete"],
    lookbook: ["create", "read", "update", "delete"],
    enquiries: ["read", "update"],
    content: ["create", "read", "update"],
    settings: ["read", "update"],
    analytics: ["read"],
    users: ["create", "read", "update", "delete"], // future /admin/settings/users
  },
  editor: {
    products: ["create", "read", "update"],
    collections: ["read", "update"],
    media: ["upload", "read"],
    lookbook: ["create", "read", "update"],
    enquiries: ["read", "update"],
    content: ["read", "update"],
    settings: ["read"],
  },
};

export function can(role: AdminRole | null | undefined, resource: Resource, action: Action = "read") {
  if (!role) return false;
  return MATRIX[role][resource]?.includes(action) ?? false;
}

/** Pages that need more than read access to open (admin-only screens). */
export const PAGE_ACCESS: Partial<Record<string, { resource: Resource; action: Action }>> = {
  "/admin/settings": { resource: "settings", action: "update" },
  "/admin/analytics": { resource: "analytics", action: "read" },
};

export const ROLE_LABEL: Record<AdminRole, string> = { admin: "Administrator", editor: "Editor" };
