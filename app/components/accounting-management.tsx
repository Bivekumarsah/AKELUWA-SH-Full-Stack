"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import CompanyAccountPanel from "@/app/components/company-account";
import {
  AccountingSummary,
  AccountingTransaction,
  AdminPermission,
  apiFetch,
  CompanyAccount,
  Contract,
  DeferredActionResponse,
  Invoice,
  InvoiceItem,
  readableError,
  User,
} from "@/app/lib/api";

type View = "overview" | "invoices" | "ledger" | "settings";
type TransactionDraft = Pick<AccountingTransaction, "invoice_id" | "direction" | "category" | "description" | "counterparty" | "amount_cents" | "currency" | "payment_method" | "reference" | "transaction_date" | "notes">;
type AccountingData = { company_account: CompanyAccount; invoices: Invoice[]; transactions: AccountingTransaction[]; summaries: AccountingSummary[] };

const today = () => new Date().toISOString().slice(0, 10);
const money = (currency: string, cents: number) => `${currency} ${(cents / 100).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const can = (user: User | null, permission: AdminPermission) => user?.role === "admin" || Boolean(user?.admin_permissions.includes(permission));

function newInvoice(users: User[], currency: string): Invoice {
  const client = users.find((user) => user.role === "user");
  const issue = new Date();
  const due = new Date(issue); due.setDate(due.getDate() + 14);
  return {
    id: "",
    user_id: "",
    invoice_number: `INV-${issue.getFullYear()}-${String(Date.now()).slice(-6)}`,
    client_name: client?.name || "",
    client_email: client?.email || "",
    client_company: "",
    issue_date: issue.toISOString().slice(0, 10),
    due_date: due.toISOString().slice(0, 10),
    currency,
    subtotal_cents: 0,
    tax_cents: 0,
    discount_cents: 0,
    total_cents: 0,
    paid_cents: 0,
    balance_cents: 0,
    notes: "",
    status: "sent",
    items: [{ id: "", description: "", quantity: 1, unit_price_cents: 0, position: 0 }],
    created_at: "",
    updated_at: "",
  };
}

function newTransaction(currency: string): TransactionDraft {
  return { invoice_id: "", direction: "income", category: "Project payment", description: "", counterparty: "", amount_cents: 0, currency, payment_method: "bank_transfer", reference: "", transaction_date: today(), notes: "" };
}

export default function AccountingManagement({ users, contracts, administrator }: { users: User[]; contracts: Contract[]; administrator: User | null }) {
  const [view, setView] = useState<View>("overview");
  const [company, setCompany] = useState<CompanyAccount | null>(null);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [transactions, setTransactions] = useState<AccountingTransaction[]>([]);
  const [summaries, setSummaries] = useState<AccountingSummary[]>([]);
  const [invoiceDraft, setInvoiceDraft] = useState<Invoice | null>(null);
  const [transactionDraft, setTransactionDraft] = useState<TransactionDraft | null>(null);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [selectedTransaction, setSelectedTransaction] = useState<AccountingTransaction | null>(null);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const canCreate = can(administrator, "accounts.create");
  const canDelete = can(administrator, "accounts.delete");

  const load = useCallback(async () => {
    const response = await apiFetch<AccountingData>("/admin/accounting");
    setCompany(response.company_account);
    setInvoices(response.invoices);
    setTransactions(response.transactions);
    setSummaries(response.summaries);
  }, []);

  useEffect(() => {
    let active = true;
    apiFetch<AccountingData>("/admin/accounting")
      .then((response) => {
        if (!active) return;
        setCompany(response.company_account);
        setInvoices(response.invoices);
        setTransactions(response.transactions);
        setSummaries(response.summaries);
      })
      .catch((requestError) => { if (active) setError(readableError(requestError)); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (!notice) return;
    const timer = window.setTimeout(() => setNotice(""), 4000);
    return () => window.clearTimeout(timer);
  }, [notice]);

  const defaultCurrency = company?.currency || "NPR";
  const filteredInvoices = useMemo(() => invoices.filter((item) => [item.invoice_number, item.client_name, item.client_company, item.status].some((value) => value?.toLowerCase().includes(query.toLowerCase()))), [invoices, query]);
  const filteredTransactions = useMemo(() => transactions.filter((item) => [item.receipt_number, item.invoice_number, item.counterparty, item.description, item.category, item.reference].some((value) => value?.toLowerCase().includes(query.toLowerCase()))), [transactions, query]);

  async function createInvoice(event: FormEvent) {
    event.preventDefault();
    if (!can(administrator, "accounts.create")) { setError("Create permission is not assigned."); return; }
    if (!invoiceDraft) return;
    setSaving(true); setError("");
    try {
      const payload = {
        contract_id: invoiceDraft.contract_id || "",
        user_id: invoiceDraft.user_id || "",
        invoice_number: invoiceDraft.invoice_number,
        client_name: invoiceDraft.client_name,
        client_email: invoiceDraft.client_email,
        client_company: invoiceDraft.client_company || "",
        issue_date: invoiceDraft.issue_date,
        due_date: invoiceDraft.due_date,
        currency: invoiceDraft.currency,
        tax_cents: invoiceDraft.tax_cents,
        discount_cents: invoiceDraft.discount_cents,
        notes: invoiceDraft.notes,
        items: invoiceDraft.items.map(({ description, quantity, unit_price_cents }, position) => ({ description, quantity, unit_price_cents, position })),
      };
      const response = await apiFetch<{ invoice: Invoice }>("/admin/accounting/invoices", { method: "POST", body: JSON.stringify(payload) });
      setInvoiceDraft(null); setSelectedInvoice(response.invoice); setNotice("Invoice issued."); await load();
    } catch (requestError) { setError(readableError(requestError)); } finally { setSaving(false); }
  }

  async function createTransaction(event: FormEvent) {
    event.preventDefault();
    if (!can(administrator, "accounts.create")) { setError("Create permission is not assigned."); return; }
    if (!transactionDraft) return;
    setSaving(true); setError("");
    try {
      const response = await apiFetch<{ transaction: AccountingTransaction }>("/admin/accounting/transactions", { method: "POST", body: JSON.stringify(transactionDraft) });
      setTransactionDraft(null); setSelectedTransaction(response.transaction); setNotice(response.transaction.direction === "income" ? "Payment recorded and receipt issued." : "Expense recorded."); await load();
    } catch (requestError) { setError(readableError(requestError)); } finally { setSaving(false); }
  }

  async function voidInvoice(item: Invoice) {
    if (!can(administrator, "accounts.delete")) { setError("Delete permission is not assigned."); return; }
    if (!window.confirm(`Void invoice ${item.invoice_number}? This remains in the financial record.`)) return;
    try { const response = await apiFetch<DeferredActionResponse>(`/admin/accounting/invoices/${item.id}/void`, { method: "POST", body: "{}" }); setSelectedInvoice(null); if(response?.queued){setNotice("Invoice void request submitted for full-admin review.");}else{setNotice("Invoice voided.");await load();} } catch (requestError) { setError(readableError(requestError)); }
  }

  async function voidTransaction(item: AccountingTransaction) {
    if (!can(administrator, "accounts.delete")) { setError("Delete permission is not assigned."); return; }
    if (!window.confirm(`Void this ${item.direction} record? Its audit history will remain available.`)) return;
    try { const response = await apiFetch<DeferredActionResponse>(`/admin/accounting/transactions/${item.id}/void`, { method: "POST", body: "{}" }); setSelectedTransaction(null); if(response?.queued){setNotice("Ledger void request submitted for full-admin review.");}else{setNotice("Ledger entry voided.");await load();} } catch (requestError) { setError(readableError(requestError)); }
  }

  function startPayment(invoice: Invoice) {
    if (!can(administrator, "accounts.create")) { setError("Create permission is not assigned."); return; }
    setSelectedInvoice(null); setView("ledger");
    setTransactionDraft({ ...newTransaction(invoice.currency), invoice_id: invoice.id, category: "Invoice payment", description: `Payment for ${invoice.invoice_number}`, counterparty: invoice.client_name, amount_cents: invoice.balance_cents });
  }

  function chooseContract(id: string) {
    if (!invoiceDraft) return;
    const contract = contracts.find((item) => item.id === id);
    setInvoiceDraft({ ...invoiceDraft, contract_id: id, user_id: contract?.user_id || invoiceDraft.user_id, client_name: contract?.client_name || invoiceDraft.client_name, client_email: contract?.client_email || invoiceDraft.client_email, client_company: contract?.client_company || "", currency: contract?.currency || invoiceDraft.currency });
  }

  function chooseInvoice(id: string) {
    if (!transactionDraft) return;
    const invoice = invoices.find((item) => item.id === id);
    setTransactionDraft({ ...transactionDraft, invoice_id: id, category: id ? "Invoice payment" : transactionDraft.category, description: invoice ? `Payment for ${invoice.invoice_number}` : transactionDraft.description, counterparty: invoice?.client_name || transactionDraft.counterparty, currency: invoice?.currency || transactionDraft.currency, amount_cents: invoice?.balance_cents || transactionDraft.amount_cents });
  }

  function exportLedger() {
    const rows = [["Date", "Direction", "Category", "Description", "Counterparty", "Currency", "Amount", "Method", "Reference", "Receipt", "Status"], ...filteredTransactions.map((item) => [item.transaction_date, item.direction, item.category, item.description, item.counterparty, item.currency, (item.amount_cents / 100).toFixed(2), item.payment_method, item.reference, item.receipt_number || "", item.status])];
    const csv = rows.map((row) => row.map((value) => `"${String(value).replaceAll('"', '""')}"`).join(",")).join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const link = document.createElement("a"); link.href = url; link.download = "akeluwa-ledger.csv"; link.click(); URL.revokeObjectURL(url);
  }

  if (selectedInvoice) return <InvoiceDocument invoice={selectedInvoice} company={company} canRecordPayment={canCreate} canVoid={canDelete} onBack={() => setSelectedInvoice(null)} onPayment={() => startPayment(selectedInvoice)} onVoid={() => voidInvoice(selectedInvoice)} />;
  if (selectedTransaction) return <ReceiptDocument transaction={selectedTransaction} company={company} canVoid={canDelete} onBack={() => setSelectedTransaction(null)} onVoid={() => voidTransaction(selectedTransaction)} />;
  if (invoiceDraft) return <InvoiceEditor value={invoiceDraft} contracts={contracts} saving={saving} onChange={setInvoiceDraft} onContract={chooseContract} onSubmit={createInvoice} onCancel={() => setInvoiceDraft(null)} />;

  return <section className="admin-panel accounting-panel">
    <div className="admin-panel-heading"><p className="portal-kicker">FINANCE / CONTROLLED</p><h1>Accounts</h1><p>Track invoices, money received, operating expenses, balances, and receipts in one permanent company ledger.</p></div>
    <nav className="accounting-tabs" aria-label="Accounting views">{(["overview", "invoices", "ledger", "settings"] as View[]).map((item) => <button type="button" className={view === item ? "is-active" : ""} onClick={() => { setView(item); setQuery(""); }} key={item}>{item === "settings" ? "Company profile" : item}</button>)}</nav>
    {error && <p className="form-alert is-error" role="alert">{error}</p>}{notice && <p className="form-alert is-success" role="status">{notice}</p>}
    {loading ? <p className="dashboard-state">Loading accounts...</p> : view === "settings" ? <CompanyAccountPanel administrator={administrator} /> : view === "overview" ? <AccountingOverview summaries={summaries} invoices={invoices} transactions={transactions} onInvoice={setSelectedInvoice} /> : view === "invoices" ? <>
      <div className="accounting-toolbar"><input type="search" placeholder="Search invoices or clients" value={query} onChange={(event) => setQuery(event.target.value)} />{canCreate && <button className="portal-primary" type="button" onClick={() => setInvoiceDraft(newInvoice(users, defaultCurrency))}>Create invoice</button>}</div>
      <InvoiceList invoices={filteredInvoices} onOpen={setSelectedInvoice} />
    </> : <>
      <div className="accounting-toolbar"><input type="search" placeholder="Search ledger, receipt or reference" value={query} onChange={(event) => setQuery(event.target.value)} /><div><button type="button" onClick={exportLedger} disabled={!filteredTransactions.length}>Export CSV</button>{canCreate && <button className="portal-primary" type="button" onClick={() => setTransactionDraft(newTransaction(defaultCurrency))}>Record transaction</button>}</div></div>
      {transactionDraft && <TransactionEditor value={transactionDraft} invoices={invoices} saving={saving} onChange={setTransactionDraft} onInvoice={chooseInvoice} onSubmit={createTransaction} onCancel={() => setTransactionDraft(null)} />}
      <Ledger transactions={filteredTransactions} onOpen={setSelectedTransaction} />
    </>}
  </section>;
}

