export const AIRBNB_URL = "https://www.airbnb.com.au/rooms/1227325251646971600";
export const ORANI_ENHANCED_EXTERIOR = "/orani-exterior-enhanced-v2.jpg";
export const ORANI_PREVIEW_IMAGE = "/orani-philippines-preview-v1.jpg";
export const ORANI_ENHANCED_INTERIORS = [
  { src: "/orani-living-enhanced-v1.jpg", alt: "AI-enhanced view of the Casa de Vacacion living room", label: "Living area" },
  { src: "/orani-kitchen-enhanced-v1.jpg", alt: "AI-enhanced view of the Casa de Vacacion kitchen and laundry area", label: "Kitchen & laundry" },
  { src: "/orani-living-second-enhanced-v1.jpg", alt: "AI-enhanced second view of the Casa de Vacacion living room", label: "Living area · second view" },
] as const;
export const SPECIALIST_SUITES_URL = "https://specialistsuiteshub.com.au/";
export const SPECIALIST_SUITES_IMAGE = "https://jiuvzvqeoguxjprpltsf.supabase.co/storage/v1/object/public/site-media/benefits/a47efbb3-b90d-4342-a8ed-fa65cf8d4301-front.webp";

const suiteImageBase = "https://jiuvzvqeoguxjprpltsf.supabase.co/storage/v1/object/public/suite-images/";

export const SPECIALIST_SUITES_PHOTOS = [
  { src: `${suiteImageBase}room-1/1785233468810-0.png`, alt: "Treatment room with examination table and workstation", label: "Consulting suite" },
  { src: `${suiteImageBase}room-2/1785233895629-0.png`, alt: "Bright consulting room with treatment table and desk", label: "Treatment-ready space" },
  { src: `${suiteImageBase}room-3/1785234340641-0.png`, alt: "Comfortable consultation seating at the Hub", label: "Welcoming consultation area" },
  { src: `${suiteImageBase}room-4/e0d14a78-57c5-48b1-9f41-df8499ff4128.webp`, alt: "Clinical consulting room with equipment and seating", label: "Clinical workspace" },
] as const;

const imageBase = "https://a0.muscache.com/im/pictures/miso/Hosting-1227325251646971600/original/";

export const ORANI_PHOTOS = [
  { src: `${imageBase}0cd6ac7a-fc50-4a1f-813c-c7ce7c4ddcba.jpeg`, alt: "Exterior of the Orani vacation home", label: "The home" },
  { src: `${imageBase}7b5f6dde-828b-4abc-b525-9ea6fc5ef5a1.jpeg`, alt: "View from the Orani vacation home", label: "The outlook" },
  { src: `${imageBase}6a97756e-71db-4211-8fdc-c351fb490aa5.jpeg`, alt: "Living area of the Orani vacation home", label: "Living area" },
  { src: `${imageBase}f44ad6b6-3c73-4d69-871a-0d7038bc89c4.jpeg`, alt: "Second view of the Orani vacation home's living area", label: "Living area · second view" },
  { src: `${imageBase}c17141a9-ce1d-4653-a375-74cbde5e3ee5.jpeg`, alt: "Kitchen and laundry area at the Orani vacation home", label: "Kitchen & laundry" },
] as const;
