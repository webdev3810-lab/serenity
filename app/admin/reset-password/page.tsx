"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/src/lib/supabase/client";
import { AdminThemeToggle, useAdminTheme } from "@/src/components/AdminTheme";

export default function AdminResetPasswordPage() {
  const router = useRouter();
  const { theme } = useAdminTheme();
  const [ready, setReady] = useState(false);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const supabase = createSupabaseBrowserClient();
    void supabase.auth.getSession().then(({ data }) => setReady(Boolean(data.session)));
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
    const { error: updateError } = await supabase.auth.updateUser({ password });
    if (updateError) setError("We could not update your password. Request a new recovery link and try again.");
    else { await supabase.auth.signOut(); router.replace("/admin/login?reset=success"); }
    setLoading(false);
  };

  return <main className={`admin-auth-shell admin-theme-${theme}`}><div className="admin-auth-header"><span className="admin-eyebrow">Secure access</span><AdminThemeToggle /></div><form onSubmit={submit} className="card mx-auto max-w-md bg-white p-8 shadow-sm"><span className="eyebrow">Serenity Stays</span><h1 className="mt-2 text-2xl font-extrabold text-stone-900">Set a new password</h1><p className="mt-2 text-sm text-stone-600">Choose a new password for your admin account.</p><div className="mt-6 space-y-4"><label className="block text-xs font-bold text-stone-900">New password<input className="field mt-1" type="password" minLength={8} autoComplete="new-password" required value={password} onChange={(event) => setPassword(event.target.value)} /></label><label className="block text-xs font-bold text-stone-900">Confirm password<input className="field mt-1" type="password" minLength={8} autoComplete="new-password" required value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} /></label>{error && <p className="rounded-none border border-red-200 bg-red-50 p-3 text-xs font-semibold text-red-700">{error}</p>}<button className="btn-primary w-full justify-center" disabled={loading}>{loading ? "Updating…" : "Update password"}</button></div></form></main>;
}
