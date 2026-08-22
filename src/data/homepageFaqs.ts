export type HomepageFaq = {
  question: string;
  answer: string;
};

export const defaultHomepageFaqs: HomepageFaq[] = [
  {
    question: "How do I reserve a house online?",
    answer: "Choose your dates, select a Serenity house, and follow the direct booking steps. Our team will support you if you need a multi-house or longer-stay arrangement.",
  },
  {
    question: "Do guests need to create an account?",
    answer: "No. You can request a stay directly and receive the booking and check-in details by email.",
  },
  {
    question: "Do you display exact street addresses publicly?",
    answer: "For guest privacy and security, the full address and access instructions are shared after your booking is confirmed.",
  },
  {
    question: "How does Stripe payment work?",
    answer: "Payments are handled securely through Stripe. Your booking confirmation will show the amount and payment status in Australian Dollars.",
  },
  {
    question: "Are prices shown in Australian Dollars (AUD)?",
    answer: "Yes. Serenity Stays prices are shown and charged in Australian Dollars.",
  },
  {
    question: "Can a company pay via tax invoice or PO?",
    answer: "Yes. Contact us with your company details and stay requirements so we can confirm the best direct-booking arrangement.",
  },
  {
    question: "Can we book all three houses beside each other?",
    answer: "Yes, when availability allows. Contact us so we can coordinate adjacent houses for your group or project team.",
  },
  {
    question: "What time is check-in and checkout?",
    answer: "Check-in is available from 3:00 PM and checkout is before 11:00 AM, unless another arrangement has been confirmed with our team.",
  },
  {
    question: "How do guests access key safe instructions?",
    answer: "Keyless self-check-in details are sent before arrival once your booking has been confirmed and the required guest information is complete.",
  },
  {
    question: "Are pets and parking included?",
    answer: "Amenities and house rules vary by property. Review the house details and let us know about any pet or parking requirements before booking.",
  },
];
