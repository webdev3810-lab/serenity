"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import NextImage from "next/image";
import {
  LayoutDashboard,
  CalendarDays,
  Building2,
  BriefcaseBusiness,
  CreditCard,
  Settings,
  LogOut,
  Menu,
  X,
  Eye,
  CheckCircle2,
  XCircle,
  MessageSquare,
  ChevronRight,
  PawPrint,
  TrendingUp,
  DoorOpen,
  DoorClosed,
  Pencil,
  Image,
  Tag,
  Clock,
  AlertTriangle,
  RefreshCw,
  ExternalLink,
  Phone,
  Mail,
  Shield,
  Home,
  Star,
  Plus,
  Trash2,
  Save,
} from "lucide-react";
import { properties } from "@/src/data/properties";
import { formatAud, formatDateAu, todayIso } from "@/src/lib/booking";
import { AU_LOCALE, AU_TIME_ZONE, formatAuNumber } from "@/src/lib/localization";
import { DEFAULT_CONTACT_SETTINGS_RECORD } from "@/src/lib/siteSettings";

// ─── Types ───────────────────────────────────────────────────────────────────

type BookingStatus = "Confirmed" | "Pending Payment" | "Corporate" | "Cancelled" | "Checked In" | "Checked Out";
type PaymentStatus = "Paid" | "Pending" | "Failed" | "Refunded";
type CorporateStatus = "New" | "Contacted" | "Pending Approval" | "Approved" | "Declined";

interface MockBooking {
  id: string;
  reference: string;
  guestName: string;
  guestEmail: string;
  guestPhone: string;
  house: string;
  houseSlug: string;
  checkIn: string;
  checkout: string;
  nights: number;
  adults: number;
  children: number;
  infants: number;
  pets: number;
  nightlyRate: number;
  cleaningFee: number;
  petFee: number;
  subtotal: number;
  discount: number;
  tax: number;
  total: number;
  paymentStatus: PaymentStatus;
  bookingStatus: BookingStatus;
  createdAt: string;
  stripeSessionId: string;
  stripePaymentIntentId: string;
  notes: string;
  isCorporate: boolean;
  companyName?: string;
}

interface CorporateEnquiry {
  id: string;
  companyName: string;
  contactPerson: string;
  email: string;
  phone: string;
  checkIn: string;
  checkout: string;
  guests: number;
  housesRequested: string[];
  status: CorporateStatus;
  notes: string;
  abn?: string;
  poNumber?: string;
}

interface AdminSettings {
  businessEmail: string;
  phone: string;
  checkInTime: string;
  checkoutTime: string;
  gstWording: string;
  cancellationPolicy: string;
}

// ─── Mock Data ───────────────────────────────────────────────────────────────

const MOCK_BOOKINGS: MockBooking[] = [
  {
    id: "1", reference: "SER-7-A8K29", guestName: "Sarah Mitchell", guestEmail: "s.mitchell@email.com.au", guestPhone: "+61 412 345 678",
    house: "Serenity 7", houseSlug: "serenity-7", checkIn: "2026-08-14", checkout: "2026-08-18", nights: 4,
    adults: 3, children: 1, infants: 0, pets: 1, nightlyRate: 240, cleaningFee: 120, petFee: 45, subtotal: 960, discount: 0, tax: 113, total: 1238,
    paymentStatus: "Paid", bookingStatus: "Confirmed", createdAt: "2026-07-28",
    stripeSessionId: "cs_test_a1b2c3d4e5f6g7h8i9j0", stripePaymentIntentId: "pi_1AbCdEfGhIjKlMnO",
    notes: "Guest travelling with a small dog. Requested ground floor if possible.", isCorporate: false,
  },
  {
    id: "2", reference: "SER-9-P4M71", guestName: "James & Rebecca Thornton", guestEmail: "jthornton@corporate.com.au", guestPhone: "+61 398 001 122",
    house: "Serenity 9", houseSlug: "serenity-9", checkIn: "2026-08-20", checkout: "2026-08-27", nights: 7,
    adults: 4, children: 2, infants: 1, pets: 0, nightlyRate: 290, cleaningFee: 145, petFee: 0, subtotal: 2030, discount: 203, tax: 197, total: 2169,
    paymentStatus: "Paid", bookingStatus: "Confirmed", createdAt: "2026-07-30",
    stripeSessionId: "cs_test_b2c3d4e5f6g7h8i9j0k1", stripePaymentIntentId: "pi_2BcDeFgHiJkLmNoP",
    notes: "Weekly discount applied. Large family. Request cot if available.", isCorporate: false,
  },
  {
    id: "3", reference: "SER-11-Q9T20", guestName: "Buildtech Pty Ltd (Crew)", guestEmail: "admin@buildtech.com.au", guestPhone: "+61 3 9501 2233",
    house: "Serenity 11", houseSlug: "serenity-11", checkIn: "2026-09-01", checkout: "2026-09-29", nights: 28,
    adults: 5, children: 0, infants: 0, pets: 0, nightlyRate: 270, cleaningFee: 135, petFee: 0, subtotal: 7560, discount: 1210, tax: 649, total: 7134,
    paymentStatus: "Pending", bookingStatus: "Corporate", createdAt: "2026-08-01",
    stripeSessionId: "", stripePaymentIntentId: "",
    notes: "Monthly contractor stay. Invoice requested. PO#: BT-2026-441. ABN: 51 824 753 556.", isCorporate: true, companyName: "Buildtech Pty Ltd",
  },
  {
    id: "4", reference: "SER-7-L2C18", guestName: "Priya Nair", guestEmail: "priya.nair@outlook.com", guestPhone: "+61 423 987 654",
    house: "Serenity 7", houseSlug: "serenity-7", checkIn: "2026-08-10", checkout: "2026-08-12", nights: 2,
    adults: 2, children: 0, infants: 0, pets: 0, nightlyRate: 240, cleaningFee: 120, petFee: 0, subtotal: 480, discount: 0, tax: 60, total: 660,
    paymentStatus: "Paid", bookingStatus: "Checked In", createdAt: "2026-07-22",
    stripeSessionId: "cs_test_c3d4e5f6g7h8i9j0k1l2", stripePaymentIntentId: "pi_3CdEfGhIjKlMnOpQ",
    notes: "", isCorporate: false,
  },
  {
    id: "5", reference: "SER-9-X1D44", guestName: "Marcus Okafor", guestEmail: "m.okafor@gmail.com", guestPhone: "+61 478 222 333",
    house: "Serenity 9", houseSlug: "serenity-9", checkIn: "2026-08-05", checkout: "2026-08-07", nights: 2,
    adults: 2, children: 0, infants: 0, pets: 2, nightlyRate: 290, cleaningFee: 145, petFee: 45, subtotal: 580, discount: 0, tax: 77, total: 847,
    paymentStatus: "Refunded", bookingStatus: "Cancelled", createdAt: "2026-07-15",
    stripeSessionId: "cs_test_d4e5f6g7h8i9j0k1l2m3", stripePaymentIntentId: "pi_4DeFgHiJkLmNoPqR",
    notes: "Guest cancelled 3 days before. Full refund issued per policy.", isCorporate: false,
  },
  {
    id: "6", reference: "SER-11-R3V55", guestName: "Claire & Ben Hargreaves", guestEmail: "chargreaves@gmail.com", guestPhone: "+61 415 100 200",
    house: "Serenity 11", houseSlug: "serenity-11", checkIn: "2026-09-05", checkout: "2026-09-10", nights: 5,
    adults: 4, children: 3, infants: 0, pets: 0, nightlyRate: 270, cleaningFee: 135, petFee: 0, subtotal: 1350, discount: 0, tax: 149, total: 1634,
    paymentStatus: "Pending", bookingStatus: "Pending Payment", createdAt: "2026-08-08",
    stripeSessionId: "cs_test_e5f6g7h8i9j0k1l2m3n4", stripePaymentIntentId: "",
    notes: "Payment link sent. Awaiting completion.", isCorporate: false,
  },
  {
    id: "7", reference: "SER-7-B7N99", guestName: "DataCore Solutions", guestEmail: "stays@datacore.com.au", guestPhone: "+61 2 8001 7700",
    house: "Serenity 7 + Serenity 9", houseSlug: "serenity-7", checkIn: "2026-10-06", checkout: "2026-10-13", nights: 7,
    adults: 8, children: 0, infants: 0, pets: 0, nightlyRate: 530, cleaningFee: 265, petFee: 0, subtotal: 3710, discount: 371, tax: 360, total: 3964,
    paymentStatus: "Paid", bookingStatus: "Corporate", createdAt: "2026-08-04",
    stripeSessionId: "cs_test_f6g7h8i9j0k1l2m3n4o5", stripePaymentIntentId: "pi_5EfGhIjKlMnOpQrS",
    notes: "Two adjacent houses for offsite team. Invoice issued. GST registered.", isCorporate: true, companyName: "DataCore Solutions",
  },
  {
    id: "8", reference: "SER-9-G2W11", guestName: "Yuki Tanaka", guestEmail: "yuki.t@proton.me", guestPhone: "+61 490 555 666",
    house: "Serenity 9", houseSlug: "serenity-9", checkIn: "2026-08-25", checkout: "2026-08-28", nights: 3,
    adults: 2, children: 0, infants: 0, pets: 1, nightlyRate: 290, cleaningFee: 145, petFee: 45, subtotal: 870, discount: 0, tax: 106, total: 1166,
    paymentStatus: "Failed", bookingStatus: "Pending Payment", createdAt: "2026-08-07",
    stripeSessionId: "cs_test_g7h8i9j0k1l2m3n4o5p6", stripePaymentIntentId: "pi_6FgHiJkLmNoPqRsT",
    notes: "Payment failed on first attempt. Retry link resent.", isCorporate: false,
  },
  {
    id: "9", reference: "SER-11-H5T66", guestName: "Lena & Tom Kowalski", guestEmail: "lena.kowalski@icloud.com", guestPhone: "+61 421 888 999",
    house: "Serenity 11", houseSlug: "serenity-11", checkIn: "2026-09-18", checkout: "2026-09-22", nights: 4,
    adults: 3, children: 1, infants: 0, pets: 0, nightlyRate: 270, cleaningFee: 135, petFee: 0, subtotal: 1080, discount: 0, tax: 122, total: 1337,
    paymentStatus: "Paid", bookingStatus: "Confirmed", createdAt: "2026-08-05",
    stripeSessionId: "cs_test_h8i9j0k1l2m3n4o5p6q7", stripePaymentIntentId: "pi_7GhIjKlMnOpQrStU",
    notes: "Relocation stay. Requested quiet room arrangement.", isCorporate: false,
  },
  {
    id: "10", reference: "SER-7-J0P33", guestName: "Nathan Burke", guestEmail: "nburke@fastmail.com", guestPhone: "+61 404 333 777",
    house: "Serenity 7", houseSlug: "serenity-7", checkIn: "2026-10-18", checkout: "2026-10-20", nights: 2,
    adults: 2, children: 0, infants: 0, pets: 0, nightlyRate: 240, cleaningFee: 120, petFee: 0, subtotal: 480, discount: 0, tax: 60, total: 660,
    paymentStatus: "Paid", bookingStatus: "Confirmed", createdAt: "2026-08-06",
    stripeSessionId: "cs_test_i9j0k1l2m3n4o5p6q7r8", stripePaymentIntentId: "pi_8HiJkLmNoPqRsUvV",
    notes: "", isCorporate: false,
  },
];

