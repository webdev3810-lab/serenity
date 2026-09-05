import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import ScrollWipeText from "./ScrollWipeText";

const corporateUseCases = [
  {
    number: "01",
    title: "Project teams",
    description: "Keep employees and contractors together, rested and close to key South-East Melbourne worksites.",
  },
  {
    number: "02",
    title: "Insurance stays",
    description: "Calm, private accommodation for displaced families while repairs or claims are resolved.",
  },
  {
    number: "03",
    title: "Employee relocation",
    description: "A ready-to-live-in home that gives employees time to settle before choosing a permanent address.",
  },
];

export interface HomepageCorporateSectionProps {
  heading: string;
  description: string;
  ctaLabel: string;
  ctaHref: string;
  className?: string;
}

export default function HomepageCorporateSection({
  heading,
  description,
  ctaLabel,
  ctaHref,
  className = "",
}: HomepageCorporateSectionProps) {
  return (
    <section className={`homepage-business-section ${className}`.trim()}>
      <div className="homepage-business-container">
        <div className="homepage-business-intro">
          <div>
            <p className="homepage-business-eyebrow">Built for business travel</p>
            <ScrollWipeText as="h2" className="homepage-business-title">
              {heading}
            </ScrollWipeText>
          </div>
          <div className="homepage-business-copy">
            <p>{description}</p>
            <Link href={ctaHref} className="homepage-business-link">
              {ctaLabel} <ArrowUpRight size={15} aria-hidden="true" />
            </Link>
          </div>
        </div>

        <div className="homepage-business-grid" aria-label="Business travel use cases">
          {corporateUseCases.map((useCase) => (
            <article className="homepage-business-card" key={useCase.number}>
              <span className="homepage-business-number">{useCase.number}</span>
              <h3>{useCase.title}</h3>
              <p>{useCase.description}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
