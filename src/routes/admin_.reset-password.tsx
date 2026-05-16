import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { AuthCard, field, submit } from "@/components/admin/AuthCard";

export const Route = createFileRoute("/admin_/reset-password")({
  ssr: false,
  head: () => ({ meta: [{ title: "Reset password — Élan Admin" }, { name: "robots", content: "noindex, nofollow" }] }),
  component: ResetPage,
});

function ResetPage() {
  const navigate = useNavigate();
  const [ready, setReady] = useState<boolean | null>(null);
  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // The reset link signs the user in with a short-lived recovery session.
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "PASSWORD_RECOVERY" || session) setReady(true);
    });
    const t = setTimeout(async () => {
      const { data } = await supabase.auth.getSession();
      setReady((r) => r ?? !!data.session);
    }, 1200);
    return () => { sub.subscription.unsubscribe(); clearTimeout(t); };
  }, []);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (pw.length < 8) return setError("Use at least 8 characters.");
    if (pw !== pw2) return setError("The passwords don't match.");
    setBusy(true);
    const { error } = await supabase.auth.updateUser({ password: pw });
    setBusy(false);
    if (error) return setError("We couldn't update your password. Please request a new link.");
    navigate({ to: "/admin", replace: true });
  }

  return (
    <AuthCard>
      {ready === null ? (
        <p className="mt-6 flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" />Checking your link…</p>
      ) : !ready ? (
        <>
          <p className="mt-2 text-sm text-muted-foreground">This reset link is invalid or has expired.</p>
          <Link to="/admin/login" className={`${submit} mt-6`}>Back to sign in</Link>
        </>
      ) : (
        <>
          <p className="mt-2 text-sm text-muted-foreground">Choose a new password.</p>
          <form onSubmit={onSubmit} className="mt-6 space-y-4">
            <label className="block text-xs font-medium">New password<input type="password" required autoComplete="new-password" value={pw} onChange={(e) => setPw(e.target.value)} className={field} /></label>
            <label className="block text-xs font-medium">Confirm password<input type="password" required autoComplete="new-password" value={pw2} onChange={(e) => setPw2(e.target.value)} className={field} /></label>
            {error && <p role="alert" className="text-xs text-destructive">{error}</p>}
            <button type="submit" disabled={busy} className={submit}>{busy && <Loader2 className="h-3.5 w-3.5 animate-spin" />}Update password</button>
          </form>
        </>
      )}
    </AuthCard>
  );
}
