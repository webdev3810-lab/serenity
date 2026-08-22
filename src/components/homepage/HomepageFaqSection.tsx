import { GsapFadeIn } from "./AnimatedSection";
import ScrollWipeText from "./ScrollWipeText";

export interface FaqItem {
  question: string;
  answer: string;
}

export interface HomepageFaqSectionProps {
  eyebrow?: string;
  heading: string;
  description?: string;
  faqs: FaqItem[];
  allFaqsHref?: string;
  allFaqsLabel?: string;
  className?: string;
}

/**
 * FAQ section: Minimal, centered accordion layout matching the sharp editorial theme.
 */
export default function HomepageFaqSection({
  heading,
  description,
  faqs,
  className = "",
}: HomepageFaqSectionProps) {
  return (
    <section id="faqs" className={`homepage-faq-editorial ${className}`}>
      <GsapFadeIn className="homepage-faq-editorial-inner">
        <div className="homepage-faq-editorial-header">
          <ScrollWipeText className="homepage-faq-editorial-title font-marcellus">
            {heading}
          </ScrollWipeText>
          {description && (
            <p className="homepage-faq-editorial-description">
              {description}
            </p>
          )}
        </div>

        <div className="homepage-faq-editorial-list" aria-label="Frequently asked questions">
          {faqs.map((faq, index) => (
            <details
              key={index}
              className="homepage-faq-editorial-item"
              open={index === 0}
            >
              <summary className="homepage-faq-editorial-summary">
                <span className="homepage-faq-editorial-question font-marcellus">
                  {faq.question}
                </span>
                <span className="homepage-faq-editorial-toggle" aria-hidden="true">
                  +
                </span>
              </summary>
              <div className="homepage-faq-editorial-answer">
                {faq.answer}
              </div>
            </details>
          ))}
        </div>
      </GsapFadeIn>
    </section>
  );
}
