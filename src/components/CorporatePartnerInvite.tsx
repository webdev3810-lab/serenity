"use client";

import Link from "next/link";
import { ArrowUpRight } from "lucide-react";

export function CorporatePartnerInvite({ onRequest }: { onRequest: () => void }) {
  return (
    <section className="corporate-partner-invite" aria-labelledby="corporate-partner-invite-title">
      <div className="corporate-partner-invite__copy">
        <span className="corporate-partner-invite__eyebrow">New corporate partners</span>
        <h2 id="corporate-partner-invite-title">Want to become a partner?</h2>
        <p>Tell us about your company and accommodation needs. We’ll review your request and contact you about a Partner ID.</p>
      </div>
      <Link href="#corporate-question" onClick={onRequest} className="corporate-partner-invite__action">
        Request a Partner ID <ArrowUpRight size={19} aria-hidden="true" />
      </Link>
    </section>
  );
}
