import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { Loader2 } from "lucide-react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { safeAdminRedirect } from "@/lib/admin/session";
import { AuthCard, field, submit } from "@/components/admin/AuthCard";

export const Route = createFileRoute("/admin_/login")({
  ssr: false,
  validateSearch: z.object({ redirect: z.string().optional() }),
  beforeLoad: async ({ search }) => {
    const { data } = await supabase.auth.getSession();
    if (data.session) throw redirect({ href: safeAdminRedirect(search.redirect), replace: true });
  },
  head: () => ({ meta: [{ title: "Sign in — Élan Admin" }, { name: "robots", content: "noindex, nofollow" }] }),
  component: LoginPage,
});

function LoginPage() {
  const search = Route.useSearch();
  const navigate = useNavigate();
  const [mode, setMode] = useState<"signin" | "reset">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  async function onSignIn(e: FormEvent) {
    e.preventDefault();
    setBusy(true); setError(null);
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    setBusy(false);
    if (error) { setError("Email or password is incorrect."); return; }
    navigate({ href: safeAdminRedirect(search.redirect), replace: true });
  }

  async function onReset(e: FormEvent) {
    e.preventDefault();
    setBusy(true); setError(null);
    await supabase.auth.resetPasswordForEmail(email.trim(), { redirectTo: `${window.location.origin}/admin/reset-password` });
    setBusy(false);
    // Same message whether or not the account exists.
    setNotice("If an account exists for this email, a reset link is on its way.");
  }

  return (
    <AuthCard>
      <p className="mt-2 text-sm text-muted-foreground">
        {mode === "signin" ? "Sign in to manage your jewellery house." : "Enter your email and we'll send a reset link."}
      </p>
      {mode === "signin" ? (
        <form onSubmit={onSignIn} className="mt-6 space-y-4">
          <label className="block text-xs font-medium">Email<input type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} className={field} /></label>
          <label className="block text-xs font-medium">Password<input type="password" required autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} className={field} /></label>
          {error && <p role="alert" className="text-xs text-destructive">{error}</p>}
          <button type="submit" disabled={busy} className={submit}>{busy && <Loader2 className="h-3.5 w-3.5 animate-spin" />}Sign in</button>
          <button type="button" onClick={() => { setMode("reset"); setError(null); }} className="block w-full text-center text-xs text-muted-foreground hover:text-foreground">Forgot password?</button>
        </form>
      ) : (
        <form onSubmit={onReset} className="mt-6 space-y-4">
          <label className="block text-xs font-medium">Email<input type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} className={field} /></label>
          {notice && <p role="status" className="text-xs text-muted-foreground">{notice}</p>}
          <button type="submit" disabled={busy} className={submit}>{busy && <Loader2 className="h-3.5 w-3.5 animate-spin" />}Send reset link</button>
          <button type="button" onClick={() => { setMode("signin"); setNotice(null); }} className="block w-full text-center text-xs text-muted-foreground hover:text-foreground">Back to sign in</button>
        </form>
      )}
    </AuthCard>
  );
}
