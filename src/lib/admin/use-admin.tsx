import { useRouteContext } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { AccessRestricted, type AdminUser } from "@/components/admin/AdminUI";
import { can, type Action, type Resource } from "./permissions";

/** The signed-in staff member. Only valid inside the guarded /admin layout. */
export function useAdminUser(): AdminUser {
  const { admin } = useRouteContext({ from: "/admin" });
  if (admin.status !== "ok") throw new Error("Admin context unavailable");
  return admin;
}

/** Renders children only when the role allows it. Data-fetching children never mount otherwise. */
export function RequireAccess({ resource, action = "read", children }: { resource: Resource; action?: Action; children: ReactNode }) {
  const user = useAdminUser();
  return can(user.role, resource, action) ? <>{children}</> : <AccessRestricted />;
}