function AccountingOverview({ summaries, invoices, transactions, onInvoice }: { summaries: AccountingSummary[]; invoices: Invoice[]; transactions: AccountingTransaction[]; onInvoice: (invoice: Invoice) => void }) {
  const open = invoices.filter((item) => !["paid", "void"].includes(item.status));
  return <div className="accounting-overview">
    {summaries.length ? summaries.map((summary) => <section className="accounting-currency" key={summary.currency}><h2>{summary.currency}</h2><div><article><span>INCOME</span><strong>{money(summary.currency, summary.income_cents)}</strong></article><article><span>EXPENSES</span><strong>{money(summary.currency, summary.expense_cents)}</strong></article><article><span>NET</span><strong className={summary.net_cents < 0 ? "negative" : ""}>{money(summary.currency, summary.net_cents)}</strong></article><article><span>RECEIVABLE</span><strong>{money(summary.currency, summary.receivable_cents)}</strong></article></div></section>) : <p className="dashboard-state">No financial activity has been recorded.</p>}
    <div className="accounting-overview-grid"><section><div className="panel-heading"><div><span>OPEN INVOICES</span><strong>{open.length}</strong></div></div>{open.slice(0, 5).map((item) => <button type="button" onClick={() => onInvoice(item)} key={item.id}><span>{item.invoice_number}</span><strong>{item.client_name}</strong><small>{money(item.currency, item.balance_cents)} due {item.due_date}</small></button>)}{!open.length && <p className="dashboard-state">No outstanding invoices.</p>}</section><section><div className="panel-heading"><div><span>RECENT ACTIVITY</span><strong>{transactions.length}</strong></div></div>{transactions.slice(0, 5).map((item) => <article key={item.id}><span>{item.transaction_date}</span><strong>{item.description}</strong><small className={item.direction}>{item.direction === "income" ? "+" : "-"}{money(item.currency, item.amount_cents)}</small></article>)}{!transactions.length && <p className="dashboard-state">No ledger activity.</p>}</section></div>
  </div>;
}

