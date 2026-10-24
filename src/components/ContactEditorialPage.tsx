"use client";

import Image from "next/image";
import Link from "next/link";
import { useState, type FormEvent } from "react";
import { ArrowUpRight } from "lucide-react";
import { SerenityLocationMap } from "@/src/components/SerenityLocationMap";
import { useContactSettings } from "@/src/context/ContactSettingsContext";
import { DEFAULT_CONTACT_SETTINGS } from "@/src/lib/siteSettings";
import type { EditorialHomepageContent } from "@/src/lib/homepageEditorialContent";

const nearby = [
  { number: "01", title: "Pakenham Station", detail: "About a 9-minute walk from the Serenity homes." },
  { number: "02", title: "Everyday essentials", detail: "Shopping, supermarkets, cafés and restaurants close by." },
  { number: "03", title: "Work and travel", detail: "A practical base for Pakenham Industrial Park and the wider region." },
];

type ContactFaqContent = Pick<EditorialHomepageContent, "editorial_faq_eyebrow" | "faq_heading" | "faq_description" | "faqs" | "editorial_faq_contact_prompt" | "editorial_faq_contact_label">;

export function ContactEditorialPage({ faqContent }: { faqContent: ContactFaqContent; properties?: unknown[] }) {
  const contact = useContactSettings() ?? DEFAULT_CONTACT_SETTINGS;
  const [sent, setSent] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
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
          phone: values.get("phone"),
          projectType: values.get("projectType"),
          preferredHouse: values.get("house"),
          message: values.get("message"),
        }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error || "We could not send your message.");
      form.reset();
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
          <h1 id="contact-story-title">Contact us<span>.</span></h1>
          <h2>{contact.contactPageHeading}</h2>
          <p>{contact.contactPageDescription}</p>
          <div className="contact-story-links">
            <a href="#contact-form">Send a message <ArrowUpRight size={17} aria-hidden="true" /></a>
            <Link href="/homes">Explore our homes <ArrowUpRight size={17} aria-hidden="true" /></Link>
          </div>
        </div>
        <figure className="contact-story-hero__media">
          <Image src="/contact-welcome-interior.jpg" alt="Illustrative furnished living room with a cream sofa and warm natural light" fill priority sizes="(max-width: 760px) 100vw, 52vw" />
          <figcaption className="illustrative-photo-label">Illustrative interior</figcaption>
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
          <h2 id="contact-story-form-title">Start the conversation.</h2>
          <p>Share your dates, group size or questions about the homes. We&apos;ll help you find the right fit and get back to you shortly.</p>
          <div className="contact-story-enquiry__note">
            <span>Private houses. Local support.</span>
            <span>For families, project teams, relocations and longer stays.</span>
          </div>
        </div>

        <form className="contact-story-form" onSubmit={submitContact}>
          <div className="contact-story-form__row">
            <label>First name <span>*</span><input name="firstName" type="text" required placeholder="Your first name" /></label>
            <label>Last name <span>*</span><input name="lastName" type="text" required placeholder="Your last name" /></label>
          </div>
          <div className="contact-story-form__row">
            <label>Email <span>*</span><input name="email" type="email" required placeholder="you@example.com" /></label>
            <label>Phone number<input name="phone" type="tel" placeholder="+61" /></label>
          </div>
          <div className="contact-story-form__row">
            <label>Stay type<select name="projectType" defaultValue=""><option value="" disabled>Select an option</option><option>Family stay</option><option>Corporate or team stay</option><option>Relocation or insurance</option><option>Long-term stay</option><option>Other</option></select></label>
            <label>Preferred house<select name="house" defaultValue=""><option value="" disabled>Select an option</option><option>Serenity 7</option><option>Serenity 9</option><option>Serenity 11</option><option>Not sure yet</option></select></label>
          </div>
          <label>Message <span>*</span><textarea name="message" required rows={5} placeholder="Tell us a little about your stay" /></label>
          {sent && <p className="contact-story-form__success" role="status">Thanks — your message has been sent. We&apos;ll be in touch shortly.</p>}
          {submitError && <p className="contact-story-form__error" role="alert">{submitError}</p>}
          <button type="submit" disabled={submitting}>{submitting ? "Sending…" : "Send message"} <ArrowUpRight size={17} aria-hidden="true" /></button>
        </form>
      </section>

      <section className="contact-story-location" id="location" aria-labelledby="contact-story-location-title">
        <div className="contact-story-location__heading">
          <div>
            <span className="contact-story-eyebrow">The setting</span>
            <h2 id="contact-story-location-title">Close to what brings you here.</h2>
          </div>
          <p>Serenity homes sit together in Pakenham, near transport and everyday essentials. Select a place on the illustrated map to open it in Google Maps.</p>
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
          <h2 id="contact-story-nearby-title">The everyday, close by.</h2>
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
          <h2>We&apos;re here when you need us.</h2>
        </div>
        <div className="contact-story-closing__links">
          {socialLinks.map(([label, href]) => <a key={label} href={href} target="_blank" rel="noopener noreferrer">{label} <ArrowUpRight size={17} aria-hidden="true" /></a>)}
          <Link href="/homes">View all homes <ArrowUpRight size={17} aria-hidden="true" /></Link>
        </div>
      </section>
    </main>
  );
}
