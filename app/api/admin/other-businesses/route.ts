import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { normalizeOtherBusinesses, OTHER_BUSINESSES_PAGE_KEY, validateOtherBusinesses } from "@/src/lib/otherBusinessesContent";
import { createSupabaseAdminClient } from "@/src/lib/supabase/admin";
import { getAdminUser } from "@/src/lib/supabase/auth";

export async function GET() {
  if (!await getAdminUser()) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
  const { data, error } = await createSupabaseAdminClient().from("homepage_content").select("content, updated_at").eq("page_key", OTHER_BUSINESSES_PAGE_KEY).maybeSingle();
  if (error) return NextResponse.json({ error: "Could not load Other Businesses content." }, { status: 500 });
  return NextResponse.json({ content: normalizeOtherBusinesses(data?.content), revision: data?.updated_at ?? null }, { headers: { "Cache-Control": "no-store" } });
}

export async function PUT(request: Request) {
  if (!await getAdminUser()) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
  let body: unknown;
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Invalid content." }, { status: 400 }); }
  if (!body || typeof body !== "object" || Array.isArray(body)) return NextResponse.json({ error: "Invalid content." }, { status: 400 });
  const input = body as { content?: unknown; revision?: unknown };
  if (!input.content || typeof input.content !== "object" || Array.isArray(input.content)) return NextResponse.json({ error: "Invalid content." }, { status: 400 });
  if (input.revision !== null && (typeof input.revision !== "string" || !Number.isFinite(Date.parse(input.revision)))) return NextResponse.json({ error: "Reload this page before saving." }, { status: 400 });
  const content = normalizeOtherBusinesses(input.content);
  const errors = validateOtherBusinesses(content);
  if (errors.length) return NextResponse.json({ error: errors.join(" ") }, { status: 400 });
  const supabase = createSupabaseAdminClient();
  const payload = { content, published: true };
  const result = input.revision
    ? await supabase.from("homepage_content").update(payload).eq("page_key", OTHER_BUSINESSES_PAGE_KEY).eq("updated_at", input.revision).select("updated_at").maybeSingle()
    : await supabase.from("homepage_content").insert({ page_key: OTHER_BUSINESSES_PAGE_KEY, ...payload }).select("updated_at").single();
  if (result.error?.code === "23505" || (!result.error && !result.data)) return NextResponse.json({ error: "Another admin updated this page. Reload before saving." }, { status: 409 });
  if (result.error) return NextResponse.json({ error: "Could not publish Other Businesses content. Your edits remain in the editor." }, { status: 500 });
  revalidatePath("/other-businesses");
  revalidatePath("/other-businesses/airbnb");
  revalidatePath("/other-businesses/specialist-suites");
  return NextResponse.json({ content, revision: result.data?.updated_at });
}
