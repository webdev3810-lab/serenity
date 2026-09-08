/* Local component fixture only. This is not a Next route or authentication bypass.
 * Requests stay on the loopback fixture server; it rejects every mutation. */
import { createRoot } from "react-dom/client";
import { useEffect, useState } from "react";
import { SupabaseAdminDashboardV2, type AdminTab } from "../../src/components/SupabaseAdminDashboardV2";
import { AdminThemeProvider } from "../../src/components/AdminTheme";
import { PropertyReviews } from "../../src/components/PropertyReviews";
import type { PropertyReview } from "../../src/data/properties";
const syntheticReviews = [5, 4, 3, 5, 2, 4].map((rating, i) => ({ id: `synthetic-${i}`, reviewerName: `Example guest ${i+1}`, reviewText: `Synthetic review ${i+1} for local layout and search checks.`, reviewDate: "2026-08-01", reviewDateLabel: "August 2026", published: true, rating, displayOrder:i, source:"Local fixture", categoryRatings: i === 0 ? {} : { cleanliness: rating, accuracy: 4, check_in: 5, communication: 4, location: 3, value: rating } } as PropertyReview));
function Preview() {
  const [url, setUrl] = useState(() => new URL(location.href));
  useEffect(() => { const sync = () => setUrl(new URL(location.href)); window.addEventListener("popstate", sync); window.addEventListener("fixture-navigation", sync); return () => { window.removeEventListener("popstate", sync); window.removeEventListener("fixture-navigation", sync); }; }, []);
  const house = url.pathname.split("/houses/")[1] ?? "";
  if(url.pathname === "/reviews-preview") return <main className="property-stay"><div className="stay-shell"><p>Synthetic reviews · local UI fixture only</p><PropertyReviews reviews={syntheticReviews}/></div></main>;
  return <AdminThemeProvider><SupabaseAdminDashboardV2 key={url.pathname} email="fixture@example.invalid" role="super_admin" initialTab={(url.searchParams.get("tab") || (house ? "houses" : "overview")) as AdminTab} initialHouseId={house === "new" ? "" : house} initialNewHouse={house === "new"} /></AdminThemeProvider>;
}
createRoot(document.getElementById("root")!).render(<Preview />);