const MOCK_CORPORATE: CorporateEnquiry[] = [
  {
    id: "c1", companyName: "Buildtech Pty Ltd", contactPerson: "David Nguyen", email: "admin@buildtech.com.au",
    phone: "+61 3 9501 2233", checkIn: "2026-09-01", checkout: "2026-09-29", guests: 5,
    housesRequested: ["Serenity 11"], status: "Approved",
    notes: "Monthly contractor accommodation. PO# BT-2026-441. GST invoice required.", abn: "51 824 753 556", poNumber: "BT-2026-441",
  },
  {
    id: "c2", companyName: "DataCore Solutions", contactPerson: "Amanda Chen", email: "stays@datacore.com.au",
    phone: "+61 2 8001 7700", checkIn: "2026-10-06", checkout: "2026-10-13", guests: 8,
    housesRequested: ["Serenity 7", "Serenity 9"], status: "Approved",
    notes: "Team offsite. Requires high-speed internet confirmed. Adjacent houses needed.", abn: "88 111 222 333", poNumber: "DC-Q4-2026",
  },
  {
    id: "c3", companyName: "InsureFirst Claims", contactPerson: "Robert Walsh", email: "claims@insurefirst.com.au",
    phone: "+61 3 8800 9900", checkIn: "2026-09-10", checkout: "2026-10-08", guests: 4,
    housesRequested: ["Serenity 9"], status: "Pending Approval",
    notes: "Insurance-funded temporary accommodation following property damage. Awaiting claim approval.", abn: "22 987 654 321",
  },
  {
    id: "c4", companyName: "Gippsland Rail Consortium", contactPerson: "Sandra Obi", email: "sandra.obi@grc.vic.gov.au",
    phone: "+61 3 5600 4411", checkIn: "2026-08-25", checkout: "2026-09-05", guests: 6,
    housesRequested: ["Serenity 7", "Serenity 11"], status: "Contacted",
    notes: "State infrastructure project. Team of engineers. Needs parking and laundry.", abn: "77 321 654 987",
  },
  {
    id: "c5", companyName: "NextGen Relocations", contactPerson: "Paul McGregor", email: "p.mcgregor@nextgenrelo.com.au",
    phone: "+61 414 900 100", checkIn: "2026-11-01", checkout: "2026-11-30", guests: 3,
    housesRequested: ["Serenity 7"], status: "New",
    notes: "Employee relocation package. Monthly rate preferred. Flexible on exact dates.", abn: "66 555 444 333",
  },
];

