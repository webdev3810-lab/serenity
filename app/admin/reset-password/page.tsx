"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/src/lib/supabase/client";
import { AdminThemeToggle, useAdminTheme } from "@/src/components/AdminTheme";
import { BrandWordmark } from "@/src/components/BrandWordmark";

export default function AdminResetPasswordPage() {
  const router = useRouter();
  const { theme } = useAdminTheme();
  const [checking, setChecking] = useState(true);
  const [ready, setReady] = useState(false);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const supabase = createSupabaseBrowserClient();
    void supabase.auth.getSession().then(({ data }) => setReady(Boolean(data.session))).catch(() => setError("Could not check your recovery link. Reload to try again.")).finally(() => setChecking(false));
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => setReady(Boolean(session)));
    return () => listener.subscription.unsubscribe();
  }, []);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault(); setError("");
    if (!ready) { setError("This recovery link is missing or expired. Request a new one."); return; }
    if (password.length < 8) { setError("Use a password with at least 8 characters."); return; }
    if (password !== confirmPassword) { setError("Passwords do not match."); return; }
    setLoading(true);
    const supabase = createSupabaseBrowserClient();
    try {
    const { error: updateError } = await supabase.auth.updateUser({ password });
    if (updateError) setError("We could not update your password. Request a new recovery link and try again.");
    else { await supabase.auth.signOut(); router.replace("/admin/login?reset=success"); }
    } catch { setError("Could not update your password. Check your connection and try again."); } finally { setLoading(false); }
  };

  return <main className={`admin-auth-shell admin-theme-${theme}`}><div className="admin-auth-header"><span className="admin-eyebrow">Secure access</span><AdminThemeToggle /></div><form onSubmit={submit} className="admin-card mx-auto max-w-md bg-[var(--admin-surface)] p-8 "><BrandWordmark variant="admin" /><h1 className="mt-2 text-2xl font-semibold text-[var(--admin-text)]">Set a new password</h1><p className="mt-2 text-sm text-[var(--admin-muted)]">Choose a new password for your admin account.</p>{checking ? <p className="mt-4" role="status">Checking recovery link…</p> : !ready && <div className="admin-notice mt-4">This recovery link is missing or expired. <a href="/admin/login" className="underline">Request a new link</a></div>}<div className="mt-6 space-y-4"><label className="block text-sm font-medium text-[var(--admin-text)]">New password<input className="admin-field mt-1" type="password" minLength={8} autoComplete="new-password" required value={password} onChange={(event) => setPassword(event.target.value)} /></label><label className="block text-sm font-medium text-[var(--admin-text)]">Confirm password<input className="admin-field mt-1" type="password" minLength={8} autoComplete="new-password" required value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} /></label>{error && <p role="alert" className="rounded-xl border border-[var(--admin-danger-border)] bg-[var(--admin-danger-bg)] p-3 text-sm font-semibold text-[var(--admin-danger-text)]">{error}</p>}<button className="admin-button admin-button-primary w-full justify-center" disabled={loading || !ready || checking}>{loading ? "Updating…" : "Update password"}</button></div></form></main>;
}
