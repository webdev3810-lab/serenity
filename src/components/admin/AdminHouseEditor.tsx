"use client";
import type { DateRate } from "@/src/lib/date-pricing";
import { AmenityEditor } from "./AmenityEditor";
import { GuestsPricingEditor } from "./GuestsPricingEditor";
import { PricingCalendar } from "./PricingCalendar";
import { RoomsEditor } from "./RoomsEditor";


/* The CMS reads flexible Supabase rows, so the boundary is intentionally defensive. */
/* eslint-disable @typescript-eslint/no-explicit-any */

import PropertyPhotoManager,{type PropertyPhotoManagerHandle} from "@/src/components/PropertyPhotoManager";
import { Building2,ChevronLeft,ChevronRight,Plus,Save,Search,Trash2 } from "lucide-react";
import Image from "next/image";
import { useRef,useState } from "react";

import { AdminBadge as StatusBadge,useAdminWorkspace } from "@/src/components/admin/AdminUI";

import { CharacterField,NumberField,PageHeader,RepeatableList,Toggle } from "./AdminFields";
import { asBeds,asDatePrices,asList,propertyImageSource,Row } from "./AdminModels";
export function LegacyHouseEditor({ draft, setDraft, selectedId, images }: { draft:Row; setDraft:(update:(r:Row)=>Row)=>void; selectedId:string; images:Row[] }) {
 const field=(key:string,value:unknown)=>setDraft(r=>({...r,[key]:value}));
 const photos=images.filter(image=>image.property_id===selectedId&&!image.is_placeholder).map(image=>({src:propertyImageSource(image),label:String(image.alt_text||image.category||"Property photo")})).filter(p=>p.src);
 return <><section className="admin-card grid gap-5 p-5 sm:p-7 md:grid-cols-2"><div className="md:col-span-2"><h2 className="text-xl font-semibold">Listing details</h2><p className="text-sm text-[var(--admin-muted)]">Clear, accurate information for your guests.</p></div>
 {[["Property name","name",80],["Slug","slug",80],["Location","location",100],["Property type","property_type",80]].map(([label,key,limit])=><CharacterField key={String(key)} label={String(label)} value={draft[String(key)]} onChange={v=>field(String(key),v)} limit={Number(limit)}/>)}
 <CharacterField label="Short description" value={draft.short_description} onChange={v=>field("short_description",v)} limit={220} textarea/><CharacterField label="Full description" value={draft.full_description} onChange={v=>field("full_description",v)} limit={2000} textarea/>
 {[["Bedrooms","bedrooms"],["Beds","beds"],["Bathrooms","bathrooms"]].map(([label,key])=><NumberField key={key} label={label} value={draft[key]} onChange={v=>field(key,v)}/>)}
 <div className="md:col-span-2 flex flex-wrap gap-5"><Toggle label="Published on public website" checked={Boolean(draft.published)} onChange={v=>field("published",v)}/><Toggle label="Featured house" checked={Boolean(draft.featured)} onChange={v=>field("featured",v)}/></div></section>
 <GuestsPricingEditor draft={draft} setDraft={setDraft}/><PricingCalendar datePrices={asDatePrices(draft.date_prices) as DateRate[]} defaultRate={Number(draft.nightly_price)} onChange={prices=>field("date_prices",prices)} onDefaultChange={v=>field("nightly_price",v)}/>
 <RoomsEditor rooms={asBeds(draft.bed_arrangements)} photos={photos} onChange={rooms=>field("bed_arrangements",rooms)}/>
 <AmenityEditor labels={asList(draft.amenities)} details={draft.amenity_details} onChange={items=>setDraft(r=>({...r,amenities:items.map(a=>a.label),amenity_details:items}))}/>
 </>;
}

