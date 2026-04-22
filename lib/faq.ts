export interface FAQItem {
  question: string;
  answer: string;
  category: string;
  slug: string;
}

export const faqData: FAQItem[] = [
  {
    question: "Does Crack Origins sell crack games?",
    answer: "Crack Origins does not sell crack games. Only games officially produced by Crack Origins are available for direct download.",
    category: "General FAQs",
    slug: "does-crack-origins-sell-crack-games"
  },
  {
    question: "Does Crack Origins sell Steam games?",
    answer: "Crack Origins does not sell Steam games directly. Steam keys may be provided through discounts, giveaways, or promotional offers.",
    category: "Pricing & Delivery",
    slug: "does-crack-origins-sell-steam-games"
  },
  {
    question: "Why does Steam key delivery take time?",
    answer: "Steam games are hosted on third-party platforms. After payment, a verification process is required before delivering the game key.",
    category: "Pricing & Delivery",
    slug: "why-does-steam-key-delivery-take-time"
  },
  {
    question: "Are payments secure on Crack Origins?",
    answer: "Payments are processed securely through PayPal. Crack Origins does not store bank details, IP addresses, or private user information.",
    category: "Pricing & Delivery",
    slug: "are-payments-secure-on-crack-origins"
  },
  {
    question: "Are Crack Origins games safe to download?",
    answer: "Games officially developed and published by Crack Origins are tested and released without viruses or security threats.",
    category: "General FAQs",
    slug: "are-crack-origins-games-safe-to-download"
  },
  {
    question: "Can developers publish games on Crack Origins?",
    answer: "External game publishing is currently unavailable but planned for future updates.",
    category: "General FAQs",
    slug: "can-developers-publish-games-on-crack-origins"
  },
  {
    question: "What is Live Cursors?",
    answer: "Live Cursors is a feature that allows users to connect with another player's cursor worldwide and start chatting using the slash key.",
    category: "Features",
    slug: "what-is-live-cursors"
  },
  {
    question: "Is Live Cursors safe?",
    answer: "Only cursor position data is shared. Sensitive information such as passwords, bank details, or typed content is never shared.",
    category: "Features",
    slug: "is-live-cursors-safe"
  },
  {
    question: "Does Live Cursors work on mobile devices?",
    answer: "Live Cursors currently works only on desktop devices.",
    category: "Features",
    slug: "does-live-cursors-work-on-mobile-devices"
  },
  {
    question: "How can I contact support?",
    answer: "Users can directly contact the Crack Origins support team at any time through the website contact section.",
    category: "General FAQs",
    slug: "how-can-i-contact-support"
  }
];
