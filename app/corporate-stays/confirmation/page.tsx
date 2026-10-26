"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { CheckCircle2, Download, Image as ImageIcon, Loader2 } from "lucide-react";
import { formatAud, formatDateAu } from "@/src/lib/booking";
import { receiptCode } from "@/src/lib/paymentReceipt";
import type { CorporateConfirmationHouse } from "@/src/lib/corporateConfirmationPdf";

export default function CorporateConfirmationPage() {
  const receiptRef = useRef<HTMLDivElement>(null);
  const [state, setState] = useState<"checking" | "paid" | "error">("checking");
  const [reference, setReference] = useState("");
  const [total, setTotal] = useState<number | null>(null);
  const [houses, setHouses] = useState<CorporateConfirmationHouse[]>([]);
  const [error, setError] = useState("");
  const [downloading, setDownloading] = useState(false);
  const [savingImage, setSavingImage] = useState(false);
  const [downloadError, setDownloadError] = useState("");
  const [imageError, setImageError] = useState("");

  useEffect(() => {
    const sessionId = new URLSearchParams(window.location.search).get("session_id");
    void Promise.resolve(sessionId)
      .then(async (id) => {
        if (!id) throw new Error("No payment session was supplied. Please contact Serenity if you were charged.");
        const response = await fetch(`/api/stripe/session?session_id=${encodeURIComponent(id)}`, { cache: "no-store" });
        const result = await response.json();
        if (!response.ok || !result.paid || typeof result.booking?.reference !== "string") throw new Error(result.error || "Payment has not been confirmed yet.");
        setReference(result.booking.reference);
        setTotal(Number.isFinite(Number(result.booking.total)) ? Number(result.booking.total) : null);
        if (Array.isArray(result.booking.bookings)) setHouses(result.booking.bookings);
        setState("paid");
      })
      .catch((reason: unknown) => {
        setError(reason instanceof Error ? reason.message : "Payment could not be verified yet.");
        setState("error");
      });
  }, []);

  const downloadConfirmation = async () => {
    if (downloading || state !== "paid") return;
    setDownloading(true);
    setDownloadError("");
    try {
      const { createCorporateConfirmationPdf } = await import("@/src/lib/corporateConfirmationPdf");
      const pdfBytes = await createCorporateConfirmationPdf({ reference, total, houses });
      const url = URL.createObjectURL(new Blob([Uint8Array.from(pdfBytes)], { type: "application/pdf" }));
      const link = document.createElement("a");
      link.href = url;
      link.download = `Serenity-corporate-booking-${reference}.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
    } catch {
      setDownloadError("The PDF could not be downloaded. Please try again.");
    } finally {
      setDownloading(false);
    }
  };

  const saveConfirmationImage = async () => {
    if (!receiptRef.current || savingImage || state !== "paid") return;
    setSavingImage(true);
    setImageError("");
    try {
      await document.fonts.ready;
      const { toPng } = await import("html-to-image");
      const receipt = receiptRef.current;
      const bounds = receipt.getBoundingClientRect();
      const dataUrl = await toPng(receipt, {
        backgroundColor: "#ffffff",
        width: Math.ceil(bounds.width),
        height: Math.max(Math.ceil(bounds.height), receipt.scrollHeight),
        pixelRatio: 2,
        cacheBust: true,
        style: { margin: "0", maxWidth: "none", overflow: "visible" },
      });
      const link = document.createElement("a");
      link.href = dataUrl;
      link.download = `Serenity-corporate-booking-${reference}.png`;
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch {
      setImageError("The image could not be saved. Please try again.");
    } finally {
      setSavingImage(false);
    }
  };

  return <div className="mx-auto flex min-h-[65vh] max-w-2xl flex-col items-center justify-center gap-5 px-5 py-20 text-center text-[#002844]" aria-live="polite">
    {state === "checking" && <>
      <Loader2 size={36} className="animate-spin" aria-hidden="true" />
      <h1 className="font-serif text-4xl">Verifying your payment…</h1>
      <p>Your houses are not confirmed until Stripe verifies payment.</p>
    </>}

    {state === "paid" && <>
      <div ref={receiptRef} className="flex w-full flex-col items-center gap-5 bg-white text-center">
        <CheckCircle2 size={44} aria-hidden="true" />
        <h1 className="font-serif text-4xl">Corporate stay confirmed</h1>
        <p>Payment succeeded. Your selected houses are now booked and will appear as reserved in the Serenity calendar.</p>
        <div className="w-full rounded-2xl border border-slate-200 bg-white p-6 text-left">
          <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Booking reference</p>
          <p className="mt-1 font-semibold">{reference}</p>
          <p className="mt-4 text-xs font-bold uppercase tracking-wider text-slate-500">Receipt code</p>
          <p className="mt-1 break-all text-xl font-bold">{receiptCode(reference)}</p>
          {houses.length > 0 && <div className="mt-5 border-t border-slate-200 pt-4">
            <p className="text-xs font-bold uppercase tracking-wider text-slate-500">House stays</p>
            <ul className="mt-3 space-y-3">{houses.map((house) => <li key={house.reference} className="rounded-xl bg-slate-50 p-3 text-sm">
              <strong className="block text-[#002844]">{house.home}</strong>
              <span>{formatDateAu(house.check_in)} to {formatDateAu(house.checkout)} · {house.adults} guest{house.adults === 1 ? "" : "s"} · {formatAud(Number(house.total))}</span>
              {house.free_cancellation_until && <span className="mt-1 block text-xs text-slate-600">Free cancellation deadline: {formatDateAu(house.free_cancellation_until)}, 11:59 pm Melbourne time. Contact Serenity to cancel.</span>}
            </li>)}</ul>
          </div>}
          {total !== null && <p className="mt-4 font-semibold">Total paid: {formatAud(total)}</p>}
          <p className="mt-4 text-xs text-slate-600">This confirms payment and your booking. It is not a tax invoice.</p>
        </div>
      </div>
      <div className="flex flex-wrap justify-center gap-3">
        <button type="button" className="inline-flex items-center gap-2 rounded-full border border-[#002844] px-6 py-3 font-semibold text-[#002844] disabled:opacity-50" onClick={() => void downloadConfirmation()} disabled={downloading}>
          <Download size={17} aria-hidden="true" /> {downloading ? "Downloading…" : "Download"}
        </button>
        <button type="button" className="inline-flex items-center gap-2 rounded-full border border-[#002844] px-6 py-3 font-semibold text-[#002844] disabled:opacity-50" onClick={() => void saveConfirmationImage()} disabled={savingImage}>
          <ImageIcon size={17} aria-hidden="true" /> {savingImage ? "Saving…" : "Save image"}
        </button>
      </div>
      {downloadError && <p role="alert" className="text-sm text-red-700">{downloadError}</p>}
      {imageError && <p role="alert" className="text-sm text-red-700">{imageError}</p>}
      <Link href="/corporate-stays" className="rounded-full bg-[#002844] px-6 py-3 font-semibold text-white">Back to corporate stays</Link>
    </>}

    {state === "error" && <>
      <h1 className="font-serif text-4xl">Payment is not confirmed</h1>
      <p role="alert">{error}</p>
      <p>Do not start another payment if you may already have been charged. Contact Serenity with your payment details so we can check it.</p>
      <Link href="/contact" className="rounded-full bg-[#002844] px-6 py-3 font-semibold text-white">Contact Serenity</Link>
    </>}
  </div>;
}
