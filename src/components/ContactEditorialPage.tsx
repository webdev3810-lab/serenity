"use client";

import Image from "next/image";
import Link from "next/link";
import { useState, type FormEvent } from "react";
import { ArrowUpRight, ChevronDown } from "lucide-react";
import { SerenityLocationMap } from "@/src/components/SerenityLocationMap";
import { useContactSettings } from "@/src/context/ContactSettingsContext";
import { DEFAULT_CONTACT_SETTINGS } from "@/src/lib/siteSettings";
import type { EditorialHomepageContent } from "@/src/lib/homepageEditorialContent";
import { PUBLIC_PAGE_MEDIA, type PublicPageMedia } from "@/src/lib/publicPageMedia";
import type { PublicPageCopy } from "@/src/lib/publicPageCopy";

type ContactFaqContent = Pick<EditorialHomepageContent, "editorial_faq_eyebrow" | "faq_heading" | "faq_description" | "faqs" | "editorial_faq_contact_prompt" | "editorial_faq_contact_label">;

const nationalPhoneDigits = (value: string) => {
  let digits = value.replace(/\D/g, "");
  if (digits.length > 9 && digits.startsWith("61")) digits = digits.slice(2);
  return digits.replace(/^0/, "").slice(0, 9);
};

export function ContactEditorialPage({ faqContent, media, copy, properties }: { faqContent: ContactFaqContent; media: PublicPageMedia; copy: PublicPageCopy; properties: { id: string; name: string }[] }) {
  const nearby = [
    { number: "01", title: copy.contactNearby1Title, detail: copy.contactNearby1Lead },
    { number: "02", title: copy.contactNearby2Title, detail: copy.contactNearby2Lead },
    { number: "03", title: copy.contactNearby3Title, detail: copy.contactNearby3Lead },
  ];
  const contact = useContactSettings() ?? DEFAULT_CONTACT_SETTINGS;
  const [sent, setSent] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [stayType, setStayType] = useState("");
  const [preferredHouse, setPreferredHouse] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const phoneHref = `tel:${(contact.phoneNumber || DEFAULT_CONTACT_SETTINGS.phoneNumber).replace(/[^+\d]/g, "")}`;
  const socialLinks = [
    ["Facebook", contact.facebookUrl],
    ["Instagram", contact.instagramUrl],
    ["LinkedIn", contact.linkedinUrl],
  ].filter(([, href]) => href);

  const submitContact = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitting(true);
    setSent(false);
    setSubmitError("");
    const form = event.currentTarget;
    const values = new FormData(form);

    try {
      const response = await fetch("/api/contact-messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Idempotency-Key": `contact:${crypto.randomUUID()}`,
        },
        body: JSON.stringify({
          firstName: values.get("firstName"),
          lastName: values.get("lastName"),
          email: values.get("email"),
          phone: phoneNumber ? `+61 ${phoneNumber}` : "",
          projectType: stayType === "Other" ? `Other: ${String(values.get("projectTypeOther") ?? "").trim()}` : stayType,
          preferredHouse: preferredHouse === "Other" ? `Other: ${String(values.get("houseOther") ?? "").trim()}` : preferredHouse,
          message: values.get("message"),
        }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error || "We could not send your message.");
      form.reset();
      setStayType("");
      setPreferredHouse("");
      setPhoneNumber("");
      setSent(true);
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : "We could not send your message.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="contact-story-page homepage-theme">
      <section className="contact-story-hero" aria-labelledby="contact-story-title">
        <div className="contact-story-hero__copy">
          <span className="contact-story-hero__eyebrow">Pakenham · Victoria</span>
          <h1 id="contact-story-title">{copy.contactHeroTitle}<span>.</span></h1>
          <h2>{contact.contactPageHeading}</h2>
          <p>{contact.contactPageDescription}</p>
          <div className="contact-story-links">
            <a href="#contact-form">Send a message <ArrowUpRight size={17} aria-hidden="true" /></a>
            <Link href="/homes">Explore our homes <ArrowUpRight size={17} aria-hidden="true" /></Link>
          </div>
        </div>
        <figure className="contact-story-hero__media">
          <Image src={media.contactHero.src} alt={media.contactHero.alt} fill priority sizes="(max-width: 760px) 100vw, 52vw" />
          {media.contactHero.src === PUBLIC_PAGE_MEDIA.contactHero.src && <figcaption className="illustrative-photo-label">Illustrative interior</figcaption>}
        </figure>
      </section>

      {contact.contactPublished && <section className="contact-story-methods" aria-label="Ways to contact Serenity">
        <a href={phoneHref}>
          <small>01 / Call us</small>
          <strong>{contact.phoneNumber}</strong>
          <span>Speak with the local team <ArrowUpRight size={17} aria-hidden="true" /></span>
        </a>
        <a href={`mailto:${contact.contactEmail}`}>
          <small>02 / Email us</small>
          <strong>{contact.contactEmail}</strong>
          <span>Send the details of your stay <ArrowUpRight size={17} aria-hidden="true" /></span>
        </a>
        {contact.publicAddress && <div>
          <small>03 / Find us</small>
          <strong>{contact.publicAddress}</strong>
          <span>We&apos;re here 24/7 — message us anytime, any day.</span>
        </div>}
      </section>}

      <section id="contact-form" className="contact-story-enquiry" aria-labelledby="contact-story-form-title">
        <div className="contact-story-enquiry__intro">
          <span className="contact-story-eyebrow">Tell us what you need</span>
          <h2 id="contact-story-form-title">{copy.contactFormTitle}</h2>
          <p>{copy.contactFormLead}</p>
          <div className="contact-story-enquiry__note">
            <span>Private houses. Local support.</span>
            <span>For families, project teams, relocations and longer stays.</span>
          </div>
        </div>

        <form className="contact-story-form" onSubmit={submitContact}>
          <div className="contact-story-form__row">
            <label>First name <span>*</span><input name="firstName" type="text" required placeholder="Enter your first name" /></label>
            <label>Last name <span>*</span><input name="lastName" type="text" required placeholder="Enter your last name" /></label>
          </div>
          <div className="contact-story-form__row">
            <label>Email <span>*</span><input name="email" type="email" required placeholder="name@example.com" /></label>
            <label>Phone number<span className="contact-story-form__phone"><span aria-hidden="true">+61</span><input name="phone" type="tel" inputMode="numeric" autoComplete="tel-national" value={phoneNumber} onChange={(event) => setPhoneNumber(nationalPhoneDigits(event.target.value))} minLength={9} pattern="[0-9]{9}" title="Enter exactly 9 digits after +61" aria-label="Phone number: exactly 9 digits after +61" placeholder="4XX XXX XXX" /></span><small className="contact-story-form__phone-hint">Enter 9 digits after +61</small></label>
          </div>
          <div className="contact-story-form__row">
            <div className="contact-story-form__choice">
              <label htmlFor="contact-stay-type">Stay type</label>
              <span className="contact-story-form__select"><select id="contact-stay-type" name="projectType" value={stayType} onChange={(event) => setStayType(event.target.value)} className={!stayType ? "is-placeholder" : ""}><option value="">Choose your stay type</option><option>Family stay</option><option>Corporate bookings</option><option>Relocation or insurance</option><option>Long-term stay</option><option>Other</option></select><ChevronDown size={19} aria-hidden="true" /></span>
              {stayType === "Other" && <label className="contact-story-form__other">Tell us your stay type<input name="projectTypeOther" required maxLength={73} placeholder="Describe your stay" /></label>}
            </div>
            <div className="contact-story-form__choice">
              <label htmlFor="contact-preferred-house">Preferred house</label>
              <span className="contact-story-form__select"><select id="contact-preferred-house" name="house" value={preferredHouse} onChange={(event) => setPreferredHouse(event.target.value)} className={!preferredHouse ? "is-placeholder" : ""}><option value="">Choose a house or select all</option><option>All houses</option>{properties.map((property) => <option key={property.id} value={property.name}>{property.name}</option>)}<option>Not sure yet</option><option>Other</option></select><ChevronDown size={19} aria-hidden="true" /></span>
              {preferredHouse === "Other" && <label className="contact-story-form__other">Which house did you have in mind?<input name="houseOther" required maxLength={73} placeholder="Enter the house or location" /></label>}
            </div>
          </div>
          <label>Message <span>*</span><textarea name="message" required rows={5} placeholder="Share your dates, guest count, and anything else we can help with" /></label>
          {sent && <p className="contact-story-form__success" role="status">Thanks — your message has been sent. We&apos;ll be in touch shortly.</p>}
          {submitError && <p className="contact-story-form__error" role="alert">{submitError}</p>}
          <button type="submit" disabled={submitting}>{submitting ? "Sending…" : "Send message"} <ArrowUpRight size={17} aria-hidden="true" /></button>
        </form>
      </section>

      <section className="contact-story-location" id="location" aria-labelledby="contact-story-location-title">
        <div className="contact-story-location__heading">
          <div>
            <span className="contact-story-eyebrow">The setting</span>
            <h2 id="contact-story-location-title">{copy.contactLocationTitle}</h2>
          </div>
          <p>{copy.contactLocationLead}</p>
        </div>
        <div className="contact-story-location__map"><SerenityLocationMap /></div>
        <div className="contact-story-location__links">
          <span>Pakenham · Victoria 3810</span>
          <a href={contact.directionsUrl} target="_blank" rel="noopener noreferrer">Get directions <ArrowUpRight size={16} aria-hidden="true" /></a>
        </div>
      </section>

      <section className="serenity-editorial-faq contact-story-faq" id="faqs" aria-labelledby="contact-story-faq-title">
        <div className="serenity-editorial-faq__header">
          <div className="serenity-editorial-faq__title">
            <p>{faqContent.editorial_faq_eyebrow}</p>
            <h2 id="contact-story-faq-title">{faqContent.faq_heading}</h2>
          </div>
          <p className="serenity-editorial-faq__intro">{faqContent.faq_description}</p>
        </div>
        <div className="serenity-editorial-faq__list" aria-label="Frequently asked questions">
          {faqContent.faqs.map((faq, index) => (
            <details className="serenity-editorial-faq__item" key={`${faq.question}-${index}`}>
              <summary>
                <span className="serenity-editorial-faq__number" aria-hidden="true">{String(index + 1).padStart(2, "0")}</span>
                <span className="serenity-editorial-faq__question">{faq.question}</span>
                <span className="serenity-editorial-faq__toggle" aria-hidden="true">+</span>
              </summary>
              <div className="serenity-editorial-faq__answer">{faq.answer}</div>
            </details>
          ))}
        </div>
        <div className="serenity-editorial-faq__contact">
          <p>{faqContent.editorial_faq_contact_prompt}</p>
          <a href="#contact-form">{faqContent.editorial_faq_contact_label} <ArrowUpRight size={17} aria-hidden="true" /></a>
        </div>
      </section>

      <section className="contact-story-nearby" aria-labelledby="contact-story-nearby-title">
        <div className="contact-story-nearby__heading">
          <span className="contact-story-eyebrow">Around the neighbourhood</span>
          <h2 id="contact-story-nearby-title">{copy.contactNearbyTitle}</h2>
        </div>
        <div className="contact-story-nearby__grid">
          {nearby.map((item) => (
            <article key={item.number}>
              <small>{item.number}</small>
              <div><h3>{item.title}</h3><p>{item.detail}</p></div>
            </article>
          ))}
        </div>
      </section>

      <section className="contact-story-closing" aria-label="More ways to connect">
        <div>
          <span className="contact-story-eyebrow">Prefer another way?</span>
          <h2>{copy.contactClosingTitle}</h2>
        </div>
        <div className="contact-story-closing__links">
          {socialLinks.map(([label, href]) => <a key={label} href={href} target="_blank" rel="noopener noreferrer">{label} <ArrowUpRight size={17} aria-hidden="true" /></a>)}
          <Link href="/homes">View all homes <ArrowUpRight size={17} aria-hidden="true" /></Link>
        </div>
      </section>
    </main>
  );
}
