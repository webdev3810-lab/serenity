"use client";

import { useRef, useState, type FormEvent } from "react";
import { ArrowUpRight } from "lucide-react";
import styles from "./airbnb-editorial.module.css";

export default function AirbnbEnquiryForm() {
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");
  const submissionKey = useRef<string | null>(null);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const values = new FormData(form);
    const arrival = String(values.get("arrival") ?? "");
    const departure = String(values.get("departure") ?? "");
    if (arrival && departure && departure <= arrival) {
      setError("Choose a departure date after your arrival date.");
      return;
    }

    setSubmitting(true);
    setSent(false);
    setError("");
    submissionKey.current ??= crypto.randomUUID();

    const message = [
      "Casa de Vacacion stay enquiry",
      `Preferred arrival: ${arrival || "Not specified"}`,
      `Preferred departure: ${departure || "Not specified"}`,
      `Guests: ${values.get("guests") || "Not specified"}`,
      "",
      String(values.get("message") ?? "").trim(),
    ].join("\n");

    try {
      const response = await fetch("/api/contact-messages", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Idempotency-Key": `orani:${submissionKey.current}` },
        body: JSON.stringify({
          firstName: values.get("firstName"),
          lastName: values.get("lastName"),
          email: values.get("email"),
          phone: values.get("phone"),
          projectType: "Casa de Vacacion enquiry",
          preferredHouse: "Casa de Vacacion",
          message,
        }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error || "We could not send your enquiry.");
      form.reset();
      submissionKey.current = null;
      setSent(true);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "We could not send your enquiry.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className={styles.enquiry} id="enquire" aria-labelledby="orani-enquiry-title">
      <div className={styles.sectionHeading}>
        <div><p className={styles.eyebrow}>Stay enquiries</p><h2 id="orani-enquiry-title">Enquire about your stay.</h2></div>
        <p>Share your preferred dates and a little about your plans. This sends a question to our team; it does not reserve the home. Bookings and payments take place on Airbnb.</p>
      </div>
      <form className={styles.enquiryForm} onSubmit={submit}>
        <label><span className={styles.fieldLabel}>First name <em>*</em></span><input name="firstName" autoComplete="given-name" maxLength={80} required /></label>
        <label><span className={styles.fieldLabel}>Last name <em>*</em></span><input name="lastName" autoComplete="family-name" maxLength={80} required /></label>
        <label><span className={styles.fieldLabel}>Email <em>*</em></span><input name="email" type="email" autoComplete="email" maxLength={150} required /></label>
        <label>Phone<input name="phone" type="tel" autoComplete="tel" maxLength={30} /></label>
        <label>Preferred arrival<input name="arrival" type="date" /></label>
        <label>Preferred departure<input name="departure" type="date" /></label>
        <label>Number of guests<select name="guests" defaultValue=""><option value="">Not sure yet</option><option value="1">1 guest</option><option value="2">2 guests</option></select></label>
        <label className={styles.messageField}><span className={styles.fieldLabel}>Your message <em>*</em></span><textarea name="message" rows={5} maxLength={1500} placeholder="Tell us what you’d like to know" required /></label>
        <div className={styles.formFooter}>
          {sent && <p className={styles.success} role="status">Thanks — your enquiry has been sent. We’ll be in touch shortly.</p>}
          {error && <p className={styles.error} role="alert">{error}</p>}
          <button className={styles.solidButton} type="submit" disabled={submitting}>{submitting ? "Sending…" : "Send stay enquiry"}<ArrowUpRight size={17} aria-hidden="true" /></button>
          <small>No booking or payment is taken through this form.</small>
        </div>
      </form>
    </section>
  );
}
