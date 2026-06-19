"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Expense,
  Project,
  Payment,
  EXPENSE_CATEGORIES,
  SERVICES,
  PAY_LABELS,
  receivedOf,
  statusOf,
  fmt,
  todayStr,
} from "./types";

type Page = "overview" | "expenses" | "income";

export default function Dashboard() {
  const router = useRouter();

  const [page, setPage] = useState<Page>("overview");
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToastMsg] = useState<string | null>(null);
  const [lightbox, setLightbox] = useState<{ url: string; isImage: boolean; name: string } | null>(null);

  const [expenseModal, setExpenseModal] = useState<Expense | null | "new">(null);
  const [incomeModal, setIncomeModal] = useState<Project | null | "new">(null);

  function showToast(msg: string) {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 2200);
  }

  async function loadAll() {
    setLoading(true);
    const [expRes, incRes] = await Promise.all([fetch("/api/expenses"), fetch("/api/income")]);
    const expData = await expRes.json();
    const incData = await incRes.json();
    setExpenses(expData.expenses || []);
    setProjects(incData.projects || []);
    setLoading(false);
  }

  useEffect(() => {
    loadAll();
  }, []);

  async function handleSignOut() {
    // Calls the server route so the OTP-verified cookie (httpOnly) is
    // cleared too, not just the Supabase session — otherwise the next
    // sign-in for this same browser could skip the OTP step.
    await fetch("/api/auth/signout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  async function viewReceipt(path: string, name: string) {
    const res = await fetch(`/api/receipt-url?path=${encodeURIComponent(path)}`);
    const data = await res.json();
    if (data.url) {
      const isImage = !name.toLowerCase().endsWith(".pdf");
      setLightbox({ url: data.url, isImage, name });
    } else {
      showToast("Could not load receipt");
    }
  }

  async function deleteExpense(id: string) {
    await fetch(`/api/expenses/${id}`, { method: "DELETE" });
    showToast("Expense removed");
    loadAll();
  }

  async function deleteProject(id: string) {
    await fetch(`/api/income/${id}`, { method: "DELETE" });
    showToast("Project removed");
    loadAll();
  }

  // ---------- overview math ----------
  const totalIncome = projects.reduce((s, p) => s + receivedOf(p), 0);
  const totalPending = projects.reduce((s, p) => s + Math.max(0, p.total - receivedOf(p)), 0);
  const totalExpense = expenses.reduce((s, e) => s + e.amount, 0);
  const profit = totalIncome - totalExpense;
  const margin = totalIncome > 0 ? Math.round((profit / totalIncome) * 100) : 0;

  return (
    <div className="min-h-screen">
      {/* TOP BAR */}
      <div className="flex items-center justify-between gap-3 px-5 py-4 border-b border-line bg-bgsoft sticky top-0 z-20 flex-wrap">
        <div className="flex items-center gap-2.5">
          <div className="w-[30px] h-[30px] rounded-lg bg-gradient-to-br from-income to-[#8284F5] flex items-center justify-center font-display font-bold text-sm text-white">
            ST
          </div>
          <div className="leading-tight">
            <div className="font-display text-[15px]">SendivTech</div>
            <div className="text-[11px] text-inkfaint tracking-wide">FINANCE LEDGER</div>
          </div>
        </div>

        <div className="flex gap-1.5 bg-bgcard border border-line rounded-[10px] p-1">
          {(["overview", "expenses", "income"] as Page[]).map((p) => (
            <button
              key={p}
              onClick={() => setPage(p)}
              className={`text-[13px] font-semibold px-3.5 py-2 rounded-lg transition-colors whitespace-nowrap ${
                page === p ? "bg-income text-white" : "text-inkdim hover:bg-line hover:text-ink"
              }`}
            >
              {p === "overview" ? "Overview" : p === "expenses" ? "Company Expenses" : "Client Income"}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2.5">
          <div className="font-mono text-[13px] bg-bgcard border border-line px-3 py-1.5 rounded-[10px] text-inkdim">
            Net{" "}
            <b className={profit >= 0 ? "text-good" : "text-expense"}>
              {profit < 0 ? "-" : ""}
              {fmt(Math.abs(profit))}
            </b>
          </div>
          <button
            onClick={handleSignOut}
            className="text-[12px] text-inkfaint hover:text-ink border border-line rounded-[10px] px-3 py-1.5"
          >
            Sign out
          </button>
        </div>
      </div>

      <div className="max-w-[1180px] mx-auto p-5">
        {loading ? (
          <div className="text-center text-inkfaint py-20 text-sm">Loading your ledger…</div>
        ) : page === "overview" ? (
          <OverviewPage
            expenses={expenses}
            projects={projects}
            totalIncome={totalIncome}
            totalExpense={totalExpense}
            totalPending={totalPending}
            profit={profit}
            margin={margin}
          />
        ) : page === "expenses" ? (
          <ExpensesPage
            expenses={expenses}
            onAdd={() => setExpenseModal("new")}
            onEdit={(e) => setExpenseModal(e)}
            onDelete={deleteExpense}
            onViewReceipt={viewReceipt}
            onImported={loadAll}
            showToast={showToast}
          />
        ) : (
          <IncomePage
            projects={projects}
            onAdd={() => setIncomeModal("new")}
            onEdit={(p) => setIncomeModal(p)}
            onDelete={deleteProject}
            onViewReceipt={viewReceipt}
            onImported={loadAll}
            showToast={showToast}
          />
        )}
      </div>

      {expenseModal && (
        <ExpenseModal
          existing={expenseModal === "new" ? null : expenseModal}
          onClose={() => setExpenseModal(null)}
          onSaved={() => {
            setExpenseModal(null);
            loadAll();
          }}
          showToast={showToast}
        />
      )}

      {incomeModal && (
        <IncomeModal
          existing={incomeModal === "new" ? null : incomeModal}
          onClose={() => setIncomeModal(null)}
          onSaved={() => {
            setIncomeModal(null);
            loadAll();
          }}
          showToast={showToast}
        />
      )}

      {lightbox && (
        <div
          className="fixed inset-0 bg-black/85 flex items-center justify-center z-[300] p-7"
          onClick={() => setLightbox(null)}
        >
          <button
            className="absolute top-4 right-5 bg-bgcard border border-line text-ink w-9 h-9 rounded-lg"
            onClick={() => setLightbox(null)}
          >
            ✕
          </button>
          {lightbox.isImage ? (
            <img
              src={lightbox.url}
              className="max-w-[90vw] max-h-[85vh] rounded-lg"
              onClick={(e) => e.stopPropagation()}
            />
          ) : (
            <div
              className="bg-bgcard rounded-xl2 p-7 text-center text-inkdim"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="text-3xl mb-2.5">📄</div>
              <div className="mb-3">{lightbox.name}</div>
              <a href={lightbox.url} target="_blank" rel="noreferrer" className="text-income font-semibold">
                Open PDF
              </a>
            </div>
          )}
        </div>
      )}

      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-bgcard border border-line text-ink px-4.5 py-2.5 rounded-[10px] text-[13px] z-[200] shadow-lg flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-good" />
          {toast}
        </div>
      )}
    </div>
  );
}

// =====================================================================
// OVERVIEW
// =====================================================================
function OverviewPage({
  expenses,
  projects,
  totalIncome,
  totalExpense,
  totalPending,
  profit,
  margin,
}: {
  expenses: Expense[];
  projects: Project[];
  totalIncome: number;
  totalExpense: number;
  totalPending: number;
  profit: number;
  margin: number;
}) {
  function exportCsv() {
    let csv = "TYPE,DATE,NAME_OR_CLIENT,PROJECT,CATEGORY_OR_SERVICE,AMOUNT_OR_TOTAL,RECEIVED,STATUS,NOTE\n";
    expenses.forEach((x) => {
      csv += `Expense,${x.date},"${x.name}",,"${x.category}",${x.amount},,,"${(x.note || "").replace(/"/g, "'")}"\n`;
    });
    projects.forEach((x) => {
      const r = receivedOf(x);
      const st = statusOf(x).label;
      csv += `Income,,"${x.client}","${x.project || ""}","${x.service}",${x.total},${r},${st},\n`;
    });
    const blob = new Blob([csv], { type: "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "sendivtech-finance-export.csv";
    a.click();
  }

  return (
    <div>
      <div className="flex justify-between items-end mb-4.5 flex-wrap gap-3">
        <div>
          <h1 className="font-display text-[22px] mb-1">Business overview</h1>
          <p className="text-[13px] text-inkdim max-w-[480px]">
            Everything coming in from clients, everything going out on running the studio, and what
            that leaves you with.
          </p>
        </div>
        <button
          onClick={exportCsv}
          className="text-[12px] border border-line text-inkdim hover:text-ink hover:border-inkfaint rounded-lg px-3 py-1.5 font-semibold"
        >
          Export all (.csv)
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
        <StatCard label="Total received" value={fmt(totalIncome)} valueClass="text-income" sub={`${projects.length} project${projects.length === 1 ? "" : "s"}`} />
        <StatCard label="Total spent" value={fmt(totalExpense)} valueClass="text-expense" sub={`${expenses.length} transaction${expenses.length === 1 ? "" : "s"}`} />
        <StatCard
          label="Net profit"
          value={(profit < 0 ? "-" : "") + fmt(Math.abs(profit))}
          valueClass={profit >= 0 ? "text-good" : "text-expense"}
          sub={totalIncome > 0 ? `${margin}% margin` : "no income yet"}
        />
        <StatCard
          label="Pending from clients"
          value={fmt(totalPending)}
          valueClass="text-warn"
          sub={`${projects.filter((p) => p.total > receivedOf(p)).length} project(s) awaiting`}
        />
      </div>

      <div className="grid md:grid-cols-[1.3fr_1fr] gap-3.5 mb-5">
        <ChartCard title="Income vs expenses, by month" subtitle="The shape of your cash flow over time">
          <MonthlyChart expenses={expenses} projects={projects} />
        </ChartCard>
        <ChartCard title="Where the money goes" subtitle="Expense breakdown by category">
          <ExpenseDonut expenses={expenses} />
        </ChartCard>
      </div>

      <div className="grid md:grid-cols-[1.3fr_1fr] gap-3.5 mb-5">
        <ChartCard title="Revenue by service" subtitle="Which work actually earns">
          <ServiceBars projects={projects} />
        </ChartCard>
        <ChartCard title="Top clients" subtitle="By total paid to date">
          <TopClients projects={projects} />
        </ChartCard>
      </div>
    </div>
  );
}

function StatCard({ label, value, valueClass, sub }: { label: string; value: string; valueClass: string; sub: string }) {
  return (
    <div className="bg-bgcard border border-line rounded-xl2 p-4">
      <div className="text-[11px] text-inkfaint uppercase tracking-wide mb-2">{label}</div>
      <div className={`font-display text-2xl font-semibold ${valueClass}`}>{value}</div>
      <div className="text-[11px] text-inkfaint mt-1.5">{sub}</div>
    </div>
  );
}

function ChartCard({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) {
  return (
    <div className="bg-bgcard border border-line rounded-xl2 p-4.5">
      <h3 className="font-display text-sm font-semibold mb-3.5">
        {title}
        <span className="block text-inkfaint font-normal text-xs font-body mt-0.5">{subtitle}</span>
      </h3>
      {children}
    </div>
  );
}

function EmptyState({ glyph, title, sub }: { glyph: string; title: string; sub: string }) {
  return (
    <div className="py-12 px-5 text-center text-inkfaint">
      <div className="text-2xl mb-2.5 opacity-50">{glyph}</div>
      <b className="block text-inkdim text-sm mb-1">{title}</b>
      <span className="text-xs">{sub}</span>
    </div>
  );
}

function monthKey(d: string) {
  const dt = new Date(d);
  return dt.getFullYear() + "-" + String(dt.getMonth() + 1).padStart(2, "0");
}
function monthLabel(key: string) {
  const [y, m] = key.split("-");
  return new Date(Number(y), Number(m) - 1, 1).toLocaleDateString("en-IN", { month: "short", year: "2-digit" });
}

function MonthlyChart({ expenses, projects }: { expenses: Expense[]; projects: Project[] }) {
  const map: Record<string, { inc: number; exp: number }> = {};
  projects.forEach((p) => {
    (p.payments || []).forEach((pay) => {
      const k = monthKey(pay.date);
      map[k] = map[k] || { inc: 0, exp: 0 };
      map[k].inc += pay.amount;
    });
  });
  expenses.forEach((e) => {
    const k = monthKey(e.date);
    map[k] = map[k] || { inc: 0, exp: 0 };
    map[k].exp += e.amount;
  });
  const keys = Object.keys(map).sort().slice(-6);
  if (keys.length === 0) return <EmptyState glyph="▱" title="Nothing to chart yet" sub="Add an expense or a project to see this fill in." />;

  const maxVal = Math.max(...keys.map((k) => Math.max(map[k].inc, map[k].exp)), 1);
  const w = 560, h = 200, padL = 10, padB = 26, padT = 10;
  const groupW = (w - padL * 2) / keys.length;
  const barW = Math.min(26, groupW * 0.32);

  return (
    <div>
      <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-auto">
        <line x1={padL} y1={h - padB} x2={w - padL} y2={h - padB} stroke="#272C36" strokeWidth={1} />
        {keys.map((k, i) => {
          const cx = padL + groupW * i + groupW / 2;
          const incH = (map[k].inc / maxVal) * (h - padB - padT);
          const expH = (map[k].exp / maxVal) * (h - padB - padT);
          return (
            <g key={k}>
              <rect x={cx - barW - 2} y={h - padB - incH} width={barW} height={incH} rx={3} fill="#6366F1" />
              <rect x={cx + 2} y={h - padB - expH} width={barW} height={expH} rx={3} fill="#F2545B" />
              <text x={cx} y={h - 8} textAnchor="middle" fontSize={10.5} fill="#5C6270" fontFamily="IBM Plex Mono, monospace">
                {monthLabel(k)}
              </text>
            </g>
          );
        })}
      </svg>
      <div className="flex gap-3.5 flex-wrap mt-3">
        <LegendItem color="#6366F1" label="Income received" />
        <LegendItem color="#F2545B" label="Expenses" />
      </div>
    </div>
  );
}

function LegendItem({ color, label }: { color: string; label: string }) {
  return (
    <div className="flex items-center gap-1.5 text-xs text-inkdim">
      <span className="w-2.5 h-2.5 rounded-[3px]" style={{ background: color }} />
      {label}
    </div>
  );
}

const PALETTE = ["#6366F1", "#F2545B", "#FBBF24", "#34D399", "#A78BFA", "#38BDF8", "#FB923C", "#94A3B8"];

function ExpenseDonut({ expenses }: { expenses: Expense[] }) {
  if (expenses.length === 0) return <EmptyState glyph="◐" title="No expenses yet" sub="Categories will show up here once you log some." />;

  const byCat: Record<string, number> = {};
  expenses.forEach((x) => { byCat[x.category] = (byCat[x.category] || 0) + x.amount; });
  const entries = Object.entries(byCat).sort((a, b) => b[1] - a[1]);
  const total = entries.reduce((s, [, v]) => s + v, 0);

  const r = 64, cx = 80, cy = 80;
  let angle = -90;
  const segs = entries.map(([cat, val], i) => {
    const sweep = (val / total) * 360;
    const large = sweep > 180 ? 1 : 0;
    const x1 = cx + r * Math.cos((angle * Math.PI) / 180);
    const y1 = cy + r * Math.sin((angle * Math.PI) / 180);
    const end = angle + sweep;
    const x2 = cx + r * Math.cos((end * Math.PI) / 180);
    const y2 = cy + r * Math.sin((end * Math.PI) / 180);
    const d = `M${cx},${cy} L${x1.toFixed(2)},${y1.toFixed(2)} A${r},${r} 0 ${large} 1 ${x2.toFixed(2)},${y2.toFixed(2)} Z`;
    angle = end;
    return <path key={cat} d={d} fill={PALETTE[i % PALETTE.length]} opacity={0.92} />;
  });

  return (
    <div className="flex gap-4.5 items-center flex-wrap">
      <svg viewBox="0 0 160 160" className="w-[140px] h-[140px] flex-shrink-0">
        {segs}
        <circle cx={80} cy={80} r={38} fill="#1A1E26" />
      </svg>
      <div className="flex-1 min-w-[160px]">
        {entries.map(([cat, val], i) => (
          <LegendItem key={cat} color={PALETTE[i % PALETTE.length]} label={`${cat} — ${fmt(val)}`} />
        ))}
      </div>
    </div>
  );
}

function BarRow({ label, value, max, color }: { label: string; value: number; max: number; color: string }) {
  return (
    <div className="flex items-center gap-2.5 mb-2.5">
      <div className="w-[90px] text-xs text-inkdim flex-shrink-0 truncate" title={label}>{label}</div>
      <div className="flex-1 h-[18px] bg-bgsoft rounded-md overflow-hidden flex">
        <div className="h-full rounded-md transition-all" style={{ width: `${(value / max) * 100}%`, background: color }} />
      </div>
      <div className="w-20 text-right font-mono text-xs text-inkdim flex-shrink-0">{fmt(value)}</div>
    </div>
  );
}

function ServiceBars({ projects }: { projects: Project[] }) {
  if (projects.length === 0) return <EmptyState glyph="▭" title="No revenue yet" sub="Add a client project to see this breakdown." />;
  const byService: Record<string, number> = {};
  projects.forEach((p) => { byService[p.service] = (byService[p.service] || 0) + receivedOf(p); });
  const entries = Object.entries(byService).sort((a, b) => b[1] - a[1]);
  const max = Math.max(...entries.map(([, v]) => v), 1);
  const palette = ["#6366F1", "#8284F5", "#A78BFA", "#38BDF8", "#34D399"];
  return (
    <div>
      {entries.map(([svc, val], i) => (
        <BarRow key={svc} label={svc} value={val} max={max} color={palette[i % palette.length]} />
      ))}
    </div>
  );
}

function TopClients({ projects }: { projects: Project[] }) {
  if (projects.length === 0) return <EmptyState glyph="◇" title="No clients yet" sub="They'll be ranked here once payments come in." />;
  const byClient: Record<string, number> = {};
  projects.forEach((p) => { byClient[p.client] = (byClient[p.client] || 0) + receivedOf(p); });
  const entries = Object.entries(byClient).sort((a, b) => b[1] - a[1]).slice(0, 6);
  const max = Math.max(...entries.map(([, v]) => v), 1);
  return (
    <div>
      {entries.map(([client, val]) => (
        <BarRow key={client} label={client} value={val} max={max} color="#34D399" />
      ))}
    </div>
  );
}

// =====================================================================
// EXPENSES PAGE
// =====================================================================
function ExpensesPage({
  expenses,
  onAdd,
  onEdit,
  onDelete,
  onViewReceipt,
  onImported,
  showToast,
}: {
  expenses: Expense[];
  onAdd: () => void;
  onEdit: (e: Expense) => void;
  onDelete: (id: string) => void;
  onViewReceipt: (path: string, name: string) => void;
  onImported: () => void;
  showToast: (m: string) => void;
}) {
  async function handleCsv(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const text = await file.text();
    const rows = parseCSV(text);
    if (rows.length < 2) { showToast("CSV looks empty"); return; }
    const header = rows[0].map((h) => h.trim().toLowerCase());
    const iName = header.indexOf("name") >= 0 ? header.indexOf("name") : header.indexOf("expense");
    const iAmt = header.indexOf("amount");
    const iDate = header.indexOf("date");
    const iCat = header.indexOf("category");
    const iNote = header.indexOf("note");
    let count = 0;
    for (let r = 1; r < rows.length; r++) {
      const row = rows[r];
      if (row.length < 2) continue;
      const amt = parseFloat(row[iAmt >= 0 ? iAmt : 1]);
      if (!amt) continue;
      await fetch("/api/expenses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: row[iName >= 0 ? iName : 0] || "Imported expense",
          amount: amt,
          date: iDate >= 0 && row[iDate] ? row[iDate] : todayStr(),
          category: iCat >= 0 && row[iCat] ? row[iCat] : "Other",
          note: iNote >= 0 && row[iNote] ? row[iNote] : "",
        }),
      });
      count++;
    }
    showToast(`${count} row${count === 1 ? "" : "s"} imported`);
    onImported();
    e.target.value = "";
  }

  return (
    <div>
      <div className="flex justify-between items-end mb-4.5 flex-wrap gap-3">
        <div>
          <h1 className="font-display text-[22px] mb-1">Company expenses</h1>
          <p className="text-[13px] text-inkdim max-w-[480px]">
            What it costs to run SendivTech itself — subscriptions, tools, and anything you buy to
            deliver client work.
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <label className="text-[12px] border border-line text-inkdim hover:text-ink hover:border-inkfaint rounded-lg px-3 py-1.5 font-semibold cursor-pointer">
            Import CSV
            <input type="file" accept=".csv" className="hidden" onChange={handleCsv} />
          </label>
          <button onClick={onAdd} className="text-[13px] bg-expense text-white rounded-lg px-4 py-2.5 font-semibold">
            + Add expense
          </button>
        </div>
      </div>

      <div className="bg-[#6366F11A] border border-[#6366F133] rounded-xl2 px-4 py-3.5 text-[12.5px] text-inkdim mb-4.5 leading-relaxed">
        <b className="text-ink">New to tracking this?</b> Common categories for a studio like yours:
        Software & subscriptions (Adobe, Figma, hosting), Domain & hosting, Stock assets,
        Contractor/freelancer payouts, Equipment, Marketing & ads, Bank/payment gateway fees, Other.
      </div>

      <div className="bg-bgcard border border-line rounded-xl2 overflow-hidden">
        <div className="grid grid-cols-[90px_1fr_130px_130px_90px_76px] px-4 py-3 text-[11px] uppercase tracking-wide text-inkfaint border-b border-line gap-2">
          <div>Date</div><div>Expense</div><div></div><div className="text-right">Amount</div><div></div><div className="text-right">Actions</div>
        </div>
        {expenses.length === 0 ? (
          <EmptyState glyph="○" title="No expenses logged yet" sub="Add your first subscription, tool, or purchase above." />
        ) : (
          expenses.map((x) => (
            <div key={x.id} className="grid grid-cols-[90px_1fr_130px_130px_90px_76px] px-4 py-3.5 text-[13px] items-center gap-2 border-b border-line last:border-b-0 hover:bg-bgsoft relative">
              <div className="absolute left-0 top-0 bottom-0 w-[3px] bg-expense" />
              <div className="text-inkfaint font-mono text-xs">{x.date}</div>
              <div>
                <b className="block">{x.name}</b>
                {x.note && <span className="block text-[11.5px] text-inkfaint mt-0.5">{x.note}</span>}
                {x.receipt_path && (
                  <button
                    onClick={() => onViewReceipt(x.receipt_path!, x.receipt_name || "receipt")}
                    className="inline-flex items-center gap-1 text-[10.5px] px-2 py-0.5 rounded-md bg-[#6366F11A] text-income border border-[#6366F133] mt-1"
                  >
                    🖼 {(x.receipt_name || "receipt").slice(0, 14)}
                  </button>
                )}
              </div>
              <div><span className="inline-block text-[10.5px] px-2 py-0.5 rounded-md bg-bgsoft text-inkdim border border-line">{x.category}</span></div>
              <div className="font-mono font-semibold text-right text-expense">-{fmt(x.amount)}</div>
              <div></div>
              <div className="flex gap-0.5 justify-end">
                <button onClick={() => onEdit(x)} className="text-inkfaint hover:text-income hover:bg-[#6366F11A] rounded-md p-1.5">✎</button>
                <button onClick={() => onDelete(x.id)} className="text-inkfaint hover:text-expense hover:bg-[#F2545B1A] rounded-md p-1.5">✕</button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

// =====================================================================
// INCOME PAGE
// =====================================================================
function IncomePage({
  projects,
  onAdd,
  onEdit,
  onDelete,
  onViewReceipt,
  onImported,
  showToast,
}: {
  projects: Project[];
  onAdd: () => void;
  onEdit: (p: Project) => void;
  onDelete: (id: string) => void;
  onViewReceipt: (path: string, name: string) => void;
  onImported: () => void;
  showToast: (m: string) => void;
}) {
  async function handleCsv(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const text = await file.text();
    const rows = parseCSV(text);
    if (rows.length < 2) { showToast("CSV looks empty"); return; }
    const header = rows[0].map((h) => h.trim().toLowerCase());
    const iClient = header.indexOf("client");
    const iProject = header.indexOf("project");
    const iService = header.indexOf("service");
    const iTotal = header.indexOf("total");
    const iReceived = header.indexOf("received");
    const iDate = header.indexOf("date");
    let count = 0;
    for (let r = 1; r < rows.length; r++) {
      const row = rows[r];
      if (row.length < 2) continue;
      const total = parseFloat(row[iTotal >= 0 ? iTotal : 2]);
      if (!total) continue;
      const received = iReceived >= 0 && row[iReceived] ? parseFloat(row[iReceived]) || 0 : 0;
      const d = iDate >= 0 && row[iDate] ? row[iDate] : todayStr();
      await fetch("/api/income", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          client: row[iClient >= 0 ? iClient : 0] || "Imported client",
          project: iProject >= 0 && row[iProject] ? row[iProject] : "",
          service: iService >= 0 && row[iService] ? row[iService] : "Multiple Services",
          total,
          payments: received > 0 ? [{ amount: received, date: d, note: "Imported" }] : [],
        }),
      });
      count++;
    }
    showToast(`${count} row${count === 1 ? "" : "s"} imported`);
    onImported();
    e.target.value = "";
  }

  return (
    <div>
      <div className="flex justify-between items-end mb-4.5 flex-wrap gap-3">
        <div>
          <h1 className="font-display text-[22px] mb-1">Client income</h1>
          <p className="text-[13px] text-inkdim max-w-[480px]">
            Every project, each payment as it comes in (advance, middle, final), and what's still pending.
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <label className="text-[12px] border border-line text-inkdim hover:text-ink hover:border-inkfaint rounded-lg px-3 py-1.5 font-semibold cursor-pointer">
            Import CSV
            <input type="file" accept=".csv" className="hidden" onChange={handleCsv} />
          </label>
          <button onClick={onAdd} className="text-[13px] bg-income text-white rounded-lg px-4 py-2.5 font-semibold">
            + Add project
          </button>
        </div>
      </div>

      <div className="bg-bgcard border border-line rounded-xl2 overflow-hidden">
        <div className="grid grid-cols-[90px_1fr_130px_130px_90px_76px] px-4 py-3 text-[11px] uppercase tracking-wide text-inkfaint border-b border-line gap-2">
          <div>Date</div><div>Project / client</div><div></div><div className="text-right">Received</div><div>Status</div><div className="text-right">Actions</div>
        </div>
        {projects.length === 0 ? (
          <EmptyState glyph="○" title="No client projects yet" sub="Add a project to start tracking what's paid and what's pending." />
        ) : (
          projects.map((p) => {
            const received = receivedOf(p);
            const { status, label } = statusOf(p);
            const lastDate = p.payments?.length ? p.payments[p.payments.length - 1].date : "—";
            const statusColor =
              status === "paid" ? "bg-[#34D39922] text-good" : status === "partial" ? "bg-[#6366F122] text-income" : "bg-[#FBBF2422] text-warn";
            return (
              <div key={p.id} className="grid grid-cols-[90px_1fr_130px_130px_90px_76px] px-4 py-3.5 text-[13px] items-start gap-2 border-b border-line last:border-b-0 hover:bg-bgsoft relative">
                <div className="absolute left-0 top-0 bottom-0 w-[3px] bg-income" />
                <div className="text-inkfaint font-mono text-xs">{lastDate}</div>
                <div>
                  <b className="block">{p.client}</b>
                  <span className="block text-[11.5px] text-inkfaint mt-0.5">
                    {p.project || "—"} · {fmt(received)} of {fmt(p.total)}
                  </span>
                  {p.payments?.length > 0 && (
                    <div className="flex flex-wrap gap-x-3 gap-y-1 mt-1.5 text-[11px] text-inkfaint">
                      {p.payments.map((pay, i) => (
                        <span key={i}>
                          {PAY_LABELS[i] || `Payment ${i + 1}`}: {fmt(pay.amount)} on {pay.date}
                          {pay.receipt_path && (
                            <button
                              onClick={() => onViewReceipt(pay.receipt_path!, pay.receipt_name || "receipt")}
                              className="inline-flex items-center gap-1 text-[10.5px] px-1.5 py-0.5 rounded-md bg-[#6366F11A] text-income border border-[#6366F133] ml-1"
                            >
                              🖼
                            </button>
                          )}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                <div><span className="inline-block text-[10.5px] px-2 py-0.5 rounded-md bg-bgsoft text-inkdim border border-line">{p.service}</span></div>
                <div className="font-mono font-semibold text-right text-good">+{fmt(received)}</div>
                <div><span className={`text-[10.5px] px-2.5 py-0.5 rounded-full font-semibold inline-block ${statusColor}`}>{label}</span></div>
                <div className="flex gap-0.5 justify-end">
                  <button onClick={() => onEdit(p)} className="text-inkfaint hover:text-income hover:bg-[#6366F11A] rounded-md p-1.5">✎</button>
                  <button onClick={() => onDelete(p.id)} className="text-inkfaint hover:text-expense hover:bg-[#F2545B1A] rounded-md p-1.5">✕</button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

function parseCSV(text: string): string[][] {
  return text
    .trim()
    .split(/\r?\n/)
    .map((line) => {
      const out: string[] = [];
      let cur = "";
      let inQ = false;
      for (let i = 0; i < line.length; i++) {
        const c = line[i];
        if (c === '"') { inQ = !inQ; continue; }
        if (c === "," && !inQ) { out.push(cur); cur = ""; continue; }
        cur += c;
      }
      out.push(cur);
      return out.map((s) => s.trim());
    });
}

// =====================================================================
// EXPENSE MODAL
// =====================================================================
function ExpenseModal({
  existing,
  onClose,
  onSaved,
  showToast,
}: {
  existing: Expense | null;
  onClose: () => void;
  onSaved: () => void;
  showToast: (m: string) => void;
}) {
  const [name, setName] = useState(existing?.name || "");
  const [amount, setAmount] = useState(existing?.amount?.toString() || "");
  const [date, setDate] = useState(existing?.date || todayStr());
  const [category, setCategory] = useState(existing?.category || EXPENSE_CATEGORIES[0]);
  const [note, setNote] = useState(existing?.note || "");
  const [receiptPath, setReceiptPath] = useState<string | null>(existing?.receipt_path || null);
  const [receiptName, setReceiptName] = useState<string | null>(existing?.receipt_name || null);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 4 * 1024 * 1024) { showToast("Keep receipts under 4MB"); return; }
    setUploading(true);
    const fd = new FormData();
    fd.append("file", file);
    const res = await fetch("/api/upload", { method: "POST", body: fd });
    const data = await res.json();
    setUploading(false);
    if (data.path) {
      setReceiptPath(data.path);
      setReceiptName(data.name);
    } else {
      showToast(data.error || "Upload failed");
    }
  }

  async function handleSave() {
    if (!name.trim() || !amount || parseFloat(amount) <= 0) { showToast("Add a name and a valid amount"); return; }
    setSaving(true);
    const payload = {
      name: name.trim(),
      amount: parseFloat(amount),
      date,
      category,
      note: note.trim(),
      receipt_path: receiptPath,
      receipt_name: receiptName,
    };
    const url = existing ? `/api/expenses/${existing.id}` : "/api/expenses";
    const method = existing ? "PUT" : "POST";
    const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
    setSaving(false);
    if (res.ok) {
      showToast(existing ? "Expense updated" : "Expense added");
      onSaved();
    } else {
      showToast("Could not save expense");
    }
  }

  return (
    <ModalShell title={existing ? "Edit company expense" : "Add company expense"} onClose={onClose}>
      <Field label="What was it">
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Adobe Creative Cloud" className={inputClass} />
      </Field>
      <div className="grid grid-cols-2 gap-2.5">
        <Field label="Amount (₹)">
          <input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="1499" className={inputClass} />
        </Field>
        <Field label="Date">
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={inputClass} />
        </Field>
      </div>
      <Field label="Category">
        <select value={category} onChange={(e) => setCategory(e.target.value)} className={inputClass}>
          {EXPENSE_CATEGORIES.map((c) => <option key={c}>{c}</option>)}
        </select>
      </Field>
      <Field label="Note (optional)">
        <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. for client X's video project" className={inputClass} />
      </Field>
      <Field label="Receipt — image or PDF (optional)">
        <label className="border-[1.5px] border-dashed border-line rounded-[10px] p-3.5 text-center text-inkfaint text-xs cursor-pointer hover:border-income hover:text-inkdim block">
          {uploading ? "Uploading…" : receiptName ? "Replace file" : "Click to upload a receipt, bill screenshot, or QR/cash receipt"}
          <input type="file" accept="image/*,application/pdf" className="hidden" onChange={handleFile} />
        </label>
        {receiptName && (
          <div className="flex items-center gap-2 mt-2 text-xs text-inkdim bg-bgsoft border border-line rounded-lg px-2.5 py-2">
            <span className="flex-1 truncate">{receiptName}</span>
            <span className="cursor-pointer text-inkfaint hover:text-expense" onClick={() => { setReceiptPath(null); setReceiptName(null); }}>✕</span>
          </div>
        )}
      </Field>
      <ModalActions onClose={onClose} onSave={handleSave} saving={saving} saveLabel="Save expense" saveColor="bg-expense" />
    </ModalShell>
  );
}

// =====================================================================
// INCOME MODAL (multi-payment)
// =====================================================================
function IncomeModal({
  existing,
  onClose,
  onSaved,
  showToast,
}: {
  existing: Project | null;
  onClose: () => void;
  onSaved: () => void;
  showToast: (m: string) => void;
}) {
  const [client, setClient] = useState(existing?.client || "");
  const [project, setProject] = useState(existing?.project || "");
  const [service, setService] = useState(existing?.service || SERVICES[0]);
  const [total, setTotal] = useState(existing?.total?.toString() || "");
  const [payments, setPayments] = useState<Payment[]>(
    existing ? JSON.parse(JSON.stringify(existing.payments || [])) : []
  );
  const [saving, setSaving] = useState(false);
  const [uploadingIdx, setUploadingIdx] = useState<number | null>(null);

  function addPayment() {
    if (payments.length >= 3) { showToast("Maximum 3 payments per project"); return; }
    setPayments([...payments, { amount: 0, date: todayStr(), note: "", receipt_path: null, receipt_name: null }]);
  }
  function removePayment(i: number) {
    setPayments(payments.filter((_, idx) => idx !== i));
  }
  function updatePayment(i: number, patch: Partial<Payment>) {
    setPayments(payments.map((p, idx) => (idx === i ? { ...p, ...patch } : p)));
  }

  async function handlePayFile(i: number, e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 4 * 1024 * 1024) { showToast("Keep files under 4MB"); return; }
    setUploadingIdx(i);
    const fd = new FormData();
    fd.append("file", file);
    const res = await fetch("/api/upload", { method: "POST", body: fd });
    const data = await res.json();
    setUploadingIdx(null);
    if (data.path) {
      updatePayment(i, { receipt_path: data.path, receipt_name: data.name });
    } else {
      showToast(data.error || "Upload failed");
    }
  }

  const received = payments.reduce((s, p) => s + (Number(p.amount) || 0), 0);
  const totalNum = parseFloat(total) || 0;

  async function handleSave() {
    if (!client.trim() || !totalNum || totalNum <= 0) { showToast("Add a client name and total value"); return; }
    const cleanPayments = payments
      .filter((p) => p.amount && Number(p.amount) > 0)
      .map((p) => ({
        amount: Number(p.amount),
        date: p.date || todayStr(),
        note: p.note || "",
        receipt_path: p.receipt_path || null,
        receipt_name: p.receipt_name || null,
      }));
    setSaving(true);
    const payload = { client: client.trim(), project: project.trim(), service, total: totalNum, payments: cleanPayments };
    const url = existing ? `/api/income/${existing.id}` : "/api/income";
    const method = existing ? "PUT" : "POST";
    const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
    setSaving(false);
    if (res.ok) {
      showToast(existing ? "Project updated" : "Project added");
      onSaved();
    } else {
      showToast("Could not save project");
    }
  }

  return (
    <ModalShell title={existing ? "Edit client project" : "Add client project"} onClose={onClose}>
      <Field label="Client name">
        <input value={client} onChange={(e) => setClient(e.target.value)} placeholder="e.g. Lumen Studios" className={inputClass} />
      </Field>
      <Field label="Project">
        <input value={project} onChange={(e) => setProject(e.target.value)} placeholder="e.g. Brand website redesign" className={inputClass} />
      </Field>
      <Field label="Service">
        <select value={service} onChange={(e) => setService(e.target.value)} className={inputClass}>
          {SERVICES.map((s) => <option key={s}>{s}</option>)}
        </select>
      </Field>
      <Field label="Total project value (₹)">
        <input type="number" value={total} onChange={(e) => setTotal(e.target.value)} placeholder="40000" className={inputClass} />
      </Field>

      <div className="text-xs text-inkdim font-semibold mb-1.5">
        Payments received <span className="text-inkfaint font-normal">(advance, middle, final — add as they come in)</span>
      </div>

      {payments.length === 0 && (
        <div className="text-xs text-inkfaint mb-2.5">
          No payments yet — click &quot;Add a payment&quot; below when the client pays you.
        </div>
      )}

      {payments.map((p, i) => (
        <div key={i} className="bg-bgsoft border border-line rounded-[11px] p-3 mb-2.5">
          <div className="flex justify-between items-center mb-2.5">
            <b className="text-[12.5px]">{PAY_LABELS[i] || `Payment ${i + 1}`}</b>
            <button onClick={() => removePayment(i)} className="text-xs text-inkfaint hover:text-expense">Remove</button>
          </div>
          <div className="grid grid-cols-2 gap-2 mb-2">
            <Field label="Amount (₹)" tight>
              <input type="number" value={p.amount || ""} onChange={(e) => updatePayment(i, { amount: parseFloat(e.target.value) || 0 })} placeholder="20000" className={inputClass} />
            </Field>
            <Field label="Date received" tight>
              <input type="date" value={p.date} onChange={(e) => updatePayment(i, { date: e.target.value })} className={inputClass} />
            </Field>
          </div>
          <Field label="Note (optional)" tight>
            <input value={p.note} onChange={(e) => updatePayment(i, { note: e.target.value })} placeholder="e.g. paid via UPI" className={inputClass} />
          </Field>
          <div className="mt-2">
            <label className="text-xs text-inkdim font-semibold block mb-1.5">Proof — QR / cash receipt / screenshot (optional)</label>
            <label className="border-[1.5px] border-dashed border-line rounded-[10px] p-2.5 text-center text-inkfaint text-xs cursor-pointer hover:border-income block">
              {uploadingIdx === i ? "Uploading…" : p.receipt_name ? "Replace file" : "Click to upload payment proof"}
              <input type="file" accept="image/*,application/pdf" className="hidden" onChange={(e) => handlePayFile(i, e)} />
            </label>
            {p.receipt_name && (
              <div className="flex items-center gap-2 mt-2 text-xs text-inkdim bg-bg border border-line rounded-lg px-2.5 py-2">
                <span className="flex-1 truncate">{p.receipt_name}</span>
                <span className="cursor-pointer text-inkfaint hover:text-expense" onClick={() => updatePayment(i, { receipt_path: null, receipt_name: null })}>✕</span>
              </div>
            )}
          </div>
        </div>
      ))}

      <button
        onClick={addPayment}
        disabled={payments.length >= 3}
        className="w-full bg-transparent border-[1.5px] border-dashed border-line text-inkdim rounded-[10px] py-2.5 text-[12.5px] font-semibold mb-1.5 disabled:opacity-40 hover:border-income hover:text-income"
      >
        + Add a payment
      </button>
      <div className="text-[11.5px] text-inkfaint mb-3.5">
        {payments.length === 0
          ? "No payments added yet"
          : `Received so far: ${fmt(received)}${totalNum > 0 ? `  ·  ${totalNum - received > 0 ? "Pending: " + fmt(totalNum - received) : "Fully paid ✓"}` : ""}`}
      </div>

      <ModalActions onClose={onClose} onSave={handleSave} saving={saving} saveLabel="Save project" saveColor="bg-income" />
    </ModalShell>
  );
}

// =====================================================================
// SHARED MODAL BITS
// =====================================================================
const inputClass = "w-full bg-bgsoft border border-line rounded-[9px] px-3 py-2.5 text-[13px] outline-none focus:border-income text-ink";

function ModalShell({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-[100] p-5" onClick={onClose}>
      <div className="bg-bgcard border border-line rounded-2xl p-6 max-w-[460px] w-full max-h-[88vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <h2 className="font-display text-[17px] mb-4">{title}</h2>
        {children}
      </div>
    </div>
  );
}

function Field({ label, children, tight }: { label: string; children: React.ReactNode; tight?: boolean }) {
  return (
    <div className={tight ? "mb-0" : "mb-3.5"}>
      <label className="block text-xs text-inkdim font-semibold mb-1.5">{label}</label>
      {children}
    </div>
  );
}

function ModalActions({
  onClose,
  onSave,
  saving,
  saveLabel,
  saveColor,
}: {
  onClose: () => void;
  onSave: () => void;
  saving: boolean;
  saveLabel: string;
  saveColor: string;
}) {
  return (
    <div className="flex gap-2 mt-4.5 justify-end">
      <button onClick={onClose} className="text-xs border border-line text-inkdim hover:text-ink rounded-lg px-3 py-1.5 font-semibold">
        Cancel
      </button>
      <button onClick={onSave} disabled={saving} className={`text-xs text-white rounded-lg px-3 py-1.5 font-semibold disabled:opacity-50 ${saveColor}`}>
        {saving ? "Saving…" : saveLabel}
      </button>
    </div>
  );
}
