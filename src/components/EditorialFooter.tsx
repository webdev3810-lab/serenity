import Link from "next/link";

export function EditorialFooter() {
  return (
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
      <Link href="/" className="serenity-editorial-footer__wordmark" aria-label="Serenity home">
        <span>Serenity</span>
      </Link>
      <div className="serenity-editorial-footer__legal">
        <p>© {new Date().getFullYear()} Serenity on the Rocks</p>
        <p>Pakenham · Victoria · Australia</p>
      </div>
    </footer>
  );
}
