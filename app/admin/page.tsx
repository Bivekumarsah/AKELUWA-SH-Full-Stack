"use client";

import { FormEvent, useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  apiFetch,
  DashboardStats,
  Inquiry,
  PortfolioItem,
  readableError,
  Service,
  User,
} from "@/app/lib/api";

type Tab = "overview" | "inquiries" | "services" | "portfolio" | "users";

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
  const [tab, setTab] = useState<Tab>("overview");
  const [admin, setAdmin] = useState<User | null>(null);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [inquiries, setInquiries] = useState<Inquiry[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [portfolio, setPortfolio] = useState<PortfolioItem[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [serviceForm, setServiceForm] = useState<Service>(emptyService);
  const [portfolioForm, setPortfolioForm] = useState<PortfolioItem>(emptyPortfolio);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    apiFetch<{ user: User }>("/auth/me")
      .then(async (profile) => {
        if (profile.user.role !== "admin") {
          window.location.assign("/account");
          return null;
        }
        const [statsData, inquiryData, serviceData, portfolioData, userData] = await Promise.all([
          apiFetch<{ stats: DashboardStats }>("/admin/stats"),
          apiFetch<{ inquiries: Inquiry[] }>("/admin/inquiries"),
          apiFetch<{ services: Service[] }>("/admin/services"),
          apiFetch<{ portfolio: PortfolioItem[] }>("/admin/portfolio"),
          apiFetch<{ users: User[] }>("/admin/users"),
        ]);
        return { profile, statsData, inquiryData, serviceData, portfolioData, userData };
      })
      .then((data) => {
        if (!active || !data) return;
        setAdmin(data.profile.user);
        setStats(data.statsData.stats);
        setInquiries(data.inquiryData.inquiries);
        setServices(data.serviceData.services);
        setPortfolio(data.portfolioData.portfolio);
        setUsers(data.userData.users);
      })
      .catch((requestError) => {
        if (!active) return;
        setError(readableError(requestError));
        if ((requestError as { status?: number }).status === 401) {
          window.location.assign("/login");
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  async function saveService(event: FormEvent) {
    event.preventDefault();
    setError("");
    setNotice("");
    try {
      const path = serviceForm.id ? `/admin/services/${serviceForm.id}` : "/admin/services";
      const response = await apiFetch<{ service: Service }>(path, {
        method: serviceForm.id ? "PUT" : "POST",
        body: JSON.stringify(serviceForm),
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
      await apiFetch(`/admin/services/${item.id}`, { method: "DELETE" });
      setServices((current) => current.filter((service) => service.id !== item.id));
      if (serviceForm.id === item.id) setServiceForm(emptyService);
      setNotice("Service deleted.");
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
        body: JSON.stringify(portfolioForm),
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
      await apiFetch(`/admin/portfolio/${item.id}`, { method: "DELETE" });
      setPortfolio((current) => current.filter((project) => project.id !== item.id));
      if (portfolioForm.id === item.id) setPortfolioForm(emptyPortfolio);
      setNotice("Portfolio item deleted.");
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

  async function logout() {
    await apiFetch("/auth/logout", { method: "POST", body: "{}" }).catch(() => undefined);
    window.location.assign("/");
  }

  return (
    <main className="admin-shell">
      <aside className="admin-sidebar">
        <Link className="portal-brand" href="/"><Image src="/company-logo.png" alt="" width={48} height={48} unoptimized /><span><strong>AKELUWA</strong> SH</span></Link>
        <div className="admin-identity"><span>ADMINISTRATOR</span><strong>{admin?.name || "Secure console"}</strong><small>{admin?.email}</small></div>
        <nav aria-label="Admin sections">
          {(["overview", "inquiries", "services", "portfolio", "users"] as Tab[]).map((item, index) => (
            <button className={tab === item ? "is-active" : ""} type="button" onClick={() => setTab(item)} key={item}>
              <span>{String(index + 1).padStart(2, "0")}</span>{item}
            </button>
          ))}
        </nav>
        <button className="admin-logout" type="button" onClick={logout}>Sign out ↗</button>
      </aside>

      <section className="admin-workspace">
        <header className="admin-topbar"><div><span>AKELUWA CONTROL / LIVE</span><i /></div><Link href="/" target="_blank">Open public website ↗</Link></header>
        {error && <p className="form-alert is-error admin-alert" role="alert">{error}</p>}
        {notice && <p className="form-alert is-success admin-alert" role="status">{notice}</p>}
        {loading ? <p className="dashboard-state">Loading the control system…</p> : (
          <div className="admin-content">
            {tab === "overview" && <Overview stats={stats} inquiries={inquiries} services={services} portfolio={portfolio} />}
            {tab === "inquiries" && <InquiriesPanel inquiries={inquiries} onUpdate={updateInquiry} />}
            {tab === "services" && (
              <ContentPanel title="Services" copy="Control the capabilities shown on the public website.">
                <ServiceEditor value={serviceForm} onChange={setServiceForm} onSubmit={saveService} onCancel={() => setServiceForm(emptyService)} />
                <div className="admin-record-list">{services.map((item) => <RecordCard key={item.id} label={item.number} title={item.title} copy={item.stack} active={item.active} onEdit={() => setServiceForm(item)} onDelete={() => removeService(item)} />)}</div>
              </ContentPanel>
            )}
            {tab === "portfolio" && (
              <ContentPanel title="Portfolio" copy="Edit the projects and proof displayed to visitors.">
                <PortfolioEditor value={portfolioForm} onChange={setPortfolioForm} onSubmit={savePortfolio} onCancel={() => setPortfolioForm(emptyPortfolio)} />
                <div className="admin-record-list">{portfolio.map((item) => <RecordCard key={item.id} label={String(item.position).padStart(2, "0")} title={item.title} copy={item.technologies} active={item.active} onEdit={() => setPortfolioForm(item)} onDelete={() => removePortfolio(item)} />)}</div>
              </ContentPanel>
            )}
            {tab === "users" && <UsersPanel users={users} currentUserID={admin?.id || ""} onUpdate={updateRole} />}
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
  return <ContentPanel title="System overview" copy="One operational view of clients, content, and incoming work.">
    <div className="admin-stat-grid">{cards.map(([label, value]) => <article key={label}><span>{label}</span><strong>{String(value).padStart(2, "0")}</strong></article>)}</div>
    <div className="overview-grid">
      <section><div className="panel-heading"><div><span>LATEST INQUIRIES</span><strong>{inquiries.length}</strong></div></div>{inquiries.slice(0, 4).map((item) => <article className="overview-line" key={item.id}><div><strong>{item.name}</strong><span>{item.company || item.email}</span></div><b className={`status-${item.status}`}>{item.status.replace("_", " ")}</b></article>)}</section>
      <section><div className="panel-heading"><div><span>PUBLIC CONTENT</span><strong>{services.length + portfolio.length}</strong></div></div><article className="overview-line"><div><strong>Services</strong><span>{services.filter((item) => item.active).length} publicly visible</span></div></article><article className="overview-line"><div><strong>Portfolio</strong><span>{portfolio.filter((item) => item.active).length} publicly visible</span></div></article></section>
    </div>
  </ContentPanel>;
}

function ContentPanel({ title, copy, children }: { title: string; copy: string; children: React.ReactNode }) {
  return <section className="admin-panel"><div className="admin-panel-heading"><p className="portal-kicker">MANAGEMENT FIELD / ACTIVE</p><h1>{title}</h1><p>{copy}</p></div>{children}</section>;
}

function InquiriesPanel({ inquiries, onUpdate }: { inquiries: Inquiry[]; onUpdate: (item: Inquiry, status: Inquiry["status"]) => void }) {
  return <ContentPanel title="Project inquiries" copy="Review every incoming request and keep its delivery status clear.">
    <div className="inquiry-admin-list">{inquiries.length === 0 ? <p className="dashboard-state">No inquiries have arrived.</p> : inquiries.map((item) => <article key={item.id}>
      <div className="inquiry-admin-meta"><span>{new Date(item.created_at).toLocaleString()}</span><select aria-label={`Status for ${item.name}`} value={item.status} onChange={(event) => onUpdate(item, event.target.value as Inquiry["status"])}><option value="new">New</option><option value="in_progress">In progress</option><option value="closed">Closed</option></select></div>
      <h2>{item.name}</h2><a href={`mailto:${item.email}`}>{item.email}</a><p>{item.message}</p><div className="inquiry-admin-foot"><span>{item.company || "No company"}</span><span>{item.budget || "Budget not specified"}</span></div>
    </article>)}</div>
  </ContentPanel>;
}

function ServiceEditor({ value, onChange, onSubmit, onCancel }: { value: Service; onChange: (value: Service) => void; onSubmit: (event: FormEvent) => void; onCancel: () => void }) {
  return <form className="content-editor" onSubmit={onSubmit}><div className="editor-grid"><label>Number<input value={value.number} onChange={(event) => onChange({ ...value, number: event.target.value })} required /></label><label>Slug<input value={value.slug} onChange={(event) => onChange({ ...value, slug: event.target.value })} required pattern="[a-z0-9]+(?:-[a-z0-9]+)*" /></label><label className="wide-field">Title<input value={value.title} onChange={(event) => onChange({ ...value, title: event.target.value })} required /></label><label className="wide-field">Summary<textarea value={value.summary} onChange={(event) => onChange({ ...value, summary: event.target.value })} required minLength={10} /></label><label className="wide-field">Technology stack<input value={value.stack} onChange={(event) => onChange({ ...value, stack: event.target.value })} required /></label><label>Position<input type="number" value={value.position} onChange={(event) => onChange({ ...value, position: Number(event.target.value) })} /></label><label className="check-field"><input type="checkbox" checked={value.active} onChange={(event) => onChange({ ...value, active: event.target.checked })} /> Visible publicly</label></div><div className="editor-actions"><button className="portal-primary" type="submit">{value.id ? "Update service" : "Add service"}</button>{value.id && <button type="button" onClick={onCancel}>Cancel editing</button>}</div></form>;
}

function PortfolioEditor({ value, onChange, onSubmit, onCancel }: { value: PortfolioItem; onChange: (value: PortfolioItem) => void; onSubmit: (event: FormEvent) => void; onCancel: () => void }) {
  return <form className="content-editor" onSubmit={onSubmit}><div className="editor-grid"><label>Slug<input value={value.slug} onChange={(event) => onChange({ ...value, slug: event.target.value })} required pattern="[a-z0-9]+(?:-[a-z0-9]+)*" /></label><label>Position<input type="number" value={value.position} onChange={(event) => onChange({ ...value, position: Number(event.target.value) })} /></label><label className="wide-field">Title<input value={value.title} onChange={(event) => onChange({ ...value, title: event.target.value })} required /></label><label className="wide-field">Summary<textarea value={value.summary} onChange={(event) => onChange({ ...value, summary: event.target.value })} required minLength={10} /></label><label className="wide-field">Technologies<input value={value.technologies} onChange={(event) => onChange({ ...value, technologies: event.target.value })} required /></label><label className="wide-field">Project URL <small>optional</small><input type="url" value={value.project_url || ""} onChange={(event) => onChange({ ...value, project_url: event.target.value })} /></label><label className="check-field"><input type="checkbox" checked={value.active} onChange={(event) => onChange({ ...value, active: event.target.checked })} /> Visible publicly</label></div><div className="editor-actions"><button className="portal-primary" type="submit">{value.id ? "Update project" : "Add project"}</button>{value.id && <button type="button" onClick={onCancel}>Cancel editing</button>}</div></form>;
}

function RecordCard({ label, title, copy, active, onEdit, onDelete }: { label: string; title: string; copy: string; active: boolean; onEdit: () => void; onDelete: () => void }) {
  return <article><span>{label}</span><div><strong>{title}</strong><p>{copy}</p></div><b className={active ? "is-public" : "is-hidden"}>{active ? "Public" : "Hidden"}</b><button type="button" onClick={onEdit}>Edit</button><button className="danger-action" type="button" onClick={onDelete}>Delete</button></article>;
}

function UsersPanel({ users, currentUserID, onUpdate }: { users: User[]; currentUserID: string; onUpdate: (user: User, role: User["role"]) => void }) {
  return <ContentPanel title="User accounts" copy="Review registered clients and control administrator access."><div className="user-table"><div className="user-table-head"><span>User</span><span>Joined</span><span>Role</span></div>{users.map((user) => <article key={user.id}><div><strong>{user.name}</strong><span>{user.email}</span></div><time>{new Date(user.created_at).toLocaleDateString()}</time><select aria-label={`Role for ${user.name}`} value={user.role} disabled={user.id === currentUserID} onChange={(event) => onUpdate(user, event.target.value as User["role"])}><option value="user">User</option><option value="admin">Admin</option></select></article>)}</div></ContentPanel>;
}
