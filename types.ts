export type Expense = {
  id: string;
  name: string;
  amount: number;
  date: string;
  category: string;
  note: string | null;
  receipt_path: string | null;
  receipt_name: string | null;
};

export type Payment = {
  id?: string;
  amount: number;
  date: string;
  note: string;
  receipt_path: string | null;
  receipt_name: string | null;
};

export type Project = {
  id: string;
  client: string;
  project: string | null;
  service: string;
  total: number;
  payments: Payment[];
};

export const EXPENSE_CATEGORIES = [
  "Software & subscriptions",
  "Domain & hosting",
  "Stock assets",
  "Contractor / freelancer payout",
  "Equipment",
  "Marketing & ads",
  "Bank / payment gateway fees",
  "Other",
];

export const SERVICES = [
  "Web Design & Development",
  "Video Editing & Motion",
  "Graphic & Poster Design",
  "Multiple Services",
  "Consultation",
];

export const PAY_LABELS = ["Advance payment", "Middle payment", "Final payment"];

export function receivedOf(p: Project): number {
  return (p.payments || []).reduce((s, x) => s + (x.amount || 0), 0);
}

export function statusOf(p: Project): { status: "paid" | "partial" | "pending"; label: string } {
  const received = receivedOf(p);
  if (received <= 0) return { status: "pending", label: "Pending" };
  if (received >= p.total) return { status: "paid", label: "Paid" };
  return { status: "partial", label: "Partial" };
}

export function fmt(n: number): string {
  return "₹" + Math.round(n || 0).toLocaleString("en-IN");
}

export function todayStr(): string {
  return new Date().toISOString().split("T")[0];
}
