type BrandWordmarkProps = {
  className?: string;
  variant?: "navigation" | "footer" | "admin";
};

export function BrandWordmark({ className = "", variant = "navigation" }: BrandWordmarkProps) {
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
