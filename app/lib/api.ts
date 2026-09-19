export const API_BASE_URL = (
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080/api/v1"
).replace(/\/$/, "");

export type AdminPermission =
  | "overview.view"
  | "inquiries.view" | "inquiries.update"
  | "contracts.view" | "contracts.create" | "contracts.update"
  | "services.view" | "services.create" | "services.update" | "services.delete"
  | "portfolio.view" | "portfolio.create" | "portfolio.update" | "portfolio.delete"
  | "downloads.view" | "downloads.create" | "downloads.update" | "downloads.delete"
  | "careers.view" | "careers.create" | "careers.update" | "careers.delete"
  | "accounts.view" | "accounts.create" | "accounts.update" | "accounts.delete";

export type User = {
  id: string;
  name: string;
  email: string;
  role: "user" | "admin" | "sub_admin";
  admin_permissions: AdminPermission[];
  account_active: boolean;
  mfa_enabled: boolean;
  created_at: string;
  avatar_updated_at?: string;
};

export type AdminAuditLog = {
  id: number;
  actor_id?: string;
  actor_name?: string;
  method: string;
  path: string;
  status: number;
  source_ip: string;
  user_agent: string;
  created_at: string;
};

export type AdminActionRequest = {
  id: string;
  requester_id: string;
  requester_name: string;
  action: string;
  target_id: string;
  target_label: string;
  status: "pending" | "processing" | "approved" | "rejected" | "failed";
  reviewed_by?: string;
  reviewer_name?: string;
  review_note: string;
  failure_message: string;
  created_at: string;
  reviewed_at?: string;
};

export type DeferredActionResponse = {
  queued?: boolean;
  action_request?: AdminActionRequest;
};

export type CompanyAccount = {
  display_name: string;
  legal_name: string;
  tagline: string;
  tagline_meaning: string;
  primary_email: string;
  support_email: string;
  careers_email: string;
  phone: string;
  website_url: string;
  registration_number: string;
  tax_id: string;
  address_line: string;
  city: string;
  region: string;
  postal_code: string;
  country: string;
  timezone: string;
  currency: string;
  linkedin_url: string;
  github_url: string;
  created_at: string;
  updated_at: string;
};

export type CompanyBrand = Pick<
  CompanyAccount,
  "display_name" | "tagline" | "tagline_meaning"
>;

export type InvoiceItem = {
  id: string;
  description: string;
  quantity: number;
  unit_price_cents: number;
  position: number;
};

export type Invoice = {
  id: string;
  contract_id?: string;
  user_id?: string;
  invoice_number: string;
  client_name: string;
  client_email: string;
  client_company?: string;
  issue_date: string;
  due_date: string;
  currency: string;
  subtotal_cents: number;
  tax_cents: number;
  discount_cents: number;
  total_cents: number;
  paid_cents: number;
  balance_cents: number;
  notes: string;
  status: "sent" | "partial" | "paid" | "overdue" | "void";
  items: InvoiceItem[];
  created_at: string;
  updated_at: string;
};

export type AccountingTransaction = {
  id: string;
  invoice_id?: string;
  invoice_number?: string;
  direction: "income" | "expense";
  category: string;
  description: string;
  counterparty: string;
  amount_cents: number;
  currency: string;
  payment_method: "cash" | "bank_transfer" | "card" | "mobile_wallet" | "cheque" | "other";
  reference: string;
  receipt_number?: string;
  transaction_date: string;
  notes: string;
  status: "posted" | "void";
  created_at: string;
  updated_at: string;
};

export type AccountingSummary = {
  currency: string;
  income_cents: number;
  expense_cents: number;
  net_cents: number;
  receivable_cents: number;
};

export type Service = {
  id: string;
  number: string;
  slug: string;
  title: string;
  summary: string;
  stack: string;
  position: number;
  active: boolean;
  created_at: string;
  updated_at: string;
};

export type PortfolioItem = {
  id: string;
  slug: string;
  title: string;
  summary: string;
  technologies: string;
  project_url?: string;
  position: number;
  active: boolean;
  created_at: string;
  updated_at: string;
};

export type Inquiry = {
  id: string;
  user_id?: string;
  name: string;
  email: string;
  company?: string;
  budget?: string;
  message: string;
  status: "new" | "in_progress" | "closed";
  created_at: string;
  updated_at: string;
};

export type DashboardStats = {
  users: number;
  new_inquiries: number;
  active_services: number;
  active_projects: number;
};

export type Contract = {
  id: string;
  user_id: string;
  inquiry_id?: string;
  contract_number: string;
  title: string;
  client_name: string;
  client_email: string;
  client_company?: string;
  provider_name: string;
  currency: string;
  amount_cents: number;
  start_date: string;
  end_date: string;
  scope: string;
  deliverables: string;
  milestones: string;
  payment_terms: string;
  revision_terms: string;
  support_terms: string;
  ownership_terms: string;
  confidentiality_terms: string;
  termination_terms: string;
  dispute_terms: string;
  special_terms: string;
  status: "draft" | "pending" | "active" | "completed" | "cancelled";
  version: number;
  content_hash: string;
  provider_signer_name: string;
  provider_signature?: string;
  provider_signed_at?: string;
  client_signer_name: string;
  client_signature?: string;
  client_signed_at?: string;
  sent_at?: string;
  created_at: string;
  updated_at: string;
};

export type DownloadResource = {
  id: string; title: string; description: string; file_name: string; content_type: string;
  file_size: number; active: boolean; position: number; download_count: number;
  created_at: string; updated_at: string;
};

export type Career = {
  id: string; title: string; department: string; location: string; employment_type: string;
  summary: string; responsibilities: string; requirements: string; apply_email: string;
  deadline?: string; active: boolean; position: number; created_at: string; updated_at: string;
};

export type CareerApplication = {
  id:string; career_id:string; career_title:string; full_name:string; email:string; phone:string;
  location:string; linkedin_url?:string; portfolio_url?:string; cover_note:string; resume_name:string;
  resume_type:string; resume_size:number; status:"new"|"reviewing"|"shortlisted"|"interview"|"rejected"|"hired";
  consent_at:string; created_at:string; updated_at:string;
};

export class APIError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "APIError";
    this.status = status;
  }
}

export async function apiFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers);
  if (init.body && !(init.body instanceof FormData) && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      ...init,
      headers,
      credentials: "include",
    });
  } catch {
    throw new APIError("The AKELUWA service is currently unreachable.", 0);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  const payload = (await response.json().catch(() => ({}))) as { error?: string };
  if (!response.ok) {
    throw new APIError(payload.error || "The request could not be completed.", response.status);
  }
  return payload as T;
}

export function readableError(error: unknown): string {
  return error instanceof Error ? error.message : "Something went wrong. Please try again.";
}
