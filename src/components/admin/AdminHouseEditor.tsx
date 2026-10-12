"use client";
import type { DateRate } from "@/src/lib/date-pricing";
import { AmenityEditor } from "./AmenityEditor";
import { GuestsPricingEditor } from "./GuestsPricingEditor";
import { PricingCalendar } from "./PricingCalendar";
import { ReviewManager } from "./ReviewEditor";
import { RoomsEditor } from "./RoomsEditor";


/* The CMS reads flexible Supabase rows, so the boundary is intentionally defensive. */
/* eslint-disable @typescript-eslint/no-explicit-any */

import PropertyPhotoManager,{type PropertyPhotoManagerHandle} from "@/src/components/PropertyPhotoManager";
import { BedDouble,Building2,CalendarDays,ChevronLeft,ChevronRight,ClipboardList,Images,Plus,Save,Search,Settings2,Star,Tags,UsersRound } from "lucide-react";
import Image from "next/image";
import { useRef,useState } from "react";

import { AdminBadge as StatusBadge,useAdminWorkspace } from "@/src/components/admin/AdminUI";

import { CharacterField,NumberField,PageHeader,RepeatableList,Toggle } from "./AdminFields";
import { asBeds,asDatePrices,asList,propertyImageSource,Row } from "./AdminModels";
export function ListingDetailsEditor({ draft, setDraft }: { draft:Row; setDraft:(update:(r:Row)=>Row)=>void }) {
 const field=(key:string,value:unknown)=>setDraft(r=>({...r,[key]:value}));
 const listingDetails = draft.listing_details && typeof draft.listing_details === "object" && !Array.isArray(draft.listing_details) ? draft.listing_details as Row : {};
 const showcaseField=(key:string,value:string)=>setDraft(r=>({...r,listing_details:{...(r.listing_details && typeof r.listing_details === "object" && !Array.isArray(r.listing_details) ? r.listing_details : {}),[key]:value}}));
 return <section className="admin-card grid gap-5 p-5 sm:p-7 md:grid-cols-2"><div className="md:col-span-2"><h2 className="text-xl font-semibold">Listing details</h2><p className="text-sm text-[var(--admin-muted)]">Clear, accurate information for your guests.</p></div>
 {[["Property name","name",80],["Slug","slug",80],["Location","location",100],["Property type","property_type",80]].map(([label,key,limit])=><CharacterField key={String(key)} label={String(label)} value={draft[String(key)]} onChange={v=>field(String(key),v)} limit={Number(limit)}/>)}
 <CharacterField label="Short description" value={draft.short_description} onChange={v=>field("short_description",v)} limit={220} textarea/><CharacterField label="Full description" value={draft.full_description} onChange={v=>field("full_description",v)} limit={2000} textarea/>
 <div className="md:col-span-2"><CharacterField label="House page hero tagline" value={listingDetails.showcase_tagline} onChange={v=>showcaseField("showcase_tagline",v)} limit={180} help="Optional. Appears over the lead photo; the short description is used if blank." /></div>
 {[["Bedrooms","bedrooms"],["Beds","beds"],["Bathrooms","bathrooms"]].map(([label,key])=><NumberField key={key} label={label} value={draft[key]} onChange={v=>field(key,v)}/>)}
 <div className="md:col-span-2 flex flex-wrap gap-5"><Toggle label="Published on public website" checked={Boolean(draft.published)} onChange={v=>field("published",v)}/><Toggle label="Featured house" checked={Boolean(draft.featured)} onChange={v=>field("featured",v)}/></div></section>;
}

type HouseEditorTab = "photos" | "details" | "guest-info" | "guests-pricing" | "nightly-rates" | "rooms" | "booking-rules" | "reviews";
const houseEditorTabs = [
  { id: "photos", label: "Property images", icon: Images },
  { id: "details", label: "House details", icon: Building2 },
  { id: "guest-info", label: "Guest information", icon: ClipboardList },
  { id: "guests-pricing", label: "Guests & pricing", icon: UsersRound },
  { id: "nightly-rates", label: "Nightly rates", icon: CalendarDays },
  { id: "rooms", label: "Rooms & amenities", icon: Tags },
  { id: "booking-rules", label: "Booking rules", icon: Settings2 },
  { id: "reviews", label: "Reviews", icon: Star },
] as const;

