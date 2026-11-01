import type { Property } from "@/src/data/properties";
import { ArrowLeft, ArrowUpRight, Bath, BedDouble, Car, MapPin, Users } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

export function BookNowPage({ properties, originSlug }: { properties: Property[]; originSlug?: string }) {
  const originHome = properties.find((home) => home.slug === originSlug);

  return <main className="book-now-page homepage-theme">
    <div className="book-now-shell">
      <header className="book-now-heading">
        <Link href={originHome ? `/properties/${originHome.slug}` : "/"} className="book-now-back"><ArrowLeft size={17} aria-hidden="true" /> {originHome ? `Back to ${originHome.listingTitle?.trim() || originHome.name.replace(/\s+-\s+Whole$/i, "")}` : "Back to homepage"}</Link>
        <p className="book-now-eyebrow">Book direct</p>
        <h1>Choose your home</h1>
      </header>

      {properties.length ? <section className="book-now-homes" aria-label="Choose a Serenity home">
        <div className="book-now-house-grid">
          {properties.map((home) => {
            const name = home.listingTitle?.trim() || home.name.replace(/\s+-\s+Whole$/i, "");
            const image = home.featuredImage || home.images.find((photo) => photo.src && photo.isVisible !== false)?.src;
            const isSuggested = home.slug === originSlug;
            return <Link key={home.slug} href={`/properties/${home.slug}#availability`} className={`book-now-house${isSuggested ? " is-suggested" : ""}`} aria-label={`Choose ${name} and see available dates`}>
              <span className="book-now-house-image">{image && <Image src={image} alt={`${name} exterior`} fill sizes="(max-width: 700px) 100vw, (max-width: 1100px) 50vw, 33vw" unoptimized />}</span>
              <span className="book-now-house-body">
                <span className="book-now-house-heading"><span className="book-now-house-name">{name}</span>{isSuggested && <span className="book-now-house-suggested">Your choice</span>}</span>
                <span className="book-now-house-location"><MapPin size={16} aria-hidden="true" /> {home.location}</span>
                <span className="book-now-house-facts"><span><Users size={17} aria-hidden="true" /> Up to {home.maxGuests} guests</span><span><BedDouble size={17} aria-hidden="true" /> {home.bedrooms} bedrooms · {home.beds} beds</span><span><Bath size={17} aria-hidden="true" /> {home.bathrooms} bathrooms</span><span><Car size={17} aria-hidden="true" /> {home.parkingType ? "Parking" : "Private home"}</span></span>
                <span className="book-now-house-action">See dates &amp; book <ArrowUpRight size={18} aria-hidden="true" /></span>
              </span>
            </Link>;
          })}
        </div>
      </section> : <section className="book-now-empty"><h2>No homes are available right now.</h2><Link href="/homes">Explore our homes</Link></section>}
    </div>
  </main>;
}
