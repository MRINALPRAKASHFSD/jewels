import type { ReactNode } from "react";

export function AuthCard({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-secondary/40 p-4 font-sans">
      <div className="w-full max-w-sm rounded-sm border border-border bg-card p-8">
        <p className="text-sm font-semibold tracking-[0.25em]">ÉLAN <span className="font-normal text-muted-foreground">ADMIN</span></p>
        {children}
      </div>
    </div>
  );
}
export const field = "mt-1.5 w-full rounded-sm border border-input bg-background px-3 py-2 text-sm outline-none focus:border-foreground";
export const submit = "flex w-full items-center justify-center gap-2 rounded-sm bg-primary px-3 py-2.5 text-xs font-medium uppercase tracking-wider text-primary-foreground hover:bg-primary/90 disabled:opacity-60";