const MOCK_SETTINGS: AdminSettings = {
  businessEmail: DEFAULT_CONTACT_SETTINGS_RECORD.contact_email,
  phone: DEFAULT_CONTACT_SETTINGS_RECORD.phone_number,
  checkInTime: "3:00 PM",
  checkoutTime: "11:00 AM",
  gstWording: "All prices include GST (10%). Tax invoice available upon request.",
  cancellationPolicy: "Free cancellation up to 7 days before check-in. 50% refund for cancellations 3–7 days prior. No refund for cancellations within 3 days.",
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

const fmtDate = (iso: string) => {
  return iso ? formatDateAu(iso) : "—";
};

const getBookingStatusColor = (status: BookingStatus) => {
  switch (status) {
    case "Confirmed": return { bg: "#ECFDF5", border: "#6EE7B7", text: "#065F46" };
    case "Pending Payment": return { bg: "#FFFBEB", border: "#FDE68A", text: "#92400E" };
    case "Corporate": return { bg: "#EFF6FF", border: "#BFDBFE", text: "#1E40AF" };
    case "Cancelled": return { bg: "#FEF2F2", border: "#FECACA", text: "#991B1B" };
    case "Checked In": return { bg: "#F0FDF4", border: "#86EFAC", text: "#15803D" };
    case "Checked Out": return { bg: "#F8F5F1", border: "#E7DED4", text: "#6F6258" };
  }
};

const getPaymentStatusColor = (status: PaymentStatus) => {
  switch (status) {
    case "Paid": return { bg: "#ECFDF5", border: "#6EE7B7", text: "#065F46" };
    case "Pending": return { bg: "#FFFBEB", border: "#FDE68A", text: "#92400E" };
    case "Failed": return { bg: "#FEF2F2", border: "#FECACA", text: "#991B1B" };
    case "Refunded": return { bg: "#F5F3FF", border: "#DDD6FE", text: "#5B21B6" };
  }
};

const getCorporateStatusColor = (status: CorporateStatus) => {
  switch (status) {
    case "New": return { bg: "#EFF6FF", border: "#BFDBFE", text: "#1E40AF" };
    case "Contacted": return { bg: "#FFFBEB", border: "#FDE68A", text: "#92400E" };
    case "Pending Approval": return { bg: "#FFF7ED", border: "#FED7AA", text: "#9A3412" };
    case "Approved": return { bg: "#ECFDF5", border: "#6EE7B7", text: "#065F46" };
    case "Declined": return { bg: "#FEF2F2", border: "#FECACA", text: "#991B1B" };
  }
};

// ─── Sub-components ───────────────────────────────────────────────────────────

function Badge({ label, colors }: { label: string; colors: { bg: string; border: string; text: string } }) {
  return (
    <span style={{ background: colors.bg, borderColor: colors.border, color: colors.text }}
      className="inline-flex items-center border rounded-none px-2 py-0.5 text-[0.68rem] font-bold whitespace-nowrap">
      {label}
    </span>
  );
}

function StatCard({ icon: Icon, label, value, sub, accent }: {
  icon: React.ElementType; label: string; value: string; sub?: string; accent?: boolean;
}) {
  return (
    <div className="card bg-white p-5 flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <span className="text-[0.68rem] font-bold uppercase tracking-wider" style={{ color: "#6F6258" }}>{label}</span>
        <span style={{ background: accent ? "#FAF5EF" : "#F8F5F1", color: accent ? "#7A4E2D" : "#6F6258" }}
          className="rounded-none p-2">
          <Icon size={15} />
        </span>
      </div>
      <p className="text-2xl font-extrabold tracking-normal" style={{ color: "#111111", fontFamily: "var(--font-display)" }}>{value}</p>
      {sub && <p className="text-[0.72rem]" style={{ color: "#6F6258" }}>{sub}</p>}
    </div>
  );
}

function SectionHeader({ title, sub }: { title: string; sub?: string }) {
  return (
    <div className="mb-6">
      <h2 className="text-lg font-bold" style={{ color: "#111111", fontFamily: "var(--font-display)" }}>{title}</h2>
      {sub && <p className="text-sm mt-0.5" style={{ color: "#6F6258" }}>{sub}</p>}
    </div>
  );
}

function TableTh({ children }: { children: React.ReactNode }) {
  return <th className="px-4 py-3 text-left text-[0.68rem] font-bold uppercase tracking-wider whitespace-nowrap" style={{ color: "#6F6258" }}>{children}</th>;
}

function TableTd({ children, bold }: { children: React.ReactNode; bold?: boolean }) {
  return <td className={`px-4 py-3 text-xs ${bold ? "font-bold" : "font-medium"} whitespace-nowrap`} style={{ color: bold ? "#111111" : "#1E1B18" }}>{children}</td>;
}

// ─── Login Screen ─────────────────────────────────────────────────────────────

function LoginScreen({ onLogin }: { onLogin: () => void }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      if (email === "admin@gmail.com" && password === "Asd12345") {
        onLogin();
      } else {
        setError("Invalid email or password. Please try again.");
      }
    }, 700);
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4" style={{ background: "#F8F5F1" }}>
      {/* Logo */}
      <div className="mb-8 text-center">
        <span className="brand-logo brand-logo-dark text-3xl">
          Serenity<span className="brand-logo-dot">.</span>
        </span>
        <p className="mt-1 text-sm font-semibold" style={{ color: "#6F6258" }}>Admin Portal</p>
      </div>

      <div className="w-full max-w-sm card bg-white p-8" style={{ boxShadow: "0 8px 40px rgba(17,17,17,0.07)" }}>
        <h1 className="text-xl font-extrabold mb-1" style={{ color: "#111111", fontFamily: "var(--font-display)" }}>Sign in to Admin</h1>
        <p className="text-xs mb-6" style={{ color: "#6F6258" }}>Manage bookings, houses and payments.</p>

        {error && (
          <div className="mb-4 rounded-none flex items-start gap-2 p-3 text-xs font-semibold"
            style={{ background: "#FEF2F2", border: "1px solid #FECACA", color: "#991B1B" }}>
            <AlertTriangle size={14} className="shrink-0 mt-0.5" />
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold mb-1.5" style={{ color: "#111111" }}>Email address</label>
            <input
              id="admin-email"
              type="email"
              className="field text-sm"
              placeholder="admin@gmail.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              autoComplete="email"
            />
          </div>
          <div>
            <label className="block text-xs font-bold mb-1.5" style={{ color: "#111111" }}>Password</label>
            <input
              id="admin-password"
              type="password"
              className="field text-sm"
              placeholder="••••••••"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              autoComplete="current-password"
            />
          </div>
          <button
            id="admin-login-btn"
            type="submit"
            disabled={loading}
            className="btn-primary w-full justify-center mt-2"
            style={{ minHeight: "2.75rem" }}
          >
            {loading ? "Signing in…" : "Sign in"}
          </button>
        </form>
      </div>

      <p className="mt-6 text-center text-[0.7rem] leading-relaxed max-w-xs" style={{ color: "#B3A89C" }}>
        This is a frontend-only mock login for demonstration purposes.<br />
        Not for production use. No real authentication is applied.
      </p>
      <Link href="/" className="mt-3 text-xs font-semibold hover:underline" style={{ color: "#7A4E2D" }}>
        ← Back to Serenity website
      </Link>
    </div>
  );
}

// ─── Overview Section ─────────────────────────────────────────────────────────

