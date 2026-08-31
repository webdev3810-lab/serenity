import { NextResponse } from "next/server";
import { isSupabaseConfigured } from "@/src/lib/supabase/config";
import { createSupabaseAdminClient } from "@/src/lib/supabase/admin";

const messageReference = () => `MSG-${new Date().getUTCFullYear()}-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;

export async function POST(request: Request) {
  if (!isSupabaseConfigured || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json({ error: "Contact messages are not configured." }, { status: 503 });
  }

  try {
    const body = await request.json();
    const firstName = String(body.firstName ?? "").trim();
    const lastName = String(body.lastName ?? "").trim();
    const email = String(body.email ?? "").trim().toLowerCase();
    const phone = String(body.phone ?? "").trim();
    const projectType = String(body.projectType ?? "").trim();
    const preferredHouse = String(body.preferredHouse ?? "").trim();
    const message = String(body.message ?? "").trim();
    const idempotencyKey = String(request.headers.get("Idempotency-Key") ?? body.idempotencyKey ?? "").trim();

    if (!firstName || !lastName || !email || !message) {
      return NextResponse.json({ error: "First name, last name, email, and message are required." }, { status: 400 });
    }
    if (!/^\S+@\S+\.\S+$/.test(email)) return NextResponse.json({ error: "Enter a valid email address." }, { status: 400 });
    if (idempotencyKey.length > 128 || firstName.length > 80 || lastName.length > 80 || email.length > 150 || phone.length > 30 || projectType.length > 80 || preferredHouse.length > 80 || message.length > 2000) {
      return NextResponse.json({ error: "Please shorten one or more contact fields." }, { status: 400 });
    }

    const supabase = createSupabaseAdminClient();
    if (idempotencyKey) {
      const { data: existing, error: existingError } = await supabase.from("contact_messages").select("id, reference, status").eq("idempotency_key", idempotencyKey).maybeSingle();
      if (existingError) throw existingError;
      if (existing) return NextResponse.json({ configured: true, contactMessage: existing });
    }

    const { data, error } = await supabase.from("contact_messages").insert({
      reference: messageReference(),
      first_name: firstName,
      last_name: lastName,
      email,
      phone,
      project_type: projectType,
      preferred_house: preferredHouse,
      message,
      status: "new",
      internal_notes: "",
      idempotency_key: idempotencyKey || null,
    }).select("id, reference, status").single();
    if (error) {
      if (error.code === "23505" && idempotencyKey) {
        const { data: existing } = await supabase.from("contact_messages").select("id, reference, status").eq("idempotency_key", idempotencyKey).maybeSingle();
        if (existing) return NextResponse.json({ configured: true, contactMessage: existing });
      }
      throw error;
    }

    return NextResponse.json({ configured: true, contactMessage: data }, { status: 201 });
  } catch (error) {
    console.error("Contact message persistence failed", error);
    return NextResponse.json({ error: "We could not send your message." }, { status: 500 });
  }
}
