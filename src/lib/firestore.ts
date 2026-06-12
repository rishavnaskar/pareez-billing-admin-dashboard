import {
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  deleteField,
  setDoc,
  query,
  where,
  orderBy,
  limit as fbLimit,
  Timestamp,
  serverTimestamp,
  type DocumentData,
} from "firebase/firestore";
import { db } from "./firebase";
import type {
  Branch,
  Customer,
  Bill,
  WalletTransaction,
  Product,
  Employee,
  BranchCashbackConfig,
  TierConfig,
} from "./types";

// ── helpers ──────────────────────────────────────────────────────────────────
function toDate(v: unknown): Date {
  if (v instanceof Timestamp) return v.toDate();
  if (v instanceof Date) return v;
  if (typeof v === "string" || typeof v === "number") {
    const d = new Date(v);
    if (!isNaN(d.getTime())) return d;
  }
  return new Date(0);
}

function num(v: unknown, fallback = 0): number {
  return typeof v === "number" && Number.isFinite(v) ? v : fallback;
}

// ── Branches ─────────────────────────────────────────────────────────────────
export async function getBranches(): Promise<Branch[]> {
  const snap = await getDocs(collection(db, "branches"));
  return snap.docs.map((d) => {
    const data = d.data() as DocumentData;
    return {
      id: d.id,
      name: data.name ?? "Unnamed branch",
      address: data.address ?? "",
      phone: data.phone,
      createdAt: toDate(data.createdAt),
    };
  });
}

// ── Customers ────────────────────────────────────────────────────────────────
function mapCustomer(id: string, data: DocumentData): Customer {
  const w = data.wallet ?? {};
  return {
    id,
    name: data.name ?? "Unknown",
    phone: data.phone,
    dateOfBirth: data.dateOfBirth,
    createdAt: toDate(data.createdAt),
    wallet: {
      balance: num(w.balance),
      lifetimeSpend: num(w.lifetimeSpend),
      lifetimeEarned: num(w.lifetimeEarned),
      lifetimeRedeemed: num(w.lifetimeRedeemed),
      tier: w.tier ?? "bronze",
      tierUpdatedAt: toDate(w.tierUpdatedAt),
      lastActivityAt: toDate(w.lastActivityAt),
    },
  };
}

export async function getCustomers(): Promise<Customer[]> {
  const snap = await getDocs(collection(db, "customers"));
  return snap.docs.map((d) => mapCustomer(d.id, d.data()));
}

export async function getCustomer(id: string): Promise<Customer | null> {
  const ref = doc(db, "customers", id);
  const snap = await getDoc(ref);
  return snap.exists() ? mapCustomer(snap.id, snap.data()) : null;
}

// ── Bills ────────────────────────────────────────────────────────────────────
function mapBill(id: string, data: DocumentData): Bill {
  return {
    id,
    billNumber: data.billNumber ?? "",
    customerId: data.customerId ?? "",
    customerName: data.customerName ?? "Walk-in",
    customerPhone: data.customerPhone,
    branchId: data.branchId ?? "",
    branchName: data.branchName ?? "",
    branchAddress: data.branchAddress ?? "",
    services: Array.isArray(data.services) ? data.services : [],
    subtotal: num(data.subtotal),
    discountAmount: num(data.discountAmount),
    totalAmount: num(data.totalAmount),
    paymentMethod: data.paymentMethod ?? "cash",
    cashbackEarned: num(data.cashbackEarned),
    walletAmountUsed: num(data.walletAmountUsed),
    netPayableAmount: num(data.netPayableAmount),
    customerTierAtPurchase: data.customerTierAtPurchase ?? "bronze",
    walletBalanceAfter: num(data.walletBalanceAfter),
    cashbackRateApplied: data.cashbackRateApplied,
    maxRedemptionRateApplied: data.maxRedemptionRateApplied,
    createdAt: toDate(data.createdAt),
  };
}

export async function getAllBills(): Promise<Bill[]> {
  const snap = await getDocs(query(collection(db, "bills"), orderBy("createdAt", "desc")));
  return snap.docs.map((d) => mapBill(d.id, d.data()));
}

export async function getBillsForCustomer(customerId: string): Promise<Bill[]> {
  const snap = await getDocs(
    query(collection(db, "bills"), where("customerId", "==", customerId))
  );
  return snap.docs
    .map((d) => mapBill(d.id, d.data()))
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
}

// ── Wallet transactions ──────────────────────────────────────────────────────
function mapTxn(id: string, data: DocumentData): WalletTransaction {
  return {
    id,
    customerId: data.customerId ?? "",
    type: data.type ?? "credit",
    amount: num(data.amount),
    billId: data.billId,
    billNumber: data.billNumber,
    description: data.description ?? "",
    balanceAfter: num(data.balanceAfter),
    tierAtTransaction: data.tierAtTransaction ?? "bronze",
    createdAt: toDate(data.createdAt),
    createdBy: data.createdBy,
  };
}

export async function getWalletTransactions(customerId: string): Promise<WalletTransaction[]> {
  const snap = await getDocs(
    query(collection(db, "walletTransactions"), where("customerId", "==", customerId))
  );
  return snap.docs
    .map((d) => mapTxn(d.id, d.data()))
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
}

export async function getRecentWalletTransactions(max = 200): Promise<WalletTransaction[]> {
  const snap = await getDocs(
    query(collection(db, "walletTransactions"), orderBy("createdAt", "desc"), fbLimit(max))
  );
  return snap.docs.map((d) => mapTxn(d.id, d.data()));
}

