import Link from "next/link";
import { ArrowUpRight } from "lucide-react";

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

function splitHeading(value: string) {
  const words = value.trim().split(/\s+/).filter(Boolean);
  if (words.length < 2) return [value.trim(), ""] as const;

  let bestIndex = Math.ceil(words.length / 2);
  let bestDifference = Number.POSITIVE_INFINITY;

  for (let index = 1; index < words.length; index += 1) {
    const firstLength = words.slice(0, index).join(" ").length;
    const secondLength = words.slice(index).join(" ").length;
    const difference = Math.abs(firstLength - secondLength);

    if (difference < bestDifference) {
      bestDifference = difference;
      bestIndex = index;
    }
  }

  return [words.slice(0, bestIndex).join(" "), words.slice(bestIndex).join(" ")] as const;
}

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
  const [headingPrimary, headingAccent] = splitHeading(heading);

  return (
    <section className={`homepage-business-section ${className}`.trim()}>
      <div className="homepage-business-container">
        <div className="homepage-business-intro">
          <div>
            <h2 className="homepage-business-title" aria-label={heading}>
              <span className="homepage-business-title-primary">{headingPrimary}</span>
              {headingAccent ? <span className="homepage-business-title-accent">{headingAccent}</span> : null}
            </h2>
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