export function HouseEditor(props: any) {
  const { confirm } = useAdminWorkspace();
  const [query, setQuery] = useState("");
  const [galleryDirty, setGalleryDirty] = useState(false);
  const [savingAll, setSavingAll] = useState(false);
  const [activeTab, setActiveTab] = useState<HouseEditorTab>(props.initialNewHouse ? "details" : "photos");
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
  const field = (key:string,value:unknown) => props.setDraft((draft:Row)=>({...draft,[key]:value}));
  const photos = props.images.filter((image:Row)=>String(image.property_id)===String(props.selectedId)&&!image.is_placeholder&&String(image.category)!=="floor-plan").map((image:Row)=>({src:propertyImageSource(image),label:String(image.alt_text||image.category||"Property photo")})).filter((photo:{src:string})=>photo.src);
  const tabs = houseEditorTabs.filter(tab=>(tab.id!=="photos" && tab.id!=="reviews") || Boolean(props.selectedId));
  const selectTab = (tab:HouseEditorTab) => {
    setActiveTab(tab);
    requestAnimationFrame(() => document.getElementById(`house-panel-${tab}`)?.scrollIntoView({ block: "start" }));
  };
  const handleTabKeyDown = (event:React.KeyboardEvent<HTMLButtonElement>, index:number) => {
    const next = event.key==="ArrowRight" ? (index+1)%tabs.length : event.key==="ArrowLeft" ? (index-1+tabs.length)%tabs.length : event.key==="Home" ? 0 : event.key==="End" ? tabs.length-1 : -1;
    if (next<0) return;
    event.preventDefault();
    selectTab(tabs[next].id);
    document.getElementById(`house-tab-${tabs[next].id}`)?.focus();
  };

  return <div className="grid gap-6">
    {!isDetailPage && <><PageHeader eyebrow="Property management" title="Houses" description="Manage your listings, photos, and booking details in one place." action={<button type="button" className="admin-button admin-button-primary inline-flex items-center gap-2" onClick={handleNew}><Plus size={16} /> New house</button>} />
    <section className="admin-houses-section" aria-labelledby="admin-houses-title">
      <div className="admin-houses-toolbar"><div><p className="admin-houses-eyebrow">Your portfolio</p><h2 id="admin-houses-title">All houses <span>{props.properties.length}</span></h2><p>Select a house to update its listing.</p></div><div className="admin-houses-search"><Search size={17} aria-hidden="true" /><input type="search" aria-label="Search houses" placeholder="Search houses" value={query} onChange={(event) => setQuery(event.target.value)} /></div></div>
      {matchingProperties.length ? <div className="admin-houses-grid">{matchingProperties.map((property: Row) => <HouseSelectorCard key={String(property.id)} property={property} images={props.images} selected={String(props.selectedId) === String(property.id)} onSelect={() => handleSelect(property)} />)}</div> : <div className="admin-houses-empty"><Building2 size={24} aria-hidden="true" /><strong>No houses found</strong><span>Try a different name or location.</span></div>}
    </section></>}
    {isDetailPage && showEditor ? <>
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[var(--admin-border)] bg-[var(--admin-surface-alt)] p-4 sm:p-5"><div className="min-w-0"><p className="text-sm font-medium text-[var(--admin-text)]">{creatingNew && !props.selectedId ? "New house" : "Selected house"}</p><h2 className="mt-1 truncate text-xl font-semibold text-[var(--admin-text)]">{creatingNew && !props.selectedId ? "Create a new furnished house" : selectedProperty?.name || "House details"}</h2><p className="mt-1 text-sm text-[var(--admin-muted)]">{creatingNew && !props.selectedId ? "Add the core listing details, then save a draft or publish it." : "Update the sections below without losing your place."}</p></div><select className="admin-field max-w-xs" aria-label="Select property to edit" value={props.selectedId || ""} onChange={e=>props.openHouse(e.target.value)}><option value="" disabled>New house</option>{props.properties.map((p:Row)=><option key={p.id} value={p.id}>{p.name}</option>)}</select><button type="button" className="admin-button inline-flex min-h-10 items-center gap-2" onClick={handleBack}><ChevronLeft size={16} /> Back to houses</button></div>
      <div className="admin-house-tabs" role="tablist" aria-label="House editor sections">
        {tabs.map((tab,index)=><button key={tab.id} id={`house-tab-${tab.id}`} type="button" role="tab" aria-selected={activeTab===tab.id} aria-controls={`house-panel-${tab.id}`} tabIndex={activeTab===tab.id?0:-1} onClick={()=>selectTab(tab.id)} onKeyDown={event=>handleTabKeyDown(event,index)}><tab.icon size={16} aria-hidden="true" /><span>{tab.label}</span></button>)}
      </div>
      {props.selectedId && <div id="house-panel-photos" role="tabpanel" aria-labelledby="house-tab-photos" hidden={activeTab!=="photos"} className="admin-house-tab-panel"><section className="admin-card overflow-hidden bg-[var(--admin-surface)]"><div className="border-b border-[var(--admin-border)] px-5 py-4 sm:px-7"><p className="text-sm font-medium text-[var(--admin-text)]">Media</p><h2 className="mt-1 text-xl font-semibold">Photos & floor plan</h2><p className="mt-1 text-sm text-[var(--admin-muted)]">Upload, organise, and publish house photos or a floor plan.</p></div><div className="p-5 sm:p-7"><PropertyPhotoManager ref={photoManagerRef} properties={props.properties} selectedId={props.selectedId} setSelectedId={props.setSelectedId} onSelectProperty={handleSelect} images={props.images} reload={props.reload} notify={props.notify} onError={props.onError} onDirtyChange={setGalleryDirty} embedded showHeader={false} showPropertySelector={false} /></div></section></div>}
      <div id="house-panel-details" role="tabpanel" aria-labelledby="house-tab-details" hidden={activeTab!=="details"} className="admin-house-tab-panel"><ListingDetailsEditor draft={props.draft} setDraft={props.setDraft} /><HouseDetailsEditor draft={props.draft} setDraft={props.setDraft} section="practical" /></div>
      <div id="house-panel-guest-info" role="tabpanel" aria-labelledby="house-tab-guest-info" hidden={activeTab!=="guest-info"} className="admin-house-tab-panel"><HouseDetailsEditor draft={props.draft} setDraft={props.setDraft} section="guest-info" /></div>
      <div id="house-panel-guests-pricing" role="tabpanel" aria-labelledby="house-tab-guests-pricing" hidden={activeTab!=="guests-pricing"} className="admin-house-tab-panel"><GuestsPricingEditor draft={props.draft} setDraft={props.setDraft} /></div>
      <div id="house-panel-nightly-rates" role="tabpanel" aria-labelledby="house-tab-nightly-rates" hidden={activeTab!=="nightly-rates"} className="admin-house-tab-panel"><PricingCalendar datePrices={asDatePrices(props.draft.date_prices) as DateRate[]} defaultRate={Number(props.draft.nightly_price)} onChange={prices=>field("date_prices",prices)} onDefaultChange={value=>field("nightly_price",value)} /></div>
      <div id="house-panel-rooms" role="tabpanel" aria-labelledby="house-tab-rooms" hidden={activeTab!=="rooms"} className="admin-house-tab-panel"><RoomsEditor rooms={asBeds(props.draft.bed_arrangements)} photos={photos} onChange={rooms=>field("bed_arrangements",rooms)} /><AmenityEditor labels={asList(props.draft.amenities)} details={props.draft.amenity_details} onChange={items=>props.setDraft((draft:Row)=>({...draft,amenities:items.map(item=>item.label),amenity_details:items}))} /></div>
      <div id="house-panel-booking-rules" role="tabpanel" aria-labelledby="house-tab-booking-rules" hidden={activeTab!=="booking-rules"} className="admin-house-tab-panel"><BookingRulesEditor draft={props.draft} setDraft={props.setDraft} propertyCount={props.properties.length} /></div>
      {props.selectedId && <div id="house-panel-reviews" role="tabpanel" aria-labelledby="house-tab-reviews" hidden={activeTab!=="reviews"} className="admin-house-tab-panel">
        {(props.dirty || galleryDirty) && <p className="admin-notice mb-5">You have unsaved house changes. Return to a house tab to save them.</p>}
        <ReviewManager key={String(props.selectedId)} selectedPropertyId={String(props.selectedId)} properties={props.properties} reviews={props.reviews} createReview={props.createReview} updateReview={props.updateReview} deleteReview={props.deleteReview} />
      </div>}
      {activeTab!=="reviews" && <HouseEditorActionBar dirty={props.dirty || galleryDirty} draft={props.draft} saving={props.saving || savingAll} invalid={bookingErrors.length > 0} onOpenBookingRules={() => selectTab("booking-rules")} onSave={() => void handleSave()} onCancel={handleCancel} />}
    </> : isDetailPage ? <div className="rounded-2xl border border-dashed border-[var(--admin-border)] bg-[var(--admin-surface)] p-8 text-center"><Building2 className="mx-auto text-[var(--admin-text)]" size={28} aria-hidden="true" /><h3 className="mt-3 text-lg font-semibold text-[var(--admin-text)]">House not found</h3><p className="mx-auto mt-1 max-w-md text-sm leading-relaxed text-[var(--admin-muted)]">Return to Houses and choose a published or draft house from the list.</p><button type="button" className="admin-button mt-4" onClick={props.onBackToHouses}>Back to houses</button></div> : null}
  </div>;
}

