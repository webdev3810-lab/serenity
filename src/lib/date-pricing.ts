export type DateRate = { price_date: string; nightly_price: number; label?: string; is_active?: boolean };
export function isCalendarDate(value: string) { return /^\d{4}-\d{2}-\d{2}$/.test(value) && Number.isFinite(Date.parse(`${value}T00:00:00Z`)) && new Date(`${value}T00:00:00Z`).toISOString().slice(0,10) === value; }
/** Both boundaries are occupied nights. Booking checkout remains exclusive. */
export function pricingDates(start: string, end: string): string[] {
  if (!isCalendarDate(start) || !isCalendarDate(end) || start>end) throw new Error("Choose valid pricing dates in chronological order.");
  const count=(Date.parse(end+'T00:00:00Z')-Date.parse(start+'T00:00:00Z'))/86400000+1;
  if (count>730) throw new Error("Select at most 730 nights at once.");
  return Array.from({length:count},(_,i)=>new Date(Date.parse(start+'T00:00:00Z')+i*86400000).toISOString().slice(0,10));
}
export function applyDateRates(existing: DateRate[], start: string, end: string, rate: number | null, label = ""): DateRate[] {
  const dates=pricingDates(start,end), selected=new Set(dates);
  if (rate !== null && (!Number.isFinite(rate) || rate < 0 || rate > 100000)) throw new Error("Use a nightly rate between $0 and $100,000.");
  if(label.length>120)throw new Error("Rate labels must be 120 characters or fewer.");
  return [...existing.filter(r=>!selected.has(r.price_date)),...(rate===null?[]:dates.map(price_date=>({price_date,nightly_price:rate,label:label.trim(),is_active:true})))].sort((a,b)=>a.price_date.localeCompare(b.price_date));
}
