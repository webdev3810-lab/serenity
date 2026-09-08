"use client";
import { Accessibility, Bath, BedDouble, CalendarDays, Car, Check, Coffee, CookingPot, Dog, KeyRound, Laptop, Shield, Thermometer, Trees, Tv, WashingMachine, Wifi } from "lucide-react";
import { AMENITY_ICONS, type AmenityIconId } from "@/src/lib/amenities";
const icons = { cooking:CookingPot,bath:Bath,laundry:WashingMachine,thermometer:Thermometer,tv:Tv,car:Car,trees:Trees,accessibility:Accessibility,shield:Shield,wifi:Wifi,desk:Laptop,key:KeyRound,bed:BedDouble,check:Check,dog:Dog,calendar:CalendarDays,coffee:Coffee };
export function AmenityIcon({ icon, size=22 }: { icon: string; size?: number }) { const Icon=(AMENITY_ICONS as readonly string[]).includes(icon)?icons[icon as AmenityIconId]:Check;return <Icon size={size} strokeWidth={1.6} aria-hidden="true" />; }
