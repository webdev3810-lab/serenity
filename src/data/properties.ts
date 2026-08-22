export type BedArrangement = {
  room: string;
  beds: string;
};

export type PropertyReview = {
  id: string;
  reviewerName: string;
  reviewText: string;
  rating: 5;
  reviewDate: string | null;
  reviewDateLabel: string | null;
  source: string;
  displayOrder: number;
  published: boolean;
};

export type PropertyDatePrice = {
  date: string;
  nightlyPrice: number;
  label: string;
};

export type PropertyImage = {
  src: string;
  alt: string;
  category?: string;
  categoryLabel?: string;
  categoryDescription?: string;
  categoryOrder?: number;
  isCover?: boolean;
  isVisible?: boolean;
};

import { propertyReviewsBySlug } from "@/src/data/propertyReviews";
import { isApprovedHomepageMediaSource } from "@/src/lib/homepageMedia";

export type Property = {
  id: string;
  slug: string;
  name: string;
  propertyType: string;
  location: string;
  shortDescription: string;
  fullDescription: string;
  maxGuests: number;
  bedrooms: number;
  beds: number;
  bathrooms: number;
  bedArrangements: BedArrangement[];
  amenities: string[];
  checkIn: string;
  checkout: string;
  petPolicy: string;
  parkingType: string;
  nightlyPrice: number;
  datePrices?: PropertyDatePrice[];
  cleaningFee: number;
  petFee: number;
  extraGuestFee: number;
  extraGuestThreshold: number;
  minimumStay: number;
  maximumStay: number;
  minimumGuests: number;
  maximumAdults: number;
  maximumChildren: number;
  maximumInfants: number;
  maximumPets: number;
  minimumAdvanceNoticeDays: number;
  maximumAdvanceBookingDays: number;
  sameDayBookingAllowed: boolean;
  weekendBookingAllowed: boolean;
  instantBookingEnabled: boolean;
  bookingRequestRequired: boolean;
  petsAllowed: boolean;
  corporateBookingAllowed: boolean;
  minimumCorporateStay: number;
  minimumCorporateHouses: number;
  maximumCorporateHouses: number;
  adjacentHousesAllowed: boolean;
  longTermStaysAllowed: boolean;
  corporateDiscount: number;
  corporateApprovalRequired: boolean;
  corporateDepositRequired: boolean;
  corporateOnlinePayment: boolean;
  gstInvoiceAvailable: boolean;
  corporateInstructions: string;
  weeklyDiscount: number;
  monthlyDiscount: number;
  listingTitle?: string;
  kitchenFacilities?: string;
  laundryFacilities?: string;
  wifiInformation?: string;
  workspaceInformation?: string;
  heatingCooling?: string;
  selfCheckInDetails?: string;
  safetyInformation?: string;
  cancellationPolicy?: string;
  corporateInformation?: string;
  images: PropertyImage[];
  featuredImage: string;
  unavailableDates: string[];
  houseRules: string[];
  nearbyLocations: string[];
  latitude: number;
  longitude: number;
  published?: boolean;
  featured?: boolean;
  displayOrder?: number;
  listingDetails?: Record<string, unknown>;
  reviews?: PropertyReview[];
};

const airbnbImage = (path: string, label: string) => ({
  // Temporary remote preview source. Keep these only while the listing photos are hosted and licensed for this site.
  src: `https://a0.muscache.com/im/pictures/${path}?im_w=1200`,
  alt: `Serenity 11 ${label}`,
});

const airbnbPropertyImage = (propertyName: string, path: string, label: string) => ({
  // Temporary remote preview source. Keep these only while the listing photos are hosted and licensed for this site.
  src: `https://a0.muscache.com/im/pictures/${path}?im_w=1200`,
  alt: `${propertyName} ${label}`,
});

const serenity9Image = (path: string, label: string) => airbnbPropertyImage("Serenity 9", path, label);
const serenity7Image = (path: string, label: string) => airbnbPropertyImage("Serenity 7", path, label);

