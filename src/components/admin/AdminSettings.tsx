"use client";

/* The CMS reads flexible Supabase rows, so the boundary is intentionally defensive. */

import { CMS_LIMITS } from "@/src/lib/cmsValidation";
import { Eye, Mail, MapPin, Phone, Plus, Save, Trash2 } from "lucide-react";
import { MAX_NOTIFICATION_RECIPIENTS } from "@/src/lib/notificationRecipients";
import { formatAustralianContactPhone } from "@/src/lib/contactPhone";

import { CharacterField, PageHeader, Toggle } from "./AdminFields";
export function ContactPagePanel({ email, settings, setSettings, save, saving }: { email: string; settings: Record<string, string>; setSettings: (value: Record<string, string>) => void; save: () => Promise<void>; saving: boolean }) {
  const update = (key: string, value: string) => setSettings({ ...settings, [key]: value });
  const addressVisible = settings.public_address_visible !== "false";

  return <>
    <PageHeader eyebrow="Content" title="Contact page" description="Edit the contact page message, footer text, directions, and social links. Business identity and contact details are in Site settings." />
    <form onSubmit={(event) => { event.preventDefault(); void save(); }} className="grid max-w-6xl gap-6 xl:grid-cols-[minmax(0,1fr)_22rem]">
      <div className="admin-card grid gap-6 bg-[var(--admin-surface)] p-5 sm:p-7">
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

        <div className="flex flex-wrap items-center justify-between gap-4 border-t border-[var(--admin-border)] pt-5"><p className="text-sm text-[var(--admin-muted)]">Signed in as <strong>{email}</strong></p><button className="admin-button admin-button-primary inline-flex min-h-11 items-center gap-2" disabled={saving}><Save size={16} /> {saving ? "Saving…" : "Save contact details"}</button></div>
      </div>

      <aside className="admin-card admin-guest-preview admin-contact-preview" aria-label="Public contact preview">
        <div className="admin-contact-preview__top">
          <span><Eye size={17} aria-hidden="true" /> Public contact preview</span>
          <span className={`admin-contact-preview__status ${settings.contact_published === "false" ? "is-hidden" : ""}`}>
            {settings.contact_published === "false" ? "Hidden" : "Published"}
          </span>
        </div>
        <div className="admin-contact-preview__hero">
          <p className="admin-contact-preview__eyebrow">{settings.business_name || "Business name"}</p>
          <h3>{settings.contact_page_heading || "Contact page heading"}</h3>
          <p className="admin-contact-preview__description">{settings.contact_page_description || "Contact page description"}</p>
        </div>
        <dl className="admin-contact-preview__details">
          <div><dt><Mail size={16} aria-hidden="true" /> Email</dt><dd>{settings.contact_email || "—"}</dd></div>
          <div><dt><Phone size={16} aria-hidden="true" /> Phone</dt><dd>{settings.phone_number || "—"}</dd></div>
          {addressVisible && <div><dt><MapPin size={16} aria-hidden="true" /> Location</dt><dd>{settings.public_address || "—"}</dd></div>}
        </dl>
        {(settings.facebook_url || settings.instagram_url || settings.linkedin_url) &&
          <div className="admin-contact-preview__channels" aria-label="Available contact channels">
            {settings.facebook_url && <span>Facebook</span>}
            {settings.instagram_url && <span>Instagram</span>}
            {settings.linkedin_url && <span>LinkedIn</span>}
          </div>}
        <p className="admin-contact-preview__note">Preview updates as you edit. Save to publish changes.</p>
      </aside>
    </form>
  </>;
}

