"use client";

/* The CMS reads flexible Supabase rows, so the boundary is intentionally defensive. */

import { ChevronDown, ChevronUp, Eye, GripVertical, Home, Plus, X } from "lucide-react";
import { useId, useRef, useState } from "react";

import { asList, BedArrangement, Row } from "./AdminModels";
export function PageHeader({ eyebrow, title, description, action }: { eyebrow: string; title: string; description: string; action?: React.ReactNode }) {
  return (
    <header className="admin-page-header">
      <div className="flex w-full min-w-0 flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="min-w-0">
          <p className="admin-section-kicker">{eyebrow}</p>
          <h2 className="mt-2 text-2xl font-semibold tracking-tight sm:text-3xl">{title}</h2>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-[var(--admin-muted)]">{description}</p>
        </div>
        {action && <div className="flex shrink-0 flex-wrap items-center gap-2">{action}</div>}
      </div>
    </header>
  );
}
export function FormGroup({ title, description, children }: { title: string; description: string; children: React.ReactNode }) { return <fieldset className="grid gap-4 border-b border-[var(--admin-border)] pb-5 last:border-b-0 last:pb-0"><legend className="text-lg font-semibold">{title}</legend><p className="-mt-2 text-sm text-[var(--admin-muted)]">{description}</p>{children}</fieldset>; }
const INTERNAL_LINK_OPTIONS = [
  { value: "/", label: "Homepage" },
  { value: "/houses", label: "Houses" },
  { value: "/corporate-stays", label: "Corporate stays" },
  { value: "/about", label: "About Serenity" },
  { value: "/long-term-stays", label: "Long-term stays" },
  { value: "/booking", label: "Booking" },
  { value: "/#faqs", label: "FAQs" },
  { value: "/contact", label: "Contact" },
  { value: "/terms", label: "Terms and conditions" },
  { value: "/privacy", label: "Privacy policy" },
];

const DEFAULT_CHARACTER_LIMIT = 300;
const FIELD_PLACEHOLDERS: Record<string, string> = {
  "Property name": "e.g. Serenity 7",
  Slug: "e.g. serenity-7",
  Location: "e.g. Pakenham, Victoria",
  "Property type": "e.g. Private furnished house",
  "Short description": "A concise description guests can scan quickly.",
  "Full description": "Describe the home, layout, and stay experience.",
  "Check-in time": "e.g. 3:00 pm",
  "Checkout time": "e.g. 10:00 am",
  "Pet policy": "e.g. Pets considered on request",
  "Parking details": "e.g. Private driveway parking",
  "Listing title": "e.g. A calm furnished stay in Pakenham",
  "Kitchen facilities": "e.g. Fully equipped kitchen with essentials.",
  "Laundry facilities": "e.g. Washing machine and dryer available.",
  "Wi-Fi and connectivity": "e.g. Fast Wi-Fi for work and streaming.",
  Workspace: "e.g. Desk and chair in the living area.",
  "Heating and cooling": "e.g. Split-system heating and cooling.",
  "Self check-in details": "e.g. Secure key-safe entry.",
  "Safety information": "e.g. Smoke alarms and emergency information provided.",
  "Cancellation policy": "Summarise the cancellation terms in plain language.",
  "Corporate information": "Explain what corporate guests should know.",
  "Corporate booking instructions": "e.g. Contact us for multi-house bookings.",
  Room: "e.g. Bedroom 1",
  Beds: "e.g. Queen bed",
  "Alt text": "Describe the image briefly",
};

