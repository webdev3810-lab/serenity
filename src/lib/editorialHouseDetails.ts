import { Bath, BedDouble, BedSingle, CarFront, UsersRound, WashingMachine, Wifi, type LucideIcon } from "lucide-react";
import type { Property } from "@/src/data/properties";

type HouseDetailsSource = Pick<Property, "maxGuests" | "bedrooms" | "bathrooms" | "beds" | "parkingType" | "amenities">;

export function editorialHouseDetails(house: HouseDetailsSource): { label: string; Icon: LucideIcon }[] {
  const details: { label: string; Icon: LucideIcon }[] = [
    { label: `Sleeps up to ${house.maxGuests}`, Icon: UsersRound },
    { label: `${house.bedrooms} ${house.bedrooms === 1 ? "bedroom" : "bedrooms"}`, Icon: BedDouble },
    { label: `${house.bathrooms} ${house.bathrooms === 1 ? "bathroom" : "bathrooms"}`, Icon: Bath },
    { label: `${house.beds} ${house.beds === 1 ? "bed" : "beds"}`, Icon: BedSingle },
  ];

  const parking = house.parkingType?.trim();
  if (parking) {
    const label = /free parking on premises/i.test(parking) && /free street parking/i.test(parking)
      ? "Free on-site & street parking"
      : /^free parking on premises$/i.test(parking) ? "Free on-site parking" : parking;
    details.push({ label, Icon: CarFront });
  }
  if (house.amenities.some((amenity) => /wi[\s-]?fi|wireless internet/i.test(amenity))) {
    details.push({ label: "Wi-Fi", Icon: Wifi });
  } else if (house.amenities.some((amenity) => /laundry|washer|washing machine/i.test(amenity))) {
    details.push({ label: "Laundry", Icon: WashingMachine });
  }

  return details;
}