// ── Products (new collection) ────────────────────────────────────────────────
function mapProduct(id: string, data: DocumentData): Product {
  return {
    id,
    name: data.name ?? "",
    category: data.category ?? "Uncategorized",
    section: data.section,
    price: num(data.price),
    durationMinutes: data.durationMinutes,
    description: data.description,
    sku: data.sku,
    active: data.active !== false,
    branchId: data.branchId,
    createdAt: toDate(data.createdAt),
    updatedAt: toDate(data.updatedAt),
  };
}

export async function getProducts(): Promise<Product[]> {
  const snap = await getDocs(collection(db, "products"));
  return snap.docs
    .map((d) => mapProduct(d.id, d.data()))
    .sort((a, b) => a.name.localeCompare(b.name));
}

export async function createProduct(
  data: Omit<Product, "id" | "createdAt" | "updatedAt">
): Promise<string> {
  // Firestore rejects `undefined` values — drop empty optional fields
  const clean = Object.fromEntries(
    Object.entries(data).filter(([, v]) => v !== undefined)
  );
  const ref = await addDoc(collection(db, "products"), {
    ...clean,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return ref.id;
}

export async function updateProduct(
  id: string,
  data: Partial<Omit<Product, "id" | "createdAt">>
): Promise<void> {
  // Firestore rejects `undefined` values — treat them as "clear this field"
  const clean = Object.fromEntries(
    Object.entries(data).map(([k, v]) => [k, v === undefined ? deleteField() : v])
  );
  await updateDoc(doc(db, "products", id), { ...clean, updatedAt: serverTimestamp() });
}

export async function deleteProduct(id: string): Promise<void> {
  await deleteDoc(doc(db, "products", id));
}

// ── Employees (new collection) ───────────────────────────────────────────────
function mapEmployee(id: string, data: DocumentData): Employee {
  return {
    id,
    name: data.name ?? "",
    phone: data.phone,
    email: data.email,
    dateOfBirth: data.dateOfBirth,
    designation: data.designation,
    branchId: data.branchId,
    joinedAt: data.joinedAt,
    active: data.active !== false,
    createdAt: toDate(data.createdAt),
    updatedAt: toDate(data.updatedAt),
  };
}

export async function getEmployees(): Promise<Employee[]> {
  const snap = await getDocs(collection(db, "employees"));
  return snap.docs
    .map((d) => mapEmployee(d.id, d.data()))
    .sort((a, b) => a.name.localeCompare(b.name));
}

export async function createEmployee(
  data: Omit<Employee, "id" | "createdAt" | "updatedAt">
): Promise<string> {
  // Firestore rejects `undefined` values — drop empty optional fields
  const clean = Object.fromEntries(
    Object.entries(data).filter(([, v]) => v !== undefined)
  );
  const ref = await addDoc(collection(db, "employees"), {
    ...clean,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return ref.id;
}

export async function updateEmployee(
  id: string,
  data: Partial<Omit<Employee, "id" | "createdAt">>
): Promise<void> {
  // Firestore rejects `undefined` values — treat them as "clear this field"
  const clean = Object.fromEntries(
    Object.entries(data).map(([k, v]) => [k, v === undefined ? deleteField() : v])
  );
  await updateDoc(doc(db, "employees", id), { ...clean, updatedAt: serverTimestamp() });
}

export async function deleteEmployee(id: string): Promise<void> {
  await deleteDoc(doc(db, "employees", id));
}

// ── Branch config (cashback + tiers) ─────────────────────────────────────────
export async function getBranchCashbackConfig(
  branchId: string
): Promise<BranchCashbackConfig | null> {
  const snap = await getDoc(doc(db, "branches", branchId, "config", "cashbackConfig"));
  if (!snap.exists()) return null;
  const data = snap.data() as DocumentData;
  return {
    branchId,
    welcomeBonus: num(data.welcomeBonus),
    minBillForCashback: num(data.minBillForCashback),
    eligiblePaymentMethodsForDiscount: data.eligiblePaymentMethodsForDiscount ?? {
      cash: true,
      card: true,
      upi: true,
    },
    dayConfig: data.dayConfig ?? {},
    updatedAt: toDate(data.updatedAt),
  };
}

export async function getBranchTierConfig(branchId: string): Promise<TierConfig | null> {
  const snap = await getDoc(doc(db, "branches", branchId, "config", "tierConfig"));
  if (!snap.exists()) return null;
  const data = snap.data() as DocumentData;
  return {
    branchId,
    thresholds: data.thresholds ?? { bronze: 0, silver: 5000, gold: 15000, platinum: 30000 },
    updatedAt: toDate(data.updatedAt),
  };
}

export async function saveBranchTierConfig(
  branchId: string,
  thresholds: TierConfig["thresholds"]
): Promise<void> {
  await setDoc(
    doc(db, "branches", branchId, "config", "tierConfig"),
    { branchId, thresholds, updatedAt: serverTimestamp() },
    { merge: true }
  );
}

export async function saveBranchCashbackBasics(
  branchId: string,
  data: { welcomeBonus: number; minBillForCashback: number }
): Promise<void> {
  await setDoc(
    doc(db, "branches", branchId, "config", "cashbackConfig"),
    { branchId, ...data, updatedAt: serverTimestamp() },
    { merge: true }
  );
}
