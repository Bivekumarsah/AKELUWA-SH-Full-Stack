"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Menu, X } from "lucide-react";
import ContractManagement from "@/app/components/contract-management";
import AccountingManagement from "@/app/components/accounting-management";
import ActionReviewManagement from "@/app/components/action-review-management";
import ProfileMenu from "@/app/components/profile-menu";
import SubAdminManagement from "@/app/components/sub-admin-management";
import { CareerManagement, DownloadManagement } from "@/app/components/publishing-management";
import {
  AdminPermission,
  AdminAuditLog,
  apiFetch,
  Contract,
  DashboardStats,
  DeferredActionResponse,
  Inquiry,
  PortfolioItem,
  readableError,
  Service,
  User,
} from "@/app/lib/api";
import { useProtectedPage } from "@/app/lib/use-session";
import { serializeCSV } from "@/app/lib/csv";

type Tab = "overview" | "inquiries" | "contracts" | "services" | "portfolio" | "downloads" | "careers" | "users" | "accounts" | "access" | "reviews" | "security";
type InquiryFilter = "all" | Inquiry["status"];

const PAGE_SIZE = 8;
const tabOrder: Tab[] = ["overview", "inquiries", "contracts", "services", "portfolio", "downloads", "careers", "users", "accounts", "access", "reviews", "security"];
const tabLabels: Record<Tab, string> = {
  overview: "Overview",
  inquiries: "Inquiries",
  contracts: "Contracts",
  services: "Services",
  portfolio: "Portfolio",
  downloads: "Downloads",
  careers: "Careers",
  users: "Users",
  accounts: "Accounts",
  access: "Access",
  reviews: "Reviews",
  security: "Security",
};
const tabPermissions: Partial<Record<Tab, AdminPermission>> = {
  overview: "overview.view",
  inquiries: "inquiries.view",
  contracts: "contracts.view",
  services: "services.view",
  portfolio: "portfolio.view",
  downloads: "downloads.view",
  careers: "careers.view",
  accounts: "accounts.view",
};

function hasPermission(user: User | null, permission: AdminPermission) {
  return user?.role === "admin" || Boolean(user?.admin_permissions.includes(permission));
}

function canAccessTab(user: User, tab: Tab) {
  if (user.role === "admin") return true;
  const permission = tabPermissions[tab];
  return user.role === "sub_admin" && permission !== undefined && user.admin_permissions.includes(permission);
}

function includesQuery(values: Array<string | undefined>, query: string) {
  const normalized = query.trim().toLowerCase();
  return !normalized || values.some((value) => value?.toLowerCase().includes(normalized));
}

