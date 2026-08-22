"use client";

export default function Error({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="section">
      <div className="container card p-8 text-center">
        <p className="eyebrow">Something went wrong</p>
        <h1 className="mt-3 text-3xl font-semibold">The prototype view could not load.</h1>
        <button className="btn-primary mt-6" onClick={reset}>Try again</button>
      </div>
    </div>
  );
}
