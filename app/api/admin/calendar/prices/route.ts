import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { parseCalendarPricingChange } from "@/src/lib/calendar-pricing";
import { getAdminUser } from "@/src/lib/supabase/auth";
import { createSupabaseAdminClient } from "@/src/lib/supabase/admin";

export async function PATCH(request: Request) {
  if (!await getAdminUser()) return NextResponse.json({ error: "You must be signed in as an admin." }, { status: 401 });
  let change: ReturnType<typeof parseCalendarPricingChange>;
  try {
    change = parseCalendarPricingChange(await request.json());
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Choose a valid price change." }, { status: 400 });
  }
  try {
    const supabase = createSupabaseAdminClient();
    const { data: property, error: propertyError } = await supabase.from("properties").select("id, slug").eq("id", change.propertyId).maybeSingle();
    if (propertyError) throw propertyError;
    if (!property) return NextResponse.json({ error: "This house could not be found." }, { status: 404 });

    if (change.action === "default") {
      const { error } = await supabase.from("properties").update({ nightly_price: change.rate }).eq("id", property.id);
      if (error) throw error;
    } else if (change.action === "reset") {
      const { error } = await supabase.from("property_date_prices").delete().eq("property_id", property.id).in("price_date", change.dates);
      if (error) throw error;
    } else {
      const { error } = await supabase.from("property_date_prices").upsert(change.dates.map((date) => ({
        property_id: property.id, price_date: date, nightly_price: change.rate, label: change.label, is_active: true,
      })), { onConflict: "property_id,price_date" });
      if (error) throw error;
    }

    revalidatePath(`/properties/${property.slug}`);
    revalidatePath("/homes");
    revalidatePath("/");
    revalidatePath("/corporate-stays");
    return NextResponse.json({ saved: true, action: change.action, nights: change.action === "default" ? undefined : change.dates.length });
  } catch (error) {
    console.error("Calendar pricing update failed", error);
    return NextResponse.json({ error: "Prices could not be saved. Please try again." }, { status: 500 });
  }
}
