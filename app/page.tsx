import SerenityEditorialHome, {
  type SerenityEditorialGalleryImage,
  type SerenityEditorialHouse,
} from "@/src/components/homepage/SerenityEditorialHome";
import "./homepage-rejouice.css";
import { getPublicProperties } from "@/src/lib/supabase/content";
import { lodgingBusinessJsonLd, pageMetadata } from "@/src/lib/seo";
import { isApprovedHomepageMediaSource } from "@/src/lib/homepageMedia";

export const metadata = pageMetadata("Serenity on the Rocks");
export const dynamic = "force-dynamic";

const displayName = (name: string) => name.replace(" - Whole", "");

export default async function Home() {
  const properties = await getPublicProperties();
  const featuredProperties = properties.filter((property) => property.featured);
  const homepageProperties = (featuredProperties.length ? featuredProperties : properties).slice(0, 3);

  const houses: SerenityEditorialHouse[] = homepageProperties.map((property) => {
    const approvedImages = property.images.filter((image) => isApprovedHomepageMediaSource(image.src));
    const image = isApprovedHomepageMediaSource(property.featuredImage)
      ? { src: property.featuredImage, alt: `${displayName(property.name)} exterior` }
      : approvedImages[0];

    return {
      name: displayName(property.name),
      slug: property.slug,
      image: image?.src || (isApprovedHomepageMediaSource(property.featuredImage) ? property.featuredImage : ""),
      imageAlt: image?.alt || `${displayName(property.name)} furnished house`,
      location: property.location,
    };
  });

  const heroImage = houses[0]
    ? { src: houses[0].image, alt: houses[0].imageAlt }
    : undefined;
  const gallery: SerenityEditorialGalleryImage[] = houses.map((house) => ({
    src: house.image,
    alt: house.imageAlt,
    label: house.name,
  }));
  const locationProperty = houses.at(-1);
  if (locationProperty?.image) {
    gallery.push({
      src: locationProperty.image,
      alt: `${locationProperty.name} exterior in Pakenham`,
      label: locationProperty.name,
    });
  }

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(lodgingBusinessJsonLd) }} />
      <SerenityEditorialHome
        heroImage={heroImage?.src || ""}
        heroAlt={heroImage?.alt || "Serenity on the Rocks furnished interior"}
        houses={houses}
        gallery={gallery}
      />
    </>
  );
}
