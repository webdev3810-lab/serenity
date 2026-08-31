import { ArrowUpRight } from "lucide-react";
import Link from "next/link";
import { GsapFadeIn } from "./AnimatedSection";
import { GsapServiceWipe } from "./GsapServiceWipe";
import ScrollWipeText from "./ScrollWipeText";

const SERVICES = [
  {
    title: "Pet-friendly homes",
    description: "Private homes where guests can comfortably settle in with their pets.",
    href: "/houses",
  },
  {
    title: "Convenient parking",
    description: "Off-street parking makes every arrival and daily trip seamless.",
    href: "/houses",
  },
  {
    title: "Move-in-ready comfort",
    description: "Thoughtfully prepared homes with full kitchens, laundries, and everyday essentials.",
    href: "/houses",
  },
  {
    title: "Prepared for your arrival",
    description: "Fresh, meticulously prepared environments ensuring a calm standard for every stay.",
    href: "/houses",
  },
];

const COLORS = [
  "bg-[#B99D88] text-[#2D2622]", // Warm tan
  "bg-[#1A1A1A] text-[#F3F2F0]", // Dark
  "bg-[#96958F] text-[#1A1A1A]", // Grey-brown
  "bg-[#D5CBC3] text-[#1A1A1A]", // Beige
  "bg-[#2C3531] text-[#F3F2F0]", // Dark green-grey
  "bg-[#A79888] text-[#1A1A1A]", // Warm brown
  "bg-[#E2DDD8] text-[#1A1A1A]", // Light grey
  "bg-[#5B6366] text-[#F3F2F0]", // Slate
];

// Abstract Line Graphic 1 (Radial Sunburst)
const GraphicOne = () => (
  <svg className="service-graphic absolute -bottom-16 -left-16 w-80 h-80 opacity-20 pointer-events-none" viewBox="0 0 100 100" data-graphic-type="radial">
    <g transform="translate(50, 50)">
      {Array.from({ length: 72 }).map((_, i) => (
        <line 
          key={i} 
          x1="25" y1="0" 
          x2={i % 2 === 0 ? "48" : "38"} y2="0" 
          stroke="currentColor" 
          strokeWidth="0.5" 
          transform={`rotate(${i * 5})`} 
        />
      ))}
    </g>
  </svg>
);

// Abstract Line Graphic 2 (Vertical Ascending/Descending)
const GraphicTwo = () => (
  <svg className="service-graphic absolute bottom-0 right-0 w-full h-48 opacity-20 pointer-events-none" viewBox="0 0 100 100" preserveAspectRatio="none" data-graphic-type="vertical">
    {Array.from({ length: 60 }).map((_, i) => {
      // Create a pattern of increasing heights with a sharp drop
      let height = 0;
      if (i < 30) {
        height = 10 + (i * 2);
      } else {
        height = 10 + ((i - 30) * 2.5);
      }
      return (
        <line 
          key={i} 
          x1={5 + i * 1.6} 
          y1="100" 
          x2={5 + i * 1.6} 
          y2={100 - height} 
          stroke="currentColor" 
          strokeWidth="0.6" 
        />
      );
    })}
  </svg>
);

// Abstract Line Graphic 3 (Horizontal Chevron)
const GraphicThree = () => (
  <svg className="service-graphic absolute bottom-10 -right-10 w-72 h-48 opacity-20 pointer-events-none" viewBox="0 0 100 100" preserveAspectRatio="none" data-graphic-type="horizontal">
    {Array.from({ length: 25 }).map((_, i) => {
      const y = 10 + i * 3.5;
      // create a gap that forms a chevron <
      const gapCenter = Math.abs(12 - i) * 3;
      return (
        <g key={i} stroke="currentColor" strokeWidth="1">
          <line x1="0" y1={y} x2={40 + gapCenter} y2={y} />
          <line x1={70 + gapCenter} y1={y} x2="150" y2={y} />
        </g>
      );
    })}
  </svg>
);

const GRAPHICS = [GraphicOne, GraphicTwo, GraphicThree];

export default function HomepageServicesSection() {
  return (
    <section className="bg-[#F9F8F6] py-32 px-4 sm:px-6 overflow-hidden">
      <GsapFadeIn className="w-full max-w-5xl mx-auto text-center mb-20">
        <ScrollWipeText className="editorial-heading text-stone-900 max-w-4xl mx-auto leading-tight">
          Comfort for every kind of stay — a clear perspective that guides every decision we make.
        </ScrollWipeText>
      </GsapFadeIn>

      <GsapServiceWipe className="w-full max-w-[96rem] mx-auto grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-2">
        {SERVICES.map((service, idx) => {
          const colorClass = COLORS[idx % COLORS.length];
          const number = String(idx + 1).padStart(2, "0");
          const Graphic = GRAPHICS[idx % GRAPHICS.length];

          return (
            <Link 
              key={service.title} 
              href={service.href} 
              className={`service-card block group relative h-[31rem] p-8 sm:h-[34rem] sm:p-10 xl:h-[36rem] flex flex-col justify-between transition-transform duration-500 hover:scale-[1.01] overflow-hidden ${colorClass}`}
            >
              <div className="relative z-10">
                <h3 className="font-marcellus text-xl md:text-2xl font-bold mb-3 flex items-center justify-between">
                  {service.title}
                  <ArrowUpRight size={24} className="opacity-0 -translate-x-4 translate-y-4 transition-all duration-300 ease-out group-hover:opacity-100 group-hover:translate-x-0 group-hover:translate-y-0" />
                </h3>
                <p className="text-[15px] leading-relaxed opacity-80 max-w-[90%] font-sans">
                  {service.description}
                </p>
              </div>
              
              {/* Graphic Background */}
              <Graphic />

              <div className="text-4xl display-font opacity-90 relative z-10 mt-auto">
                {number}
              </div>
            </Link>
          );
        })}
      </GsapServiceWipe>
    </section>
  );
}
