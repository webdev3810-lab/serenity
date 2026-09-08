"use client";

/* The CMS reads flexible Supabase rows, so the boundary is intentionally defensive. */

import { CMS_LIMITS } from "@/src/lib/cmsValidation";
import { Eye, Save } from "lucide-react";

import { CharacterField, PageHeader, Toggle } from "./AdminFields";
export function SettingsPanel({ email, settings, setSettings, save, saving }: { email: string; settings: Record<string, string>; setSettings: (value: Record<string, string>) => void; save: () => Promise<void>; saving: boolean }) {
  const update = (key: string, value: string) => setSettings({ ...settings, [key]: value });
  const addressVisible = settings.public_address_visible !== "false";

  return <>
    <PageHeader eyebrow="Site settings" title="One place for every public contact detail" description="Edit the contact information used across the homepage, contact page, footer, location prompts, corporate stays, and booking conversations." />
    <form onSubmit={(event) => { event.preventDefault(); void save(); }} className="grid max-w-6xl gap-6 xl:grid-cols-[minmax(0,1fr)_22rem]">
      <div className="admin-card grid gap-6 bg-[var(--admin-surface)] p-5 sm:p-7">
        <section className="grid gap-4 border-b border-[var(--admin-border)] pb-6">
          <div><h3 className="text-lg font-semibold">Business identity</h3><p className="mt-1 text-sm text-[var(--admin-muted)]">These values power the public contact cards and footer. Required fields are marked with an asterisk.</p></div>
          <div className="grid gap-4 sm:grid-cols-2">
            <CharacterField label="Business name *" value={settings.business_name} onChange={(value) => update("business_name", value)} limit={CMS_LIMITS.business_name} />
            <CharacterField label="Contact email *" value={settings.contact_email} onChange={(value) => update("contact_email", value)} limit={CMS_LIMITS.email_address} type="email" />
            <CharacterField label="Phone number *" value={settings.phone_number} onChange={(value) => update("phone_number", value)} limit={CMS_LIMITS.phone_number} type="tel" help="Australian format, for example +61 3 9000 0000." />
            <CharacterField label="WhatsApp number" value={settings.whatsapp_number} onChange={(value) => update("whatsapp_number", value)} limit={CMS_LIMITS.whatsapp_number} type="tel" help="Optional. Used to build a secure wa.me link." />
            <CharacterField label="Public address *" value={settings.public_address} onChange={(value) => update("public_address", value)} limit={CMS_LIMITS.public_address} textarea help="Keep this to the intended public neighbourhood/address level." />
            <CharacterField label="Business hours *" value={settings.business_hours} onChange={(value) => update("business_hours", value)} limit={CMS_LIMITS.business_hours} textarea />
          </div>
          <div className="grid gap-3 rounded-xl border border-[var(--admin-border)] bg-[var(--admin-surface-alt)] p-4 sm:grid-cols-2"><Toggle label="Publish contact details" checked={settings.contact_published !== "false"} onChange={(checked) => update("contact_published", String(checked))} /><Toggle label="Show public address" checked={addressVisible} onChange={(checked) => update("public_address_visible", String(checked))} /></div>
        </section>

        <section className="grid gap-4 border-b border-[var(--admin-border)] pb-6">
          <div><h3 className="text-lg font-semibold">Contact page copy</h3><p className="mt-1 text-sm text-[var(--admin-muted)]">Keep the public message concise so it remains readable on mobile.</p></div>
          <CharacterField label="Contact page heading *" value={settings.contact_page_heading} onChange={(value) => update("contact_page_heading", value)} limit={CMS_LIMITS.contact_page_heading} textarea />
          <CharacterField label="Contact page description *" value={settings.contact_page_description} onChange={(value) => update("contact_page_description", value)} limit={CMS_LIMITS.contact_page_description} textarea />
          <CharacterField label="Footer text *" value={settings.footer_text} onChange={(value) => update("footer_text", value)} limit={CMS_LIMITS.footer_text} textarea />
        </section>

        <section className="grid gap-4 border-b border-[var(--admin-border)] pb-6">
          <div><h3 className="text-lg font-semibold">Directions and social links</h3><p className="mt-1 text-sm text-[var(--admin-muted)]">Use complete https URLs for external destinations. Leave social links blank to hide them.</p></div>
          <div className="grid gap-4 sm:grid-cols-2">
            <CharacterField label="Directions link *" value={settings.directions_url} onChange={(value) => update("directions_url", value)} limit={CMS_LIMITS.directions_url} type="url" />
            <CharacterField label="Google Maps or map link *" value={settings.map_url} onChange={(value) => update("map_url", value)} limit={CMS_LIMITS.map_url} type="url" />
            <CharacterField label="Facebook URL" value={settings.facebook_url} onChange={(value) => update("facebook_url", value)} limit={CMS_LIMITS.social_url} type="url" />
            <CharacterField label="Instagram URL" value={settings.instagram_url} onChange={(value) => update("instagram_url", value)} limit={CMS_LIMITS.social_url} type="url" />
            <CharacterField label="LinkedIn URL" value={settings.linkedin_url} onChange={(value) => update("linkedin_url", value)} limit={CMS_LIMITS.social_url} type="url" />
          </div>
        </section>

        <section className="grid gap-4 border-b border-[var(--admin-border)] pb-6">
          <div><h3 className="text-lg font-semibold">Enquiry routing</h3><p className="mt-1 text-sm text-[var(--admin-muted)]">These addresses are available to booking and corporate contact prompts.</p></div>
          <div className="grid gap-4 sm:grid-cols-2"><CharacterField label="Booking enquiry email *" value={settings.booking_enquiry_email} onChange={(value) => update("booking_enquiry_email", value)} limit={CMS_LIMITS.booking_enquiry_email} type="email" /><CharacterField label="Corporate enquiry email *" value={settings.corporate_enquiry_email} onChange={(value) => update("corporate_enquiry_email", value)} limit={CMS_LIMITS.corporate_enquiry_email} type="email" /></div>
        </section>

        <section className="grid gap-4 border-b border-[var(--admin-border)] pb-6"><div><h3 className="text-lg font-semibold">Australian defaults</h3><p className="mt-1 text-sm text-[var(--admin-muted)]">These existing settings remain available for the promotion and local formatting.</p></div><div className="grid gap-4 sm:grid-cols-3"><CharacterField label="Locale" value={settings.locale} onChange={(value) => update("locale", value)} limit={CMS_LIMITS.navigation_label} /><CharacterField label="Timezone" value={settings.timezone} onChange={(value) => update("timezone", value)} limit={CMS_LIMITS.nearby_location} /><CharacterField label="Currency" value={settings.currency} onChange={(value) => update("currency", value)} limit={CMS_LIMITS.navigation_label} /></div></section>

        <div className="flex flex-wrap items-center justify-between gap-4 border-t border-[var(--admin-border)] pt-5"><p className="text-sm text-[var(--admin-muted)]">Signed in as <strong>{email}</strong><br /><span className="text-sm">Contact values are stored in the existing public site settings record.</span></p><button className="admin-button admin-button-primary inline-flex min-h-11 items-center gap-2" disabled={saving}><Save size={16} /> {saving ? "Saving…" : "Save settings"}</button></div>
      </div>

      <aside className="admin-card admin-guest-preview h-fit bg-[#EAE1DD] p-5 sm:p-6"><div className="flex items-center gap-2 text-sm font-extrabold"><Eye size={17} className="text-[#8B6B55]" /> Public contact preview</div><div className="mt-4 bg-white p-5"><p className="text-xs font-bold uppercase tracking-[0.16em] text-[#8B6B55]">{settings.business_name || "Business name"}</p><h3 className="mt-3 break-words text-2xl font-extrabold text-[#2D2622]">{settings.contact_page_heading || "Contact page heading"}</h3><p className="mt-3 break-words text-sm leading-relaxed text-stone-600">{settings.contact_page_description || "Contact page description"}</p><div className="mt-5 space-y-2 border-t border-[#EAE1DD] pt-4 text-sm text-stone-700"><p className="break-words"><strong>Email:</strong> {settings.contact_email || "—"}</p><p><strong>Phone:</strong> {settings.phone_number || "—"}</p>{addressVisible && <p className="break-words"><strong>Location:</strong> {settings.public_address || "—"}</p>}<p className="break-words"><strong>Hours:</strong> {settings.business_hours || "—"}</p></div><div className="mt-5 flex flex-wrap gap-2 text-xs font-bold">{settings.whatsapp_number && <span className="rounded-none bg-[#E6EFE9] px-3 py-1.5 text-[#2F5D4B]">WhatsApp</span>}{settings.facebook_url && <span className="rounded-none bg-[#F7F4F1] px-3 py-1.5">Facebook</span>}{settings.instagram_url && <span className="rounded-none bg-[#F7F4F1] px-3 py-1.5">Instagram</span>}{settings.linkedin_url && <span className="rounded-none bg-[#F7F4F1] px-3 py-1.5">LinkedIn</span>}</div></div></aside>
    </form>
  </>;
}

