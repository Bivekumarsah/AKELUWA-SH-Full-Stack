export const API_BASE_URL = (
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080/api/v1"
).replace(/\/$/, "");

export type User = {
  id: string;
  name: string;
  email: string;
  role: "user" | "admin";
  created_at: string;
  avatar_updated_at?: string;
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
