import EyebrowLabel from "./EyebrowLabel";

type HeadingLevel = "h1" | "h2" | "h3";

interface SectionHeadingProps {
  eyebrow?: string;
  heading: string;
  description?: string;
  centred?: boolean;
  headingAs?: HeadingLevel;
  className?: string;
}

/**
 * Reusable section heading block: optional eyebrow label, heading, and description.
 * Used in every homepage section for consistent typography.
 */
export default function SectionHeading({
  eyebrow,
  heading,
  description,
  centred = false,
  headingAs: Heading = "h2",
  className = "",
}: SectionHeadingProps) {
  return (
    <div className={`${centred ? "text-center max-w-2xl mx-auto" : ""} ${className}`}>
      {eyebrow && <EyebrowLabel>{eyebrow}</EyebrowLabel>}
      <Heading className="font-serif text-3xl sm:text-4xl font-bold text-[#2D2622] leading-[1.15] text-balance">
        {heading}
      </Heading>
      {description && (
        <p className="mt-3 text-base sm:text-lg text-[#5A463A] leading-relaxed text-balance font-normal">
          {description}
        </p>
      )}
    </div>
  );
}