function OverviewSection() {
  const confirmed = MOCK_BOOKINGS.filter(b => b.bookingStatus === "Confirmed").length;
  const pending = MOCK_BOOKINGS.filter(b => b.bookingStatus === "Pending Payment").length;
  const corporate = MOCK_BOOKINGS.filter(b => b.isCorporate).length;
  const monthlyRevenue = MOCK_BOOKINGS.filter(b => b.paymentStatus === "Paid").reduce((s, b) => s + b.total, 0);
  const checkedIn = MOCK_BOOKINGS.filter(b => b.bookingStatus === "Checked In").length;
  const upcomingCheckout = MOCK_BOOKINGS.filter(b => b.bookingStatus === "Confirmed").slice(0, 2).length;

  return (
    <div>
      <SectionHeader title="Overview" sub="Live summary of Serenity bookings and performance." />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-8">
        <StatCard icon={CalendarDays} label="Total Bookings" value={formatAuNumber(MOCK_BOOKINGS.length)} sub="All time" />
        <StatCard icon={CheckCircle2} label="Confirmed" value={String(confirmed)} sub="Active reservations" accent />
        <StatCard icon={Clock} label="Pending Payment" value={String(pending)} sub="Awaiting payment" />
        <StatCard icon={BriefcaseBusiness} label="Corporate Enquiries" value={String(corporate)} sub="Corporate bookings" accent />
        <StatCard icon={TrendingUp} label="Monthly Revenue" value={formatAud(monthlyRevenue)} sub="Paid bookings only" accent />
        <StatCard icon={Star} label="Occupancy Rate" value="78%" sub="Past 30 days" />
        <StatCard icon={DoorOpen} label="Upcoming Check-ins" value={String(checkedIn + 2)} sub="Next 7 days" accent />
        <StatCard icon={DoorClosed} label="Upcoming Checkouts" value={String(upcomingCheckout)} sub="Next 7 days" />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Recent Bookings */}
        <div className="card bg-white overflow-hidden">
          <div className="px-5 py-4 border-b" style={{ borderColor: "#E7DED4" }}>
            <h3 className="font-bold text-sm" style={{ color: "#111111" }}>Recent Bookings</h3>
          </div>
          <div className="divide-y" style={{ borderColor: "#F3EFE9" }}>
            {MOCK_BOOKINGS.slice(0, 5).map(b => {
              const sc = getBookingStatusColor(b.bookingStatus);
              return (
                <div key={b.id} className="flex items-center justify-between px-5 py-3">
                  <div>
                    <p className="text-xs font-bold" style={{ color: "#111111" }}>{b.guestName}</p>
                    <p className="text-[0.7rem] mt-0.5" style={{ color: "#6F6258" }}>{b.house} · {fmtDate(b.checkIn)}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-semibold" style={{ color: "#111111" }}>{formatAud(b.total)}</span>
                    <Badge label={b.bookingStatus} colors={sc} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Houses at a glance */}
        <div className="card bg-white overflow-hidden">
          <div className="px-5 py-4 border-b" style={{ borderColor: "#E7DED4" }}>
            <h3 className="font-bold text-sm" style={{ color: "#111111" }}>Houses at a Glance</h3>
          </div>
          <div className="divide-y" style={{ borderColor: "#F3EFE9" }}>
            {properties.map(p => (
              <div key={p.id} className="flex items-center justify-between px-5 py-3.5">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-none overflow-hidden shrink-0">
                    <NextImage src={p.featuredImage} alt={p.name} width={80} height={80} sizes="40px" className="w-full h-full object-cover" />
                  </div>
                  <div>
                    <p className="text-xs font-bold" style={{ color: "#111111" }}>{p.name}</p>
                    <p className="text-[0.7rem] mt-0.5" style={{ color: "#6F6258" }}>{formatAuNumber(p.bedrooms)} bed · Up to {formatAuNumber(p.maxGuests)} guests</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold" style={{ color: "#7A4E2D" }}>{formatAud(p.nightlyPrice)}</p>
                  <p className="text-[0.68rem]" style={{ color: "#6F6258" }}>per night</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Bookings Section ─────────────────────────────────────────────────────────

function BookingsSection() {
  type FilterTab = "All" | "Confirmed" | "Pending Payment" | "Corporate" | "Cancelled";
  const [tab, setTab] = useState<FilterTab>("All");
  const [selectedBooking, setSelectedBooking] = useState<MockBooking | null>(null);
  const [noteText, setNoteText] = useState("");
  const [bookings, setBookings] = useState(MOCK_BOOKINGS);
  const [noteModal, setNoteModal] = useState<string | null>(null);

  const tabs: FilterTab[] = ["All", "Confirmed", "Pending Payment", "Corporate", "Cancelled"];

  const filtered = bookings.filter(b => {
    if (tab === "All") return true;
    if (tab === "Corporate") return b.isCorporate;
    return b.bookingStatus === tab;
  });

  const markConfirmed = (id: string) => {
    setBookings(prev => prev.map(b => b.id === id ? { ...b, bookingStatus: "Confirmed", paymentStatus: "Paid" } : b));
  };

  const cancelBooking = (id: string) => {
    setBookings(prev => prev.map(b => b.id === id ? { ...b, bookingStatus: "Cancelled" } : b));
  };

  const saveNote = (id: string) => {
    setBookings(prev => prev.map(b => b.id === id ? { ...b, notes: noteText } : b));
    setNoteModal(null);
  };

  return (
    <div>
      <SectionHeader title="Booking Management" sub="View and manage all guest reservations." />

      {/* Tabs */}
      <div className="flex gap-1 mb-4 flex-wrap">
        {tabs.map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className="px-3.5 py-1.5 rounded-none text-xs font-bold transition-colors"
            style={{
              background: tab === t ? "#111111" : "#F8F5F1",
              color: tab === t ? "#ffffff" : "#6F6258",
              border: tab === t ? "1px solid #111111" : "1px solid #E7DED4",
            }}
          >
            {t}
          </button>
        ))}
      </div>

      <div className="card bg-white overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead style={{ background: "#FAF8F5", borderBottom: "1px solid #E7DED4" }}>
              <tr>
                <TableTh>Reference</TableTh>
                <TableTh>Guest</TableTh>
                <TableTh>House</TableTh>
                <TableTh>Dates</TableTh>
                <TableTh>Guests</TableTh>
                <TableTh>Pets</TableTh>
                <TableTh>Total AUD</TableTh>
                <TableTh>Payment</TableTh>
                <TableTh>Status</TableTh>
                <TableTh>Created</TableTh>
                <TableTh>Actions</TableTh>
              </tr>
            </thead>
            <tbody className="divide-y" style={{ borderColor: "#F3EFE9" }}>
              {filtered.map(b => {
                const bs = getBookingStatusColor(b.bookingStatus);
                const ps = getPaymentStatusColor(b.paymentStatus);
                return (
                  <tr key={b.id} className="hover:bg-[#FAFAF9] transition-colors">
                    <TableTd bold>{b.reference}</TableTd>
                    <td className="px-4 py-3">
                      <p className="text-xs font-bold" style={{ color: "#111111" }}>{b.guestName}</p>
                      {b.isCorporate && <p className="text-[0.65rem]" style={{ color: "#1E40AF" }}>{b.companyName}</p>}
                    </td>
                    <TableTd>{b.house}</TableTd>
                    <td className="px-4 py-3 text-xs font-medium whitespace-nowrap" style={{ color: "#1E1B18" }}>
                      {fmtDate(b.checkIn)} – {fmtDate(b.checkout)}
                      <span className="ml-1" style={{ color: "#6F6258" }}>({formatAuNumber(b.nights)}n)</span>
                    </td>
                    <TableTd>{b.adults + b.children}</TableTd>
                      <TableTd>{b.pets > 0 ? <span className="flex items-center gap-1"><PawPrint size={11} />{formatAuNumber(b.pets)}</span> : "—"}</TableTd>
                    <TableTd bold>{formatAud(b.total)}</TableTd>
                    <td className="px-4 py-3"><Badge label={b.paymentStatus} colors={ps} /></td>
                    <td className="px-4 py-3"><Badge label={b.bookingStatus} colors={bs} /></td>
                    <TableTd>{fmtDate(b.createdAt)}</TableTd>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <button
                          title="View details"
                          onClick={() => setSelectedBooking(b)}
                          className="p-1.5 rounded-none transition-colors"
                          style={{ background: "#F8F5F1", color: "#7A4E2D" }}
                        >
                          <Eye size={13} />
                        </button>
                        <button
                          title="Mark confirmed"
                          onClick={() => markConfirmed(b.id)}
                          className="p-1.5 rounded-none transition-colors"
                          style={{ background: "#ECFDF5", color: "#065F46" }}
                        >
                          <CheckCircle2 size={13} />
                        </button>
                        <button
                          title="Cancel booking"
                          onClick={() => cancelBooking(b.id)}
                          className="p-1.5 rounded-none transition-colors"
                          style={{ background: "#FEF2F2", color: "#991B1B" }}
                        >
                          <XCircle size={13} />
                        </button>
                        <button
                          title="Record note"
                          onClick={() => { setNoteModal(b.id); setNoteText(b.notes); }}
                          className="p-1.5 rounded-none transition-colors"
                          style={{ background: "#EFF6FF", color: "#1E40AF" }}
                        >
                          <MessageSquare size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {filtered.length === 0 && (
                <tr><td colSpan={11} className="px-4 py-10 text-center text-xs" style={{ color: "#6F6258" }}>No bookings found for this filter.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Note Modal */}
      {noteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4" style={{ background: "rgba(17,17,17,0.45)" }}
          onClick={() => setNoteModal(null)}>
          <div className="w-full max-w-md card bg-white p-6" onClick={e => e.stopPropagation()}>
            <h3 className="font-bold text-sm mb-3" style={{ color: "#111111" }}>Record Note</h3>
            <textarea
              className="field text-xs"
              rows={4}
              value={noteText}
              onChange={e => setNoteText(e.target.value)}
              placeholder="Enter note…"
            />
            <div className="flex gap-2 mt-4">
              <button className="btn-primary text-xs flex-1 justify-center" onClick={() => saveNote(noteModal)}>Save Note</button>
              <button className="btn-outline-dark text-xs px-4" onClick={() => setNoteModal(null)}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* Booking Detail Panel */}
      {selectedBooking && (
        <BookingDetailPanel booking={selectedBooking} onClose={() => setSelectedBooking(null)} />
      )}
    </div>
  );
}

// ─── Booking Detail Panel ─────────────────────────────────────────────────────

function BookingDetailPanel({ booking: b, onClose }: { booking: MockBooking; onClose: () => void }) {
  const bs = getBookingStatusColor(b.bookingStatus);
  const ps = getPaymentStatusColor(b.paymentStatus);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex" style={{ background: "rgba(17,17,17,0.45)" }} onClick={onClose}>
      <div className="ml-auto h-full w-full max-w-xl overflow-y-auto" style={{ background: "#ffffff" }} onClick={e => e.stopPropagation()}>
        {/* Panel Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between px-6 py-4 border-b"
          style={{ background: "#ffffff", borderColor: "#E7DED4" }}>
          <div>
            <p className="text-[0.68rem] font-bold uppercase tracking-wider" style={{ color: "#6F6258" }}>Booking Detail</p>
            <h2 className="font-extrabold text-base" style={{ color: "#111111", fontFamily: "var(--font-display)" }}>{b.reference}</h2>
          </div>
          <button onClick={onClose} className="p-2 rounded-none" style={{ background: "#F8F5F1" }}>
            <X size={16} style={{ color: "#111111" }} />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Status row */}
          <div className="flex gap-2">
            <Badge label={b.bookingStatus} colors={bs} />
            <Badge label={b.paymentStatus} colors={ps} />
            {b.isCorporate && <Badge label="Corporate" colors={{ bg: "#EFF6FF", border: "#BFDBFE", text: "#1E40AF" }} />}
          </div>

          {/* Guest Details */}
          <DetailBlock title="Guest Details">
            <DetailRow label="Name" value={b.guestName} />
            <DetailRow label="Email" value={b.guestEmail} />
            <DetailRow label="Phone" value={b.guestPhone} />
            {b.isCorporate && <DetailRow label="Company" value={b.companyName ?? ""} />}
          </DetailBlock>

          {/* Stay Details */}
          <DetailBlock title="Stay Details">
            <DetailRow label="House" value={b.house} />
            <DetailRow label="Check-in" value={fmtDate(b.checkIn)} />
            <DetailRow label="Checkout" value={fmtDate(b.checkout)} />
            <DetailRow label="Nights" value={formatAuNumber(b.nights)} />
            <DetailRow label="Adults" value={String(b.adults)} />
            <DetailRow label="Children" value={String(b.children)} />
            <DetailRow label="Infants" value={String(b.infants)} />
            <DetailRow label="Pets" value={b.pets > 0 ? `${formatAuNumber(b.pets)} pet${b.pets > 1 ? "s" : ""}` : "None"} />
          </DetailBlock>

          {/* Price Breakdown */}
          <DetailBlock title="Price Breakdown">
            <DetailRow label={`Nightly rate × ${b.nights}`} value={formatAud(b.subtotal)} />
            <DetailRow label="Cleaning fee" value={formatAud(b.cleaningFee)} />
            {b.petFee > 0 && <DetailRow label="Pet fee" value={formatAud(b.petFee)} />}
            {b.discount > 0 && <DetailRow label="Discount" value={`−${formatAud(b.discount)}`} />}
            <DetailRow label="GST (10%)" value={formatAud(b.tax)} />
            <div className="flex justify-between pt-2 border-t mt-2" style={{ borderColor: "#E7DED4" }}>
              <span className="text-xs font-extrabold" style={{ color: "#111111" }}>Total AUD</span>
              <span className="text-sm font-extrabold" style={{ color: "#7A4E2D" }}>{formatAud(b.total)}</span>
            </div>
          </DetailBlock>

          {/* Payment / Stripe */}
          <DetailBlock title="Payment & Stripe">
            <DetailRow label="Payment Status" value={b.paymentStatus} />
            <DetailRow label="Stripe Session ID" value={b.stripeSessionId || "Not yet created"} mono />
            <DetailRow label="Payment Intent ID" value={b.stripePaymentIntentId || "—"} mono />
            <div className="flex items-center justify-between py-1.5">
              <span className="text-[0.72rem]" style={{ color: "#6F6258" }}>Receipt Link</span>
              <span className="text-[0.72rem] italic" style={{ color: "#B3A89C" }}>
                {b.paymentStatus === "Paid" ? "stripe.com/receipt/… (placeholder)" : "Not available"}
              </span>
            </div>
          </DetailBlock>

          {/* Corporate Details */}
          {b.isCorporate && (
            <DetailBlock title="Corporate Details">
              <DetailRow label="Company" value={b.companyName ?? ""} />
              <DetailRow label="Invoice Required" value="Yes" />
              <DetailRow label="GST Invoice" value="Requested" />
            </DetailBlock>
          )}

          {/* Notes */}
          <DetailBlock title="Notes">
            <p className="text-xs leading-relaxed" style={{ color: b.notes ? "#1E1B18" : "#B3A89C" }}>
              {b.notes || "No notes recorded."}
            </p>
          </DetailBlock>
        </div>
      </div>
    </div>
  );
}

function DetailBlock({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h4 className="text-[0.68rem] font-bold uppercase tracking-wider mb-2" style={{ color: "#7A4E2D" }}>{title}</h4>
      <div className="card p-4 space-y-0.5 bg-white">{children}</div>
    </div>
  );
}

function DetailRow({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex justify-between items-start py-1.5 border-b last:border-b-0" style={{ borderColor: "#F3EFE9" }}>
      <span className="text-[0.72rem] shrink-0 mr-4" style={{ color: "#6F6258" }}>{label}</span>
      <span className={`text-[0.72rem] font-semibold text-right break-all ${mono ? "font-mono" : ""}`} style={{ color: "#111111" }}>{value}</span>
    </div>
  );
}

// ─── Houses Section ───────────────────────────────────────────────────────────

function HousesSection() {
  const [toast, setToast] = useState("");

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(""), 2500);
  };

  return (
    <div>
      <SectionHeader title="House Management" sub="Manage Serenity 7, Serenity 9, and Serenity 11." />

      {toast && (
        <div className="fixed top-4 right-4 z-50 rounded-none px-4 py-3 text-xs font-bold shadow-lg"
          style={{ background: "#111111", color: "#ffffff" }}>
          {toast}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        {properties.map(p => (
          <div key={p.id} className="card bg-white overflow-hidden flex flex-col">
            <div className="relative h-44 overflow-hidden">
              <NextImage src={p.featuredImage} alt={p.name} fill sizes="(max-width: 768px) 100vw, 33vw" className="w-full h-full object-cover" />
              <div className="absolute inset-0" style={{ background: "linear-gradient(to top, rgba(17,17,17,0.5) 0%, transparent 60%)" }} />
              <div className="absolute bottom-3 left-3">
                <p className="text-white font-extrabold text-base leading-tight" style={{ fontFamily: "var(--font-display)", textShadow: "0 1px 4px rgba(0,0,0,0.4)" }}>
                  {p.name}
                </p>
                <p className="text-[0.68rem] mt-0.5" style={{ color: "rgba(255,255,255,0.8)" }}>{p.location}</p>
              </div>
            </div>

            <div className="p-5 flex flex-col gap-4 flex-1">
              {/* Key stats */}
              <div className="grid grid-cols-2 gap-2 text-xs">
                {[
                  ["Nightly Price", formatAud(p.nightlyPrice)],
                  ["Bedrooms", String(p.bedrooms)],
                  ["Bathrooms", String(p.bathrooms)],
                  ["Max Guests", String(p.maxGuests)],
                  ["Min Stay", `${p.minimumStay} nights`],
                  ["Cleaning Fee", formatAud(p.cleaningFee)],
                  ["Pet Fee", formatAud(p.petFee)],
                  ["Weekly Disc.", `${p.weeklyDiscount}%`],
                  ["Monthly Disc.", `${p.monthlyDiscount}%`],
                  ["Parking", p.parkingType.replace("Free ", "")],
                ].map(([label, value]) => (
                  <div key={label} className="flex justify-between items-center py-1 border-b" style={{ borderColor: "#F3EFE9" }}>
                    <span style={{ color: "#6F6258" }}>{label}</span>
                    <span className="font-bold" style={{ color: "#111111" }}>{value}</span>
                  </div>
                ))}
              </div>

              {/* Pet-friendly badge */}
              <div className="flex flex-wrap gap-1.5">
                <span className="property-badge text-[0.65rem]"><PawPrint size={11} />Pet-friendly</span>
                {p.amenities.includes("Corporate-stay friendly") && (
                  <span className="property-badge text-[0.65rem]"><BriefcaseBusiness size={11} />Corporate</span>
                )}
              </div>

              {/* Action buttons */}
              <div className="grid grid-cols-2 gap-2 mt-auto pt-2">
                {[
                  { icon: Tag, label: "Edit Price", action: "Pricing editor opened" },
                  { icon: CalendarDays, label: "Availability", action: "Availability calendar opened" },
                  { icon: Image, label: "Photos", action: "Photo manager opened" },
                  { icon: Pencil, label: "Details", action: "Details editor opened" },
                ].map(({ icon: Icon, label, action }) => (
                  <button
                    key={label}
                    onClick={() => showToast(`${action} for ${p.name} (demo)`)}
                    className="flex items-center gap-1.5 justify-center rounded-none px-3 py-2 text-[0.7rem] font-bold transition-colors"
                    style={{ background: "#F8F5F1", border: "1px solid #E7DED4", color: "#111111" }}
                  >
                    <Icon size={12} />
                    {label}
                  </button>
                ))}
              </div>

              <Link
                href={`/properties/${p.slug}`}
                className="btn-primary w-full justify-center text-xs"
                style={{ minHeight: "2.25rem" }}
              >
                View Public Listing <ExternalLink size={12} />
              </Link>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Availability Section ─────────────────────────────────────────────────────

function AvailabilitySection() {
  const [selectedSlug, setSelectedSlug] = useState(properties[0].slug);
  const [blocked, setBlocked] = useState<Record<string, string[]>>(() => {
    const initial: Record<string, string[]> = {};
    properties.forEach(p => { initial[p.slug] = [...p.unavailableDates]; });
    return initial;
  });
  const [newDate, setNewDate] = useState("");
  const [toast, setToast] = useState("");

  const selectedProp = properties.find(p => p.slug === selectedSlug)!;
  const currentBlocked = blocked[selectedSlug] ?? [];

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(""), 2000); };

  const addDate = () => {
    if (!newDate) return;
    if (currentBlocked.includes(newDate)) { showToast("Date already blocked"); return; }
    setBlocked(prev => ({ ...prev, [selectedSlug]: [...prev[selectedSlug], newDate].sort() }));
    showToast(`${fmtDate(newDate)} blocked for ${selectedProp.name}`);
    setNewDate("");
  };

  const removeDate = (date: string) => {
    setBlocked(prev => ({ ...prev, [selectedSlug]: prev[selectedSlug].filter(d => d !== date) }));
    showToast(`${fmtDate(date)} unblocked`);
  };

  // Build a mini calendar for current + next month
  const today = new Date(`${todayIso()}T00:00:00Z`);
  const monthDates: Date[] = [];
  const start = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), 1));
  const end = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth() + 2, 0));
  for (let d = new Date(start); d <= end; d.setUTCDate(d.getUTCDate() + 1)) {
    monthDates.push(new Date(d));
  }

  const toIso = (d: Date) => d.toISOString().slice(0, 10);

  return (
    <div>
      <SectionHeader title="Availability Calendar" sub="View and manage blocked dates per house. Changes are stored locally (demo only)." />

      {toast && (
        <div className="fixed top-4 right-4 z-50 rounded-none px-4 py-3 text-xs font-bold shadow-lg"
          style={{ background: "#111111", color: "#ffffff" }}>
          {toast}
        </div>
      )}

      {/* Demo notice */}
      <div className="mb-5 rounded-none flex items-start gap-2 p-3 text-xs"
        style={{ background: "#FFFBEB", border: "1px solid #FDE68A", color: "#92400E" }}>
        <AlertTriangle size={14} className="shrink-0 mt-0.5" />
        <span><strong>Demo mode:</strong> Date blocks are stored in local component state only. They will not persist after a page reload unless real backend persistence is connected.</span>
      </div>

      {/* House selector */}
      <div className="flex gap-2 mb-6 flex-wrap">
        {properties.map(p => (
          <button
            key={p.slug}
            onClick={() => setSelectedSlug(p.slug)}
            className="px-4 py-2 rounded-none text-xs font-bold transition-colors"
            style={{
              background: selectedSlug === p.slug ? "#111111" : "#ffffff",
              color: selectedSlug === p.slug ? "#ffffff" : "#6F6258",
              border: selectedSlug === p.slug ? "1px solid #111111" : "1px solid #E7DED4",
            }}
          >
            {p.name}
          </button>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Mini calendar */}
        <div className="card bg-white p-5">
          <h3 className="font-bold text-sm mb-4" style={{ color: "#111111" }}>
            {today.toLocaleString(AU_LOCALE, { month: "long", year: "numeric", timeZone: AU_TIME_ZONE })} –{" "}
            {new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth() + 1)).toLocaleString(AU_LOCALE, { month: "long", timeZone: AU_TIME_ZONE })}
          </h3>
          <div className="grid grid-cols-7 gap-1 text-center mb-2">
            {["Su","Mo","Tu","We","Th","Fr","Sa"].map(d => (
              <div key={d} className="text-[0.62rem] font-bold uppercase" style={{ color: "#6F6258" }}>{d}</div>
            ))}
          </div>

          {/* Month 1 */}
          {(() => {
            const m1Start = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), 1));
            const m1End = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth() + 1, 0));
            const paddingBefore = m1Start.getUTCDay();
            const days = [];
            for (let i = 0; i < paddingBefore; i++) days.push(<div key={`e${i}`} />);
            for (let d = 1; d <= m1End.getUTCDate(); d++) {
              const dateObj = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), d));
              const iso = toIso(dateObj);
              const isBlocked = currentBlocked.includes(iso);
              const isPast = dateObj < new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()));
              days.push(
                <button
                  key={iso}
                  title={isBlocked ? `Blocked: ${fmtDate(iso)}` : fmtDate(iso)}
                  onClick={() => !isPast && (isBlocked ? removeDate(iso) : (setNewDate(iso)))}
                  className="aspect-square rounded-none text-[0.72rem] font-semibold transition-colors"
                  style={{
                    background: isBlocked ? "#FEF2F2" : isPast ? "#F3EFE9" : "#FAF8F5",
                    color: isBlocked ? "#991B1B" : isPast ? "#B3A89C" : "#111111",
                    border: isBlocked ? "1px solid #FECACA" : "none",
                    textDecoration: isPast ? "line-through" : "none",
                    cursor: isPast ? "default" : "pointer",
                  }}
                >
                  {d}
                </button>
              );
            }
            return <div className="grid grid-cols-7 gap-1 mb-3">{days}</div>;
          })()}
          <p className="text-[0.65rem] mt-3" style={{ color: "#6F6258" }}>
            <span style={{ background: "#FEF2F2", border: "1px solid #FECACA", color: "#991B1B", borderRadius: 3, padding: "0 4px" }}>Red</span> = blocked.
            Click a date to pre-fill the block field below.
          </p>
        </div>

        {/* Block date controls + list */}
        <div className="flex flex-col gap-4">
          <div className="card bg-white p-5">
            <h3 className="font-bold text-sm mb-3" style={{ color: "#111111" }}>Add Blocked Date</h3>
            <div className="flex gap-2">
              <input
                type="date"
                className="field text-xs flex-1"
                value={newDate}
                onChange={e => setNewDate(e.target.value)}
              />
              <button className="btn-primary text-xs px-4" onClick={addDate}>
                <Plus size={13} /> Block
              </button>
            </div>
          </div>

          <div className="card bg-white p-5 flex-1">
            <h3 className="font-bold text-sm mb-3" style={{ color: "#111111" }}>
              Blocked Dates — {selectedProp.name}
              <span className="ml-2 text-[0.7rem] font-normal" style={{ color: "#6F6258" }}>({currentBlocked.length} dates)</span>
            </h3>
            {currentBlocked.length === 0 ? (
              <p className="text-xs" style={{ color: "#6F6258" }}>No dates currently blocked.</p>
            ) : (
              <div className="space-y-1.5 max-h-64 overflow-y-auto pr-1">
                {currentBlocked.sort().map(date => (
                  <div key={date} className="flex items-center justify-between rounded-none px-3 py-2"
                    style={{ background: "#FEF2F2", border: "1px solid #FECACA" }}>
                    <span className="text-xs font-semibold" style={{ color: "#991B1B" }}>{fmtDate(date)}</span>
                    <button onClick={() => removeDate(date)} className="p-1 rounded-none"
                      style={{ color: "#991B1B" }}>
                      <Trash2 size={12} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Corporate Section ────────────────────────────────────────────────────────

function CorporateSection() {
  const [enquiries, setEnquiries] = useState(MOCK_CORPORATE);
  const [selectedEnquiry, setSelectedEnquiry] = useState<CorporateEnquiry | null>(null);

  const statuses: CorporateStatus[] = ["New", "Contacted", "Pending Approval", "Approved", "Declined"];

  const updateStatus = (id: string, status: CorporateStatus) => {
    setEnquiries(prev => prev.map(e => e.id === id ? { ...e, status } : e));
  };

  return (
    <div>
      <SectionHeader title="Corporate Enquiries" sub="Manage company bookings, approvals, and multi-house requests." />

      {/* Summary badges */}
      <div className="flex flex-wrap gap-2 mb-5">
        {statuses.map(s => {
          const count = enquiries.filter(e => e.status === s).length;
          const colors = getCorporateStatusColor(s);
          return (
            <div key={s} className="flex items-center gap-1.5 rounded-none px-3 py-1 text-[0.68rem] font-bold"
              style={{ background: colors.bg, border: `1px solid ${colors.border}`, color: colors.text }}>
              {s} ({count})
            </div>
          );
        })}
      </div>

      <div className="card bg-white overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead style={{ background: "#FAF8F5", borderBottom: "1px solid #E7DED4" }}>
              <tr>
                <TableTh>Company</TableTh>
                <TableTh>Contact</TableTh>
                <TableTh>Email</TableTh>
                <TableTh>Phone</TableTh>
                <TableTh>Dates</TableTh>
                <TableTh>Guests</TableTh>
                <TableTh>Houses</TableTh>
                <TableTh>Status</TableTh>
                <TableTh>Notes</TableTh>
                <TableTh>Actions</TableTh>
              </tr>
            </thead>
            <tbody className="divide-y" style={{ borderColor: "#F3EFE9" }}>
              {enquiries.map(e => {
                const cs = getCorporateStatusColor(e.status);
                return (
                  <tr key={e.id} className="hover:bg-[#FAFAF9] transition-colors">
                    <td className="px-4 py-3">
                      <p className="text-xs font-bold" style={{ color: "#111111" }}>{e.companyName}</p>
                      {e.abn && <p className="text-[0.65rem]" style={{ color: "#6F6258" }}>ABN {e.abn}</p>}
                    </td>
                    <TableTd>{e.contactPerson}</TableTd>
                    <TableTd>{e.email}</TableTd>
                    <TableTd>{e.phone}</TableTd>
                    <td className="px-4 py-3 text-xs font-medium whitespace-nowrap" style={{ color: "#1E1B18" }}>
                      {fmtDate(e.checkIn)} – {fmtDate(e.checkout)}
                    </td>
                    <TableTd>{e.guests}</TableTd>
                    <td className="px-4 py-3">
                      <div className="flex flex-col gap-0.5">
                        {e.housesRequested.map(h => (
                          <span key={h} className="text-[0.65rem] font-semibold" style={{ color: "#1E1B18" }}>{h}</span>
                        ))}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <Badge label={e.status} colors={cs} />
                    </td>
                    <td className="px-4 py-3 max-w-[180px]">
                      <p className="text-[0.68rem] leading-relaxed line-clamp-2" style={{ color: "#6F6258" }}>{e.notes}</p>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => setSelectedEnquiry(e)}
                          className="p-1.5 rounded-none"
                          style={{ background: "#F8F5F1", color: "#7A4E2D" }}
                          title="View details"
                        >
                          <Eye size={13} />
                        </button>
                        <select
                          value={e.status}
                          onChange={ev => updateStatus(e.id, ev.target.value as CorporateStatus)}
                          className="text-[0.65rem] font-bold rounded-none px-2 py-1 cursor-pointer"
                          style={{ border: "1px solid #E7DED4", background: "#F8F5F1", color: "#111111" }}
                        >
                          {statuses.map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Corporate detail modal */}
      {selectedEnquiry && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4" style={{ background: "rgba(17,17,17,0.45)" }}
          onClick={() => setSelectedEnquiry(null)}>
          <div className="w-full max-w-lg card bg-white p-6 overflow-y-auto max-h-[90vh]" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-extrabold text-base" style={{ color: "#111111", fontFamily: "var(--font-display)" }}>
                {selectedEnquiry.companyName}
              </h3>
              <button onClick={() => setSelectedEnquiry(null)} className="p-1.5 rounded-none" style={{ background: "#F8F5F1" }}>
                <X size={15} style={{ color: "#111111" }} />
              </button>
            </div>
            <Badge label={selectedEnquiry.status} colors={getCorporateStatusColor(selectedEnquiry.status)} />
            <div className="mt-4 space-y-2 text-xs">
              {[
                ["Contact", selectedEnquiry.contactPerson],
                ["Email", selectedEnquiry.email],
                ["Phone", selectedEnquiry.phone],
                ["Check-in", fmtDate(selectedEnquiry.checkIn)],
                ["Checkout", fmtDate(selectedEnquiry.checkout)],
                ["Guests", formatAuNumber(selectedEnquiry.guests)],
                ["Houses Requested", selectedEnquiry.housesRequested.join(", ")],
                ...(selectedEnquiry.abn ? [["ABN", selectedEnquiry.abn]] : []),
                ...(selectedEnquiry.poNumber ? [["PO Number", selectedEnquiry.poNumber]] : []),
              ].map(([label, value]) => (
                <div key={label} className="flex justify-between border-b pb-2" style={{ borderColor: "#F3EFE9" }}>
                  <span style={{ color: "#6F6258" }}>{label}</span>
                  <span className="font-semibold" style={{ color: "#111111" }}>{value}</span>
                </div>
              ))}
              <div className="pt-2">
                <p className="font-bold mb-1" style={{ color: "#111111" }}>Notes</p>
                <p className="leading-relaxed" style={{ color: "#6F6258" }}>{selectedEnquiry.notes}</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Payments Section ─────────────────────────────────────────────────────────

function PaymentsSection() {
  const [filter, setFilter] = useState<PaymentStatus | "All">("All");
  const filters: (PaymentStatus | "All")[] = ["All", "Paid", "Pending", "Failed", "Refunded"];

  const filtered = filter === "All" ? MOCK_BOOKINGS : MOCK_BOOKINGS.filter(b => b.paymentStatus === filter);
  const totalPaid = MOCK_BOOKINGS.filter(b => b.paymentStatus === "Paid").reduce((s, b) => s + b.total, 0);
  const totalPending = MOCK_BOOKINGS.filter(b => b.paymentStatus === "Pending").reduce((s, b) => s + b.total, 0);

  return (
    <div>
      <SectionHeader title="Payments" sub="Track payment statuses, Stripe sessions, and receipts." />

      {/* Summary */}
      <div className="grid gap-4 sm:grid-cols-4 mb-6">
        {[
          { label: "Total Paid", value: formatAud(totalPaid), colors: { bg: "#ECFDF5", border: "#6EE7B7", text: "#065F46" } },
          { label: "Pending", value: formatAud(totalPending), colors: { bg: "#FFFBEB", border: "#FDE68A", text: "#92400E" } },
          { label: "Failed", value: String(MOCK_BOOKINGS.filter(b => b.paymentStatus === "Failed").length) + " booking(s)", colors: { bg: "#FEF2F2", border: "#FECACA", text: "#991B1B" } },
          { label: "Refunded", value: String(MOCK_BOOKINGS.filter(b => b.paymentStatus === "Refunded").length) + " booking(s)", colors: { bg: "#F5F3FF", border: "#DDD6FE", text: "#5B21B6" } },
        ].map(({ label, value, colors }) => (
          <div key={label} className="card p-4 bg-white" style={{ borderColor: colors.border }}>
            <p className="text-[0.68rem] font-bold uppercase tracking-wider mb-1" style={{ color: colors.text }}>{label}</p>
            <p className="text-xl font-extrabold" style={{ color: "#111111", fontFamily: "var(--font-display)" }}>{value}</p>
          </div>
        ))}
      </div>

      {/* Filter tabs */}
      <div className="flex gap-1 mb-4 flex-wrap">
        {filters.map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className="px-3.5 py-1.5 rounded-none text-xs font-bold transition-colors"
            style={{
              background: filter === f ? "#111111" : "#F8F5F1",
              color: filter === f ? "#ffffff" : "#6F6258",
              border: filter === f ? "1px solid #111111" : "1px solid #E7DED4",
            }}
          >
            {f}
          </button>
        ))}
      </div>

      <div className="card bg-white overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead style={{ background: "#FAF8F5", borderBottom: "1px solid #E7DED4" }}>
              <tr>
                <TableTh>Reference</TableTh>
                <TableTh>Guest</TableTh>
                <TableTh>House</TableTh>
                <TableTh>Total AUD</TableTh>
                <TableTh>Status</TableTh>
                <TableTh>Stripe Session ID</TableTh>
                <TableTh>Payment Intent ID</TableTh>
                <TableTh>Receipt</TableTh>
                <TableTh>Date</TableTh>
              </tr>
            </thead>
            <tbody className="divide-y" style={{ borderColor: "#F3EFE9" }}>
              {filtered.map(b => {
                const ps = getPaymentStatusColor(b.paymentStatus);
                return (
                  <tr key={b.id} className="hover:bg-[#FAFAF9] transition-colors">
                    <TableTd bold>{b.reference}</TableTd>
                    <TableTd>{b.guestName}</TableTd>
                    <TableTd>{b.house}</TableTd>
                    <TableTd bold>{formatAud(b.total)}</TableTd>
                    <td className="px-4 py-3"><Badge label={b.paymentStatus} colors={ps} /></td>
                    <td className="px-4 py-3">
                      <span className="font-mono text-[0.65rem]" style={{ color: b.stripeSessionId ? "#111111" : "#B3A89C" }}>
                        {b.stripeSessionId || "—"}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="font-mono text-[0.65rem]" style={{ color: b.stripePaymentIntentId ? "#111111" : "#B3A89C" }}>
                        {b.stripePaymentIntentId || "—"}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {b.paymentStatus === "Paid" ? (
                        <span className="flex items-center gap-1 text-[0.68rem] font-semibold" style={{ color: "#7A4E2D" }}>
                          <ExternalLink size={10} /> View Receipt
                        </span>
                      ) : (
                        <span className="text-[0.68rem]" style={{ color: "#B3A89C" }}>—</span>
                      )}
                    </td>
                    <TableTd>{fmtDate(b.createdAt)}</TableTd>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ─── Settings Section ─────────────────────────────────────────────────────────

function SettingsSection() {
  const [settings, setSettings] = useState<AdminSettings>(MOCK_SETTINGS);
  const [saved, setSaved] = useState(false);

  const update = (key: keyof AdminSettings, value: string) => {
    setSettings(prev => ({ ...prev, [key]: value }));
    setSaved(false);
  };

  const save = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  return (
    <div>
      <SectionHeader title="Admin Settings" sub="Configure business details, policies, and operating rules." />

      {saved && (
        <div className="mb-4 rounded-none flex items-center gap-2 px-4 py-3 text-xs font-bold"
          style={{ background: "#ECFDF5", border: "1px solid #6EE7B7", color: "#065F46" }}>
          <CheckCircle2 size={14} /> Settings saved successfully (demo only — changes are not persisted).
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="card bg-white p-6 space-y-4">
          <h3 className="font-bold text-sm" style={{ color: "#111111" }}>Business Contact</h3>
          <div>
            <label className="block text-xs font-bold mb-1.5" style={{ color: "#111111" }}>
              <Mail size={12} className="inline mr-1" />Business Email
            </label>
            <input className="field text-sm" type="email" value={settings.businessEmail}
              onChange={e => update("businessEmail", e.target.value)} />
          </div>
          <div>
            <label className="block text-xs font-bold mb-1.5" style={{ color: "#111111" }}>
              <Phone size={12} className="inline mr-1" />Phone Number
            </label>
            <input className="field text-sm" type="tel" value={settings.phone}
              onChange={e => update("phone", e.target.value)} />
          </div>
        </div>

        <div className="card bg-white p-6 space-y-4">
          <h3 className="font-bold text-sm" style={{ color: "#111111" }}>Check-in / Checkout Times</h3>
          <div>
            <label className="block text-xs font-bold mb-1.5" style={{ color: "#111111" }}>
              <DoorOpen size={12} className="inline mr-1" />Check-in Time
            </label>
            <input className="field text-sm" type="text" value={settings.checkInTime}
              onChange={e => update("checkInTime", e.target.value)} placeholder="e.g. 3:00 PM" />
          </div>
          <div>
            <label className="block text-xs font-bold mb-1.5" style={{ color: "#111111" }}>
              <DoorClosed size={12} className="inline mr-1" />Checkout Time
            </label>
            <input className="field text-sm" type="text" value={settings.checkoutTime}
              onChange={e => update("checkoutTime", e.target.value)} placeholder="e.g. 11:00 AM" />
          </div>
        </div>

        <div className="card bg-white p-6 space-y-4">
          <h3 className="font-bold text-sm" style={{ color: "#111111" }}>Tax & GST Wording</h3>
          <div>
            <label className="block text-xs font-bold mb-1.5" style={{ color: "#111111" }}>GST Display Text</label>
            <textarea className="field text-sm" rows={3} value={settings.gstWording}
              onChange={e => update("gstWording", e.target.value)} />
            <p className="text-[0.68rem] mt-1" style={{ color: "#6F6258" }}>Shown to guests during checkout and on tax invoices.</p>
          </div>
        </div>

        <div className="card bg-white p-6 space-y-4">
          <h3 className="font-bold text-sm" style={{ color: "#111111" }}>Cancellation Policy</h3>
          <div>
            <label className="block text-xs font-bold mb-1.5" style={{ color: "#111111" }}>Policy Summary</label>
            <textarea className="field text-sm" rows={3} value={settings.cancellationPolicy}
              onChange={e => update("cancellationPolicy", e.target.value)} />
            <p className="text-[0.68rem] mt-1" style={{ color: "#6F6258" }}>Shown on property detail pages and booking confirmation.</p>
          </div>
        </div>
      </div>

      <div className="mt-6 flex gap-3">
        <button className="btn-primary" onClick={save}>
          <Save size={14} /> Save Settings
        </button>
        <button className="btn-outline-dark" onClick={() => { setSettings(MOCK_SETTINGS); setSaved(false); }}>
          <RefreshCw size={14} /> Reset Defaults
        </button>
      </div>

      {/* Info box */}
      <div className="mt-6 rounded-none flex items-start gap-3 p-4 text-xs"
        style={{ background: "#EFF6FF", border: "1px solid #BFDBFE", color: "#1E40AF" }}>
        <Shield size={15} className="shrink-0 mt-0.5" />
        <div>
          <p className="font-bold mb-0.5">Demo Notice</p>
          <p>This settings panel is frontend-only. Changes will not persist. Connect this form to a real API or CMS to save configuration data.</p>
        </div>
      </div>
    </div>
  );
}

// ─── Main Admin Dashboard ─────────────────────────────────────────────────────

type NavSection = "overview" | "bookings" | "houses" | "availability" | "corporate" | "payments" | "settings";

interface NavItem {
  id: NavSection;
  label: string;
  icon: React.ElementType;
}

const NAV_ITEMS: NavItem[] = [
  { id: "overview", label: "Overview", icon: LayoutDashboard },
  { id: "bookings", label: "Bookings", icon: CalendarDays },
  { id: "houses", label: "Houses", icon: Building2 },
  { id: "availability", label: "Availability", icon: Home },
  { id: "corporate", label: "Corporate Enquiries", icon: BriefcaseBusiness },
  { id: "payments", label: "Payments", icon: CreditCard },
  { id: "settings", label: "Settings", icon: Settings },
];

function AdminDashboardInner({ onLogout }: { onLogout: () => void }) {
  const [activeSection, setActiveSection] = useState<NavSection>("overview");
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const navTo = useCallback((id: NavSection) => {
    setActiveSection(id);
    setSidebarOpen(false);
  }, []);

  const activeNav = NAV_ITEMS.find(n => n.id === activeSection)!;

  const renderSection = () => {
    switch (activeSection) {
      case "overview": return <OverviewSection />;
      case "bookings": return <BookingsSection />;
      case "houses": return <HousesSection />;
      case "availability": return <AvailabilitySection />;
      case "corporate": return <CorporateSection />;
      case "payments": return <PaymentsSection />;
      case "settings": return <SettingsSection />;
    }
  };

  return (
    <div className="min-h-screen flex" style={{ background: "#F8F5F1" }}>
      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 lg:hidden"
          style={{ background: "rgba(17,17,17,0.4)" }}
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed top-0 left-0 h-full z-50 flex flex-col transition-transform duration-300 lg:translate-x-0 lg:static lg:z-auto ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}`}
        style={{ width: 240, background: "#111111", borderRight: "1px solid #1E1B18" }}
      >
        {/* Logo */}
        <div className="flex items-center justify-between px-5 py-5 border-b" style={{ borderColor: "#1E1B18" }}>
          <span className="brand-logo text-xl">
            Serenity<span className="brand-logo-dot">.</span>
          </span>
          <button className="lg:hidden p-1" onClick={() => setSidebarOpen(false)}>
            <X size={16} style={{ color: "#ffffff" }} />
          </button>
        </div>

        <p className="px-5 pt-3 pb-1 text-[0.6rem] font-bold uppercase tracking-widest" style={{ color: "#B88A5A" }}>
          Admin Panel
        </p>

        {/* Nav */}
        <nav className="flex-1 px-3 pb-4 space-y-0.5 overflow-y-auto">
          {NAV_ITEMS.map(item => {
            const isActive = activeSection === item.id;
            return (
              <button
                key={item.id}
                onClick={() => navTo(item.id)}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-none text-sm font-semibold text-left transition-colors"
                style={{
                  background: isActive ? "#1E1B18" : "transparent",
                  color: isActive ? "#B88A5A" : "rgba(255,255,255,0.7)",
                  borderLeft: isActive ? "2px solid #7A4E2D" : "2px solid transparent",
                }}
              >
                <item.icon size={15} />
                <span className="truncate">{item.label}</span>
                {isActive && <ChevronRight size={12} className="ml-auto shrink-0" />}
              </button>
            );
          })}
        </nav>

        {/* Footer nav */}
        <div className="px-3 pb-5 border-t pt-4" style={{ borderColor: "#1E1B18" }}>
          <div className="px-3 py-2.5 mb-2">
            <p className="text-[0.68rem] font-bold" style={{ color: "rgba(255,255,255,0.9)" }}>Admin</p>
            <p className="text-[0.62rem] mt-0.5" style={{ color: "rgba(255,255,255,0.45)" }}>admin@gmail.com</p>
          </div>
          <button
            onClick={onLogout}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-none text-sm font-semibold transition-colors"
            style={{ color: "rgba(255,255,255,0.55)" }}
          >
            <LogOut size={15} />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar */}
        <header className="sticky top-0 z-30 flex items-center justify-between px-5 py-3.5 border-b"
          style={{ background: "#ffffff", borderColor: "#E7DED4", boxShadow: "0 1px 4px rgba(17,17,17,0.04)" }}>
          <div className="flex items-center gap-3">
            <button
              className="lg:hidden p-2 rounded-none"
              style={{ background: "#F8F5F1" }}
              onClick={() => setSidebarOpen(true)}
            >
              <Menu size={17} style={{ color: "#111111" }} />
            </button>
            <div>
              <p className="font-extrabold text-sm leading-tight" style={{ color: "#111111", fontFamily: "var(--font-display)" }}>
                {activeNav.label}
              </p>
              <p className="text-[0.65rem] hidden sm:block" style={{ color: "#6F6258" }}>
                Serenity Admin · Pakenham, Victoria, Australia
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-[0.65rem] font-bold rounded-none px-2.5 py-1 hidden sm:inline-flex items-center gap-1"
              style={{ background: "#FAF5EF", border: "1px solid #EADCCF", color: "#7A4E2D" }}>
              <Shield size={10} /> Demo Mode
            </span>
            <Link
              href="/"
              className="text-xs font-semibold flex items-center gap-1.5 rounded-none px-3 py-2 transition-colors"
              style={{ background: "#F8F5F1", border: "1px solid #E7DED4", color: "#111111" }}
            >
              <Home size={13} /> View Site
            </Link>
          </div>
        </header>

        {/* Section content */}
        <main className="flex-1 p-5 sm:p-6 lg:p-8 overflow-x-hidden">
          {renderSection()}
        </main>
      </div>
    </div>
  );
}

// ─── Root Export ──────────────────────────────────────────────────────────────

export function AdminDashboard() {
  const [loggedIn, setLoggedIn] = useState(false);

  return loggedIn
    ? <AdminDashboardInner onLogout={() => setLoggedIn(false)} />
    : <LoginScreen onLogin={() => setLoggedIn(true)} />;
}
