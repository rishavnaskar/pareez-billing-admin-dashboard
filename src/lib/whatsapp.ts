// WhatsApp "click to chat" intent links + reusable message templates.
// Matches the billing app's phone handling: 10-digit numbers get the 91 prefix.

import { formatINR } from "./currency";

const SALON_NAME = "Pareez Unisex Professional Salon";

// Public URL of the billing app, which serves the shareable /bill/<id> pages.
// Override via NEXT_PUBLIC_BILLING_URL if the billing app moves domains.
const BILLING_APP_URL = (
  process.env.NEXT_PUBLIC_BILLING_URL || "https://billing.pareezsalon.com"
).replace(/\/$/, "");

/** Public link to a bill, served by the billing app. */
export function billPublicUrl(billId: string): string {
  return `${BILLING_APP_URL}/bill/${billId}`;
}

/**
 * Bill-share message — kept identical to the billing app's
 * generateWhatsAppMessage(): only the bill link, plus header, thanks, socials.
 * When the customer has cashback in their wallet, a redeem nudge is added.
 */
export function generateBillShareMessage(billUrl: string, walletBalance?: number): string {
  const cashbackLine =
    walletBalance && walletBalance > 0
      ? `\nYou have ${formatINR(walletBalance)} cashback in your Pareez wallet — redeem it on your next visit! 💖\n`
      : "";

  return `Bill from Pareez Unisex Professional Salon

View your bill online: ${billUrl}
${cashbackLine}
Thank you for visiting Pareez!

Follow us on social media:
Instagram: @pareezsalon
Facebook: PAREEZ.salon`;
}

export function normalizePhone(phone?: string): string | null {
  if (!phone) return null;
  let clean = phone.replace(/\D/g, "");
  if (clean.length === 10) clean = "91" + clean;
  if (clean.length < 11) return null;
  return clean;
}

/** Build a wa.me intent URL. Opens WhatsApp with the message pre-filled. */
export function buildWhatsAppLink(phone: string | undefined, message: string): string | null {
  const clean = normalizePhone(phone);
  const text = encodeURIComponent(message);
  if (!clean) return `https://wa.me/?text=${text}`; // generic share
  return `https://wa.me/${clean}?text=${text}`;
}

export interface TemplateVars {
  name?: string;
  tier?: string;
  balance?: string;
  billNumber?: string;
  amount?: string;
  branch?: string;
  offer?: string;
  date?: string;
}

export interface MessageTemplate {
  id: string;
  label: string;
  category: "greeting" | "birthday" | "promo" | "loyalty" | "reminder" | "thanks";
  body: (v: TemplateVars) => string;
  /** which variables are meaningfully used, for the UI hints */
  uses: (keyof TemplateVars)[];
}

const sig = `\n\nWarm regards,\n${SALON_NAME}\n📷 @pareezsalon`;

export const MESSAGE_TEMPLATES: MessageTemplate[] = [
  {
    id: "birthday",
    label: "🎂 Birthday Wishes",
    category: "birthday",
    uses: ["name"],
    body: (v) =>
      `Happy Birthday ${v.name || "there"}! 🎉🎂\n\nThe entire team at ${SALON_NAME} wishes you a fabulous year ahead. ` +
      `Visit us this week and enjoy a special birthday treat on the house! 🎁${sig}`,
  },
  {
    id: "birthday-employee",
    label: "🎂 Staff Birthday",
    category: "birthday",
    uses: ["name"],
    body: (v) =>
      `Happy Birthday ${v.name || "team"}! 🎉\n\nThank you for everything you do at ${SALON_NAME}. ` +
      `Wishing you health, happiness and lots of cake today! 🎂`,
  },
  {
    id: "win-back",
    label: "💜 We Miss You",
    category: "reminder",
    uses: ["name", "balance"],
    body: (v) =>
      `Hi ${v.name || "there"}, we've missed you at ${SALON_NAME}! 💜\n\n` +
      `You still have ${v.balance || "cashback"} waiting in your wallet. ` +
      `Book your next visit and treat yourself. See you soon!${sig}`,
  },
  {
    id: "loyalty-balance",
    label: "🪙 Wallet Balance Update",
    category: "loyalty",
    uses: ["name", "balance", "tier"],
    body: (v) =>
      `Hi ${v.name || "there"}! 👋\n\nYour ${SALON_NAME} loyalty wallet balance is ${v.balance || "₹0"} ` +
      `(${v.tier || "member"} tier). Redeem it on your next visit and keep glowing! ✨${sig}`,
  },
  {
    id: "tier-upgrade",
    label: "⭐ Tier Upgrade",
    category: "loyalty",
    uses: ["name", "tier"],
    body: (v) =>
      `Congratulations ${v.name || "there"}! 🌟\n\nYou've been upgraded to ${v.tier || "a new"} tier at ${SALON_NAME}. ` +
      `Enjoy higher cashback and bigger redemptions on every visit. Thank you for your loyalty! 💖${sig}`,
  },
  {
    id: "promo",
    label: "🔥 Promotion / Offer",
    category: "promo",
    uses: ["name", "offer"],
    body: (v) =>
      `Hi ${v.name || "there"}! 🔥\n\n${v.offer || "Special offer this week at " + SALON_NAME + "!"} ` +
      `Don't miss out — book your slot today.${sig}`,
  },
  {
    id: "thanks",
    label: "🙏 Thank You / Post-Visit",
    category: "thanks",
    uses: ["name", "billNumber", "amount"],
    body: (v) =>
      `Thank you for visiting ${SALON_NAME}, ${v.name || "there"}! 🙏\n\n` +
      `Bill ${v.billNumber || ""} — ${v.amount || ""}. We hope you loved your experience. ` +
      `We'd be grateful for a Google review! ⭐${sig}`,
  },
  {
    id: "appointment-reminder",
    label: "📅 Appointment Reminder",
    category: "reminder",
    uses: ["name", "date"],
    body: (v) =>
      `Hi ${v.name || "there"}! 📅\n\nThis is a friendly reminder of your appointment at ${SALON_NAME}` +
      `${v.date ? ` on ${v.date}` : ""}. Reply here to reschedule. See you soon!${sig}`,
  },
  {
    id: "festive",
    label: "🪔 Festive Greeting",
    category: "greeting",
    uses: ["name", "offer"],
    body: (v) =>
      `Dear ${v.name || "valued guest"}, 🪔\n\nWarm festive wishes from all of us at ${SALON_NAME}! ` +
      `${v.offer || "Celebrate the season with a fresh new look."}${sig}`,
  },
];

export function getTemplate(id: string): MessageTemplate | undefined {
  return MESSAGE_TEMPLATES.find((t) => t.id === id);
}