function InvoiceList({ invoices, onOpen }: { invoices: Invoice[]; onOpen: (invoice: Invoice) => void }) {
  return <div className="accounting-table invoice-table"><div className="accounting-table-head"><span>Invoice</span><span>Client</span><span>Total</span><span>Balance</span><span>Status</span></div>{invoices.map((item) => <button type="button" onClick={() => onOpen(item)} key={item.id}><span><strong>{item.invoice_number}</strong><small>{item.issue_date} / due {item.due_date}</small></span><span>{item.client_name}</span><span>{money(item.currency, item.total_cents)}</span><span>{money(item.currency, item.balance_cents)}</span><b className={`accounting-status status-${item.status}`}>{item.status}</b></button>)}{!invoices.length && <p className="dashboard-state">No invoices match this search.</p>}</div>;
}

function Ledger({ transactions, onOpen }: { transactions: AccountingTransaction[]; onOpen: (transaction: AccountingTransaction) => void }) {
  return <div className="accounting-table ledger-table"><div className="accounting-table-head"><span>Date / record</span><span>Description</span><span>Method</span><span>Amount</span><span>Status</span></div>{transactions.map((item) => <button type="button" onClick={() => onOpen(item)} key={item.id}><span><strong>{item.receipt_number || item.reference || "Ledger entry"}</strong><small>{item.transaction_date}</small></span><span><strong>{item.description}</strong><small>{item.counterparty} / {item.category}</small></span><span>{item.payment_method.replace("_", " ")}</span><span className={item.direction}>{item.direction === "income" ? "+" : "-"}{money(item.currency, item.amount_cents)}</span><b className={`accounting-status status-${item.status}`}>{item.status}</b></button>)}{!transactions.length && <p className="dashboard-state">No transactions match this search.</p>}</div>;
}