export function HouseEditor(props: any) {
  const { confirm } = useAdminWorkspace();
  const [query, setQuery] = useState("");
  const [galleryDirty, setGalleryDirty] = useState(false);
  const [savingAll, setSavingAll] = useState(false);
  const photoManagerRef = useRef<PropertyPhotoManagerHandle>(null);
  const creatingNew = Boolean(props.initialNewHouse);
  const matchingProperties = props.properties.filter((property: Row) => String(property.name ?? "").toLowerCase().includes(query.toLowerCase()) || String(property.location ?? "").toLowerCase().includes(query.toLowerCase()));
  const selectedProperty = props.properties.find((property: Row) => String(property.id) === String(props.selectedId));
  const handleSelect = (property: Row) => { props.openHouse(String(property.id)); };
  const handleNew = () => { props.openNewHouse(); };
  const handleBack = () => props.onBackToHouses();
  const handleCancel = async () => {
    if ((props.dirty || galleryDirty) && !await confirm({ title: "Discard house edits?", description: "Restore the last saved house details and gallery settings.", confirmLabel: "Discard changes", destructive: true })) return;
    photoManagerRef.current?.discardChanges();
    if (creatingNew && !props.selectedId) return props.onBackToHouses();
    if (selectedProperty) props.editProperty(selectedProperty);
    else props.onBackToHouses();
  };
  const handleSave = async () => {
    setSavingAll(true);
    try {
      const gallerySaved = await photoManagerRef.current?.saveChanges();
      if (gallerySaved === false) return;
      await props.saveProperty(Boolean(props.draft.published));
    } finally {
      setSavingAll(false);
    }
  };
  const showEditor = Boolean(props.selectedId) || creatingNew;
  const bookingErrors = getBookingRuleErrors(props.draft, props.properties.length);
  const isDetailPage = Boolean(props.isDetailPage);

  return <div className="grid gap-6">
    {!isDetailPage && <><PageHeader eyebrow="Houses" title="Choose a house to manage" description="Start with a house card, then open its dedicated detail page to edit the listing." action={<button type="button" className="admin-button inline-flex items-center gap-2" onClick={handleNew}><Plus size={16} /> New house</button>} />
    <section className="grid gap-4">
      <div className="flex flex-wrap items-end justify-between gap-3"><div><p className="text-sm font-medium text-[var(--admin-text)]">Your houses</p><h2 className="mt-1 text-xl font-semibold text-[var(--admin-text)]">Select a property</h2><p className="mt-1 text-sm text-[var(--admin-muted)]">Choose a house card to open its details.</p></div><div className="relative w-full max-w-xs"><Search className="admin-search-icon" size={18} aria-hidden="true" /><input className="admin-field admin-search-input" aria-label="Search houses" placeholder="Search houses" value={query} onChange={(event) => setQuery(event.target.value)} /></div></div>
      {matchingProperties.length ? <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{matchingProperties.map((property: Row) => <HouseSelectorCard key={String(property.id)} property={property} images={props.images} selected={String(props.selectedId) === String(property.id)} onSelect={() => handleSelect(property)} />)}</div> : <div className="rounded-2xl border border-dashed border-[var(--admin-border)] bg-[var(--admin-surface-alt)] p-8 text-center text-sm text-[var(--admin-muted)]">No houses match your search.</div>}
    </section></>}
    {isDetailPage && showEditor ? <>
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[var(--admin-border)] bg-[var(--admin-surface-alt)] p-4 sm:p-5"><div className="min-w-0"><p className="text-sm font-medium text-[var(--admin-text)]">{creatingNew && !props.selectedId ? "New house" : "Selected house"}</p><h2 className="mt-1 truncate text-xl font-semibold text-[var(--admin-text)]">{creatingNew && !props.selectedId ? "Create a new furnished house" : selectedProperty?.name || "House details"}</h2><p className="mt-1 text-sm text-[var(--admin-muted)]">{creatingNew && !props.selectedId ? "Add the core listing details, then save a draft or publish it." : "Update the sections below without losing your place."}</p></div><select className="admin-field max-w-xs" aria-label="Select property to edit" value={props.selectedId || ""} onChange={e=>props.openHouse(e.target.value)}><option value="" disabled>New house</option>{props.properties.map((p:Row)=><option key={p.id} value={p.id}>{p.name}</option>)}</select><button type="button" className="admin-button inline-flex min-h-10 items-center gap-2" onClick={handleBack}><ChevronLeft size={16} /> Back to houses</button></div>
      {props.selectedId && <section className="admin-card overflow-hidden bg-[var(--admin-surface)]"><div className="border-b border-[var(--admin-border)] px-5 py-4 sm:px-7"><p className="text-sm font-medium text-[var(--admin-text)]">Media</p><h2 className="mt-1 text-xl font-semibold">Property gallery</h2><p className="mt-1 text-sm text-[var(--admin-muted)]">Upload, organise, and publish photos for the selected house.</p></div><div className="p-5 sm:p-7"><PropertyPhotoManager ref={photoManagerRef} properties={props.properties} selectedId={props.selectedId} setSelectedId={props.setSelectedId} onSelectProperty={handleSelect} images={props.images} reload={props.reload} notify={props.notify} onError={props.onError} onDirtyChange={setGalleryDirty} embedded showHeader={false} showPropertySelector={false} /></div></section>}
      <LegacyHouseEditor images={props.images} draft={props.draft} setDraft={props.setDraft} selectedId={props.selectedId} />
      <HouseDetailsEditor draft={props.draft} setDraft={props.setDraft} />
      <BookingRulesEditor draft={props.draft} setDraft={props.setDraft} propertyCount={props.properties.length} />
      <HouseEditorActionBar dirty={props.dirty || galleryDirty} draft={props.draft} saving={props.saving || savingAll} invalid={bookingErrors.length > 0} onSave={() => void handleSave()} onCancel={handleCancel} onDelete={props.selectedId ? () => void props.deleteProperty() : undefined} />
    </> : isDetailPage ? <div className="rounded-2xl border border-dashed border-[var(--admin-border)] bg-[var(--admin-surface)] p-8 text-center"><Building2 className="mx-auto text-[var(--admin-text)]" size={28} aria-hidden="true" /><h3 className="mt-3 text-lg font-semibold text-[var(--admin-text)]">House not found</h3><p className="mx-auto mt-1 max-w-md text-sm leading-relaxed text-[var(--admin-muted)]">Return to Houses and choose a published or draft house from the list.</p><button type="button" className="admin-button mt-4" onClick={props.onBackToHouses}>Back to houses</button></div> : null}
  </div>;
}

