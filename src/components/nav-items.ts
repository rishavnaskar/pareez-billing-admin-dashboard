import type { LucideIcon } from "lucide-react";
import {
  LayoutDashboard,
  Users,
  ReceiptText,
  Package,
  UserCog,
  Cake,
  MessageCircle,
  BarChart3,
  FileDown,
  Settings,
} from "lucide-react";

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  group: "Overview" | "Operations" | "Catalog & Team" | "Engagement" | "System";
}

export const NAV_ITEMS: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard, group: "Overview" },
  { href: "/analytics", label: "Analytics", icon: BarChart3, group: "Overview" },
  { href: "/customers", label: "Customers", icon: Users, group: "Operations" },
  { href: "/bills", label: "Bills", icon: ReceiptText, group: "Operations" },
  { href: "/products", label: "Catalog", icon: Package, group: "Catalog & Team" },
  { href: "/employees", label: "Employees", icon: UserCog, group: "Catalog & Team" },
  { href: "/birthdays", label: "Birthdays", icon: Cake, group: "Engagement" },
  { href: "/messaging", label: "Messaging", icon: MessageCircle, group: "Engagement" },
  { href: "/exports", label: "Exports", icon: FileDown, group: "System" },
  { href: "/settings", label: "Settings", icon: Settings, group: "System" },
];
