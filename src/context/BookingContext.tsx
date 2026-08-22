"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { BookingState, defaultGuests } from "@/src/lib/booking";

const STORAGE_KEY = "serenity-booking";

type BookingContextValue = {
  booking: BookingState;
  setBooking: (patch: Partial<BookingState>) => void;
  clearBooking: () => void;
};

const BookingContext = createContext<BookingContextValue | null>(null);

const initialBooking: BookingState = { guests: defaultGuests };

export function BookingProvider({ children }: { children: React.ReactNode }) {
  // Keep the first render identical on the server and in the browser. Saved
  // dates are restored after hydration so the calendar cannot render a
  // different selection during React's hydration pass.
  const [booking, setBookingState] = useState<BookingState>(initialBooking);
  const [storageLoaded, setStorageLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const restoreBooking = () => {
      if (cancelled) return;
      try {
        const saved = window.localStorage.getItem(STORAGE_KEY);
        if (saved) setBookingState({ ...initialBooking, ...JSON.parse(saved) });
      } catch {
        // Ignore invalid or unavailable browser storage and keep the defaults.
      } finally {
        setStorageLoaded(true);
      }
    };
    const restoreTimer = window.setTimeout(restoreBooking, 0);

    return () => {
      cancelled = true;
      window.clearTimeout(restoreTimer);
    };
  }, []);

  useEffect(() => {
    if (!storageLoaded) return;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(booking));
  }, [booking, storageLoaded]);

  const value = useMemo<BookingContextValue>(
    () => ({
      booking,
      setBooking: (patch) => setBookingState((current) => ({ ...current, ...patch, guests: patch.guests ?? current.guests })),
      clearBooking: () => {
        setBookingState(initialBooking);
        if (typeof window !== "undefined") window.localStorage.removeItem(STORAGE_KEY);
      },
    }),
    [booking],
  );

  return <BookingContext.Provider value={value}>{children}</BookingContext.Provider>;
}

export function useBooking() {
  const context = useContext(BookingContext);
  if (!context) throw new Error("useBooking must be used inside BookingProvider");
  return context;
}
