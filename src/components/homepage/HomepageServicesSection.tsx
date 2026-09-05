import ScrollWipeText from "./ScrollWipeText";

const SERVICE_POINTS = [
  {
    title: "Flexible arrangements",
    description: "Single or multi-house bookings, with longer-stay terms shaped around your project or case.",
  },
  {
    title: "Commercially straightforward",
    description: "Transparent pricing, GST invoices and a direct contact for extensions or changes.",
  },
  {
    title: "Guest-ready homes",
    description: "Full kitchens, laundries, Wi-Fi, parking and thoughtful preparation before every arrival.",
  },
  {
    title: "Local human support",
    description: "Responsive assistance from a team that knows the homes and the Pakenham area.",
  },
];

export default function HomepageServicesSection() {
  return (
    <section className="homepage-services-section">
      <div className="homepage-services-container">
        <div className="homepage-services-layout">
          <div className="homepage-services-intro">
            <p className="homepage-services-eyebrow">Less admin. Better stays.</p>
            <ScrollWipeText as="h2">A simple, dependable accommodation partner.</ScrollWipeText>
            <p className="homepage-services-intro-copy">
              Designed for travel coordinators, claims teams, HR teams and project managers who need clear answers and reliable delivery.
            </p>
          </div>

          <div className="homepage-services-list" aria-label="Serenity service benefits">
            {SERVICE_POINTS.map((service, index) => (
              <article className="homepage-services-item" key={service.title}>
                <span className="homepage-services-number">{String(index + 1).padStart(2, "0")}</span>
                <div>
                  <h3>{service.title}</h3>
                  <p>{service.description}</p>
                </div>
              </article>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