const localPropertyLibrary: Property[] = [
  {
    id: "serenity-7",
    slug: "serenity-7",
    name: "Serenity 7 - Whole",
    propertyType: "Entire furnished house",
    location: "Pakenham, Victoria, Australia",
    shortDescription: "A comfortable three-bedroom house for families, work crews and longer stays near Pakenham transport and shops.",
    fullDescription:
      "Serenity 7 is a fully furnished private house arranged for practical, comfortable stays in Pakenham. The house sits beside the other Serenity houses, making it useful for groups that need separate houses in the same location. It includes three bedrooms, a fully equipped kitchen, dining area, laundry, Wi-Fi, Netflix, heating and air conditioning. It suits family trips, company bookings, contractors, relocating employees and extended stays where guests need space to settle in.",
    maxGuests: 6,
    bedrooms: 3,
    beds: 5,
    bathrooms: 2.5,
    bedArrangements: [
      { room: "Bedroom 1", beds: "1 queen bed" },
      { room: "Bedroom 2", beds: "2 single beds" },
      { room: "Bedroom 3", beds: "2 single beds" },
    ],
    amenities: [
      "Self check-in with key safe",
      "Wi-Fi",
      "Fully equipped kitchen",
      "Laundry facilities",
      "Free parking",
      "HDTV",
      "Netflix",
      "Heating",
      "Air conditioning",
      "Dining area",
      "Private entrance",
      "Long-term stays allowed",
      "Pet-friendly",
      "Family suitable",
      "Corporate-stay friendly",
    ],
    checkIn: "After 3:00 PM",
    checkout: "Before 11:00 AM",
    petPolicy: "Pet-friendly. Pets must be declared before arrival.",
    parkingType: "Free parking",
    nightlyPrice: 240,
    cleaningFee: 120,
    petFee: 45,
    extraGuestFee: 20,
    extraGuestThreshold: 4,
    minimumStay: 2,
    maximumStay: 90,
    minimumGuests: 1,
    maximumAdults: 6,
    maximumChildren: 6,
    maximumInfants: 2,
    maximumPets: 2,
    minimumAdvanceNoticeDays: 0,
    maximumAdvanceBookingDays: 365,
    sameDayBookingAllowed: true,
    weekendBookingAllowed: true,
    instantBookingEnabled: true,
    bookingRequestRequired: false,
    petsAllowed: true,
    corporateBookingAllowed: true,
    minimumCorporateStay: 7,
    minimumCorporateHouses: 1,
    maximumCorporateHouses: 3,
    adjacentHousesAllowed: true,
    longTermStaysAllowed: true,
    corporateDiscount: 0,
    corporateApprovalRequired: false,
    corporateDepositRequired: false,
    corporateOnlinePayment: true,
    gstInvoiceAvailable: true,
    corporateInstructions: "Corporate stays are welcome. Contact Serenity for multi-house availability, GST invoices, and project-team arrangements.",
    weeklyDiscount: 8,
    monthlyDiscount: 15,
    images: [
      serenity7Image("hosting/Hosting-U3RheVN1cHBseUxpc3Rpbmc6ODE2ODA3MjczNjQ5MzExODEy/original/b2cb970f-d33e-458e-837b-c742d80fbd84.jpeg", "exterior image 3"),
      serenity7Image("hosting/Hosting-U3RheVN1cHBseUxpc3Rpbmc6ODE2ODA3MjczNjQ5MzExODEy/original/ee8a5173-6d16-4c98-98a4-6957a24a6c41.jpeg", "living room image 1"),
      serenity7Image("hosting/Hosting-U3RheVN1cHBseUxpc3Rpbmc6ODE2ODA3MjczNjQ5MzExODEy/original/bc4fd156-24d4-420e-bed5-22f940ad79b8.jpeg", "full kitchen image 1"),
      serenity7Image("hosting/Hosting-U3RheVN1cHBseUxpc3Rpbmc6ODE2ODA3MjczNjQ5MzExODEy/original/9f8f360d-f5e4-4db1-89f6-03b224ee80ce.jpeg", "dining area image 1"),
      serenity7Image("hosting/Hosting-U3RheVN1cHBseUxpc3Rpbmc6ODE2ODA3MjczNjQ5MzExODEy/original/3ea13d70-9cc5-42cf-ab49-1ecc1726c9fb.jpeg", "bedroom 1 image 1"),
      serenity7Image("hosting/Hosting-U3RheVN1cHBseUxpc3Rpbmc6ODE2ODA3MjczNjQ5MzExODEy/original/157f9aa6-805d-4c7e-bcb9-cd9c6c64ef45.jpeg", "bedroom 2 image 1"),
      serenity7Image("hosting/Hosting-U3RheVN1cHBseUxpc3Rpbmc6ODE2ODA3MjczNjQ5MzExODEy/original/23df84b3-358e-4bcf-be5a-6a511906efa2.jpeg", "bedroom 3 image 1"),
      serenity7Image("miso/Hosting-816807273649311812/original/da6330dc-a04d-47ab-b4cf-7baabc1983b3.png", "full bathroom 1 image 1"),
      serenity7Image("hosting/Hosting-U3RheVN1cHBseUxpc3Rpbmc6ODE2ODA3MjczNjQ5MzExODEy/original/9f6c81fe-07bf-49d6-91b6-416ec27d3919.jpeg", "full bathroom 2 image 1"),
      serenity7Image("hosting/Hosting-U3RheVN1cHBseUxpc3Rpbmc6ODE2ODA3MjczNjQ5MzExODEy/original/08894154-76a7-4f3d-b33c-d43be3a197ff.jpeg", "half bathroom image 1"),
      serenity7Image("hosting/Hosting-U3RheVN1cHBseUxpc3Rpbmc6ODE2ODA3MjczNjQ5MzExODEy/original/bcbbd9d4-5f7f-41ea-9cea-5dcefe081d2e.jpeg", "laundry area image 1"),
      serenity7Image("miso/Hosting-816807273649311812/original/412f2b6b-4982-4081-b198-0acbfd7c899b.jpeg", "exterior image 1"),
      serenity7Image("hosting/Hosting-U3RheVN1cHBseUxpc3Rpbmc6ODE2ODA3MjczNjQ5MzExODEy/original/002cdc47-0b1f-4023-aa72-fa862e5b19f9.jpeg", "additional photos image 1"),
      serenity7Image("hosting/Hosting-U3RheVN1cHBseUxpc3Rpbmc6ODE2ODA3MjczNjQ5MzExODEy/original/49b045d6-2919-4720-87e9-1b93b5ecf2fa.jpeg", "living room image 2"),
      serenity7Image("hosting/Hosting-U3RheVN1cHBseUxpc3Rpbmc6ODE2ODA3MjczNjQ5MzExODEy/original/04a83c22-d8e9-4ffe-9504-800c8ec33ebb.jpeg", "living room image 3"),
      serenity7Image("hosting/Hosting-U3RheVN1cHBseUxpc3Rpbmc6ODE2ODA3MjczNjQ5MzExODEy/original/c01c9458-7864-4f02-ad34-bcb655a519b3.jpeg", "full kitchen image 2"),
      serenity7Image("hosting/Hosting-U3RheVN1cHBseUxpc3Rpbmc6ODE2ODA3MjczNjQ5MzExODEy/original/1ad4afd8-5eb4-4a02-be1d-ad41c24b2206.jpeg", "dining area image 2"),
      serenity7Image("hosting/Hosting-U3RheVN1cHBseUxpc3Rpbmc6ODE2ODA3MjczNjQ5MzExODEy/original/1d330a5a-01cc-4916-8e9d-aac8215fd346.jpeg", "dining area image 3"),
      serenity7Image("hosting/Hosting-U3RheVN1cHBseUxpc3Rpbmc6ODE2ODA3MjczNjQ5MzExODEy/original/da68e2bb-8dd5-4f75-b141-f387cae30ada.jpeg", "dining area image 4"),
      serenity7Image("hosting/Hosting-U3RheVN1cHBseUxpc3Rpbmc6ODE2ODA3MjczNjQ5MzExODEy/original/8657999a-88b5-4cc4-87b0-a108868f22e6.jpeg", "dining area image 5"),
      serenity7Image("hosting/Hosting-U3RheVN1cHBseUxpc3Rpbmc6ODE2ODA3MjczNjQ5MzExODEy/original/1bc88480-0d10-4684-9bc5-dd2505a69d0c.jpeg", "dining area image 6"),
      serenity7Image("hosting/Hosting-U3RheVN1cHBseUxpc3Rpbmc6ODE2ODA3MjczNjQ5MzExODEy/original/3264d70e-22d7-47a4-976b-5309cd21921a.jpeg", "dining area image 7"),
      serenity7Image("hosting/Hosting-U3RheVN1cHBseUxpc3Rpbmc6ODE2ODA3MjczNjQ5MzExODEy/original/7c1a6288-cc40-4727-9346-2f92162fc7d2.jpeg", "bedroom 1 image 2"),
      serenity7Image("hosting/Hosting-U3RheVN1cHBseUxpc3Rpbmc6ODE2ODA3MjczNjQ5MzExODEy/original/710b6abb-d637-4dbc-895e-28085e2bd49e.jpeg", "full bathroom 1 image 2"),
      serenity7Image("hosting/Hosting-U3RheVN1cHBseUxpc3Rpbmc6ODE2ODA3MjczNjQ5MzExODEy/original/98ed6860-6fa5-449c-9bab-92d2e9b2899c.jpeg", "exterior image 2"),
      serenity7Image("hosting/Hosting-U3RheVN1cHBseUxpc3Rpbmc6ODE2ODA3MjczNjQ5MzExODEy/original/bbf29d76-dba5-42cf-ad12-fdcf30e674d7.jpeg", "exterior image 4"),
      serenity7Image("miso/Hosting-816807273649311812/original/75bbe2d5-7054-4f40-82b1-5adcb455ef2f.jpeg", "additional photos image 2"),
      serenity7Image("hosting/Hosting-U3RheVN1cHBseUxpc3Rpbmc6ODE2ODA3MjczNjQ5MzExODEy/original/2e0f42e9-2a8e-4d96-8525-4978692f5564.jpeg", "additional photos image 3"),
      serenity7Image("miso/Hosting-816807273649311812/original/d8a96c66-821f-4049-8bd9-ae2dff036fff.png", "additional photos image 6"),
      serenity7Image("miso/Hosting-816807273649311812/original/1a623ff3-897a-4bc5-b5e5-33a631b379d7.jpeg", "additional photos image 4"),
      serenity7Image("miso/Hosting-816807273649311812/original/7491f846-4a95-4bc1-83a5-1abfaeffac30.jpeg", "additional photos image 5"),
    ],
    featuredImage: serenity7Image("hosting/Hosting-U3RheVN1cHBseUxpc3Rpbmc6ODE2ODA3MjczNjQ5MzExODEy/original/b2cb970f-d33e-458e-837b-c742d80fbd84.jpeg", "exterior image 3").src,
    unavailableDates: ["2026-08-12", "2026-08-13", "2026-08-14", "2026-09-02", "2026-09-03", "2026-10-18", "2026-10-19"],
    houseRules: [
      "Check-in after 3:00 PM",
      "Checkout before 11:00 AM",
      "Maximum guest limit applies",
      "Pets must be declared",
      "No parties or events",
      "No smoking inside",
      "Quiet hours from 10:00 PM to 7:00 AM",
      "Guests are responsible for damage",
      "Exact access instructions are provided after booking",
    ],
    nearbyLocations: ["Beside Serenity 9 and Serenity 11", "Pakenham town centre", "Pakenham train station", "Deep Creek Eco Playspace", "Public transport", "Shops and restaurants"],
    latitude: -38.0702,
    longitude: 145.4742,
    reviews: propertyReviewsBySlug["serenity-7"],
  },
  {
    id: "serenity-9",
    slug: "serenity-9",
    name: "Serenity 9 - Whole",
    propertyType: "Entire furnished house",
    location: "Pakenham, Victoria, Australia",
    shortDescription: "A larger four-bedroom furnished house with private bedrooms, parking and practical amenities for teams or families.",
    fullDescription:
      "Serenity 9 is arranged for bigger families, work crews, project teams and relocating staff who need a private base in Pakenham. It is beside the other Serenity houses, so multiple families or teams can stay close while keeping their own private space. Guests have exclusive use of all bedrooms, with a kitchen, laundry, dining area, Wi-Fi, Netflix, heating, air conditioning and free on-site parking.",
    maxGuests: 8,
    bedrooms: 4,
    beds: 6,
    bathrooms: 2.5,
    bedArrangements: [
      { room: "Bedroom 1", beds: "1 queen bed" },
      { room: "Bedroom 2", beds: "2 single beds" },
      { room: "Bedroom 3", beds: "2 single beds" },
      { room: "Bedroom 4", beds: "1 single or configurable sleeping space" },
    ],
    amenities: [
      "Self check-in with key safe",
      "Wi-Fi",
      "Fully equipped kitchen",
      "Laundry facilities",
      "Free on-site parking",
      "Television",
      "Netflix",
      "Heating",
      "Air conditioning",
      "Dining area",
      "Private entrance",
      "Long-term stays allowed",
      "Pet-friendly",
      "Corporate-stay friendly",
    ],
    checkIn: "After 3:00 PM",
    checkout: "Before 11:00 AM",
    petPolicy: "Pet-friendly. Pets must be declared before arrival.",
    parkingType: "Free on-site parking",
    nightlyPrice: 290,
    cleaningFee: 145,
    petFee: 45,
    extraGuestFee: 20,
    extraGuestThreshold: 6,
    minimumStay: 2,
    maximumStay: 90,
    minimumGuests: 1,
    maximumAdults: 8,
    maximumChildren: 8,
    maximumInfants: 2,
    maximumPets: 2,
    minimumAdvanceNoticeDays: 0,
    maximumAdvanceBookingDays: 365,
    sameDayBookingAllowed: true,
    weekendBookingAllowed: true,
    instantBookingEnabled: true,
    bookingRequestRequired: false,
    petsAllowed: true,
    corporateBookingAllowed: true,
    minimumCorporateStay: 7,
    minimumCorporateHouses: 1,
    maximumCorporateHouses: 3,
    adjacentHousesAllowed: true,
    longTermStaysAllowed: true,
    corporateDiscount: 0,
    corporateApprovalRequired: false,
    corporateDepositRequired: false,
    corporateOnlinePayment: true,
    gstInvoiceAvailable: true,
    corporateInstructions: "Corporate stays are welcome. Contact Serenity for multi-house availability, GST invoices, and project-team arrangements.",
    weeklyDiscount: 10,
    monthlyDiscount: 18,
    images: [
      serenity9Image("hosting/Hosting-U3RheVN1cHBseUxpc3Rpbmc6MzA3NzY2NDI%3D/original/ed5ae8bf-3a99-41b4-b752-8256329baa2f.jpeg", "exterior image 1"),
      serenity9Image("hosting/Hosting-U3RheVN1cHBseUxpc3Rpbmc6MzA3NzY2NDI%3D/original/a0b924d2-328a-4b0a-93ca-46e5777e030a.jpeg", "living room image 1"),
      serenity9Image("hosting/Hosting-U3RheVN1cHBseUxpc3Rpbmc6MzA3NzY2NDI%3D/original/8f944169-4d27-43e3-8ead-8ac8be0c61de.jpeg", "full kitchen image 1"),
      serenity9Image("hosting/Hosting-U3RheVN1cHBseUxpc3Rpbmc6MzA3NzY2NDI%3D/original/033243a5-1649-4726-967d-b909f3262968.jpeg", "kitchenette image 1"),
      serenity9Image("hosting/Hosting-U3RheVN1cHBseUxpc3Rpbmc6MzA3NzY2NDI%3D/original/142a6310-d52e-4259-9768-b3133c524273.jpeg", "dining area image 1"),
      serenity9Image("hosting/Hosting-U3RheVN1cHBseUxpc3Rpbmc6MzA3NzY2NDI%3D/original/9f37049f-0656-40b4-a6c3-d373aab3e7f4.jpeg", "bedroom 1 image 1"),
      serenity9Image("hosting/Hosting-U3RheVN1cHBseUxpc3Rpbmc6MzA3NzY2NDI%3D/original/b74a5703-83e8-42d0-9c6f-7e896c87da62.jpeg", "bedroom 2 image 1"),
      serenity9Image("hosting/Hosting-U3RheVN1cHBseUxpc3Rpbmc6MzA3NzY2NDI%3D/original/30a43a7b-eda0-44ed-afd4-6869cae4fe14.jpeg", "bedroom 3 image 1"),
      serenity9Image("hosting/Hosting-U3RheVN1cHBseUxpc3Rpbmc6MzA3NzY2NDI%3D/original/6bfa7925-57a7-4fe6-8a9f-e47e64e9b3c7.jpeg", "bedroom 4 image 1"),
      serenity9Image("hosting/Hosting-U3RheVN1cHBseUxpc3Rpbmc6MzA3NzY2NDI%3D/original/caa6bb63-f78a-4ba2-9168-0fb7de855001.jpeg", "full bathroom 1 image 1"),
      serenity9Image("hosting/Hosting-U3RheVN1cHBseUxpc3Rpbmc6MzA3NzY2NDI%3D/original/c98c9171-91fc-435a-a16a-f590c9b023b9.jpeg", "full bathroom 2 image 1"),
      serenity9Image("hosting/Hosting-U3RheVN1cHBseUxpc3Rpbmc6MzA3NzY2NDI%3D/original/f30fb6d1-27d3-4695-9399-b0742e417e66.jpeg", "half bathroom image 1"),
      serenity9Image("hosting/Hosting-U3RheVN1cHBseUxpc3Rpbmc6MzA3NzY2NDI%3D/original/37b2fa87-59f7-40d7-b1f8-53b3c1ec9d59.jpeg", "backyard image 1"),
      serenity9Image("hosting/Hosting-U3RheVN1cHBseUxpc3Rpbmc6MzA3NzY2NDI%3D/original/93a62f6d-5a49-4e06-919a-af50f1bc5490.jpeg", "laundry area image 1"),
      serenity9Image("ef948fc6-b1e0-4e75-ac97-04edeafcdfad.jpg", "hot tub image 1"),
      serenity9Image("1ac510ee-1700-458a-b2b7-202013ba68ca.jpg", "additional photos image 1"),
      serenity9Image("hosting/Hosting-U3RheVN1cHBseUxpc3Rpbmc6MzA3NzY2NDI%3D/original/1e64aba5-15e5-447e-a70c-5784f2788af5.jpeg", "living room image 2"),
      serenity9Image("hosting/Hosting-U3RheVN1cHBseUxpc3Rpbmc6MzA3NzY2NDI%3D/original/00529c45-c913-4f52-b4ed-38199ea8c07c.jpeg", "living room image 3"),
      serenity9Image("hosting/Hosting-U3RheVN1cHBseUxpc3Rpbmc6MzA3NzY2NDI%3D/original/5f2b978b-8d8d-43a7-b840-53e79d044ae3.jpeg", "living room image 4"),
      serenity9Image("hosting/Hosting-U3RheVN1cHBseUxpc3Rpbmc6MzA3NzY2NDI%3D/original/306d24b4-0687-4310-adb8-99a292aa29ec.jpeg", "living room image 5"),
      serenity9Image("hosting/Hosting-U3RheVN1cHBseUxpc3Rpbmc6MzA3NzY2NDI%3D/original/56d19858-6590-4932-a14d-050fa724e316.jpeg", "living room image 6"),
      serenity9Image("hosting/Hosting-U3RheVN1cHBseUxpc3Rpbmc6MzA3NzY2NDI%3D/original/f83eb029-f788-4142-aefe-0f9f6404ff91.jpeg", "living room image 7"),
      serenity9Image("hosting/Hosting-U3RheVN1cHBseUxpc3Rpbmc6MzA3NzY2NDI%3D/original/43f0e3e7-b65d-4a54-83bd-af1ed5728216.jpeg", "living room image 8"),
      serenity9Image("hosting/Hosting-U3RheVN1cHBseUxpc3Rpbmc6MzA3NzY2NDI%3D/original/1882e4a2-feee-46b4-b1cf-8301987d7ceb.jpeg", "living room image 9"),
      serenity9Image("hosting/Hosting-U3RheVN1cHBseUxpc3Rpbmc6MzA3NzY2NDI%3D/original/5bbc22a0-f78c-42f3-b6c1-e69e6e9eaa33.jpeg", "living room image 10"),
      serenity9Image("hosting/Hosting-U3RheVN1cHBseUxpc3Rpbmc6MzA3NzY2NDI%3D/original/5e9e1402-83d9-4dec-a2c6-65b51f6f532f.jpeg", "living room image 11"),
      serenity9Image("hosting/Hosting-U3RheVN1cHBseUxpc3Rpbmc6MzA3NzY2NDI%3D/original/a7988baa-6c15-47df-9a9d-d5a31958240c.jpeg", "full kitchen image 2"),
      serenity9Image("hosting/Hosting-U3RheVN1cHBseUxpc3Rpbmc6MzA3NzY2NDI%3D/original/548de88b-77c8-4b95-8da7-f829eac64a52.jpeg", "full kitchen image 3"),
      serenity9Image("hosting/Hosting-U3RheVN1cHBseUxpc3Rpbmc6MzA3NzY2NDI%3D/original/14d27309-ec7f-4db6-aa31-2ef8571d3252.jpeg", "full kitchen image 4"),
      serenity9Image("e5c714a4-7311-404c-8150-4196e7693bd2.jpg", "kitchenette image 2"),
      serenity9Image("hosting/Hosting-U3RheVN1cHBseUxpc3Rpbmc6MzA3NzY2NDI%3D/original/428a2281-4d92-44d5-aa41-2a0fb1bb3594.jpeg", "kitchenette image 3"),
      serenity9Image("hosting/Hosting-U3RheVN1cHBseUxpc3Rpbmc6MzA3NzY2NDI%3D/original/8b4b534f-9578-4edb-81c3-6c89d5d739f7.jpeg", "dining area image 2"),
      serenity9Image("hosting/Hosting-U3RheVN1cHBseUxpc3Rpbmc6MzA3NzY2NDI%3D/original/be7360c5-457b-4b6f-80bc-5ab8d8883422.jpeg", "dining area image 3"),
      serenity9Image("hosting/Hosting-U3RheVN1cHBseUxpc3Rpbmc6MzA3NzY2NDI%3D/original/0629c283-e248-4995-a102-c10a60c83f87.jpeg", "dining area image 4"),
      serenity9Image("hosting/Hosting-U3RheVN1cHBseUxpc3Rpbmc6MzA3NzY2NDI%3D/original/6fbf04a5-db97-471d-a20f-cc4c5cbf7d7e.jpeg", "dining area image 5"),
      serenity9Image("hosting/Hosting-U3RheVN1cHBseUxpc3Rpbmc6MzA3NzY2NDI%3D/original/5312d5cc-5d09-4715-ab3e-b7f211c9e560.jpeg", "dining area image 6"),
      serenity9Image("hosting/Hosting-U3RheVN1cHBseUxpc3Rpbmc6MzA3NzY2NDI%3D/original/62d813db-532d-4626-9b03-c94f366ae452.jpeg", "bedroom 1 image 2"),
      serenity9Image("hosting/Hosting-U3RheVN1cHBseUxpc3Rpbmc6MzA3NzY2NDI%3D/original/c06ee11a-5031-4db8-b395-e85bc9a0931b.jpeg", "bedroom 1 image 3"),
      serenity9Image("hosting/Hosting-U3RheVN1cHBseUxpc3Rpbmc6MzA3NzY2NDI%3D/original/6903fcf7-27dc-4a4a-8b65-00595421cda3.jpeg", "bedroom 1 image 4"),
      serenity9Image("hosting/Hosting-U3RheVN1cHBseUxpc3Rpbmc6MzA3NzY2NDI%3D/original/e4d86373-41a3-47c2-9e32-5057ec183a98.jpeg", "bedroom 1 image 5"),
      serenity9Image("hosting/Hosting-U3RheVN1cHBseUxpc3Rpbmc6MzA3NzY2NDI%3D/original/43cab0e2-0ecc-4e3e-a5d3-c479c4f1a0eb.jpeg", "bedroom 1 image 6"),
      serenity9Image("hosting/Hosting-U3RheVN1cHBseUxpc3Rpbmc6MzA3NzY2NDI%3D/original/f5ba0df7-b911-459f-8204-373cdeb2b2ec.jpeg", "bedroom 1 image 7"),
      serenity9Image("hosting/Hosting-U3RheVN1cHBseUxpc3Rpbmc6MzA3NzY2NDI%3D/original/4133fada-e51d-472a-af56-4b829649cbce.jpeg", "bedroom 2 image 2"),
      serenity9Image("hosting/Hosting-U3RheVN1cHBseUxpc3Rpbmc6MzA3NzY2NDI%3D/original/cb1e5757-82d4-4f3f-8c91-9d948b7ec9f3.jpeg", "bedroom 2 image 3"),
      serenity9Image("hosting/Hosting-U3RheVN1cHBseUxpc3Rpbmc6MzA3NzY2NDI%3D/original/31b164be-b65e-40bb-91ea-4cef739eb85c.jpeg", "bedroom 3 image 2"),
      serenity9Image("hosting/Hosting-U3RheVN1cHBseUxpc3Rpbmc6MzA3NzY2NDI%3D/original/fe565b6b-6175-47aa-b977-3476350a0549.jpeg", "bedroom 3 image 3"),
      serenity9Image("hosting/Hosting-U3RheVN1cHBseUxpc3Rpbmc6MzA3NzY2NDI%3D/original/f6147b79-756c-447c-9987-6cc25c05027b.jpeg", "bedroom 3 image 4"),
      serenity9Image("hosting/Hosting-U3RheVN1cHBseUxpc3Rpbmc6MzA3NzY2NDI%3D/original/845d7067-b77a-43f6-bed7-e99e6275b60b.jpeg", "bedroom 3 image 5"),
      serenity9Image("hosting/Hosting-U3RheVN1cHBseUxpc3Rpbmc6MzA3NzY2NDI%3D/original/e8a1269e-3f60-45b1-8e38-04d22a46ea92.jpeg", "bedroom 4 image 2"),
      serenity9Image("hosting/Hosting-U3RheVN1cHBseUxpc3Rpbmc6MzA3NzY2NDI%3D/original/4a36fe9c-7186-468f-b97e-f3a7b4498838.jpeg", "bedroom 4 image 3"),
      serenity9Image("hosting/Hosting-U3RheVN1cHBseUxpc3Rpbmc6MzA3NzY2NDI%3D/original/e9ee179a-ec16-436c-98e3-9a71d385564d.jpeg", "bedroom 4 image 4"),
      serenity9Image("hosting/Hosting-U3RheVN1cHBseUxpc3Rpbmc6MzA3NzY2NDI%3D/original/7803ce0e-51a1-4ca7-ac80-6e37fe1a84f0.jpeg", "full bathroom 1 image 2"),
      serenity9Image("hosting/Hosting-U3RheVN1cHBseUxpc3Rpbmc6MzA3NzY2NDI%3D/original/c5a1376b-da3a-4e26-9237-26129a4ab618.jpeg", "full bathroom 1 image 3"),
      serenity9Image("hosting/Hosting-U3RheVN1cHBseUxpc3Rpbmc6MzA3NzY2NDI%3D/original/e6821aad-4ea7-4b44-bb2f-d7cb8623b15d.jpeg", "full bathroom 1 image 4"),
      serenity9Image("hosting/Hosting-U3RheVN1cHBseUxpc3Rpbmc6MzA3NzY2NDI%3D/original/4e65cd56-457d-49f4-857c-e6fa59ea077a.jpeg", "full bathroom 1 image 5"),
      serenity9Image("hosting/Hosting-U3RheVN1cHBseUxpc3Rpbmc6MzA3NzY2NDI%3D/original/943e6cde-e210-4987-ab0b-7c35e8a899fb.jpeg", "full bathroom 1 image 6"),
      serenity9Image("hosting/Hosting-U3RheVN1cHBseUxpc3Rpbmc6MzA3NzY2NDI%3D/original/a41473a7-0e12-4da6-91e4-d011731c40e9.jpeg", "full bathroom 1 image 7"),
      serenity9Image("hosting/Hosting-U3RheVN1cHBseUxpc3Rpbmc6MzA3NzY2NDI%3D/original/91c35011-ac50-483a-91af-c1171bff8564.jpeg", "full bathroom 2 image 2"),
      serenity9Image("hosting/Hosting-U3RheVN1cHBseUxpc3Rpbmc6MzA3NzY2NDI%3D/original/391734da-a24d-43ae-a90e-b099231bc88c.jpeg", "full bathroom 2 image 3"),
      serenity9Image("hosting/Hosting-U3RheVN1cHBseUxpc3Rpbmc6MzA3NzY2NDI%3D/original/689e1fc2-4b76-4145-a541-71f0c474ccee.jpeg", "full bathroom 2 image 4"),
      serenity9Image("hosting/Hosting-U3RheVN1cHBseUxpc3Rpbmc6MzA3NzY2NDI%3D/original/abd22d10-11a3-43b0-bef9-8d7593107df3.jpeg", "full bathroom 2 image 5"),
      serenity9Image("hosting/Hosting-U3RheVN1cHBseUxpc3Rpbmc6MzA3NzY2NDI%3D/original/b4b8757c-67fa-4338-a092-48b979d705da.jpeg", "half bathroom image 2"),
      serenity9Image("hosting/Hosting-U3RheVN1cHBseUxpc3Rpbmc6MzA3NzY2NDI%3D/original/68021a5b-7f5b-4639-9373-39a2330cfbef.jpeg", "half bathroom image 3"),
      serenity9Image("hosting/Hosting-U3RheVN1cHBseUxpc3Rpbmc6MzA3NzY2NDI%3D/original/2cfa280a-053c-4e28-8c34-36fbe15def7a.jpeg", "backyard image 2"),
      serenity9Image("hosting/Hosting-U3RheVN1cHBseUxpc3Rpbmc6MzA3NzY2NDI%3D/original/a5e3df94-d9a2-4075-90ac-d0011b9e070e.jpeg", "backyard image 3"),
      serenity9Image("hosting/Hosting-U3RheVN1cHBseUxpc3Rpbmc6MzA3NzY2NDI%3D/original/4f64e9e3-2182-4276-897e-fe830aa89989.jpeg", "laundry area image 2"),
      serenity9Image("hosting/Hosting-U3RheVN1cHBseUxpc3Rpbmc6MzA3NzY2NDI%3D/original/ab7aaea0-04ab-4799-86ba-764f158bd2e3.jpeg", "exterior image 2"),
      serenity9Image("hosting/Hosting-U3RheVN1cHBseUxpc3Rpbmc6MzA3NzY2NDI%3D/original/6b6effd4-64e1-4023-9d29-6e2e88c459ad.jpeg", "hot tub image 2"),
      serenity9Image("hosting/Hosting-U3RheVN1cHBseUxpc3Rpbmc6MzA3NzY2NDI%3D/original/83602a75-6e6f-4e14-9703-4e78a83d7f95.jpeg", "additional photos image 2"),
    ],
    featuredImage: serenity9Image("hosting/Hosting-U3RheVN1cHBseUxpc3Rpbmc6MzA3NzY2NDI%3D/original/ed5ae8bf-3a99-41b4-b752-8256329baa2f.jpeg", "exterior image 1").src,
    unavailableDates: ["2026-08-20", "2026-08-21", "2026-09-10", "2026-09-11", "2026-09-12", "2026-10-03", "2026-10-04"],
    houseRules: [
      "Check-in after 3:00 PM",
      "Checkout before 11:00 AM",
      "Maximum guest limit applies",
      "Pets must be declared",
      "No parties or events",
      "No smoking inside",
      "Quiet hours from 10:00 PM to 7:00 AM",
      "Guests are responsible for damage",
      "Exact access instructions are provided after booking",
    ],
    nearbyLocations: ["Beside Serenity 7 and Serenity 11", "Pakenham town centre", "Pakenham train station", "Public transport", "Pakenham services"],
    latitude: -38.0718,
    longitude: 145.4802,
    reviews: propertyReviewsBySlug["serenity-9"],
  },
  {
    id: "serenity-11",
    slug: "serenity-11",
    name: "Serenity 11 - Whole",
    propertyType: "Entire furnished house",
    location: "Pakenham, Victoria, Australia",
    shortDescription: "A flexible four-bedroom house for business travellers, families and extended stays toward Gippsland.",
    fullDescription:
      "Serenity 11 offers a practical furnished base in Pakenham for guests visiting the region, working locally or needing temporary accommodation. It is beside Serenity 7 and Serenity 9, which helps larger groups book nearby houses for the same dates when available. The house includes four bedrooms, Wi-Fi, kitchen, laundry, dining space, Netflix, heating, air conditioning, private entrance and free street parking.",
    maxGuests: 7,
    bedrooms: 4,
    beds: 5,
    bathrooms: 2.5,
    bedArrangements: [
      { room: "Bedroom 1", beds: "2 single beds" },
      { room: "Bedroom 2", beds: "1 queen bed" },
      { room: "Bedroom 3", beds: "1 queen bed" },
      { room: "Bedroom 4", beds: "1 single bed" },
    ],
    amenities: [
      "Self check-in with key safe",
      "Wi-Fi",
      "Fully equipped kitchen",
      "Laundry facilities",
      "Free street parking",
      "HDTV",
      "Netflix",
      "Heating",
      "Air conditioning",
      "Dining area",
      "Private entrance",
      "Long-term stays allowed",
      "Pet-friendly",
      "Corporate-stay friendly",
    ],
    checkIn: "After 3:00 PM",
    checkout: "Before 11:00 AM",
    petPolicy: "Pet-friendly. Pets must be declared before arrival.",
    parkingType: "Free street parking",
    nightlyPrice: 270,
    cleaningFee: 135,
    petFee: 45,
    extraGuestFee: 20,
    extraGuestThreshold: 5,
    minimumStay: 2,
    maximumStay: 90,
    minimumGuests: 1,
    maximumAdults: 7,
    maximumChildren: 7,
    maximumInfants: 2,
    maximumPets: 2,
    minimumAdvanceNoticeDays: 0,
    maximumAdvanceBookingDays: 365,
    sameDayBookingAllowed: true,
    weekendBookingAllowed: true,
    instantBookingEnabled: true,
    bookingRequestRequired: false,
    petsAllowed: true,
    corporateBookingAllowed: true,
    minimumCorporateStay: 7,
    minimumCorporateHouses: 1,
    maximumCorporateHouses: 3,
    adjacentHousesAllowed: true,
    longTermStaysAllowed: true,
    corporateDiscount: 0,
    corporateApprovalRequired: false,
    corporateDepositRequired: false,
    corporateOnlinePayment: true,
    gstInvoiceAvailable: true,
    corporateInstructions: "Corporate stays are welcome. Contact Serenity for multi-house availability, GST invoices, and project-team arrangements.",
    weeklyDiscount: 8,
    monthlyDiscount: 16,
    images: [
      airbnbImage("miso/Hosting-38935171/original/c8650de8-5536-4081-aac8-68e99d8c25e6.jpeg", "exterior view"),
      airbnbImage("miso/Hosting-38935171/original/29a6f04d-00ee-4e51-bf9c-f4f8e28b6778.jpeg", "second exterior view"),
      airbnbImage("miso/Hosting-38935171/original/590fa3b7-32d2-4ba2-82af-5ee97f4084a0.jpeg", "dining area"),
      airbnbImage("miso/Hosting-38935171/original/5b51b710-2427-45e7-ad1f-41722c5c4b58.jpeg", "open design area"),
      airbnbImage("miso/Hosting-38935171/original/963c28fc-c61b-4a2c-b7e5-d06f52ead016.jpeg", "dining area view"),
      airbnbImage("miso/Hosting-38935171/original/c65f95d5-eebd-496f-954b-e2457a1780af.jpeg", "bedroom 1"),
      airbnbImage("miso/Hosting-38935171/original/0740f1fa-7881-4cb8-a6b8-a22b9eba94eb.jpeg", "bedroom 2"),
      airbnbImage("miso/Hosting-38935171/original/4741ba52-d9e5-455c-a9e9-7af4a9f0f422.jpeg", "bedroom 3"),
      airbnbImage("miso/Hosting-38935171/original/f0cc058c-31fc-4c1b-ba14-22b46ca6f6d8.jpeg", "master bedroom"),
      airbnbImage("miso/Hosting-38935171/original/53b1b1c4-5a35-43b0-b47c-8dd439d45abb.jpeg", "living room"),
      airbnbImage("miso/Hosting-38935171/original/42bd864d-6f4e-47cf-8f70-69d622a3be09.jpeg", "full kitchen"),
      airbnbImage("miso/Hosting-38935171/original/5eb083c5-da7c-4581-8142-188b1c76ee52.jpeg", "full bathroom"),
      airbnbImage("miso/Hosting-38935171/original/59858ab6-32cd-4e99-aebe-16fcafe6bca9.jpeg", "common bathroom"),
      airbnbImage("miso/Hosting-38935171/original/91813505-a5a1-4c80-af6d-f471bd2a1ece.png", "master bedroom bathroom"),
      airbnbImage("miso/Hosting-38935171/original/32f93ae9-8daa-44fd-9891-e87aa1a4fc59.jpeg", "additional photo"),
      airbnbImage("miso/Hosting-38935171/original/19fbaf91-8b19-4a9e-accc-3868b7d19c38.jpeg", "living room view 2"),
      airbnbImage("miso/Hosting-38935171/original/909f1629-2b76-4ee9-ae7b-a25bb871f80e.jpeg", "living room view 3"),
      airbnbImage("miso/Hosting-38935171/original/138059e0-6025-46f4-98ef-f4178fd852cc.jpeg", "living room view 4"),
      airbnbImage("miso/Hosting-38935171/original/3b6a65db-928e-4ca7-9b27-364b2c7bf97a.jpeg", "kitchen view 2"),
      airbnbImage("miso/Hosting-38935171/original/0be9f7bb-edff-46ee-b316-4ea583420b70.jpeg", "dining area view 4"),
      airbnbImage("miso/Hosting-38935171/original/a788371e-f0c2-44e1-b04b-2032033ca917.jpeg", "dining area view 5"),
      airbnbImage("miso/Hosting-38935171/original/f5e5d070-788b-4a77-afb3-109b76e3e001.jpeg", "dining area view 6"),
      airbnbImage("miso/Hosting-38935171/original/2ab5e2ba-860b-460a-a36d-7c7d2b8fa245.jpeg", "bedroom 1 view 2"),
      airbnbImage("miso/Hosting-38935171/original/83ce089b-aec5-49d7-970f-fef05d3470c0.jpeg", "bedroom 1 view 3"),
      airbnbImage("miso/Hosting-38935171/original/f069b9e4-a810-4576-9072-b13ebbee4f7e.jpeg", "bedroom 1 view 4"),
      airbnbImage("miso/Hosting-38935171/original/b451f5df-db1c-4212-a8c0-a5b5bad74311.jpeg", "bedroom 1 view 5"),
      airbnbImage("miso/Hosting-38935171/original/4afda856-9ed8-4a65-88c0-9989293c1f04.jpeg", "bedroom 2 view 2"),
      airbnbImage("miso/Hosting-38935171/original/72fd0d38-59bc-4254-ab17-0dccd87802a5.jpeg", "bedroom 2 view 3"),
      airbnbImage("miso/Hosting-38935171/original/ff2c273f-7fe6-4011-9b77-87eec76419a6.jpeg", "bedroom 3 view 2"),
      airbnbImage("miso/Hosting-38935171/original/dd3b79c5-37ff-4091-8e05-979de909c13c.jpeg", "bedroom 3 view 3"),
      airbnbImage("miso/Hosting-38935171/original/6709a0fe-bf73-4e41-b60a-7fb1424b33d4.jpeg", "full bathroom view 2"),
      airbnbImage("miso/Hosting-38935171/original/642f7fb1-d0dd-404d-94fd-4b874c2ad4be.png", "full bathroom view 3"),
      airbnbImage("miso/Hosting-38935171/original/8f6b83b2-d04b-4730-9041-cd6993802f50.jpeg", "second bathroom"),
      airbnbImage("miso/Hosting-38935171/original/d4d5306f-b3f8-47f4-9a6f-e13906981ce4.jpeg", "second bathroom view 2"),
      airbnbImage("miso/Hosting-38935171/original/fe02a3b3-2851-4f21-bb8f-3a207bf28e54.jpeg", "half bathroom"),
      airbnbImage("miso/Hosting-38935171/original/06fbaadc-f961-48bf-ada0-5410463d1a6e.jpeg", "half bathroom view 2"),
      airbnbImage("miso/Hosting-38935171/original/1f43bcdf-efbc-41a0-a086-f3da1a0ce5e4.jpeg", "additional photo 2"),
      airbnbImage("miso/Hosting-38935171/original/95c71474-effb-4a90-8f1e-b89b953d3830.jpeg", "additional photo 3"),
      airbnbImage("cd5d2477-f88c-4ab4-9407-a6bb6850e955.jpg", "additional photo 4"),
    ],
    featuredImage: airbnbImage("miso/Hosting-38935171/original/c8650de8-5536-4081-aac8-68e99d8c25e6.jpeg", "exterior view").src,
    unavailableDates: ["2026-08-28", "2026-08-29", "2026-09-18", "2026-09-19", "2026-10-09", "2026-10-10", "2026-10-11"],
    houseRules: [
      "Check-in after 3:00 PM",
      "Checkout before 11:00 AM",
      "Maximum guest limit applies",
      "Pets must be declared",
      "No parties or events",
      "No smoking inside",
      "Quiet hours from 10:00 PM to 7:00 AM",
      "Guests are responsible for damage",
      "Exact access instructions are provided after booking",
    ],
    nearbyLocations: ["Beside Serenity 7 and Serenity 9", "Deep Creek Eco Playspace", "Pakenham train station", "Pakenham South", "Cardinia region"],
    latitude: -38.0665,
    longitude: 145.486,
    reviews: propertyReviewsBySlug["serenity-11"],
  },
];

// These fixtures remain useful for local copy, pricing, and booking previews,
// but their old third-party preview URLs must never render on the public site.
export const properties: Property[] = localPropertyLibrary.map((property) => {
  const images = property.images.filter((image) => isApprovedHomepageMediaSource(image.src));
  return {
    ...property,
    images,
    featuredImage: isApprovedHomepageMediaSource(property.featuredImage) ? property.featuredImage : images[0]?.src ?? "",
  };
});

export const getPropertyBySlug = (slug: string) => properties.find((property) => property.slug === slug);