export function HouseSelectorCard({ property, images, selected, onSelect }: { property: Row; images: Row[]; selected: boolean; onSelect: () => void }) {
  const propertyImages = images.filter((image) => String(image.property_id) === String(property.id) && String(image.category) !== "floor-plan");
  const coverImage = propertyImages.find((image) => image.is_cover === true && image.is_visible !== false) ?? propertyImages.find((image) => image.is_visible !== false && String(image.category ?? "") !== "unsorted") ?? propertyImages[0];
  const imageSource = coverImage ? propertyImageSource(coverImage) : "";
  const status = property.published ? "Published" : "Draft";
  return <button type="button" onClick={onSelect} aria-pressed={selected} className="admin-house-card group">
    <div className="admin-house-card-image">{imageSource ? <Image src={imageSource} alt={String(coverImage?.alt_text || `${property.name} cover photo`)} fill loading="eager" sizes="(max-width: 640px) 100vw, (max-width: 1280px) 50vw, 33vw" className="object-cover transition duration-500 group-hover:scale-105" unoptimized={Boolean(coverImage?.external_url)} /> : <div className="admin-house-card-no-image"><Building2 size={26} aria-hidden="true" /><span>No cover photo</span></div>}<span className="admin-house-card-status" data-published={Boolean(property.published)}>{status}</span></div>
    <div className="admin-house-card-body"><div className="admin-house-card-title"><h3>{property.name || "Unnamed house"}</h3><p>{property.location || "Pakenham, Victoria"}</p></div><div className="admin-house-card-facts"><span><BedDouble size={15} aria-hidden="true" /> {Number(property.bedrooms ?? 0)} bedrooms</span><span><UsersRound size={15} aria-hidden="true" /> {Number(property.max_guests ?? 0)} guests</span><span><Images size={15} aria-hidden="true" /> {Number(propertyImages.length)} photos</span></div><span className="admin-house-card-action">Manage listing <span><ChevronRight size={16} aria-hidden="true" /></span></span></div>
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

export function HouseEditorActionBar({ dirty, draft, saving, invalid, onOpenBookingRules, onSave, onCancel }: { dirty: boolean; draft: Row; saving: boolean; invalid: boolean; onOpenBookingRules: () => void; onSave: () => void; onCancel: () => void }) {
  return <div className="admin-house-action-bar sticky bottom-4 z-30 rounded-2xl border border-[var(--admin-border)] bg-[var(--admin-surface)] p-3 backdrop-blur sm:p-4">
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><p className="text-sm font-semibold text-[var(--admin-text)]">{dirty ? "Unsaved house changes" : draft.id ? "House saved" : "New house draft"}</p><StatusBadge label={draft.published ? "Will be published" : "Will stay as draft"} tone={draft.published ? "success" : "neutral"} /></div><p className="admin-house-save-description mt-1 text-sm text-[var(--admin-muted)]">Save the gallery, listing, guest, booking, and pricing changes together.</p>{invalid && <button type="button" className="mt-1 text-left text-sm font-semibold text-[var(--admin-danger-text)] underline underline-offset-2" onClick={onOpenBookingRules}>Fix booking rules before saving</button>}</div><div className="flex flex-wrap gap-2 sm:justify-end"><button type="button" className="admin-button min-h-11" onClick={onCancel} disabled={saving}>Cancel changes</button><button type="button" className="admin-button admin-button-primary inline-flex min-h-11 items-center gap-2" onClick={onSave} disabled={saving || invalid || !dirty}><Save size={16} /> {saving ? "Saving…" : "Save changes"}</button></div></div>
  </div>;
}

export function HouseDetailsEditor({ draft, setDraft, section }: { draft:Row;setDraft:(update:(r:Row)=>Row)=>void;section:"guest-info"|"practical" }) {
 const field=(key:string,value:unknown)=>setDraft(r=>({...r,[key]:value}));
 const listingDetails = draft.listing_details && typeof draft.listing_details === "object" && !Array.isArray(draft.listing_details) ? draft.listing_details as Row : {};
 const hostBio=(value:string)=>setDraft(r=>({...r,listing_details:{...(r.listing_details && typeof r.listing_details === "object" && !Array.isArray(r.listing_details) ? r.listing_details : {}),showcase_host_bio:value}}));
 return section==="guest-info" ? <section className="admin-card p-5 sm:p-7 grid gap-5"><h2 className="text-xl font-semibold">Things to know</h2><p className="text-sm text-[var(--admin-muted)]">Only enter actual rules, safety information and applicable cancellation terms. Blank information is omitted publicly.</p><div className="grid gap-4 md:grid-cols-2">
 {[["Check-in information","check_in_time",30],["Checkout information","checkout_time",30],["Self check-in details","self_check_in_details",300],["Pet policy","pet_policy",160],["Safety and property information","safety_information",300],["Cancellation policy or policy link","cancellation_policy",300]].map(([label,key,limit])=><CharacterField key={String(key)} label={String(label)} value={draft[String(key)]} onChange={v=>field(String(key),v)} limit={Number(limit)} textarea/>)}
 </div><CharacterField label="About the host" value={listingDetails.showcase_host_bio} onChange={hostBio} limit={500} textarea help="Optional. Add only verified details about the host or management team." /><RepeatableList label="House rules" items={asList(draft.house_rules)} onChange={v=>field("house_rules",v)} limit={160} help="List actual restrictions or instructions for this house."/></section>
 : <section className="admin-card p-5 sm:p-7 grid gap-5"><h2 className="text-xl font-semibold">Practical details and location</h2><div className="grid gap-4 md:grid-cols-2">{[["Listing title","listing_title"],["Kitchen facilities","kitchen_facilities"],["Laundry facilities","laundry_facilities"],["Wi-Fi and connectivity","wifi_information"],["Workspace","workspace_information"],["Heating and cooling","heating_cooling"],["Parking details","parking_type"],["Corporate information","corporate_information"]].map(([label,key])=><CharacterField key={key} label={label} value={draft[key]} onChange={v=>field(key,v)} limit={key==="listing_title"?80:key==="parking_type"?100:300} textarea/>)}</div><RepeatableList label="Nearby locations" items={asList(draft.nearby_locations)} onChange={v=>field("nearby_locations",v)} limit={100} help="Places that guests may find useful."/></section>;
}

export function BookingRulesEditor({draft,setDraft,propertyCount}:{draft:Row;setDraft:(update:(r:Row)=>Row)=>void;propertyCount:number}) {
 const field=(key:string,value:unknown)=>setDraft(r=>({...r,[key]:value}));const errors=getBookingRuleErrors(draft,propertyCount);
 return <section className="admin-card p-5 sm:p-7 grid gap-5"><h2 className="text-xl font-semibold">Availability and booking rules</h2><p className="text-sm text-[var(--admin-muted)]">These rules are checked again when a booking is submitted.</p>{errors.length>0&&<div role="alert" className="admin-notice is-error">{errors.join(" ")}</div>}<div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{[["Minimum stay (nights)","minimum_stay"],["Maximum stay (nights)","maximum_stay"],["Minimum advance notice (days)","minimum_advance_notice_days"],["Maximum advance booking (days)","maximum_advance_booking_days"],["Minimum corporate stay (nights)","minimum_corporate_stay"],["Minimum corporate houses","minimum_corporate_houses"],["Maximum corporate houses","maximum_corporate_houses"],["Corporate discount (%)","corporate_discount"],["Weekly discount (%)","weekly_discount"],["Monthly discount (%)","monthly_discount"]].map(([label,key])=><NumberField key={key} label={label} value={draft[key]} onChange={v=>field(key,v)}/>)}</div><div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{[["Allow same-day booking","same_day_booking_allowed"],["Allow weekend bookings","weekend_booking_allowed"],["Instant booking","instant_booking_enabled"],["Booking request required","booking_request_required"],["Allow corporate bookings","corporate_booking_allowed"],["Adjacent houses allowed","adjacent_houses_allowed"],["Allow long-term stays","long_term_stays_allowed"],["Corporate approval required","corporate_approval_required"],["Corporate deposit required","corporate_deposit_required"],["Corporate online payment","corporate_online_payment"],["GST invoice available","gst_invoice_available"]].map(([label,key])=><Toggle key={key} label={label} checked={Boolean(draft[key])} onChange={v=>field(key,v)}/>)}</div><CharacterField label="Corporate booking instructions" value={draft.corporate_instructions} onChange={v=>field("corporate_instructions",v)} limit={1000} textarea/></section>;
}
