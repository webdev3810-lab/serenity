"use client";

import { useState } from "react";
import type { Property } from "@/src/data/properties";
import { addDays, calculatePrice, formatAud, todayIso, validateGuestCapacity } from "@/src/lib/booking";
import { NumberField, Toggle } from "./AdminFields";
import type { Row } from "./AdminModels";

export function GuestsPricingEditor({ draft, setDraft }: { draft: Row; setDraft: (update: (r: Row) => Row) => void }) {
  const field = (key: string, value: unknown) => setDraft((row) => ({ ...row, [key]: value }));
  const [nights, setNights] = useState(3);
  const [adults, setAdults] = useState(2);
  const [children, setChildren] = useState(0);
  const [infants, setInfants] = useState(0);
  const [pets, setPets] = useState(0);
  const property = {
    nightlyPrice: Number(draft.nightly_price),
    petFee: Number(draft.pet_fee),
    extraGuestFee: Number(draft.extra_guest_fee),
    extraGuestThreshold: Number(draft.extra_guest_threshold),
    minimumGuests: Number(draft.minimum_guests),
    maxGuests: Number(draft.max_guests),
    maximumAdults: Number(draft.maximum_adults),
    maximumChildren: Number(draft.maximum_children),
    maximumInfants: Number(draft.maximum_infants),
    maximumPets: Number(draft.maximum_pets),
    petsAllowed: draft.pets_allowed !== false,
  } as Property;
  const guests = { adults, children, infants, pets };
  const price = calculatePrice(property, todayIso(), addDays(todayIso(), Math.max(1, Math.min(365, nights || 1))), guests);
  const error = validateGuestCapacity(property, guests);
  const numberFields = [
    ["Minimum staying guests", "minimum_guests"],
    ["Maximum staying guests", "max_guests"],
    ["Maximum adults", "maximum_adults"],
    ["Maximum children", "maximum_children"],
    ["Maximum infants", "maximum_infants"],
    ["Maximum pets", "maximum_pets"],
    ["Guests included in default rate", "extra_guest_threshold"],
    ["Extra guest / night (AUD)", "extra_guest_fee"],
    ["Pet fee / stay (AUD)", "pet_fee"],
  ] as const;
  const examples = [
    ["Accommodation", price.nightlySubtotal],
    ["Extra guests", price.extraGuestFee],
    ["Pet fee", price.petFee],
    ["Total", price.total],
  ] as const;

  return (
    <section className="admin-card grid gap-5 p-5 sm:p-7">
      <div>
        <h2 className="text-xl font-semibold">Guests and pricing</h2>
        <p className="text-sm text-[var(--admin-muted)]">Adults and children are staying guests. Infants do not count toward capacity or extra-guest fees and have their own limit.</p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {numberFields.map(([label, key]) => <NumberField key={key} label={label} value={draft[key]} onChange={(value) => field(key, value)} />)}
      </div>
      <div className="flex flex-wrap gap-5">
        <Toggle label="Children allowed" checked={Number(draft.maximum_children) > 0} onChange={(value) => field("maximum_children", value ? 1 : 0)} />
        <Toggle label="Infants allowed" checked={Number(draft.maximum_infants) > 0} onChange={(value) => field("maximum_infants", value ? 1 : 0)} />
        <Toggle label="Pets allowed" checked={draft.pets_allowed !== false} onChange={(value) => setDraft((row) => ({ ...row, pets_allowed: value, maximum_pets: value ? Math.max(1, Number(row.maximum_pets)) : 0 }))} />
      </div>
      <p className="text-sm text-[var(--admin-muted)]">The nightly rate is the accommodation price charged. Extra guests and pets are charged only when applicable. No separate cleaning fee or tax is added at checkout.</p>
      <details open className="rounded-xl border border-[var(--admin-border)] p-4">
        <summary className="cursor-pointer font-medium">Live example at the default rate</summary>
        <div className="my-4 grid grid-cols-2 gap-3 lg:grid-cols-5">
          {([
            ["Nights", nights, setNights],
            ["Adults", adults, setAdults],
            ["Children", children, setChildren],
            ["Infants", infants, setInfants],
            ["Pets", pets, setPets],
          ] as const).map(([label, value, setter]) => (
            <label key={label}>{label}<input className="admin-field" type="number" min={label === "Nights" ? 1 : 0} max="365" value={value} onChange={(event) => setter(Number(event.target.value))} /></label>
          ))}
        </div>
        {error && <p className="admin-notice is-error" role="status">{error}</p>}
        <dl className="admin-example-price">
          {examples.map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{formatAud(value)}</dd></div>)}
        </dl>
        <p className="text-sm text-[var(--admin-muted)]">Illustration only. Date overrides and promotion codes are not included in this example.</p>
      </details>
    </section>
  );
}
