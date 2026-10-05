"use client";

import Image from "next/image";
import Link from "next/link";
import { useState, type FormEvent } from "react";
import { ArrowUpRight } from "lucide-react";
import { SerenityLocationMap } from "@/src/components/SerenityLocationMap";
import { useContactSettings } from "@/src/context/ContactSettingsContext";
import type { Property } from "@/src/data/properties";
import { DEFAULT_CONTACT_SETTINGS } from "@/src/lib/siteSettings";

const nearby = [
  { number: "01", title: "Pakenham Station", detail: "About a 9-minute walk from the Serenity homes." },
  { number: "02", title: "Everyday essentials", detail: "Shopping, supermarkets, cafés and restaurants close by." },
  { number: "03", title: "Work and travel", detail: "A practical base for Pakenham Industrial Park and the wider region." },
];

export function ContactEditorialPage({ properties }: { properties: Property[] }) {
  const contact = useContactSettings() ?? DEFAULT_CONTACT_SETTINGS;
  const [sent, setSent] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const homeImage = properties.find((property) => property.slug === "serenity-7")?.featuredImage ?? properties[0]?.featuredImage ?? "";
  const phoneHref = `tel:${contact.phoneNumber.replace(/[^+\d]/g, "")}`;
  const whatsappDigits = contact.whatsappNumber.replace(/\D/g, "");
  const whatsappHref = whatsappDigits ? `https://wa.me/${whatsappDigits.startsWith("0") ? `61${whatsappDigits.slice(1)}` : whatsappDigits}` : "";
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
      <header className="contact-story-masthead">
        <h1>Get in touch</h1>
        <span>Pakenham · Victoria</span>
      </header>

      <section className="contact-story-hero" aria-labelledby="contact-story-title">
        <div className="contact-story-hero__media">
          {homeImage ? <Image src={homeImage} alt="Serenity house in Pakenham" fill priority sizes="(max-width: 760px) 100vw, 58vw" unoptimized={homeImage.startsWith("http")} /> : null}
          <span>Stay close.<br />Settle in.</span>
        </div>
        <div className="contact-story-hero__copy">
          <span className="contact-story-eyebrow">A local conversation starts here</span>
          <h2 id="contact-story-title">{contact.contactPageHeading}</h2>
          <p>{contact.contactPageDescription}</p>
          <div className="contact-story-links">
            <a href="#contact-form">Send a message <ArrowUpRight size={17} aria-hidden="true" /></a>
            <Link href="/houses">Explore the houses <ArrowUpRight size={17} aria-hidden="true" /></Link>
          </div>
        </div>
      </section>

      <section className="contact-story-methods" aria-label="Ways to contact Serenity">
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
        <div>
          <small>03 / Find us</small>
          <strong>{contact.publicAddress || "Pakenham, Victoria"}</strong>
          <span>{contact.businessHours}</span>
        </div>
      </section>

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
          <p>Serenity homes sit together in Pakenham, near transport and everyday essentials. Exact street details are shared after a confirmed booking to protect guest privacy.</p>
        </div>
        <div className="contact-story-location__map"><SerenityLocationMap /></div>
        <div className="contact-story-location__links">
          <span>Pakenham · Victoria 3810</span>
          <a href={contact.directionsUrl} target="_blank" rel="noopener noreferrer">Get directions <ArrowUpRight size={16} aria-hidden="true" /></a>
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
          {whatsappHref && <a href={whatsappHref} target="_blank" rel="noopener noreferrer">WhatsApp <ArrowUpRight size={17} aria-hidden="true" /></a>}
          {socialLinks.map(([label, href]) => <a key={label} href={href} target="_blank" rel="noopener noreferrer">{label} <ArrowUpRight size={17} aria-hidden="true" /></a>)}
          <Link href="/houses">View all houses <ArrowUpRight size={17} aria-hidden="true" /></Link>
        </div>
      </section>
    </main>
  );
}
