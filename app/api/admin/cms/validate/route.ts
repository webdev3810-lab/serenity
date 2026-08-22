import { NextResponse } from "next/server";
import { getAdminUser } from "@/src/lib/supabase/auth";
import { validateCmsContent, type CmsValidationScope } from "@/src/lib/cmsValidation";

const scopes = new Set<CmsValidationScope>(["property", "homepage", "settings"]);

export async function POST(request: Request) {
  const admin = await getAdminUser();
  if (!admin) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });

  let body: { scope?: CmsValidationScope; payload?: Record<string, unknown> };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid validation request." }, { status: 400 });
  }

  if (!body.scope || !scopes.has(body.scope) || !body.payload || typeof body.payload !== "object") {
    return NextResponse.json({ error: "Invalid CMS validation request." }, { status: 400 });
  }

  const errors = validateCmsContent(body.scope, body.payload);
  if (errors.length) return NextResponse.json({ valid: false, errors }, { status: 422 });
  return NextResponse.json({ valid: true, errors: [] });
}