export function HouseSelectorCard({ property, images, selected, onSelect }: { property: Row; images: Row[]; selected: boolean; onSelect: () => void }) {
  const propertyImages = images.filter((image) => String(image.property_id) === String(property.id));
  const coverImage = propertyImages.find((image) => image.is_cover === true && image.is_visible !== false) ?? propertyImages.find((image) => image.is_visible !== false && String(image.category ?? "") !== "unsorted") ?? propertyImages[0];
  const imageSource = coverImage ? propertyImageSource(coverImage) : "";
  const status = property.published ? "Published" : "Draft";
  return <button type="button" onClick={onSelect} aria-pressed={selected} className={`group overflow-hidden rounded-2xl border bg-[var(--admin-surface)] text-left  transition duration-200 hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--admin-focus)] focus-visible:ring-offset-2 ${selected ? "border-[var(--admin-border)] ring-2 ring-[var(--admin-border)]" : "border-[var(--admin-border)] hover:border-[var(--admin-border)]"}`}>
    <div className="relative h-44 overflow-hidden bg-[var(--admin-surface-alt)] sm:h-52">{imageSource ? <Image src={imageSource} alt={String(coverImage?.alt_text || `${property.name} cover photo`)} fill loading="eager" sizes="(max-width: 640px) 100vw, (max-width: 1280px) 50vw, 33vw" className="object-cover transition duration-500 group-hover:scale-105" unoptimized={Boolean(coverImage?.external_url)} /> : <div className="flex h-full flex-col items-center justify-center gap-2 text-[var(--admin-text)]"><Building2 size={28} aria-hidden="true" /><span className="text-sm font-medium">No cover photo</span></div>}<div className="absolute inset-x-0 top-0 flex items-center justify-between gap-2 bg-gradient-to-b from-black/45 to-transparent p-3"><span className="rounded-full bg-[var(--admin-surface)] px-2.5 py-1 text-xs font-medium text-[var(--admin-text)]">{status}</span>{selected && <span className="rounded-full bg-[var(--admin-accent)] px-2.5 py-1 text-xs font-medium text-[var(--admin-on-accent)]">Selected</span>}</div></div>
    <div className="p-4 sm:p-5"><div className="flex items-start justify-between gap-3"><div className="min-w-0"><h3 className="truncate text-xl font-semibold text-[var(--admin-text)]">{property.name || "Unnamed house"}</h3><p className="mt-1 truncate text-sm text-[var(--admin-muted)]">{property.location || "Pakenham, Victoria"}</p></div><ChevronRight className="mt-1 shrink-0 text-[var(--admin-text)] transition-transform group-hover:translate-x-1" size={18} aria-hidden="true" /></div><div className="mt-4 flex flex-wrap gap-x-4 gap-y-2 border-t border-[var(--admin-border)] pt-3 text-sm font-semibold text-[var(--admin-muted)]"><span>{Number(property.bedrooms ?? 0)} bedrooms</span><span>{Number(property.max_guests ?? 0)} guests</span><span>{Number(propertyImages.length)} photos</span></div><p className="mt-4 text-sm font-medium text-[var(--admin-text)]">Open house details</p></div>
  </button>;
}