function downloadCSV(filename: string, rows: Array<Array<string | number>>) {
  const csv = serializeCSV(rows);
  const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

const emptyService: Service = {
  id: "",
  number: "",
  slug: "",
  title: "",
  summary: "",
  stack: "",
  position: 0,
  active: true,
  created_at: "",
  updated_at: "",
};

const emptyPortfolio: PortfolioItem = {
  id: "",
  slug: "",
  title: "",
  summary: "",
  technologies: "",
  project_url: "",
  position: 0,
  active: true,
  created_at: "",
  updated_at: "",
};

export default function AdminPage() {
  useProtectedPage({ requireAdmin: true });
  const [tab, setTab] = useState<Tab>("overview");
  const [admin, setAdmin] = useState<User | null>(null);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [inquiries, setInquiries] = useState<Inquiry[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [portfolio, setPortfolio] = useState<PortfolioItem[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [clientUsers, setClientUsers] = useState<User[]>([]);
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [auditLogs, setAuditLogs] = useState<AdminAuditLog[] | null>(null);
  const [serviceForm, setServiceForm] = useState<Service>(emptyService);
  const [portfolioForm, setPortfolioForm] = useState<PortfolioItem>(emptyPortfolio);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const availableTabs = admin ? tabOrder.filter((item) => canAccessTab(admin, item)) : ["overview"] as Tab[];

  useEffect(() => {
    if (!notice) return;
    const timer = window.setTimeout(() => setNotice(""), 4000);
    return () => window.clearTimeout(timer);
  }, [notice]);

  useEffect(() => {
    let active = true;
    apiFetch<{ user: User }>("/auth/me")
      .then(async (profile) => {
        if (profile.user.role !== "admin" && profile.user.role !== "sub_admin") {
          window.location.replace("/account");
          return null;
        }
        const isFullAdmin = profile.user.role === "admin";
        const can = (permission: AdminPermission) => isFullAdmin || profile.user.admin_permissions.includes(permission);
        const [statsData, inquiryData, serviceData, portfolioData, userData, contractData] = await Promise.all([
          can("overview.view") ? apiFetch<{ stats: DashboardStats }>("/admin/stats") : Promise.resolve(null),
          can("inquiries.view") ? apiFetch<{ inquiries: Inquiry[] }>("/admin/inquiries") : Promise.resolve(null),
          can("services.view") ? apiFetch<{ services: Service[] }>("/admin/services") : Promise.resolve(null),
          can("portfolio.view") ? apiFetch<{ portfolio: PortfolioItem[] }>("/admin/portfolio") : Promise.resolve(null),
          isFullAdmin ? apiFetch<{ users: User[] }>("/admin/users") : Promise.resolve(null),
          can("contracts.view") ? apiFetch<{ contracts: Contract[] }>("/admin/contracts") : Promise.resolve(null),
        ]);
        const clientData = can("contracts.view") || can("accounts.view")
          ? await apiFetch<{ users: User[] }>("/admin/client-options")
          : null;
        return { profile, statsData, inquiryData, serviceData, portfolioData, userData, contractData, clientData };
      })
      .then((data) => {
        if (!active || !data) return;
        setAdmin(data.profile.user);
        setStats(data.statsData?.stats ?? null);
        setInquiries(data.inquiryData?.inquiries ?? []);
        setServices(data.serviceData?.services ?? []);
        setPortfolio(data.portfolioData?.portfolio ?? []);
        setUsers(data.userData?.users ?? []);
        setClientUsers(data.clientData?.users ?? []);
        setContracts(data.contractData?.contracts ?? []);
        setTab((current) => canAccessTab(data.profile.user, current) ? current : tabOrder.find((item) => canAccessTab(data.profile.user, item)) ?? "overview");
      })
      .catch((requestError) => {
        if (!active) return;
        setError(readableError(requestError));
        if ((requestError as { status?: number }).status === 401) {
          window.location.replace("/login");
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (tab !== "security" || auditLogs !== null || admin?.role !== "admin") return;
    let active = true;
    apiFetch<{ audit_logs: AdminAuditLog[] }>("/admin/audit-logs")
      .then((response) => {
        if (active) setAuditLogs(response.audit_logs);
      })
      .catch((requestError) => {
        if (!active) return;
        setAuditLogs([]);
        setError(readableError(requestError));
      });
    return () => {
      active = false;
    };
  }, [admin?.role, auditLogs, tab]);

  async function saveService(event: FormEvent) {
    event.preventDefault();
    setError("");
    setNotice("");
    try {
      const path = serviceForm.id ? `/admin/services/${serviceForm.id}` : "/admin/services";
      const response = await apiFetch<{ service: Service }>(path, {
        method: serviceForm.id ? "PUT" : "POST",
        body: JSON.stringify({ number: serviceForm.number, slug: serviceForm.slug, title: serviceForm.title, summary: serviceForm.summary, stack: serviceForm.stack, position: serviceForm.position, active: serviceForm.active }),
      });
      setServices((current) => {
        const next = serviceForm.id
          ? current.map((item) => item.id === response.service.id ? response.service : item)
          : [...current, response.service];
        return next.sort((a, b) => a.position - b.position);
      });
      setServiceForm(emptyService);
      setNotice("Service saved successfully.");
    } catch (requestError) {
      setError(readableError(requestError));
    }
  }

  async function removeService(item: Service) {
    if (!window.confirm(`Delete “${item.title}”?`)) return;
    try {
      const response = await apiFetch<DeferredActionResponse>(`/admin/services/${item.id}`, { method: "DELETE" });
      if (response?.queued) {
        setNotice("Service deletion submitted for full-admin review.");
      } else {
        setServices((current) => current.filter((service) => service.id !== item.id));
        if (serviceForm.id === item.id) setServiceForm(emptyService);
        setNotice("Service deleted.");
      }
    } catch (requestError) {
      setError(readableError(requestError));
    }
  }

  async function savePortfolio(event: FormEvent) {
    event.preventDefault();
    setError("");
    setNotice("");
    try {
      const path = portfolioForm.id ? `/admin/portfolio/${portfolioForm.id}` : "/admin/portfolio";
      const response = await apiFetch<{ portfolio_item: PortfolioItem }>(path, {
        method: portfolioForm.id ? "PUT" : "POST",
        body: JSON.stringify({ slug: portfolioForm.slug, title: portfolioForm.title, summary: portfolioForm.summary, technologies: portfolioForm.technologies, project_url: portfolioForm.project_url || "", position: portfolioForm.position, active: portfolioForm.active }),
      });
      setPortfolio((current) => {
        const next = portfolioForm.id
          ? current.map((item) => item.id === response.portfolio_item.id ? response.portfolio_item : item)
          : [...current, response.portfolio_item];
        return next.sort((a, b) => a.position - b.position);
      });
      setPortfolioForm(emptyPortfolio);
      setNotice("Portfolio item saved successfully.");
    } catch (requestError) {
      setError(readableError(requestError));
    }
  }

  async function removePortfolio(item: PortfolioItem) {
    if (!window.confirm(`Delete “${item.title}”?`)) return;
    try {
      const response = await apiFetch<DeferredActionResponse>(`/admin/portfolio/${item.id}`, { method: "DELETE" });
      if (response?.queued) {
        setNotice("Portfolio deletion submitted for full-admin review.");
      } else {
        setPortfolio((current) => current.filter((project) => project.id !== item.id));
        if (portfolioForm.id === item.id) setPortfolioForm(emptyPortfolio);
        setNotice("Portfolio item deleted.");
      }
    } catch (requestError) {
      setError(readableError(requestError));
    }
  }

  async function updateInquiry(item: Inquiry, status: Inquiry["status"]) {
    try {
      const response = await apiFetch<{ inquiry: Inquiry }>(`/admin/inquiries/${item.id}`, {
        method: "PATCH",
        body: JSON.stringify({ status }),
      });
      setInquiries((current) => current.map((inquiry) => inquiry.id === item.id ? response.inquiry : inquiry));
      setNotice("Inquiry status updated.");
    } catch (requestError) {
      setError(readableError(requestError));
    }
  }

  async function updateRole(user: User, role: User["role"]) {
    if (!window.confirm(`Change ${user.name}'s role to ${role}? This changes their access immediately.`)) return;
    try {
      const response = await apiFetch<{ user: User }>(`/admin/users/${user.id}/role`, {
        method: "PATCH",
        body: JSON.stringify({ role }),
      });
      setUsers((current) => current.map((item) => item.id === user.id ? response.user : item));
      setNotice("User role updated.");
    } catch (requestError) {
      setError(readableError(requestError));
    }
  }

  return (
    <main className={`admin-shell${sidebarOpen ? " is-sidebar-open" : ""}`}>
      <aside className="admin-sidebar" id="admin-sidebar">
        <Link className="portal-brand" href="/"><Image src="/company-logo.png" alt="" width={48} height={48} unoptimized /><span><strong>AKELUWA</strong> SH</span></Link>
        <nav className="admin-section-tabs" aria-label="Admin sections">
          {availableTabs.map((item, index) => (
            <button className={tab === item ? "is-active" : ""} type="button" onClick={() => { setTab(item); setSidebarOpen(false); }} key={item}>
              <span>{String(index + 1).padStart(2, "0")}</span>{tabLabels[item]}
            </button>
          ))}
        </nav>
        <label className="admin-mobile-section-picker">
          <span>Admin section</span>
          <select aria-label="Admin section" value={tab} onChange={(event) => setTab(event.target.value as Tab)}>
            {availableTabs.map((item) => <option value={item} key={item}>{tabLabels[item]}</option>)}
          </select>
        </label>
      </aside>

      <section className="admin-workspace">
        <header className="admin-topbar">
          <div className="admin-live"><button className="admin-sidebar-toggle" type="button" onClick={() => setSidebarOpen((open) => !open)} aria-expanded={sidebarOpen} aria-controls="admin-sidebar" aria-label={sidebarOpen ? "Close admin navigation" : "Open admin navigation"} title={sidebarOpen ? "Close navigation" : "Open navigation"}>{sidebarOpen ? <X aria-hidden="true" /> : <Menu aria-hidden="true" />}</button><span>AKELUWA CONTROL / LIVE</span><i /></div>
          <div className="admin-topbar-right"><ProfileMenu user={admin} onUserChange={setAdmin} openOnHover /></div>
        </header>
        {error && <p className="form-alert is-error admin-alert" role="alert">{error}</p>}
        {notice && <p className="form-alert is-success admin-alert" role="status">{notice}</p>}
        {loading ? <p className="dashboard-state">Loading the control system...</p> : (
          <div className="admin-content">
            {tab === "overview" && <Overview stats={stats} inquiries={inquiries} services={services} portfolio={portfolio} />}
            {tab === "inquiries" && <InquiriesPanel inquiries={inquiries} onUpdate={updateInquiry} canUpdate={hasPermission(admin, "inquiries.update")} />}
            {tab === "contracts" && <ContractManagement initialContracts={contracts} users={clientUsers} adminName={admin?.name || ""} administrator={admin} onContractsChange={setContracts} />}
            {tab === "services" && (
              <ContentPanel title="Services" copy="Control the capabilities shown on the public website.">
                {(serviceForm.id ? hasPermission(admin, "services.update") : hasPermission(admin, "services.create")) && <ServiceEditor value={serviceForm} onChange={setServiceForm} onSubmit={saveService} onCancel={() => setServiceForm(emptyService)} />}
                <ContentRecords items={services} type="service" onEdit={setServiceForm} onDelete={removeService} canEdit={hasPermission(admin, "services.update")} canDelete={hasPermission(admin, "services.delete")} />
              </ContentPanel>
            )}
            {tab === "portfolio" && (
              <ContentPanel title="Portfolio" copy="Edit the projects and proof displayed to visitors.">
                {(portfolioForm.id ? hasPermission(admin, "portfolio.update") : hasPermission(admin, "portfolio.create")) && <PortfolioEditor value={portfolioForm} onChange={setPortfolioForm} onSubmit={savePortfolio} onCancel={() => setPortfolioForm(emptyPortfolio)} />}
                <ContentRecords items={portfolio} type="portfolio" onEdit={setPortfolioForm} onDelete={removePortfolio} canEdit={hasPermission(admin, "portfolio.update")} canDelete={hasPermission(admin, "portfolio.delete")} />
              </ContentPanel>
            )}
            {tab === "downloads" && <DownloadManagement administrator={admin} />}
            {tab === "careers" && <CareerManagement administrator={admin} />}
            {tab === "users" && admin?.role === "admin" && <UsersPanel users={users} currentUserID={admin.id} onUpdate={updateRole} />}
            {tab === "accounts" && <AccountingManagement users={clientUsers} contracts={contracts} administrator={admin} />}
            {tab === "access" && admin?.role === "admin" && <SubAdminManagement />}
            {tab === "reviews" && admin?.role === "admin" && <ActionReviewManagement />}
            {tab === "security" && <SecurityPanel logs={auditLogs} />}
          </div>
        )}
      </section>
    </main>
  );
}

function Overview({ stats, inquiries, services, portfolio }: { stats: DashboardStats | null; inquiries: Inquiry[]; services: Service[]; portfolio: PortfolioItem[] }) {
  const cards = [
    ["REGISTERED USERS", stats?.users ?? 0],
    ["NEW INQUIRIES", stats?.new_inquiries ?? 0],
    ["ACTIVE SERVICES", stats?.active_services ?? 0],
    ["PORTFOLIO ITEMS", stats?.active_projects ?? 0],
  ];
  const pipeline = (["new", "in_progress", "closed"] as Inquiry["status"][]).map((status) => ({
    status,
    count: inquiries.filter((item) => item.status === status).length,
  }));
  const largestPipeline = Math.max(...pipeline.map((item) => item.count), 1);
  return <ContentPanel title="System overview" copy="One operational view of clients, content, and incoming work.">
    <div className="admin-stat-grid">{cards.map(([label, value]) => <article key={label}><span>{label}</span><strong>{String(value).padStart(2, "0")}</strong></article>)}</div>
    <div className="overview-grid">
      <section><div className="panel-heading"><div><span>LATEST INQUIRIES</span><strong>{inquiries.length}</strong></div></div>{inquiries.slice(0, 4).map((item) => <article className="overview-line" key={item.id}><div><strong>{item.name}</strong><span>{item.company || item.email}</span></div><b className={`status-${item.status}`}>{item.status.replace("_", " ")}</b></article>)}</section>
      <section><div className="panel-heading"><div><span>INQUIRY PIPELINE</span><strong>{inquiries.length}</strong></div></div><div className="pipeline-chart">{pipeline.map((item) => <div key={item.status}><span>{item.status.replace("_", " ")}</span><i><b style={{ width: `${(item.count / largestPipeline) * 100}%` }} /></i><strong>{item.count}</strong></div>)}</div></section>
      <section><div className="panel-heading"><div><span>PUBLIC CONTENT</span><strong>{services.length + portfolio.length}</strong></div></div><article className="overview-line"><div><strong>Services</strong><span>{services.filter((item) => item.active).length} publicly visible</span></div></article><article className="overview-line"><div><strong>Portfolio</strong><span>{portfolio.filter((item) => item.active).length} publicly visible</span></div></article></section>
      <section><div className="panel-heading"><div><span>ATTENTION</span><strong>{pipeline[0].count}</strong></div></div><p className="overview-note">{pipeline[0].count ? `${pipeline[0].count} new project ${pipeline[0].count === 1 ? "inquiry needs" : "inquiries need"} a response.` : "Every inquiry has been reviewed. The pipeline is clear."}</p></section>
    </div>
  </ContentPanel>;
}

function ContentPanel({ title, copy, children }: { title: string; copy: string; children: React.ReactNode }) {
  return <section className="admin-panel"><div className="admin-panel-heading"><p className="portal-kicker">MANAGEMENT FIELD / ACTIVE</p><h1>{title}</h1><p>{copy}</p></div>{children}</section>;
}

function InquiriesPanel({ inquiries, onUpdate, canUpdate }: { inquiries: Inquiry[]; onUpdate: (item: Inquiry, status: Inquiry["status"]) => void; canUpdate: boolean }) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<InquiryFilter>("all");
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<Inquiry | null>(null);
  const filtered = useMemo(() => inquiries.filter((item) =>
    (filter === "all" || item.status === filter) && includesQuery([item.name, item.email, item.company, item.budget, item.message], query)
  ), [filter, inquiries, query]);
  const pages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const visible = filtered.slice((Math.min(page, pages) - 1) * PAGE_SIZE, Math.min(page, pages) * PAGE_SIZE);

  function exportInquiries() {
    downloadCSV("akeluwa-inquiries.csv", [
      ["Name", "Email", "Company", "Budget", "Status", "Message", "Created"],
      ...filtered.map((item) => [item.name, item.email, item.company || "", item.budget || "", item.status, item.message, item.created_at]),
    ]);
  }

  return <ContentPanel title="Project inquiries" copy="Review every incoming request and keep its delivery status clear.">
    <AdminToolbar query={query} onQuery={(value) => { setQuery(value); setPage(1); }} placeholder="Search name, email, company or message">
      <select aria-label="Filter inquiries by status" value={filter} onChange={(event) => { setFilter(event.target.value as InquiryFilter); setPage(1); }}><option value="all">All statuses</option><option value="new">New</option><option value="in_progress">In progress</option><option value="closed">Closed</option></select>
      <button type="button" onClick={exportInquiries} disabled={!filtered.length}>Export CSV</button>
    </AdminToolbar>
    <p className="result-count">Showing {visible.length} of {filtered.length} matching inquiries</p>
    <div className="inquiry-admin-list">{visible.length === 0 ? <EmptyState title="No matching inquiries" copy="Try another search or status filter." /> : visible.map((item) => <article key={item.id}>
      <div className="inquiry-admin-meta"><span>{new Date(item.created_at).toLocaleString()}</span><select aria-label={`Status for ${item.name}`} value={item.status} disabled={!canUpdate} onChange={(event) => onUpdate(item, event.target.value as Inquiry["status"])}><option value="new">New</option><option value="in_progress">In progress</option><option value="closed">Closed</option></select></div>
      <h2>{item.name}</h2><a href={`mailto:${item.email}`}>{item.email}</a><p>{item.message}</p><div className="inquiry-admin-foot"><span>{item.company || "No company"}</span><span>{item.budget || "Budget not specified"}</span></div><button className="inquiry-open" type="button" onClick={() => setSelected(item)}>View details</button>
    </article>)}</div>
    <Pagination page={Math.min(page, pages)} pages={pages} onChange={setPage} />
    {selected && <InquiryDialog item={selected} onClose={() => setSelected(null)} canUpdate={canUpdate} onUpdate={(status) => { onUpdate(selected, status); setSelected({ ...selected, status }); }} />}
  </ContentPanel>;
}

function AdminToolbar({ query, onQuery, placeholder, children }: { query: string; onQuery: (value: string) => void; placeholder: string; children?: React.ReactNode }) {
  return <div className="admin-toolbar"><label><span className="sr-only">Search</span><input type="search" value={query} onChange={(event) => onQuery(event.target.value)} placeholder={placeholder} /></label><div>{children}</div></div>;
}

function Pagination({ page, pages, onChange }: { page: number; pages: number; onChange: (page: number) => void }) {
  if (pages <= 1) return null;
  return <nav className="admin-pagination" aria-label="Pagination"><button type="button" disabled={page === 1} onClick={() => onChange(page - 1)}>Previous</button><span>Page {page} of {pages}</span><button type="button" disabled={page === pages} onClick={() => onChange(page + 1)}>Next</button></nav>;
}

function EmptyState({ title, copy }: { title: string; copy: string }) {
  return <div className="admin-empty"><strong>{title}</strong><p>{copy}</p></div>;
}

function InquiryDialog({ item, onClose, onUpdate, canUpdate }: { item: Inquiry; onClose: () => void; onUpdate: (status: Inquiry["status"]) => void; canUpdate: boolean }) {
  return <div className="admin-modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}><section className="admin-modal" role="dialog" aria-modal="true" aria-labelledby="inquiry-dialog-title"><button className="admin-modal-close" type="button" onClick={onClose} aria-label="Close inquiry details">×</button><p className="portal-kicker">PROJECT INQUIRY / {item.status.replace("_", " ")}</p><h2 id="inquiry-dialog-title">{item.name}</h2><div className="inquiry-detail-grid"><div><span>Email</span><a href={`mailto:${item.email}`}>{item.email}</a></div><div><span>Company</span><strong>{item.company || "Not provided"}</strong></div><div><span>Budget</span><strong>{item.budget || "Not specified"}</strong></div><div><span>Received</span><strong>{new Date(item.created_at).toLocaleString()}</strong></div></div><div className="inquiry-message"><span>Project brief</span><p>{item.message}</p></div><div className="modal-actions"><a className="portal-primary" href={`mailto:${item.email}?subject=${encodeURIComponent("Your AKELUWA SH project inquiry")}`}>Reply by email</a><select aria-label="Update inquiry status" value={item.status} disabled={!canUpdate} onChange={(event) => onUpdate(event.target.value as Inquiry["status"])}><option value="new">New</option><option value="in_progress">In progress</option><option value="closed">Closed</option></select></div></section></div>;
}

function ServiceEditor({ value, onChange, onSubmit, onCancel }: { value: Service; onChange: (value: Service) => void; onSubmit: (event: FormEvent) => void; onCancel: () => void }) {
  return <form className="content-editor" onSubmit={onSubmit}><div className="editor-grid"><label>Number<input value={value.number} onChange={(event) => onChange({ ...value, number: event.target.value })} required /></label><label>Slug<input value={value.slug} onChange={(event) => onChange({ ...value, slug: event.target.value })} required pattern="[a-z0-9]+(?:-[a-z0-9]+)*" /></label><label className="wide-field">Title<input value={value.title} onChange={(event) => onChange({ ...value, title: event.target.value })} required /></label><label className="wide-field">Summary<textarea value={value.summary} onChange={(event) => onChange({ ...value, summary: event.target.value })} required minLength={10} /></label><label className="wide-field">Technology stack<input value={value.stack} onChange={(event) => onChange({ ...value, stack: event.target.value })} required /></label><label>Position<input type="number" value={value.position} onChange={(event) => onChange({ ...value, position: Number(event.target.value) })} /></label><label className="check-field"><input type="checkbox" checked={value.active} onChange={(event) => onChange({ ...value, active: event.target.checked })} /> Visible publicly</label></div><div className="editor-actions"><button className="portal-primary" type="submit">{value.id ? "Update service" : "Add service"}</button>{value.id && <button type="button" onClick={onCancel}>Cancel editing</button>}</div></form>;
}

function PortfolioEditor({ value, onChange, onSubmit, onCancel }: { value: PortfolioItem; onChange: (value: PortfolioItem) => void; onSubmit: (event: FormEvent) => void; onCancel: () => void }) {
  return <form className="content-editor" onSubmit={onSubmit}><div className="editor-grid"><label>Slug<input value={value.slug} onChange={(event) => onChange({ ...value, slug: event.target.value })} required pattern="[a-z0-9]+(?:-[a-z0-9]+)*" /></label><label>Position<input type="number" value={value.position} onChange={(event) => onChange({ ...value, position: Number(event.target.value) })} /></label><label className="wide-field">Title<input value={value.title} onChange={(event) => onChange({ ...value, title: event.target.value })} required /></label><label className="wide-field">Summary<textarea value={value.summary} onChange={(event) => onChange({ ...value, summary: event.target.value })} required minLength={10} /></label><label className="wide-field">Technologies<input value={value.technologies} onChange={(event) => onChange({ ...value, technologies: event.target.value })} required /></label><label className="wide-field">Project URL <small>optional</small><input type="url" value={value.project_url || ""} onChange={(event) => onChange({ ...value, project_url: event.target.value })} /></label><label className="check-field"><input type="checkbox" checked={value.active} onChange={(event) => onChange({ ...value, active: event.target.checked })} /> Visible publicly</label></div><div className="editor-actions"><button className="portal-primary" type="submit">{value.id ? "Update project" : "Add project"}</button>{value.id && <button type="button" onClick={onCancel}>Cancel editing</button>}</div></form>;
}

function RecordCard({ label, title, copy, active, onEdit, onDelete, canEdit, canDelete }: { label: string; title: string; copy: string; active: boolean; onEdit: () => void; onDelete: () => void; canEdit: boolean; canDelete: boolean }) {
  return <article><span>{label}</span><div><strong>{title}</strong><p>{copy}</p></div><b className={active ? "is-public" : "is-hidden"}>{active ? "Public" : "Hidden"}</b>{canEdit && <button type="button" onClick={onEdit}>Edit</button>}{canDelete && <button className="danger-action" type="button" onClick={onDelete}>Delete</button>}</article>;
}

function ContentRecords<T extends Service | PortfolioItem>({ items, type, onEdit, onDelete, canEdit, canDelete }: { items: T[]; type: "service" | "portfolio"; onEdit: (item: T) => void; onDelete: (item: T) => void; canEdit: boolean; canDelete: boolean }) {
  const [query, setQuery] = useState("");
  const [visibility, setVisibility] = useState<"all" | "public" | "hidden">("all");
  const filtered = useMemo(() => items.filter((item) => {
    const copy = "stack" in item ? item.stack : item.technologies;
    return includesQuery([item.title, item.slug, item.summary, copy], query) && (visibility === "all" || item.active === (visibility === "public"));
  }), [items, query, visibility]);
  return <><AdminToolbar query={query} onQuery={setQuery} placeholder={`Search ${type === "service" ? "services" : "projects"}`}><select aria-label="Filter by visibility" value={visibility} onChange={(event) => setVisibility(event.target.value as "all" | "public" | "hidden")}><option value="all">All visibility</option><option value="public">Public</option><option value="hidden">Hidden</option></select></AdminToolbar><p className="result-count">{filtered.length} of {items.length} records</p><div className="admin-record-list">{filtered.length ? filtered.map((item) => <RecordCard key={item.id} label={type === "service" && "number" in item ? item.number : String(item.position).padStart(2, "0")} title={item.title} copy={"stack" in item ? item.stack : item.technologies} active={item.active} onEdit={() => onEdit(item)} onDelete={() => onDelete(item)} canEdit={canEdit} canDelete={canDelete} />) : <EmptyState title="No matching content" copy="Try another search or visibility filter." />}</div></>;
}

function UsersPanel({ users, currentUserID, onUpdate }: { users: User[]; currentUserID: string; onUpdate: (user: User, role: User["role"]) => void }) {
  const [query, setQuery] = useState("");
  const [role, setRole] = useState<"all" | User["role"]>("all");
  const [page, setPage] = useState(1);
  const filtered = useMemo(() => users.filter((user) => (role === "all" || user.role === role) && includesQuery([user.name, user.email], query)), [query, role, users]);
  const pages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const visible = filtered.slice((Math.min(page, pages) - 1) * PAGE_SIZE, Math.min(page, pages) * PAGE_SIZE);
  function exportUsers() {
    downloadCSV("akeluwa-users.csv", [["Name", "Email", "Role", "MFA", "Joined"], ...filtered.map((user) => [user.name, user.email, user.role, user.mfa_enabled ? "Enabled" : "Not enrolled", user.created_at])]);
  }
  return <ContentPanel title="User accounts" copy="Review registered clients and control administrator access."><AdminToolbar query={query} onQuery={(value) => { setQuery(value); setPage(1); }} placeholder="Search name or email"><select aria-label="Filter users by role" value={role} onChange={(event) => { setRole(event.target.value as "all" | User["role"]); setPage(1); }}><option value="all">All roles</option><option value="user">Clients</option><option value="admin">Administrators</option></select><button type="button" onClick={exportUsers} disabled={!filtered.length}>Export CSV</button></AdminToolbar><p className="result-count">Showing {visible.length} of {filtered.length} matching accounts</p><div className="user-table"><div className="user-table-head"><span>User</span><span>Joined</span><span>Role</span></div>{visible.length ? visible.map((user) => <article key={user.id}><div><strong>{user.name}{user.id === currentUserID && <small>YOU</small>}</strong><span>{user.email}</span>{user.role === "admin" && <small className={user.mfa_enabled ? "mfa-ready" : "mfa-pending"}>{user.mfa_enabled ? "MFA enabled" : "MFA enrollment pending"}</small>}</div><time>{new Date(user.created_at).toLocaleDateString()}</time><select aria-label={`Role for ${user.name}`} value={user.role} disabled={user.id === currentUserID} onChange={(event) => onUpdate(user, event.target.value as User["role"])}><option value="user">User</option><option value="admin">Admin</option></select></article>) : <EmptyState title="No matching users" copy="Try another search or role filter." />}</div><Pagination page={Math.min(page, pages)} pages={pages} onChange={setPage} /></ContentPanel>;
}

function SecurityPanel({ logs }: { logs: AdminAuditLog[] | null }) {
  const [query, setQuery] = useState("");
  const [result, setResult] = useState<"all" | "success" | "failed">("all");
  const [page, setPage] = useState(1);
  const filtered = useMemo(() => (logs || []).filter((entry) => {
    const matchesResult = result === "all" || (result === "success" ? entry.status < 400 : entry.status >= 400);
    return matchesResult && includesQuery([entry.actor_name, entry.method, entry.path, entry.source_ip], query);
  }), [logs, query, result]);
  const pages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const visible = filtered.slice((Math.min(page, pages) - 1) * PAGE_SIZE, Math.min(page, pages) * PAGE_SIZE);

  return <ContentPanel title="Security activity" copy="A permanent record of administrative changes, their source, and result.">
    <div className="security-summary"><article><span>ADMIN MFA</span><strong>Required</strong></article><article><span>AUDIT STORAGE</span><strong>Append-only</strong></article></div>
    <AdminToolbar query={query} onQuery={(value) => { setQuery(value); setPage(1); }} placeholder="Search actor, route or IP address"><select aria-label="Filter audit result" value={result} onChange={(event) => { setResult(event.target.value as "all" | "success" | "failed"); setPage(1); }}><option value="all">All results</option><option value="success">Successful</option><option value="failed">Failed</option></select></AdminToolbar>
    <p className="result-count">{logs === null ? "Loading security activity" : `Showing ${visible.length} of ${filtered.length} matching actions`}</p>
    <div className="audit-table"><div className="audit-table-head"><span>Actor and action</span><span>Source</span><span>Result</span><span>Time</span></div>{logs === null ? <p className="dashboard-state">Loading audit records...</p> : visible.length ? visible.map((entry) => <article key={entry.id}><div><strong>{entry.actor_name || "Former administrator"}</strong><code>{entry.method} {entry.path}</code></div><span title={entry.user_agent}>{entry.source_ip || "Unknown"}</span><b className={entry.status < 400 ? "audit-success" : "audit-failed"}>{entry.status}</b><time>{new Date(entry.created_at).toLocaleString()}</time></article>) : <EmptyState title="No matching activity" copy="Administrative changes will appear here." />}</div>
    <Pagination page={Math.min(page, pages)} pages={pages} onChange={setPage} />
  </ContentPanel>;
}
