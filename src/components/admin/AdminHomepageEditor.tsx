"use client";

import HomepageHeroMediaEditor from "@/src/components/HomepageHeroMediaEditor";
import StayHighlightIcon from "@/src/components/homepage/StayHighlightIcon";
import { CMS_LIMITS } from "@/src/lib/cmsValidation";
import { HOMEPAGE_HIGHLIGHT_ICON_OPTIONS, type EditorialHighlightIcon } from "@/src/lib/homepageEditorialContent";
import { Building2, ChevronDown, ChevronUp, ExternalLink, Globe2, MessageSquare, Pencil, Plus, Search, Trash2, X } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { AdminBadge as StatusBadge, AdminDialog } from "@/src/components/admin/AdminUI";
import { CharacterField, EmptyState, FormGroup, IconButton, moveItem, PageHeader } from "./AdminFields";
import { HomepageDraft, HomepageFaq, HomepageSectionKey, Row } from "./AdminModels";

const sectionFields: Record<HomepageSectionKey, Array<keyof HomepageDraft>> = {
  hero: ["editorial_hero_eyebrow", "editorial_hero_heading", "editorial_hero_description", "editorial_hero_primary_label", "editorial_hero_secondary_label", "editorial_highlights"],
  houses: [],
  intro: ["editorial_intro_heading", "editorial_intro_link_label", "editorial_intro_statement_one", "editorial_intro_statement_two"],
  services: ["editorial_services_heading", "editorial_services_description", "editorial_services"],
  faqs: ["editorial_faq_eyebrow", "faq_heading", "faq_description", "faqs", "editorial_faq_contact_prompt", "editorial_faq_contact_label"],
  social: ["editorial_social_heading", "editorial_social_houses_label", "editorial_social_story_label", "editorial_social_contact_label"],
};

const sections: Array<{ id: HomepageSectionKey; label: string; description: string }> = [
  { id: "hero", label: "Hero & highlights", description: "The first message, two button labels, four stay benefits, and hero image." },
  { id: "houses", label: "House previews", description: "Choose which houses and photos appear in the homepage showcase." },
  { id: "intro", label: "The tailored stay", description: "The short introduction below the house previews." },
  { id: "services", label: "Stay services", description: "The three linked service rows." },
  { id: "faqs", label: "FAQs", description: "Guest questions and the contact prompt below them." },
  { id: "social", label: "Explore links", description: "The final links to houses, your story, and contact." },
];