function InvoiceEditor({ value, contracts, saving, onChange, onContract, onSubmit, onCancel }: { value: Invoice; contracts: Contract[]; saving: boolean; onChange: (value: Invoice) => void; onContract: (id: string) => void; onSubmit: (event: FormEvent) => void; onCancel: () => void }) {
  const set = (field: keyof Invoice, next: string | number) => onChange({ ...value, [field]: next });
  const subtotal = value.items.reduce((sum, item) => sum + Math.round(item.quantity * item.unit_price_cents), 0);
  const total = subtotal + value.tax_cents - value.discount_cents;
  function updateLine(index: number, field: keyof InvoiceItem, next: string | number) { onChange({ ...value, items: value.items.map((item, position) => position === index ? { ...item, [field]: next } : item) }); }
  return <section className="admin-panel"><div className="admin-panel-heading"><p className="portal-kicker">ACCOUNTS / NEW INVOICE</p><h1>Issue invoice</h1><p>Create an immutable client invoice. Corrections after issue are handled by voiding the invoice.</p></div><form className="accounting-editor" onSubmit={onSubmit}><fieldset><legend>Invoice and client</legend><div className="editor-grid"><label>Contract <small>optional</small><select value={value.contract_id || ""} onChange={(event) => onContract(event.target.value)}><option value="">No linked contract</option>{contracts.filter((item) => item.status !== "cancelled").map((item) => <option value={item.id} key={item.id}>{item.contract_number} / {item.client_name}</option>)}</select></label><label>Invoice number<input value={value.invoice_number} onChange={(event) => set("invoice_number", event.target.value)} required /></label><label>Client name<input value={value.client_name} onChange={(event) => set("client_name", event.target.value)} required /></label><label>Client email<input type="email" value={value.client_email} onChange={(event) => set("client_email", event.target.value)} required /></label><label>Client company<input value={value.client_company || ""} onChange={(event) => set("client_company", event.target.value)} /></label><label>Currency<input value={value.currency} maxLength={3} onChange={(event) => set("currency", event.target.value.toUpperCase())} required /></label><label>Issue date<input type="date" value={value.issue_date} onChange={(event) => set("issue_date", event.target.value)} required /></label><label>Due date<input type="date" min={value.issue_date} value={value.due_date} onChange={(event) => set("due_date", event.target.value)} required /></label></div></fieldset><fieldset><legend>Line items</legend><div className="invoice-lines">{value.items.map((item, index) => <div key={index}><label>Description<input value={item.description} onChange={(event) => updateLine(index, "description", event.target.value)} required /></label><label>Quantity<input type="number" min="0.01" step="0.01" value={item.quantity} onChange={(event) => updateLine(index, "quantity", Number(event.target.value))} required /></label><label>Unit price<input type="number" min="0" step="0.01" value={item.unit_price_cents / 100} onChange={(event) => updateLine(index, "unit_price_cents", Math.round(Number(event.target.value) * 100))} required /></label><strong>{money(value.currency, Math.round(item.quantity * item.unit_price_cents))}</strong><button type="button" aria-label={`Remove line ${index + 1}`} disabled={value.items.length === 1} onClick={() => onChange({ ...value, items: value.items.filter((_, position) => position !== index) })}>Remove</button></div>)}<button type="button" onClick={() => onChange({ ...value, items: [...value.items, { id: "", description: "", quantity: 1, unit_price_cents: 0, position: value.items.length }] })}>Add line item</button></div></fieldset><fieldset><legend>Totals and notes</legend><div className="editor-grid"><label>Tax<input type="number" min="0" step="0.01" value={value.tax_cents / 100} onChange={(event) => set("tax_cents", Math.round(Number(event.target.value) * 100))} /></label><label>Discount<input type="number" min="0" step="0.01" value={value.discount_cents / 100} onChange={(event) => set("discount_cents", Math.round(Number(event.target.value) * 100))} /></label><label className="wide-field">Notes<textarea value={value.notes} onChange={(event) => set("notes", event.target.value)} maxLength={3000} /></label></div><div className="invoice-totals"><span>Subtotal <strong>{money(value.currency, subtotal)}</strong></span><span>Tax <strong>{money(value.currency, value.tax_cents)}</strong></span><span>Discount <strong>-{money(value.currency, value.discount_cents)}</strong></span><span>Total <strong>{money(value.currency, total)}</strong></span></div></fieldset><div className="editor-actions"><button className="portal-primary" disabled={saving || total <= 0}>{saving ? "Issuing..." : "Issue invoice"}</button><button type="button" onClick={onCancel}>Cancel</button></div></form></section>;
}