export function getBookingRuleErrors(draft: Row, propertyCount: number) {
  const minimumStay = Number(draft.minimum_stay || 1);
  const maximumStay = Number(draft.maximum_stay || 0);
  const minimumGuests = Number(draft.minimum_guests || 1);
  const maximumGuests = Number(draft.max_guests || 0);
  const minimumCorporateStay = Number(draft.minimum_corporate_stay || 0);
  const minimumCorporateHouses = Number(draft.minimum_corporate_houses || 0);
  const maximumCorporateHouses = Number(draft.maximum_corporate_houses || 0);
  return [
    maximumStay < minimumStay ? "Maximum stay must be at least the minimum stay." : "",
    minimumGuests > maximumGuests ? "Minimum guests cannot exceed maximum guests." : "",
    minimumCorporateStay < minimumStay ? "Minimum corporate stay cannot be shorter than the minimum stay." : "",
    minimumCorporateHouses > maximumCorporateHouses ? "Minimum corporate houses cannot exceed the maximum." : "",
    minimumCorporateHouses > Math.max(1, propertyCount) ? "Minimum corporate houses cannot exceed the available house count." : "",
  ].filter(Boolean);
}

export function HouseEditorActionBar({ dirty, draft, saving, invalid, onSave, onCancel, onDelete }: { dirty: boolean; draft: Row; saving: boolean; invalid: boolean; onSave: () => void; onCancel: () => void; onDelete?: () => void }) {
  return <div className="sticky bottom-4 z-30 rounded-2xl border border-[var(--admin-border)] bg-[var(--admin-surface)] p-3  backdrop-blur sm:p-4">
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><p className="text-sm font-semibold text-[var(--admin-text)]">{dirty ? "Unsaved house changes" : draft.id ? "House saved" : "New house draft"}</p><StatusBadge label={draft.published ? "Will be published" : "Will stay as draft"} tone={draft.published ? "success" : "neutral"} /></div><p className="mt-1 text-sm text-[var(--admin-muted)]">Save the gallery, listing, guest, booking, and pricing changes together.</p>{invalid && <p className="mt-1 text-sm font-semibold text-[var(--admin-danger-text)]">Fix the booking rule messages above before saving.</p>}</div><div className="flex flex-wrap gap-2 sm:justify-end"><button type="button" className="admin-button min-h-11" onClick={onCancel} disabled={saving}>Cancel changes</button>{onDelete && <button type="button" className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-[var(--admin-border)] px-4 py-2 text-sm font-medium text-[var(--admin-danger-text)] hover:bg-[var(--admin-surface-alt)]" onClick={onDelete} disabled={saving}><Trash2 size={16} /> Delete house</button>}<button type="button" className="admin-button admin-button-primary inline-flex min-h-11 items-center gap-2" onClick={onSave} disabled={saving || invalid || !dirty}><Save size={16} /> {saving ? "Saving…" : "Save changes"}</button></div></div>
  </div>;
}

export function HouseDetailsEditor({ draft, setDraft }: { draft:Row;setDraft:(update:(r:Row)=>Row)=>void }) {
 const field=(key:string,value:unknown)=>setDraft(r=>({...r,[key]:value}));
 return <><section className="admin-card p-5 sm:p-7 grid gap-5"><h2 className="text-xl font-semibold">Things to know</h2><p className="text-sm text-[var(--admin-muted)]">Only enter actual rules, safety information and applicable cancellation terms. Blank information is omitted publicly.</p><div className="grid gap-4 md:grid-cols-2">
 {[["Check-in information","check_in_time",30],["Checkout information","checkout_time",30],["Self check-in details","self_check_in_details",300],["Pet policy","pet_policy",160],["Safety and property information","safety_information",300],["Cancellation policy or policy link","cancellation_policy",300]].map(([label,key,limit])=><CharacterField key={String(key)} label={String(label)} value={draft[String(key)]} onChange={v=>field(String(key),v)} limit={Number(limit)} textarea/>)}
 </div><RepeatableList label="House rules" items={asList(draft.house_rules)} onChange={v=>field("house_rules",v)} limit={160} help="List actual restrictions or instructions for this house."/></section>
 <section className="admin-card p-5 sm:p-7 grid gap-5"><h2 className="text-xl font-semibold">Practical details and location</h2><div className="grid gap-4 md:grid-cols-2">{[["Listing title","listing_title"],["Kitchen facilities","kitchen_facilities"],["Laundry facilities","laundry_facilities"],["Wi-Fi and connectivity","wifi_information"],["Workspace","workspace_information"],["Heating and cooling","heating_cooling"],["Parking details","parking_type"],["Corporate information","corporate_information"]].map(([label,key])=><CharacterField key={key} label={label} value={draft[key]} onChange={v=>field(key,v)} limit={key==="listing_title"?80:key==="parking_type"?100:300} textarea/>)}</div><RepeatableList label="Nearby locations" items={asList(draft.nearby_locations)} onChange={v=>field("nearby_locations",v)} limit={100} help="Places that guests may find useful."/></section></>;
}

export function BookingRulesEditor({draft,setDraft,propertyCount}:{draft:Row;setDraft:(update:(r:Row)=>Row)=>void;propertyCount:number}) {
 const field=(key:string,value:unknown)=>setDraft(r=>({...r,[key]:value}));const errors=getBookingRuleErrors(draft,propertyCount);
 return <section className="admin-card p-5 sm:p-7 grid gap-5"><h2 className="text-xl font-semibold">Availability and booking rules</h2><p className="text-sm text-[var(--admin-muted)]">These rules are checked again when a booking is submitted.</p>{errors.length>0&&<div role="alert" className="admin-notice is-error">{errors.join(" ")}</div>}<div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{[["Minimum stay (nights)","minimum_stay"],["Maximum stay (nights)","maximum_stay"],["Minimum advance notice (days)","minimum_advance_notice_days"],["Maximum advance booking (days)","maximum_advance_booking_days"],["Minimum corporate stay (nights)","minimum_corporate_stay"],["Minimum corporate houses","minimum_corporate_houses"],["Maximum corporate houses","maximum_corporate_houses"],["Corporate discount (%)","corporate_discount"],["Weekly discount (%)","weekly_discount"],["Monthly discount (%)","monthly_discount"]].map(([label,key])=><NumberField key={key} label={label} value={draft[key]} onChange={v=>field(key,v)}/>)}</div><div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{[["Allow same-day booking","same_day_booking_allowed"],["Allow weekend bookings","weekend_booking_allowed"],["Instant booking","instant_booking_enabled"],["Booking request required","booking_request_required"],["Allow corporate bookings","corporate_booking_allowed"],["Adjacent houses allowed","adjacent_houses_allowed"],["Allow long-term stays","long_term_stays_allowed"],["Corporate approval required","corporate_approval_required"],["Corporate deposit required","corporate_deposit_required"],["Corporate online payment","corporate_online_payment"],["GST invoice available","gst_invoice_available"]].map(([label,key])=><Toggle key={key} label={label} checked={Boolean(draft[key])} onChange={v=>field(key,v)}/>)}</div><CharacterField label="Corporate booking instructions" value={draft.corporate_instructions} onChange={v=>field("corporate_instructions",v)} limit={1000} textarea/></section>;
}