export function EmailNotificationsPanel({ email, notificationEmails, setNotificationEmails, save, saving }: { email: string; notificationEmails: string[]; setNotificationEmails: (value: string[]) => void; save: () => Promise<void>; saving: boolean }) {
  return <>
    <PageHeader eyebrow="Administration" title="Email notifications" description="Choose the private addresses that receive contact messages, corporate enquiries, and paid-booking alerts." />
    <form onSubmit={(event) => { event.preventDefault(); void save(); }} className="admin-card grid max-w-3xl gap-6 bg-[var(--admin-surface)] p-5 sm:p-7">
      <section className="grid gap-4">
        <div><h3 className="text-lg font-semibold">Notification recipients</h3><p className="mt-1 text-sm text-[var(--admin-muted)]">Add up to {MAX_NOTIFICATION_RECIPIENTS} email addresses. These are private and never shown to guests.</p></div>
        <div className="grid gap-3">
          {notificationEmails.map((address, index) => <div key={index} className="flex items-end gap-2"><label className="grid flex-1 gap-1.5 text-sm font-semibold" htmlFor={`notification-email-${index}`}><span>Recipient {index + 1}</span><input id={`notification-email-${index}`} className="admin-field" type="email" maxLength={120} value={address} onChange={(event) => setNotificationEmails(notificationEmails.map((item, itemIndex) => itemIndex === index ? event.target.value : item))} placeholder="name@example.com" /></label><button type="button" className="admin-button min-h-11 px-3" aria-label={`Remove recipient ${index + 1}`} onClick={() => setNotificationEmails(notificationEmails.filter((_, itemIndex) => itemIndex !== index))}><Trash2 size={16} /></button></div>)}
          {notificationEmails.length < MAX_NOTIFICATION_RECIPIENTS && <button type="button" className="admin-button w-fit min-h-11 gap-2" onClick={() => setNotificationEmails([...notificationEmails, ""])}><Plus size={16} /> Add email</button>}
          {notificationEmails.length === 0 && <p className="text-sm text-[var(--admin-muted)]">No recipients selected. Saving this will turn off internal email notifications.</p>}
        </div>
      </section>
      <div className="flex flex-wrap items-center justify-between gap-4 border-t border-[var(--admin-border)] pt-5"><p className="text-sm text-[var(--admin-muted)]">Signed in as <strong>{email}</strong></p><button className="admin-button admin-button-primary inline-flex min-h-11 items-center gap-2" disabled={saving}><Save size={16} /> {saving ? "Saving…" : "Save notification emails"}</button></div>
    </form>
  </>;
}

export function SettingsPanel({ email, settings, setSettings, save, saving }: { email: string; settings: Record<string, string>; setSettings: (value: Record<string, string>) => void; save: () => Promise<void>; saving: boolean }) {
  const update = (key: string, value: string) => setSettings({ ...settings, [key]: value });

  return <>
    <PageHeader eyebrow="Administration" title="Site settings" description="Manage your business identity, public contact details, and Australian regional defaults." />
    <form onSubmit={(event) => { event.preventDefault(); void save(); }} className="admin-card grid max-w-5xl gap-6 bg-[var(--admin-surface)] p-5 sm:p-7">
      <section className="grid gap-4 border-b border-[var(--admin-border)] pb-6">
        <div><h3 className="text-lg font-semibold">Business identity</h3><p className="mt-1 text-sm text-[var(--admin-muted)]">These values power the public contact cards and footer. Required fields are marked with an asterisk.</p></div>
        <div className="grid gap-4 sm:grid-cols-2">
          <CharacterField label="Business name *" value={settings.business_name} onChange={(value) => update("business_name", value)} limit={CMS_LIMITS.business_name} />
          <CharacterField label="Contact email *" value={settings.contact_email} onChange={(value) => update("contact_email", value)} limit={CMS_LIMITS.email_address} type="email" />
          <CharacterField label="Phone number *" value={settings.phone_number} onChange={(value) => update("phone_number", formatAustralianContactPhone(value))} limit={CMS_LIMITS.phone_number} type="tel" help="Australian format is added automatically, for example +61 412 634 002." />
          <CharacterField label="Public address *" value={settings.public_address} onChange={(value) => update("public_address", value)} limit={CMS_LIMITS.public_address} textarea help="Keep this to the intended public neighbourhood/address level." />
        </div>
        <div className="grid gap-3 rounded-xl border border-[var(--admin-border)] bg-[var(--admin-surface-alt)] p-4 sm:grid-cols-2"><Toggle label="Publish contact details" checked={settings.contact_published !== "false"} onChange={(checked) => update("contact_published", String(checked))} /><Toggle label="Show public address" checked={settings.public_address_visible !== "false"} onChange={(checked) => update("public_address_visible", String(checked))} /></div>
      </section>
      <section className="grid gap-4">
        <div><h3 className="text-lg font-semibold">Australian defaults</h3><p className="mt-1 text-sm text-[var(--admin-muted)]">These values control the locale, time zone, and currency used by the site.</p></div>
        <div className="grid gap-4 sm:grid-cols-3">
          <CharacterField label="Locale" value={settings.locale} onChange={(value) => update("locale", value)} limit={CMS_LIMITS.navigation_label} />
          <CharacterField label="Timezone" value={settings.timezone} onChange={(value) => update("timezone", value)} limit={CMS_LIMITS.nearby_location} />
          <CharacterField label="Currency" value={settings.currency} onChange={(value) => update("currency", value)} limit={CMS_LIMITS.navigation_label} />
        </div>
      </section>
      <div className="flex flex-wrap items-center justify-between gap-4 border-t border-[var(--admin-border)] pt-5">
        <p className="text-sm text-[var(--admin-muted)]">Signed in as <strong>{email}</strong></p>
        <button className="admin-button admin-button-primary inline-flex min-h-11 items-center gap-2" disabled={saving}><Save size={16} /> {saving ? "Saving…" : "Save settings"}</button>
      </div>
    </form>
  </>;
}
