"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/src/lib/supabase/client";
import { AdminThemeToggle, useAdminTheme } from "@/src/components/AdminTheme";

type Mode = "login" | "forgot" | "register";

export default function AdminLoginPage() {
  const router = useRouter();
  const { theme } = useAdminTheme();
  const [mode, setMode] = useState<Mode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [hasAdmin, setHasAdmin] = useState<boolean | null>(null);
  const [statusError, setStatusError] = useState("");
  const [message, setMessage] = useState(() => typeof window !== "undefined" && new URLSearchParams(window.location.search).get("reset") === "success" ? "Your password has been reset. You can sign in now." : "");
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
        router.replace("/admin"); router.refresh();
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
      <form onSubmit={submit} className="card mx-auto max-w-md bg-white p-8 shadow-sm">
        <span className="eyebrow">Serenity Stays</span>
        <h1 className="auth-heading mt-2 text-stone-900">{title}</h1>
        <p className="page-intro mt-3 text-stone-600">{description}</p>
        {statusError && <p className="mt-4 rounded-none border border-amber-200 bg-amber-50 p-3 text-xs font-semibold text-amber-800">{statusError}</p>}
        {hasAdmin === null && !statusError && <p className="mt-4 text-xs text-stone-500">Checking admin setup…</p>}
        <div className="mt-6 space-y-4">
          <label className="block text-sm font-bold text-stone-900">Email<input className="field mt-1" type="email" autoComplete="email" required value={email} onChange={(event) => setEmail(event.target.value)} /></label>
          {mode !== "forgot" && <label className="block text-sm font-bold text-stone-900">Password<input className="field mt-1" type="password" minLength={8} autoComplete={mode === "register" ? "new-password" : "current-password"} required value={password} onChange={(event) => setPassword(event.target.value)} /></label>}
          {mode === "register" && <label className="block text-sm font-bold text-stone-900">Confirm password<input className="field mt-1" type="password" minLength={8} autoComplete="new-password" required value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} /></label>}
          {message && <p className="rounded-none border border-green-200 bg-green-50 p-3 text-xs font-semibold text-green-700">{message}</p>}
          {error && <p className="rounded-none border border-red-200 bg-red-50 p-3 text-xs font-semibold text-red-700">{error}</p>}
          <button className="btn-primary w-full justify-center" disabled={loading}>{loading ? "Please wait…" : mode === "login" ? "Sign in" : mode === "forgot" ? "Send recovery email" : "Create first admin account"}</button>
        </div>
        <div className="mt-6 flex flex-wrap justify-between gap-3 text-sm font-bold text-[#7A4E2D]">
          {mode === "login" && hasAdmin === true && <button type="button" onClick={() => { clearFeedback(); setMode("forgot"); }}>Forgot password?</button>}
          {mode === "login" && hasAdmin === false && <button type="button" onClick={() => { clearFeedback(); setMode("register"); }}>Create first admin account</button>}
          {mode !== "login" && <button type="button" onClick={() => { clearFeedback(); setMode("login"); }}>Back to sign in</button>}
        </div>
      </form>
    </main>
  );
}