function TransactionEditor({ value, invoices, saving, onChange, onInvoice, onSubmit, onCancel }: { value: TransactionDraft; invoices: Invoice[]; saving: boolean; onChange: (value: TransactionDraft) => void; onInvoice: (id: string) => void; onSubmit: (event: FormEvent) => void; onCancel: () => void }) {
  const set = (field: keyof TransactionDraft, next: string | number) => onChange({ ...value, [field]: next });
  return <form className="accounting-editor transaction-editor" onSubmit={onSubmit}><div className="transaction-direction" role="group" aria-label="Transaction direction"><button type="button" className={value.direction === "income" ? "is-active" : ""} onClick={() => onChange({ ...value, direction: "income" })}>Income</button><button type="button" className={value.direction === "expense" ? "is-active" : ""} onClick={() => onChange({ ...value, direction: "expense", invoice_id: "" })}>Expense</button></div><div className="editor-grid">{value.direction === "income" && <label className="wide-field">Apply to invoice <small>optional</small><select value={value.invoice_id} onChange={(event) => onInvoice(event.target.value)}><option value="">Standalone income</option>{invoices.filter((item) => item.balance_cents > 0 && item.status !== "void").map((item) => <option value={item.id} key={item.id}>{item.invoice_number} / {item.client_name} / {money(item.currency, item.balance_cents)}</option>)}</select></label>}<label>Category<input value={value.category} onChange={(event) => set("category", event.target.value)} required /></label><label>{value.direction === "income" ? "Received from" : "Paid to"}<input value={value.counterparty} onChange={(event) => set("counterparty", event.target.value)} required /></label><label className="wide-field">Description<input value={value.description} onChange={(event) => set("description", event.target.value)} required /></label><label>Amount<input type="number" min="0.01" step="0.01" value={value.amount_cents / 100} onChange={(event) => set("amount_cents", Math.round(Number(event.target.value) * 100))} required /></label><label>Currency<input value={value.currency} maxLength={3} onChange={(event) => set("currency", event.target.value.toUpperCase())} required readOnly={Boolean(value.invoice_id)} /></label><label>Payment method<select value={value.payment_method} onChange={(event) => set("payment_method", event.target.value)}><option value="bank_transfer">Bank transfer</option><option value="cash">Cash</option><option value="card">Card</option><option value="mobile_wallet">Mobile wallet</option><option value="cheque">Cheque</option><option value="other">Other</option></select></label><label>Date<input type="date" value={value.transaction_date} onChange={(event) => set("transaction_date", event.target.value)} required /></label><label className="wide-field">Bank, wallet, cheque or vendor reference<input value={value.reference} onChange={(event) => set("reference", event.target.value)} maxLength={180} /></label><label className="wide-field">Notes<textarea value={value.notes} onChange={(event) => set("notes", event.target.value)} maxLength={3000} /></label></div><div className="editor-actions"><button className="portal-primary" disabled={saving}>{saving ? "Recording..." : value.direction === "income" ? "Record payment" : "Record expense"}</button><button type="button" onClick={onCancel}>Cancel</button></div></form>;
}

