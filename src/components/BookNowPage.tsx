import type { Property } from "@/src/data/properties";
import { ArrowLeft, ArrowUpRight } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { editorialHouseDetails } from "@/src/lib/editorialHouseDetails";

export function BookNowPage({ properties, originSlug }: { properties: Property[]; originSlug?: string }) {
  const originHome = properties.find((home) => home.slug === originSlug);

  return <main className="book-now-page homepage-theme">
    <div className="book-now-shell">
      <header className="book-now-heading">
        <Link href={originHome ? `/properties/${originHome.slug}` : "/"} className="book-now-back"><ArrowLeft size={17} aria-hidden="true" /> {originHome ? `Back to ${originHome.listingTitle?.trim() || originHome.name.replace(/\s+-\s+Whole$/i, "")}` : "Back to homepage"}</Link>
        <h1>Choose your <em>home</em></h1>
      </header>

      {properties.length ? <section className="book-now-homes" aria-label="Choose a Serenity home">
        <div className="houses-editorial-list book-now-house-grid">
          {properties.map((home) => {
            const name = home.listingTitle?.trim() || home.name.replace(/\s+-\s+Whole$/i, "");
            const image = home.featuredImage || home.images.find((photo) => photo.src && photo.isVisible !== false)?.src;
            const isSuggested = home.slug === originSlug;
            const details = editorialHouseDetails(home);
            return <article key={home.slug} className={`houses-editorial-list__card book-now-house${isSuggested ? " is-suggested" : ""}`}>
              <Link href={`/properties/${home.slug}#availability`} className="houses-editorial-list__link" aria-label={`Choose ${name} and see available dates`}>
                <span className="houses-editorial-list__media">
                  {image ? <Image src={image} alt={`${name} exterior`} fill sizes="(max-width: 760px) 100vw, (max-width: 1023px) 50vw, 33vw" unoptimized={image.includes(".supabase.co/")} /> : <span className="houses-editorial-list__fallback">Home photos coming soon</span>}
                </span>
                <span className="houses-editorial-list__content">
                  <span className="houses-editorial-list__caption"><span className="houses-editorial-list__title">{name}</span>{isSuggested && <span className="book-now-house-suggested">Your choice</span>}</span>
                  <ul className="houses-editorial-list__details" aria-label={`${name} at a glance`}>
                    {details.map(({ label, Icon }) => <li key={label}><Icon size={17} strokeWidth={1.8} aria-hidden="true" /><span>{label}</span></li>)}
                  </ul>
                  <span className="houses-editorial-list__cta">See dates &amp; book <ArrowUpRight size={17} aria-hidden="true" /></span>
                </span>
              </Link>
            </article>;
          })}
        </div>
      </section> : <section className="book-now-empty"><h2>No homes are available right now.</h2><Link href="/homes">Explore our homes</Link></section>}
    </div>
  </main>;
}