export function LinkSelect({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  const hasKnownValue = INTERNAL_LINK_OPTIONS.some((option) => option.value === value);
  const options = hasKnownValue || !value
    ? INTERNAL_LINK_OPTIONS
    : [{ value, label: `Current saved link (${value})` }, ...INTERNAL_LINK_OPTIONS];

  return <label className="block text-sm font-medium">Button destination<select className="admin-field mt-1" value={value || "/houses"} onChange={(event) => onChange(event.target.value)} aria-label="Button destination">{options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select><span className="mt-1 block text-sm font-normal text-[var(--admin-muted)]">Choose the page guests should visit when they select this button.</span></label>;
}

export function CharacterField({ label, value, onChange, limit, textarea = false, type = "text", placeholder, help }: { label: string; value: unknown; onChange: (value: string) => void; limit?: number; textarea?: boolean; type?: string; placeholder?: string; help?: string }) {
  const helpId = useId();
  const text = String(value ?? "");
  if (label.toLowerCase().includes("button link") || label.toLowerCase().includes("button destination")) return <LinkSelect value={text} onChange={onChange} />;
  const safeLimit = limit ?? DEFAULT_CHARACTER_LIMIT;
  const remaining = safeLimit - text.length;
  const fieldProps = { className: `admin-field mt-1 ${textarea ? "admin-textarea min-h-40 max-h-96 resize-y overflow-y-auto" : ""}`, value: text, maxLength: safeLimit, placeholder: placeholder ?? FIELD_PLACEHOLDERS[label] ?? `Enter ${label.toLowerCase()}`, onChange: (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => onChange(event.target.value), "aria-label": label, "aria-describedby": helpId, "aria-invalid": text.length > safeLimit, required: label.endsWith("*") };
  return <label className="block min-w-0 text-sm font-medium">{label}{textarea ? <textarea {...fieldProps} /> : <input {...fieldProps} type={type} />}<span id={helpId} className="mt-1 flex min-w-0 items-start justify-between gap-3 text-sm font-normal text-[var(--admin-muted)]">{help ? <span className="min-w-0">{help}</span> : <span />}{<span className={remaining <= Math.ceil(safeLimit * 0.1) ? "shrink-0 font-medium text-[var(--admin-danger-text)]" : "shrink-0"}>{text.length} / {safeLimit}</span>}</span></label>;
}
export function NumberField({ label, value, onChange }: { label: string; value: unknown; onChange: (value: number) => void }) { return <label className="block text-sm font-medium">{label}<input className="admin-field mt-1" type="number" min="0" step={/fee|price|rate|discount|bathroom|AUD/i.test(label) ? "0.01" : "1"} value={Number(value ?? 0)} onChange={(event) => onChange(Number(event.target.value))} /></label>; }
export function RepeatableList({ label, items, onChange, limit, help }: { label: string; items: string[]; onChange: (items: string[]) => void; limit: number; help: string }) {
  const [pending, setPending] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const addTag = () => {
    const value = pending.trim().replace(/,$/, "").trim();
    if (!value) return;
    if (!items.some((item) => item.trim().toLowerCase() === value.toLowerCase())) onChange([...items, value.slice(0, limit)]);
    setPending("");
  };
  const reorder = (from: number, to: number) => {
    if (from === to || from < 0 || to < 0 || from >= items.length || to >= items.length) return;
    const next = [...items];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    onChange(next);
  };
  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter" || event.key === ",") {
      event.preventDefault();
      addTag();
    }
  };

  return <section className="md:col-span-2 rounded-xl border border-[var(--admin-border)] bg-[var(--admin-surface-alt)] p-4">
    <div className="flex items-center justify-between gap-3">
      <div className="min-w-0"><div className="flex items-center gap-2"><h3 className="text-sm font-semibold">{label}</h3><span className="rounded-xl bg-[var(--admin-surface)] px-2 py-0.5 text-xs font-medium text-[var(--admin-muted)]">{items.length}</span></div><p className="mt-1 text-sm font-normal text-[var(--admin-muted)]">{help}</p></div>
      <button type="button" className="admin-button inline-flex min-h-9 shrink-0 items-center gap-1 px-3 py-1 text-sm" onClick={() => inputRef.current?.focus()}><Plus size={14} /> Add</button>
    </div>
    <div className="mt-3 flex gap-2"><input ref={inputRef} className="admin-field !mt-0 min-h-10 min-w-0 flex-1 bg-[var(--admin-surface)] py-2 text-sm" value={pending} maxLength={limit} placeholder={`Type an item and press Enter`} onChange={(event) => setPending(event.target.value)} onKeyDown={handleKeyDown} aria-label={`Add ${label.toLowerCase()}`} /><button type="button" className="admin-button admin-button-primary min-h-10 shrink-0 px-3 text-sm" onClick={addTag} disabled={!pending.trim()}>Add tag</button></div>
    <p className="mt-1 text-sm text-[var(--admin-muted)]">Press Enter or comma to create a tag. Drag tags to change their order.</p>
    {items.length ? <div className="mt-3 flex flex-wrap gap-2">
      {items.map((item, index) => <div className="admin-tag group inline-flex max-w-full cursor-grab items-center gap-1 rounded-xl border border-[var(--admin-border)] bg-[var(--admin-surface)] pl-2 pr-1 py-1 text-sm font-medium text-[var(--admin-text)]  active:cursor-grabbing" key={`${label}-${index}`} draggable onDragStart={(event) => { event.dataTransfer.effectAllowed = "move"; event.dataTransfer.setData("text/plain", String(index)); }} onDragOver={(event) => { event.preventDefault(); event.dataTransfer.dropEffect = "move"; }} onDrop={(event) => { event.preventDefault(); reorder(Number(event.dataTransfer.getData("text/plain")), index); }} title="Drag to reorder. Double-click the label to edit.">
        <GripVertical size={14} className="shrink-0 text-[var(--admin-muted)]" aria-hidden="true" /><button type="button" className="max-w-[18rem] truncate text-left outline-none focus-visible:underline" onDoubleClick={() => { setPending(item); onChange(items.filter((_, itemIndex) => itemIndex !== index)); inputRef.current?.focus(); }}>{item}</button><button type="button" className="ml-1 inline-flex h-6 w-6 items-center justify-center rounded-xl text-[var(--admin-muted)] hover:bg-[var(--admin-surface-alt)] hover:text-[var(--admin-danger-text)]" onClick={() => onChange(items.filter((_, itemIndex) => itemIndex !== index))} aria-label={`Remove ${item}`}><X size={13} /></button>
      </div>)}
    </div> : <p className="mt-3 rounded-xl border border-dashed border-[var(--admin-border)] bg-[var(--admin-surface)] p-3 text-sm text-[var(--admin-muted)]">No tags yet. Type an item above to add one.</p>}
  </section>;
}
export function BedEditor({ items, onChange }: { items: BedArrangement[]; onChange: (items: BedArrangement[]) => void }) { return <div className="md:col-span-2 rounded-xl border border-[var(--admin-border)] bg-[var(--admin-surface-alt)] p-4"><div className="flex items-start justify-between gap-3"><div><h3 className="text-sm font-semibold">Sleeping arrangements</h3><p className="mt-1 text-sm text-[var(--admin-muted)]">Add rooms and describe the beds without editing JSON.</p></div><button type="button" className="admin-button inline-flex min-h-9 items-center gap-1 px-3 py-1 text-sm" onClick={() => onChange([...items, { room: `Bedroom ${items.length + 1}`, beds: "" }])}><Plus size={14} /> Add room</button></div><div className="mt-4 grid gap-3">{items.map((item, index) => <div key={`bed-${index}`} className="grid gap-3 rounded-xl border border-[var(--admin-border)] bg-[var(--admin-surface)] p-3 sm:grid-cols-[1fr_1fr_auto]"><CharacterField label="Room" value={item.room} onChange={(value) => onChange(items.map((current, itemIndex) => itemIndex === index ? { ...current, room: value } : current))} limit={60} /><CharacterField label="Beds" value={item.beds} onChange={(value) => onChange(items.map((current, itemIndex) => itemIndex === index ? { ...current, beds: value } : current))} limit={100} /><div className="mt-7 flex gap-1"><IconButton label="Move up" disabled={!index} onClick={() => onChange(moveItem(items, index, -1))} icon={<ChevronUp size={15} />} /><IconButton label="Move down" disabled={index === items.length - 1} onClick={() => onChange(moveItem(items, index, 1))} icon={<ChevronDown size={15} />} /></div></div>)}</div></div>; }
export function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (checked: boolean) => void }) { return <label className="flex cursor-pointer items-center gap-3 text-sm font-medium"><input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} className="h-4 w-4 accent-[var(--admin-accent)]" />{label}</label>; }
export function IconButton({ label, disabled, onClick, icon }: { label: string; disabled?: boolean; onClick: () => void; icon: React.ReactNode }) { return <button type="button" aria-label={label} title={label} disabled={disabled} onClick={onClick} className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-[var(--admin-border)] bg-[var(--admin-surface)] text-[var(--admin-muted)] hover:bg-[var(--admin-surface-alt)] disabled:cursor-not-allowed disabled:opacity-40">{icon}</button>; }
export function moveItem<T>(items: T[], index: number, direction: -1 | 1) { const next = index + direction; if (next < 0 || next >= items.length) return items; const copy = [...items]; [copy[index], copy[next]] = [copy[next], copy[index]]; return copy; }
export function HousePreview({ draft }: { draft: Row }) { return <div className="admin-card admin-guest-preview mt-6 bg-[#EAE1DD] p-6"><div className="flex items-center gap-2 text-sm font-bold text-[#5A463A]"><Eye size={17} /> Guest preview</div><div className="mt-4 rounded-none bg-white p-6"><p className="text-xs font-bold uppercase tracking-widest text-[#8B6B55]">{draft.property_type || "Furnished house"}</p><h3 className="mt-2 max-w-2xl text-3xl font-extrabold text-[#2D2622]">{draft.name || "Your house heading"}</h3><p className="mt-3 max-w-2xl text-base leading-relaxed text-stone-700">{draft.short_description || "Your short description will appear here."}</p><div className="mt-5 flex flex-wrap gap-2">{asList(draft.amenities).slice(0, 6).map((item) => <span key={item} className="rounded-none bg-[#F7F4F1] px-3 py-1 text-xs font-bold text-stone-700">{item}</span>)}</div></div></div>; }
export function EmptyState({ icon: Icon, title, description, compact = false }: { icon: typeof Home; title: string; description: string; compact?: boolean }) { return <div className={`flex flex-col items-center justify-center text-center text-[var(--admin-muted)] ${compact ? "p-8" : "min-h-64 p-10"}`}><Icon className="text-[var(--admin-text)]" size={compact ? 28 : 38} /><h3 className="mt-3 text-lg font-semibold text-[var(--admin-text)]">{title}</h3><p className="mt-1 max-w-md text-sm">{description}</p></div>; }
