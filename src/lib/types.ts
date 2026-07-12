// ─────────────────────────────────────────────────────────────────────────────
// Shared types — kept in sync with the pareez-billing app's src/lib/types.ts.
// The admin dashboard reads the SAME Firestore project, so these must match.
// New collections introduced by the dashboard (Product, Employee) are at the end.
// ─────────────────────────────────────────────────────────────────────────────

export interface Branch {
  id: string;
  name: string;
  address: string;
  phone?: string;
  createdAt: Date;
}

export type MembershipTier = "bronze" | "silver" | "gold" | "platinum";
export type PaymentMethod = "cash" | "card" | "upi";
export type DayOfWeek =
  | "sunday"
  | "monday"
  | "tuesday"
  | "wednesday"
  | "thursday"
  | "friday"
  | "saturday";

export interface TierConfig {
  branchId: string;
  thresholds: Record<MembershipTier, number>;
  updatedAt: Date;
}

export interface TierRates {
  cashbackRate: number; // 0.05 = 5%
  maxRedemptionRate: number; // 0.10 = 10%
}

export interface BranchCashbackConfig {
  branchId: string;
  welcomeBonus: number;
  minBillForCashback: number;
  eligiblePaymentMethodsForDiscount: Record<PaymentMethod, boolean>;
  dayConfig: Record<DayOfWeek, Record<MembershipTier, TierRates>>;
  // Master on/off switches (default true when absent). Toggled here in the
  // dashboard; honoured by the billing app's resolveRates().
  cashbackEnabled: boolean;
  redemptionEnabled: boolean;
  updatedAt: Date;
}

export interface CustomerWallet {
  balance: number;
  lifetimeSpend: number;
  lifetimeEarned: number;
  lifetimeRedeemed: number;
  tier: MembershipTier;
  tierUpdatedAt: Date;
  lastActivityAt: Date;
}

export interface WalletTransaction {
  id: string;
  customerId: string;
  type: "credit" | "debit" | "adjustment" | "welcome_bonus" | "tier_downgrade";
  amount: number;
  billId?: string;
  billNumber?: string;
  description: string;
  balanceAfter: number;
  tierAtTransaction: MembershipTier;
  createdAt: Date;
  createdBy?: string;
}

export interface Customer {
  id: string;
  name: string;
  phone?: string;
  dateOfBirth?: string; // YYYY-MM-DD
  wallet: CustomerWallet;
  createdAt: Date;
}

export interface ServiceItem {
  id: string;
  serviceName: string;
  price: number;
  discountAmount: number;
  staffName?: string;
}

export interface Bill {
  id: string;
  billNumber: string;
  customerId: string;
  customerName: string;
  customerPhone?: string;
  branchId: string;
  branchName: string;
  branchAddress: string;
  services: ServiceItem[];
  subtotal: number;
  discountAmount: number;
  totalAmount: number;
  paymentMethod: PaymentMethod;
  cashbackEarned: number;
  walletAmountUsed: number;
  depositAmountUsed?: number; // prepaid deposit applied to this bill (own money)
  netPayableAmount: number;
  customerTierAtPurchase: MembershipTier;
  walletBalanceAfter: number;
  cashbackRateApplied?: number;
  maxRedemptionRateApplied?: number;
  createdAt: Date;
}

export type UserRole = "admin" | "user";

export interface UserProfile {
  uid: string;
  email: string;
  displayName?: string;
  role: UserRole;
  branchId?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// NEW collections owned by the admin dashboard
// ─────────────────────────────────────────────────────────────────────────────

/** products/{productId} — the salon service/product catalog. */
export interface Product {
  id: string;
  name: string;
  category: string; // subcategory, e.g. "Hair Cut", "Facial Treatments"
  section?: "Men's" | "Women's" | "Unisex"; // top-level grouping
  price: number;
  durationMinutes?: number; // for services
  description?: string;
  sku?: string;
  active: boolean;
  branchId?: string; // optional: product limited to a branch ("" / undefined = all)
  createdAt: Date;
  updatedAt: Date;
}

/** employees/{employeeId} — salon staff. Billing app only stores free-text staffName. */
export interface Employee {
  id: string;
  name: string;
  phone?: string;
  email?: string;
  dateOfBirth?: string; // YYYY-MM-DD
  designation?: string; // "Stylist", "Beautician", "Manager"...
  branchId?: string;
  joinedAt?: string; // YYYY-MM-DD
  // Commission rate (percent) applied to all services this employee performs,
  // used to compute their month-wise incentive from matching bill services.
  commissionPercent?: number;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
}

/** A unified "has a birthday" record used by the birthdays view. */
export interface BirthdayPerson {
  id: string;
  kind: "customer" | "employee";
  name: string;
  phone?: string;
  dateOfBirth: string; // YYYY-MM-DD
  meta?: string; // tier for customers, designation for employees
}

// ── Website analytics (written anonymously by pareezsalon.com) ───────────────

export type WebEventType =
  | "pageview"
  | "whatsapp_click"
  | "call_click"
  | "directions_click"
  | "instagram_click"
  | "facebook_click"
  | "booking_started"
  | "booking_submitted";

/** webEvents/{eventId} — one anonymous interaction on the website. */
export interface WebEvent {
  id: string;
  type: WebEventType;
  path: string;
  label: string;
  sessionId: string;
  visitorId: string;
  device: "mobile" | "tablet" | "desktop" | string;
  referrer: string; // external referrer hostname, "" = direct/internal
  utmSource: string;
  utmMedium: string;
  utmCampaign: string;
  ts: Date;
}

export type WebBookingStatus = "new" | "contacted" | "booked" | "closed";

/** webBookings/{bookingId} — appointment request from the website form. */
export interface WebBooking {
  id: string;
  name: string;
  phone: string;
  branchId: string;
  branchName: string;
  service: string;
  date: string; // requested date, YYYY-MM-DD
  time: string; // requested slot, e.g. "5:00 PM"
  notes: string;
  status: WebBookingStatus;
  device: string;
  createdAt: Date;
}
