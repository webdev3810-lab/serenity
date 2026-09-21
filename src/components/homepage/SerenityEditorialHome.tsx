import Image from "next/image";
import Link from "next/link";

export type SerenityEditorialHouse = {
  name: string;
  slug: string;
  image: string;
  imageAlt: string;
  location: string;
};

export type SerenityEditorialGalleryImage = {
  src: string;
  alt: string;
  label: string;
};

type SerenityEditorialHomeProps = {
  heroImage: string;
  heroAlt: string;
  houses: SerenityEditorialHouse[];
  gallery: SerenityEditorialGalleryImage[];
};

function EditorialImage({ src, alt, priority = false }: { src: string; alt: string; priority?: boolean }) {
  if (!src) return <div className="serenity-editorial-image-fallback" aria-hidden="true" />;

  return (
    <Image
      src={src}
      alt={alt}
      fill
      priority={priority}
      sizes="100vw"
      unoptimized={src.includes("a0.muscache.com") || src.includes(".supabase.co/")}
    />
  );
}

export default function SerenityEditorialHome({ heroImage, heroAlt, houses, gallery }: SerenityEditorialHomeProps) {
  const editorialCards = houses.map((house, index) => ({
    ...house,
    image: gallery[index]?.src || house.image,
    imageAlt: gallery[index]?.alt || house.imageAlt,
  }));
  const locationImage = gallery[3] ?? gallery[0];

  return (
    <div className="serenity-editorial-home">
      <header className="serenity-editorial-nav">
        <nav className="serenity-editorial-nav__left" aria-label="Primary navigation">
          <Link href="/houses">Houses</Link>
          <Link href="/about">About</Link>
          <Link href="/corporate-stays">Corporate stays</Link>
        </nav>

        <Link href="/" className="serenity-editorial-nav__mark" aria-label="Serenity on the Rocks home">
          S
        </Link>

        <nav className="serenity-editorial-nav__right" aria-label="Booking navigation">
          <Link href="/contact">Contact</Link>
          <Link href="/houses">Book a stay</Link>
        </nav>
      </header>

      <section className="serenity-editorial-hero" aria-labelledby="serenity-editorial-title">
        <EditorialImage src={heroImage} alt={heroAlt} priority />
        <div className="serenity-editorial-hero__shade" aria-hidden="true" />
        <h1 id="serenity-editorial-title">
          <span>Serenity</span>
          <span>on the Rocks</span>
        </h1>
      </section>

      <section className="serenity-editorial-houses" aria-label="The Serenity houses">
        {houses.map((house, index) => (
          <article className="serenity-editorial-house" key={house.slug} style={{ zIndex: index + 1 }}>
            <EditorialImage src={house.image} alt={house.imageAlt} />
            <div className="serenity-editorial-house__shade" aria-hidden="true" />
            <div className="serenity-editorial-house__copy">
              <p>0{index + 1} · {house.location}</p>
              <h2>{house.name}</h2>
              <Link href={`/properties/${house.slug}`}>Explore house <span aria-hidden="true">↗</span></Link>
            </div>
            <ol className="serenity-editorial-house__index" aria-label="House index">
              {houses.map((item, itemIndex) => (
                <li className={itemIndex === index ? "is-active" : ""} key={item.slug}>{item.name}</li>
              ))}
            </ol>
          </article>
        ))}
      </section>

      <section className="serenity-editorial-intro" aria-labelledby="serenity-editorial-intro-title">
        <div className="serenity-editorial-intro__topline">
          <h2 id="serenity-editorial-intro-title">The tailored stay</h2>
          <Link href="/houses">View all houses <span aria-hidden="true">↗</span></Link>
        </div>
        <div className="serenity-editorial-intro__statement">
          <p>Three private homes, considered down to the everyday details.</p>
          <p>Stay independently or reserve the houses together for family, work, relocation and longer visits.</p>
        </div>
      </section>

      <section className="serenity-editorial-collection" aria-label="Explore the Serenity collection">
        {editorialCards.map((house, index) => (
          <Link className="serenity-editorial-card" href={`/properties/${house.slug}`} key={house.slug}>
            <div className="serenity-editorial-card__media">
              <EditorialImage src={house.image} alt={house.imageAlt} />
            </div>
            <div className="serenity-editorial-card__meta">
              <h3>{house.name}</h3>
              <p>House 0{index + 1}</p>
            </div>
          </Link>
        ))}
      </section>

      <section className="serenity-editorial-services" aria-labelledby="serenity-editorial-services-title">
        <div className="serenity-editorial-services__heading">
          <h2 id="serenity-editorial-services-title">Stay services</h2>
          <p>The finishing touches for an easy arrival and a settled stay.</p>
        </div>
        <div className="serenity-editorial-services__grid">
          <Link href="/houses">
            <span>01</span>
            <h3>Private whole homes</h3>
            <p>Space to cook, work, rest and live at your own pace.</p>
          </Link>
          <Link href="/corporate-stays">
            <span>02</span>
            <h3>Corporate stays</h3>
            <p>Flexible arrangements for project teams and relocations.</p>
          </Link>
          <Link href="/contact">
            <span>03</span>
            <h3>Local support</h3>
            <p>One responsive point of contact from enquiry to checkout.</p>
          </Link>
        </div>
      </section>

      <section className="serenity-editorial-location" aria-labelledby="serenity-editorial-location-title">
        <EditorialImage
          src={locationImage?.src || heroImage}
          alt={locationImage?.alt || "Serenity on the Rocks in Pakenham"}
        />
        <div className="serenity-editorial-location__shade" aria-hidden="true" />
        <div className="serenity-editorial-location__copy">
          <p>Our house is yours</p>
          <h2 id="serenity-editorial-location-title">Pakenham,<br />Victoria</h2>
          <div>
            <Link href="/houses">Explore the homes</Link>
            <Link href="/contact">Plan your stay</Link>
          </div>
        </div>
      </section>

      <section className="serenity-editorial-social" aria-label="Serenity social links">
        <p>Stay inspired</p>
        <div>
          <Link href="/houses">Houses,</Link>
          <Link href="/about">Our story,</Link>
          <Link href="/contact">Contact</Link>
        </div>
      </section>

      <footer className="serenity-editorial-footer">
        <div className="serenity-editorial-footer__grid">
          <div>
            <h2>Stay</h2>
            <Link href="/houses">All houses</Link>
            <Link href="/properties/serenity-7">Serenity 7</Link>
            <Link href="/properties/serenity-9">Serenity 9</Link>
            <Link href="/properties/serenity-11">Serenity 11</Link>
          </div>
          <div>
            <h2>Discover</h2>
            <Link href="/about">About</Link>
            <Link href="/corporate-stays">Corporate stays</Link>
            <Link href="/long-term-stays">Long-term stays</Link>
          </div>
          <div>
            <h2>Visit</h2>
            <p>Pakenham, Victoria 3810<br />Australia</p>
            <Link href="/contact">Get in touch</Link>
          </div>
          <div>
            <h2>Information</h2>
            <Link href="/terms">Terms &amp; conditions</Link>
            <Link href="/privacy">Privacy policy</Link>
            <Link href="/cancellation-policy">Cancellation policy</Link>
          </div>
        </div>
        <div className="serenity-editorial-footer__wordmark" aria-label="Serenity on the Rocks">
          <span>Serenity</span>
          <span>on the Rocks</span>
        </div>
        <div className="serenity-editorial-footer__legal">
          <p>© {new Date().getFullYear()} Serenity on the Rocks</p>
          <p>Pakenham · Victoria · Australia</p>
        </div>
      </footer>
    </div>
  );
}
