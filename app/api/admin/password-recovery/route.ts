import { NextResponse } from "next/server";
import { isSupabaseConfigured } from "@/src/lib/supabase/config";
import { createSupabaseAdminClient } from "@/src/lib/supabase/admin";
import { sendAdminPasswordRecovery } from "@/src/lib/transactionalEmail";

const genericResponse = () => NextResponse.json({ sent: true });
const recentRequests = new Map<string, number>();

function resetUrl(request: Request): string | null {
  const origin = new URL(request.url);
  if (process.env.NODE_ENV !== "production" && ["localhost", "127.0.0.1"].includes(origin.hostname)) {
    return new URL("/admin/reset-password", origin).toString();
  }

  const configured = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  try {
    const url = new URL("/admin/reset-password", configured || "https://www.serenityhomesdirect.com");
    return url.protocol === "https:" ? url.toString() : null;
  } catch { return null; }
}

export async function POST(request: Request) {
  if (!isSupabaseConfigured || !process.env.SUPABASE_SERVICE_ROLE_KEY || !process.env.RESEND_API_KEY || !process.env.RESEND_FROM_EMAIL) {
    return NextResponse.json({ error: "Password recovery is temporarily unavailable." }, { status: 503 });
  }

  const redirectTo = resetUrl(request);
  if (!redirectTo) return NextResponse.json({ error: "Password recovery is temporarily unavailable." }, { status: 503 });

  let body: unknown;
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Enter a valid email address." }, { status: 400 }); }
  const email = typeof body === "object" && body !== null && "email" in body && typeof body.email === "string"
    ? body.email.trim().toLowerCase() : "";
  if (email.length > 254 || !/^\S+@\S+\.\S+$/.test(email)) {
    return NextResponse.json({ error: "Enter a valid email address." }, { status: 400 });
  }

  // A short per-address cooldown limits accidental repeats; responses never reveal account existence.
  const now = Date.now();
  for (const [key, expires] of recentRequests) if (expires <= now) recentRequests.delete(key);
  if ((recentRequests.get(email) ?? 0) > now) return genericResponse();
  recentRequests.set(email, now + 60_000);

  try {
    const supabase = createSupabaseAdminClient();
    const { data: admin, error: lookupError } = await supabase.from("admin_users")
      .select("email")
      .eq("email", email)
      .eq("active", true)
      .maybeSingle();
    if (lookupError) throw lookupError;
    if (!admin) return genericResponse();

    const { data, error: linkError } = await supabase.auth.admin.generateLink({
      type: "recovery",
      email: admin.email,
      options: { redirectTo },
    });
    if (linkError || !data?.properties.action_link) throw linkError ?? new Error("No recovery link was generated.");
    if (data.properties.redirect_to !== redirectTo) throw new Error("Supabase rejected the recovery redirect URL.");

    await sendAdminPasswordRecovery(admin.email, data.properties.action_link);
  } catch (error) {
    recentRequests.delete(email);
    // Do not log or return the recovery URL, email address, or whether an account exists.
    console.error("Admin password recovery could not be sent", error instanceof Error ? error.name : "Unknown error");
  }

  return genericResponse();
}
