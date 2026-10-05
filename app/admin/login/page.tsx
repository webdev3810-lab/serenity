"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createSupabaseBrowserClient } from "@/src/lib/supabase/client";
import { AdminThemeToggle, useAdminTheme } from "@/src/components/AdminTheme";
import { BrandWordmark } from "@/src/components/BrandWordmark";

type Mode = "login" | "forgot" | "register";

export default function AdminLoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { theme } = useAdminTheme();
  const [mode, setMode] = useState<Mode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [hasAdmin, setHasAdmin] = useState<boolean | null>(null);
  const [statusError, setStatusError] = useState("");
  const [message, setMessage] = useState("");
  const resetMessage = searchParams.get("reset") === "success" ? "Your password has been reset. You can sign in now." : "";
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    void fetch("/api/admin/status", { cache: "no-store" })
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "Could not check admin setup.");
        setHasAdmin(!data.canRegister);
      })
      .catch((statusFailure: Error) => setStatusError(statusFailure.message));
  }, []);

  const clearFeedback = () => { setError(""); setMessage(""); };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault(); clearFeedback();
    const trimmedEmail = email.trim().toLowerCase();
    if (!/^\S+@\S+\.\S+$/.test(trimmedEmail)) { setError("Enter a valid email address."); return; }
    if (mode === "register" && password.length < 8) { setError("Use a password with at least 8 characters."); return; }
    if (mode === "register" && password !== confirmPassword) { setError("Passwords do not match."); return; }
    setLoading(true);
    try {
      if (mode === "forgot") {
        const supabase = createSupabaseBrowserClient();
        await supabase.auth.resetPasswordForEmail(trimmedEmail, { redirectTo: `${window.location.origin}/admin/reset-password` });
        setMessage("If an admin account uses that email, recovery instructions have been sent.");
      } else if (mode === "register") {
        const response = await fetch("/api/admin/bootstrap", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email: trimmedEmail, password }) });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "We could not create the first admin account.");
        setHasAdmin(true); setMode("login"); setPassword(""); setConfirmPassword("");
        setMessage("First admin account created. Sign in with your new credentials.");
      } else {
        const supabase = createSupabaseBrowserClient();
        const { error: signInError } = await supabase.auth.signInWithPassword({ email: trimmedEmail, password });
        if (signInError) throw new Error("Sign in failed. Check your email and password, then try again.");
        const next = searchParams.get("next");
        router.replace(next && (next === "/admin" || next.startsWith("/admin/") || next.startsWith("/admin?")) && !next.includes("\\") ? next : "/admin"); router.refresh();
      }
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Something went wrong. Please try again.");
    } finally { setLoading(false); }
  };

  const title = mode === "login" ? "Admin sign in" : mode === "forgot" ? "Reset admin password" : "Create first admin";
  const description = mode === "login" ? "Sign in to manage Serenity Stays." : mode === "forgot" ? "Enter your email and we’ll send recovery instructions if an admin account uses it." : "This secure setup option is available only until the first admin is created.";

  return (
    <main className={`admin-auth-shell admin-theme-${theme}`}>
      <div className="admin-auth-header"><span className="admin-eyebrow">Secure access</span><AdminThemeToggle /></div>
      <form onSubmit={submit} className="admin-card mx-auto max-w-md bg-[var(--admin-surface)] p-8 ">
        <BrandWordmark variant="admin" />
        <h1 className="admin-auth-heading mt-2 text-[var(--admin-text)]">{title}</h1>
        <p className="admin-auth-intro mt-3 text-[var(--admin-muted)]">{description}</p>
        {statusError && <p role="alert" className="mt-4 rounded-xl border border-[var(--admin-warning-border)] bg-[var(--admin-warning-bg)] p-3 text-sm font-semibold text-[var(--admin-warning-text)]">{statusError}</p>}
        {hasAdmin === null && !statusError && <p className="mt-4 text-sm text-[var(--admin-muted)]">Checking admin setup…</p>}
        <div className="mt-6 space-y-4">
          <label className="block text-sm font-medium text-[var(--admin-text)]">Email<input className="admin-field mt-1" type="email" autoComplete="email" required value={email} onChange={(event) => setEmail(event.target.value)} /></label>
          {mode !== "forgot" && <label className="block text-sm font-medium text-[var(--admin-text)]">Password<input className="admin-field mt-1" type="password" minLength={8} autoComplete={mode === "register" ? "new-password" : "current-password"} required value={password} onChange={(event) => setPassword(event.target.value)} /></label>}
          {mode === "register" && <label className="block text-sm font-medium text-[var(--admin-text)]">Confirm password<input className="admin-field mt-1" type="password" minLength={8} autoComplete="new-password" required value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} /></label>}
          {(message || resetMessage) && <p className="rounded-xl border border-[var(--admin-success-border)] bg-[var(--admin-success-bg)] p-3 text-sm font-semibold text-[var(--admin-success-text)]" role="status">{message || resetMessage}</p>}
          {error && <p role="alert" className="rounded-xl border border-[var(--admin-danger-border)] bg-[var(--admin-danger-bg)] p-3 text-sm font-semibold text-[var(--admin-danger-text)]">{error}</p>}
          <button className="admin-button admin-button-primary w-full justify-center" disabled={loading}>{loading ? "Please wait…" : mode === "login" ? "Sign in" : mode === "forgot" ? "Send recovery email" : "Create first admin account"}</button>
        </div>
        <div className="mt-6 flex flex-wrap justify-between gap-3 text-sm font-medium text-[var(--admin-text)]">
          {mode === "login" && hasAdmin === true && <button type="button" onClick={() => { clearFeedback(); setMode("forgot"); }}>Forgot password?</button>}
          {mode === "login" && hasAdmin === false && <button type="button" onClick={() => { clearFeedback(); setMode("register"); }}>Create first admin account</button>}
          {mode !== "login" && <button type="button" onClick={() => { clearFeedback(); setMode("login"); }}>Back to sign in</button>}
        </div>
      </form>
    </main>
  );
}