function InvoiceDocument({ invoice, company, canRecordPayment, canVoid, onBack, onPayment, onVoid }: { invoice: Invoice; company: CompanyAccount | null; canRecordPayment: boolean; canVoid: boolean; onBack: () => void; onPayment: () => void; onVoid: () => void }) {
  return <section className="admin-panel"><div className="accounting-document-actions"><button type="button" onClick={onBack}>Back to accounts</button><button type="button" onClick={() => window.print()}>Print / Save PDF</button>{invoice.balance_cents > 0 && invoice.status !== "void" && <button className="portal-primary" type="button" onClick={onPayment}>Record payment</button>}{invoice.paid_cents === 0 && invoice.status !== "void" && <button className="danger-action" type="button" onClick={onVoid}>Void invoice</button>}</div><article className="accounting-document invoice-document"><header><div><span>{company?.display_name || "AKELUWA SH"}</span><small>{company?.legal_name}</small></div><div><h1>Invoice</h1><strong>{invoice.invoice_number}</strong></div></header><section className="document-parties"><div><span>FROM</span><strong>{company?.legal_name || "AKELUWA SH"}</strong><p>{company?.address_line}<br />{[company?.city, company?.region, company?.country].filter(Boolean).join(", ")}<br />{company?.primary_email}</p></div><div><span>BILL TO</span><strong>{invoice.client_name}</strong><p>{invoice.client_company}<br />{invoice.client_email}</p></div></section><section className="document-meta"><div><span>ISSUED</span><strong>{invoice.issue_date}</strong></div><div><span>DUE</span><strong>{invoice.due_date}</strong></div><div><span>STATUS</span><strong>{invoice.status}</strong></div><div><span>BALANCE</span><strong>{money(invoice.currency, invoice.balance_cents)}</strong></div></section><div className="document-lines"><div><span>Description</span><span>Qty</span><span>Unit price</span><span>Amount</span></div>{invoice.items.map((item) => <div key={item.id || item.position}><strong>{item.description}</strong><span>{item.quantity}</span><span>{money(invoice.currency, item.unit_price_cents)}</span><span>{money(invoice.currency, Math.round(item.quantity * item.unit_price_cents))}</span></div>)}</div><section className="document-total"><span>Subtotal <strong>{money(invoice.currency, invoice.subtotal_cents)}</strong></span><span>Tax <strong>{money(invoice.currency, invoice.tax_cents)}</strong></span><span>Discount <strong>-{money(invoice.currency, invoice.discount_cents)}</strong></span><span>Total <strong>{money(invoice.currency, invoice.total_cents)}</strong></span><span>Paid <strong>{money(invoice.currency, invoice.paid_cents)}</strong></span><span>Balance due <strong>{money(invoice.currency, invoice.balance_cents)}</strong></span></section>{invoice.notes && <footer><span>NOTES</span><p>{invoice.notes}</p></footer>}</article></section>;
}

