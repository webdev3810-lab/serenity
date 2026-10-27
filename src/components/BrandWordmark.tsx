import Image from "next/image";

type BrandWordmarkProps = {
  className?: string;
  variant?: "navigation" | "footer" | "admin";
  priority?: boolean;
};

export function BrandWordmark({ className = "", variant = "navigation", priority = false }: BrandWordmarkProps) {
  return (
    <span className={`serenity-brand serenity-brand--${variant} ${className}`.trim()}>
      <Image
        className="serenity-brand__symbol"
        src="/LOGO.png"
        alt=""
        width={1248}
        height={642}
        sizes="(max-width: 640px) 72px, 112px"
        priority={priority}
      />
      <span className="serenity-brand__wordmark">
        <strong className="serenity-brand__name">SERENITY</strong>
        <small className="serenity-brand__descriptor">
          <span className="serenity-brand__rule" aria-hidden="true" />
          CORPORATE BOOKINGS
          <span className="serenity-brand__rule" aria-hidden="true" />
        </small>
      </span>
    </span>
  );
}
