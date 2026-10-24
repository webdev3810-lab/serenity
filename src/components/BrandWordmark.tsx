import Image from "next/image";

type BrandWordmarkProps = {
  className?: string;
  variant?: "navigation" | "footer" | "admin";
};

export function BrandWordmark({ className = "", variant = "navigation" }: BrandWordmarkProps) {
  if (variant === "admin") {
    return (
      <span className={`brand-wordmark brand-wordmark--admin ${className}`.trim()}>
        <Image src="/LOGO.png" alt="" width={1248} height={642} sizes="72px" />
        <span className="brand-wordmark__admin-copy">
          <strong>Serenity</strong>
          <small>Corporate Stays</small>
        </span>
      </span>
    );
  }

  return (
    <span className={`brand-wordmark brand-wordmark--${variant} ${className}`.trim()}>
      <span className="brand-wordmark__primary">Serenity</span>
      <span className="brand-wordmark__secondary">
        <span className="brand-wordmark__rule" aria-hidden="true" />
        <span className="brand-wordmark__tagline">on the rocks</span>
        <span className="brand-wordmark__stone" aria-hidden="true" />
      </span>
    </span>
  );
}