function ReceiptDocument({ transaction, company, canVoid, onBack, onVoid }: { transaction: AccountingTransaction; company: CompanyAccount | null; canVoid: boolean; onBack: () => void; onVoid: () => void }) {
  const receipt = transaction.direction === "income";
  return <section className="admin-panel"><div className="accounting-document-actions"><button type="button" onClick={onBack}>Back to ledger</button><button type="button" onClick={() => window.print()}>Print / Save PDF</button>{transaction.status === "posted" && <button className="danger-action" type="button" onClick={onVoid}>Void entry</button>}</div><article className="accounting-document receipt-document"><header><div><span>{company?.display_name || "AKELUWA SH"}</span><small>{company?.primary_email}</small></div><div><h1>{receipt ? "Receipt" : "Expense record"}</h1><strong>{transaction.receipt_number || transaction.reference || "LEDGER RECORD"}</strong></div></header><section className="receipt-amount"><span>{receipt ? "AMOUNT RECEIVED" : "AMOUNT PAID"}</span><strong>{money(transaction.currency, transaction.amount_cents)}</strong><b className={`accounting-status status-${transaction.status}`}>{transaction.status}</b></section><dl><div><dt>Date</dt><dd>{transaction.transaction_date}</dd></div><div><dt>{receipt ? "Received from" : "Paid to"}</dt><dd>{transaction.counterparty}</dd></div><div><dt>Description</dt><dd>{transaction.description}</dd></div><div><dt>Category</dt><dd>{transaction.category}</dd></div><div><dt>Method</dt><dd>{transaction.payment_method.replace("_", " ")}</dd></div><div><dt>Reference</dt><dd>{transaction.reference || "Not provided"}</dd></div>{transaction.invoice_number && <div><dt>Invoice</dt><dd>{transaction.invoice_number}</dd></div>}</dl>{transaction.notes && <footer><span>NOTES</span><p>{transaction.notes}</p></footer>}<small className="document-issued">Recorded by {company?.legal_name || "AKELUWA SH"} on {new Date(transaction.created_at).toLocaleString()}</small></article></section>;
}
