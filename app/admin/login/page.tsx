"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, ArrowRight, LockKeyhole } from "lucide-react";
import { createSupabaseBrowserClient } from "@/src/lib/supabase/client";
import { AdminThemeToggle, useAdminTheme } from "@/src/components/AdminTheme";
import { BrandWordmark } from "@/src/components/BrandWordmark";
import { AdminPasswordField } from "@/src/components/admin/AdminPasswordField";

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
        const response = await fetch("/api/admin/password-recovery", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: trimmedEmail }),
        });
        if (!response.ok) throw new Error("Recovery email is temporarily unavailable. Please try again later.");
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

  const title = mode === "login" ? "Welcome back" : mode === "forgot" ? "Reset your password" : "Create your admin account";
  const description = mode === "login" ? "Sign in with your admin details to continue to your workspace." : mode === "forgot" ? "Enter your email and we’ll send recovery instructions if an admin account uses it." : "This secure setup option is available only until the first admin is created.";

  return (
    <main className={`admin-auth-shell admin-login-page admin-theme-${theme}`}>
      <div className="admin-auth-header admin-login-header">
        <Link href="/" className="admin-login-back"><ArrowLeft size={17} aria-hidden="true" />Back to website</Link>
        <AdminThemeToggle />
      </div>
      <div className="admin-login-layout">
        <aside className="admin-login-brand" aria-label="Serenity workspace">
          <BrandWordmark variant="admin" priority />
          <div className="admin-login-brand__copy">
            <span className="admin-login-brand__eyebrow">SERENITY WORKSPACE</span>
            <p className="admin-login-brand__headline">Your stays,<br />all in one place.</p>
            <p>Manage bookings, availability and guest enquiries from your private workspace.</p>
          </div>
          <div className="admin-login-brand__foot"><LockKeyhole size={16} aria-hidden="true" />Private admin access</div>
        </aside>
        <form onSubmit={submit} className="admin-login-form">
          <div className="admin-login-form__intro">
            <span className="admin-login-form__eyebrow">{mode === "login" ? "ADMIN SIGN IN" : mode === "forgot" ? "ACCOUNT RECOVERY" : "ADMIN SETUP"}</span>
            <h1 className="admin-auth-heading">{title}</h1>
            <p className="admin-auth-intro">{description}</p>
          </div>
          {statusError && <p role="alert" className="admin-login-feedback admin-login-feedback--warning">{statusError}</p>}
          {hasAdmin === null && !statusError && <p className="admin-login-setup" role="status">Checking admin setup…</p>}
          <div className="admin-login-fields">
            <label className="admin-login-label">Email address<input className="admin-field" type="email" autoComplete="email" inputMode="email" placeholder="you@example.com" required value={email} onChange={(event) => setEmail(event.target.value)} /></label>
            {mode !== "forgot" && <AdminPasswordField label="Password" value={password} onChange={setPassword} autoComplete={mode === "register" ? "new-password" : "current-password"} />}
            {mode === "register" && <AdminPasswordField label="Confirm password" value={confirmPassword} onChange={setConfirmPassword} autoComplete="new-password" />}
            {mode === "login" && hasAdmin === true && <button className="admin-login-text-button admin-login-forgot" type="button" onClick={() => { clearFeedback(); setMode("forgot"); }}>Forgot password?</button>}
            {(message || resetMessage) && <p className="admin-login-feedback admin-login-feedback--success" role="status">{message || resetMessage}</p>}
            {error && <p role="alert" className="admin-login-feedback admin-login-feedback--error">{error}</p>}
            <button className="admin-button admin-button-primary admin-login-submit" disabled={loading}>{loading ? "Please wait…" : mode === "login" ? "Sign in" : mode === "forgot" ? "Send recovery email" : "Create first admin account"}<ArrowRight size={17} aria-hidden="true" /></button>
          </div>
          {(mode !== "login" || hasAdmin === false) && <div className="admin-login-footer">
            {mode === "login" && hasAdmin === false && <button className="admin-login-text-button" type="button" onClick={() => { clearFeedback(); setMode("register"); }}>Create first admin account</button>}
            {mode !== "login" && <button className="admin-login-text-button" type="button" onClick={() => { clearFeedback(); setMode("login"); }}><ArrowLeft size={15} aria-hidden="true" />Back to sign in</button>}
          </div>}
        </form>
      </div>
    </main>
  );
}
