export const API_BASE_URL = (
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080/api/v1"
).replace(/\/$/, "");

export type User = {
  id: string;
  name: string;
  email: string;
  role: "user" | "admin";
  created_at: string;
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
  if (init.body && !headers.has("Content-Type")) {
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