export function HomepageSectionsEditor({ baseline, homepage, setHomepage, published, saveSection, saving, properties, toggleFeatured }: {
  baseline: HomepageDraft; homepage: HomepageDraft; setHomepage: (value: HomepageDraft) => void;
  published: boolean; saveSection: (section: HomepageSectionKey, published: boolean) => Promise<void>;
  saving: boolean; properties: Row[]; toggleFeatured: (property: Row) => Promise<void>;
}) {
  const [activeSection, setActiveSection] = useState<HomepageSectionKey>("hero");
  const [pickerIndex, setPickerIndex] = useState<number | null>(null);
  const [iconSearch, setIconSearch] = useState("");
  const dirty = Object.fromEntries(Object.entries(sectionFields).map(([section, keys]) => [section, keys.some((key) => JSON.stringify(homepage[key]) !== JSON.stringify(baseline[key]))])) as Record<HomepageSectionKey, boolean>;
  const update = <K extends keyof HomepageDraft>(key: K, value: HomepageDraft[K]) => setHomepage({ ...homepage, [key]: value });
  const updateCard = (key: "editorial_highlights" | "editorial_services", index: number, field: "title" | "description", value: string) => update(key, homepage[key].map((card, i) => i === index ? { ...card, [field]: value } : card));
  const updateHighlightIcon = (index: number, icon: EditorialHighlightIcon) => update("editorial_highlights", homepage.editorial_highlights.map((card, i) => i === index ? { ...card, icon } : card));
  const updateFaq = (index: number, key: keyof HomepageFaq, value: string) => update("faqs", homepage.faqs.map((faq, i) => i === index ? { ...faq, [key]: value } : faq));
  const active = sections.find((section) => section.id === activeSection) ?? sections[0];
  const selectedHighlight = pickerIndex === null ? null : homepage.editorial_highlights[pickerIndex];
  const filteredIcons = HOMEPAGE_HIGHLIGHT_ICON_OPTIONS.filter((option) => option.label.toLowerCase().includes(iconSearch.trim().toLowerCase()));
  const openIconPicker = (index: number) => { setIconSearch(""); setPickerIndex(index); };

  const field = (key: keyof HomepageDraft, label: string, limit: number, textarea = false) => {
    const value = homepage[key];
    if (typeof value !== "string") return null;
    return <CharacterField label={label} value={value} onChange={(next) => setHomepage({ ...homepage, [key]: next })} limit={limit} textarea={textarea} />;
  };
  const cards = (key: "editorial_highlights" | "editorial_services", prefix: string) => <div className="grid gap-4 sm:grid-cols-2">{homepage[key].map((card, index) => <div key={index} className="rounded-xl border border-[var(--admin-border)] p-4">
    <p className="mb-3 text-sm font-semibold">{prefix} {index + 1}</p>
    <div className="grid gap-3">
      <div className="flex items-start gap-3">
        {key === "editorial_highlights" && <button type="button" aria-label={`Change icon for highlight ${index + 1}`} title="Change icon" onClick={() => openIconPicker(index)} className="relative mt-6 grid h-10 w-10 shrink-0 cursor-pointer place-items-center rounded-lg border border-dashed border-[var(--admin-border-strong)] bg-[var(--admin-nav-active-bg)] text-[var(--admin-nav-active-text)] transition-colors hover:border-[var(--admin-accent)] hover:bg-[var(--admin-surface-alt)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--admin-accent)]"><StayHighlightIcon icon={homepage.editorial_highlights[index].icon} size={17} /><span className="absolute -bottom-1 -right-1 grid h-4 w-4 place-items-center rounded-full border border-[var(--admin-border)] bg-[var(--admin-surface)] text-[var(--admin-accent)]"><Pencil size={9} aria-hidden="true" /></span></button>}
        <div className="min-w-0 flex-1"><CharacterField label="Title" value={card.title} onChange={(value) => updateCard(key, index, "title", value)} limit={CMS_LIMITS.benefit_title} /></div>
      </div>
      <CharacterField label="Description" value={card.description} onChange={(value) => updateCard(key, index, "description", value)} limit={CMS_LIMITS.benefit_description} textarea />
    </div>
  </div>)}</div>;

  return <>
    <PageHeader eyebrow="Homepage CMS" title="Edit your current homepage" description="These fields follow the sections visitors see on the homepage. Changes appear there after you publish them." action={<StatusBadge label={published ? "Published" : "Draft"} tone={published ? "success" : "neutral"} />} />
    <div className="homepage-cms-grid"><div className="min-w-0">
      <nav className="homepage-cms-tabs" aria-label="Homepage sections">{sections.map((section) => <button key={section.id} type="button" className={`homepage-cms-tab ${activeSection === section.id ? "is-active" : ""}`} onClick={() => setActiveSection(section.id)}><span>{section.label}</span>{dirty[section.id] && <span className="homepage-cms-unsaved">Unsaved</span>}</button>)}</nav>
      <section className="admin-card homepage-cms-panel bg-[var(--admin-surface)] p-5 sm:p-7">
        <div className="flex flex-wrap items-start justify-between gap-4 border-b border-[var(--admin-border)] pb-5"><div><p className="text-sm font-medium text-[var(--admin-muted)]">Homepage section</p><h2 className="mt-2 text-2xl font-semibold">{active.label}</h2><p className="mt-2 max-w-2xl text-sm leading-relaxed text-[var(--admin-muted)]">{active.description}</p></div><Link href="/" target="_blank" rel="noopener noreferrer" className="admin-button"><ExternalLink size={15} /> View homepage</Link></div>

        {activeSection === "hero" && <div className="mt-6 grid gap-5"><FormGroup title="Hero message" description="Use a new line for each line of the large headline. Button destinations stay linked to Houses and Partner Booking.">{field("editorial_hero_eyebrow", "Small heading", CMS_LIMITS.section_heading)}{field("editorial_hero_heading", "Main headline", CMS_LIMITS.hero_heading, true)}{field("editorial_hero_description", "Supporting text", CMS_LIMITS.hero_subtitle, true)}<div className="grid gap-4 sm:grid-cols-2">{field("editorial_hero_primary_label", "Houses button text", CMS_LIMITS.button_label)}{field("editorial_hero_secondary_label", "Partner button text", CMS_LIMITS.button_label)}</div></FormGroup><FormGroup title="Stay highlights" description="These four cards sit directly below the hero image.">{cards("editorial_highlights", "Highlight")}</FormGroup><HomepageHeroMediaEditor /></div>}

        {activeSection === "houses" && <div className="mt-6 grid gap-5"><div className="rounded-xl border border-[var(--admin-border)] bg-[var(--admin-surface-alt)] p-5"><div className="flex items-start justify-between gap-3"><div><h3 className="text-lg font-semibold">Choose featured houses</h3><p className="mt-1 text-sm text-[var(--admin-muted)]">The homepage shows featured houses, or the first three published houses if none are featured.</p></div><Building2 size={22} aria-hidden="true" /></div><div className="mt-4 grid gap-3 sm:grid-cols-3">{properties.map((property) => <button key={property.id} type="button" aria-pressed={Boolean(property.featured)} disabled={saving} onClick={() => void toggleFeatured(property)} className={`rounded-xl border p-4 text-left transition-colors ${property.featured ? "border-[var(--admin-border)] bg-[var(--admin-accent)] text-[var(--admin-on-accent)]" : "border-[var(--admin-border)] bg-[var(--admin-surface)] text-[var(--admin-text)] hover:bg-[var(--admin-surface-alt)]"}`}><span className="block text-sm font-semibold">{property.name}</span><span className="mt-1 block text-sm opacity-80">{property.featured ? "Featured on homepage" : "Not featured"}</span></button>)}</div></div><p className="text-sm text-[var(--admin-muted)]">House names, details, cover photos, and gallery images are edited in the Houses tab. The photo rail uses those images automatically.</p></div>}

        {activeSection === "intro" && <div className="mt-6"><FormGroup title="The tailored stay" description="This introduction follows the featured houses. Its link opens the Houses page.">{field("editorial_intro_heading", "Section heading", CMS_LIMITS.section_heading)}{field("editorial_intro_link_label", "Houses link text", CMS_LIMITS.button_label)}{field("editorial_intro_statement_one", "First statement", CMS_LIMITS.section_description, true)}{field("editorial_intro_statement_two", "Second statement", CMS_LIMITS.section_description, true)}</FormGroup></div>}

        {activeSection === "services" && <div className="mt-6 grid gap-5"><FormGroup title="Stay services" description="Edit the introduction and each row. Destinations stay linked to Houses, Corporate Stays, and Contact.">{field("editorial_services_heading", "Section heading", CMS_LIMITS.section_heading)}{field("editorial_services_description", "Supporting text", CMS_LIMITS.section_description, true)}</FormGroup>{cards("editorial_services", "Service")}</div>}

        {activeSection === "faqs" && <div className="mt-6 grid gap-5"><FormGroup title="Frequently asked questions" description="Edit the heading, introduction, and contact prompt around your questions.">{field("editorial_faq_eyebrow", "Small heading", CMS_LIMITS.section_heading)}{field("faq_heading", "FAQ heading", CMS_LIMITS.section_heading)}{field("faq_description", "Supporting text", CMS_LIMITS.section_description, true)}<div className="grid gap-4 sm:grid-cols-2">{field("editorial_faq_contact_prompt", "Contact prompt", CMS_LIMITS.section_heading)}{field("editorial_faq_contact_label", "Contact link text", CMS_LIMITS.button_label)}</div></FormGroup><div className="rounded-xl border border-[var(--admin-border)] bg-[var(--admin-surface-alt)] p-4"><div className="flex items-start justify-between gap-3"><div><h3 className="text-lg font-semibold">Guest questions</h3><p className="mt-1 text-sm text-[var(--admin-muted)]">Keep answers specific to the Serenity houses.</p></div><button type="button" className="admin-button" onClick={() => update("faqs", [...homepage.faqs, { question: "", answer: "" }])}><Plus size={15} /> Add question</button></div><div className="mt-4 grid gap-3">{homepage.faqs.map((faq, index) => <div key={`faq-${index}`} className="rounded-xl border border-[var(--admin-border)] bg-[var(--admin-surface)] p-4"><div className="flex items-start justify-between gap-3"><p className="text-sm font-medium">Question {index + 1}</p><div className="flex gap-1"><IconButton label="Move up" disabled={!index} onClick={() => update("faqs", moveItem(homepage.faqs, index, -1))} icon={<ChevronUp size={15} />} /><IconButton label="Move down" disabled={index === homepage.faqs.length - 1} onClick={() => update("faqs", moveItem(homepage.faqs, index, 1))} icon={<ChevronDown size={15} />} /><IconButton label="Remove question" onClick={() => update("faqs", homepage.faqs.filter((_, i) => i !== index))} icon={<Trash2 size={15} />} /></div></div><div className="mt-3 grid gap-3"><CharacterField label="Question" value={faq.question} onChange={(value) => updateFaq(index, "question", value)} limit={CMS_LIMITS.faq_question} /><CharacterField label="Answer" value={faq.answer} onChange={(value) => updateFaq(index, "answer", value)} limit={CMS_LIMITS.faq_answer} textarea /></div></div>)}</div>{!homepage.faqs.length && <EmptyState icon={MessageSquare} title="No FAQs yet" description="Add the first answer guests should see before booking." compact />}</div></div>}

        {activeSection === "social" && <div className="mt-6"><FormGroup title="Explore links" description="This is the final section of the homepage. The destinations remain Houses, About, and Contact.">{field("editorial_social_heading", "Small heading", CMS_LIMITS.section_heading)}{field("editorial_social_houses_label", "Houses link text", CMS_LIMITS.button_label)}{field("editorial_social_story_label", "About link text", CMS_LIMITS.button_label)}{field("editorial_social_contact_label", "Contact link text", CMS_LIMITS.button_label)}</FormGroup></div>}

        {activeSection !== "houses" && <div className="homepage-cms-savebar"><div><p className="text-sm font-medium">{dirty[activeSection] ? "Unsaved changes" : "Section saved"}</p><p className="text-sm text-[var(--admin-muted)]">Publishing updates the public homepage immediately.</p></div><button type="button" className="admin-button admin-button-primary" disabled={saving || (!dirty[activeSection] && published)} onClick={() => void saveSection(activeSection, true)}><Globe2 size={15} /> {saving ? "Publishing…" : "Save and publish"}</button></div>}
      </section>
    </div></div>
    {pickerIndex !== null && selectedHighlight && <AdminDialog label={`Choose icon for highlight ${pickerIndex + 1}`} onClose={() => setPickerIndex(null)} className="admin-highlight-icon-dialog">
      <div className="p-4"><div className="flex items-start justify-between gap-3"><div><h2 className="text-lg font-semibold">Choose an icon</h2><p className="mt-0.5 text-xs text-[var(--admin-muted)]">Highlight {pickerIndex + 1} · {selectedHighlight.title}</p></div><button type="button" className="admin-icon-button" aria-label="Close icon picker" onClick={() => setPickerIndex(null)}><X size={16} /></button></div>
        <label className="mt-3 flex items-center gap-2 rounded-lg border border-[var(--admin-border)] bg-[var(--admin-input)] px-3 text-[var(--admin-muted)]"><Search size={16} aria-hidden="true" /><span className="sr-only">Search icons</span><input autoFocus type="search" value={iconSearch} onChange={(event) => setIconSearch(event.target.value)} placeholder="Search icons" className="min-h-10 w-full bg-transparent text-sm text-[var(--admin-text)] outline-none" /></label>
        <div className="mt-3 grid max-h-[50dvh] grid-cols-3 gap-1.5 overflow-y-auto pr-1 sm:grid-cols-4" role="group" aria-label="Available icons">{filteredIcons.map((option) => <button key={option.id} type="button" aria-pressed={selectedHighlight.icon === option.id} onClick={() => { updateHighlightIcon(pickerIndex, option.id); setPickerIndex(null); }} className={`flex min-h-16 flex-col items-center justify-center gap-1 rounded-lg border p-1.5 text-center text-[11px] font-medium leading-tight transition-colors ${selectedHighlight.icon === option.id ? "border-[var(--admin-accent)] bg-[var(--admin-nav-active-bg)] text-[var(--admin-nav-active-text)]" : "border-[var(--admin-border)] text-[var(--admin-muted)] hover:border-[var(--admin-accent)] hover:bg-[var(--admin-surface-alt)]"}`}><StayHighlightIcon icon={option.id} size={18} /><span>{option.label}</span></button>)}</div>
        {!filteredIcons.length && <p className="py-8 text-center text-sm text-[var(--admin-muted)]">No icons match your search.</p>}
      </div>
    </AdminDialog>}
  </>;
}
