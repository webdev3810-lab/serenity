import { NextResponse } from "next/server";
import { getAdminUser } from "@/src/lib/supabase/auth";
import { createSupabaseServerClient } from "@/src/lib/supabase/server";
import { CMS_LIMITS } from "@/src/lib/cmsValidation";

function readText(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function validateReview(body: Record<string, unknown>) {
  const errors: string[] = [];
  const reviewerName = readText(body.reviewer_name);
  const reviewText = readText(body.review_text);
  const reviewDateLabel = readText(body.review_date_label);
  const reviewDate = body.review_date === null || body.review_date === "" ? null : String(body.review_date ?? "");

  if (!reviewerName) errors.push("Reviewer name is required.");
  if (!reviewText) errors.push("Review text is required.");
  if (reviewerName.length > CMS_LIMITS.reviewer_name) errors.push(`Reviewer name must be ${CMS_LIMITS.reviewer_name} characters or fewer.`);
  if (reviewText.length > CMS_LIMITS.review_text) errors.push(`Review text must be ${CMS_LIMITS.review_text} characters or fewer.`);
  if (reviewDateLabel.length > CMS_LIMITS.review_date_label) errors.push(`Date label must be ${CMS_LIMITS.review_date_label} characters or fewer.`);
  if (reviewDate && !/^\d{4}-\d{2}-\d{2}$/.test(reviewDate)) errors.push("Review date must use YYYY-MM-DD format.");

  const displayOrder = Number(body.display_order ?? 0);
  if (!Number.isInteger(displayOrder) || displayOrder < 0) errors.push("Display order must be a whole number of zero or more.");

  return { errors, reviewerName, reviewText, reviewDateLabel, reviewDate, displayOrder, published: body.published !== false };
}

export async function POST(request: Request) {
  const admin = await getAdminUser();
  if (!admin) return NextResponse.json({ error: "Unauthorised." }, { status: 403 });

  let body: Record<string, unknown>;
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Invalid review request." }, { status: 400 }); }

  const propertyId = typeof body.property_id === "string" ? body.property_id : "";
  if (!propertyId) return NextResponse.json({ error: "Select a house for this review." }, { status: 400 });

  const validation = validateReview(body);
  if (validation.errors.length) return NextResponse.json({ error: validation.errors.join(" ") }, { status: 422 });

  const supabase = await createSupabaseServerClient();
  const { data: property, error: propertyError } = await supabase.from("properties").select("id").eq("id", propertyId).maybeSingle();
  if (propertyError || !property) return NextResponse.json({ error: "Selected house could not be found." }, { status: 404 });

  const { data, error } = await supabase.from("property_reviews").insert({
    property_id: propertyId,
    reviewer_name: validation.reviewerName,
    review_text: validation.reviewText,
    rating: 5,
    review_date: validation.reviewDate,
    review_date_label: validation.reviewDateLabel || null,
    source: "Manual",
    source_review_id: `manual-${crypto.randomUUID()}`,
    display_order: validation.displayOrder,
    published: validation.published,
  }).select("*").single();

  if (error) return NextResponse.json({ error: "Could not create the review." }, { status: 500 });
  return NextResponse.json({ review: data }, { status: 201 });
}
