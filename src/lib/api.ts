// In dev: requests go through Vite proxy (/api -> localhost:8080)
// TODO: set PUBLIC_API_URL in .env for production
const BASE = import.meta.env.PUBLIC_API_URL ?? '/api';

export interface ApiError {
  code: string;
  message: string;
  fields?: Record<string, string>;
}

export interface SignupPayload {
  email: string;
  username: string;
  password: string;
}

export interface SigninPayload {
  email: string;
  password: string;
}

export interface SigninTokens {
  accessToken: string;
  refreshToken: string;
}

async function parseError(res: Response): Promise<ApiError> {
  try {
    return await res.json();
  } catch {
    return { code: 'internal_error', message: 'Unknown error' };
  }
}

// Returns tokens on success, ApiError otherwise
export async function signin(payload: SigninPayload): Promise<SigninTokens | ApiError> {
  const res = await fetch(`${BASE}/signin`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (res.status === 200) return res.json() as Promise<SigninTokens>;
  return parseError(res);
}

// Returns null on success, ApiError otherwise
export async function signout(refreshToken: string): Promise<ApiError | null> {
  const res = await fetch(`${BASE}/signout`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refreshToken }),
  });

  if (res.status === 200) return null;
  return parseError(res);
}

export type ProjectStatus   = 'active' | 'finished';
export type ProjectSort     = 'default' | 'date';
export type ProjectCategory = 'science' | 'tech' | 'architecture_and_urban' | 'sport' | 'music';

export interface Project {
  id:            string;
  userID:        string;
  category:      string;
  name:          string;
  description:   string;
  currency:      'RUB' | 'USD';
  goalAmount:    number;
  currentAmount: number;
  startedAt:     string;
  durationDays:  number;
  isBoosted:     boolean;
}

export interface GetProjectsParams {
  status?:   ProjectStatus;
  sort?:     ProjectSort;
  category?: string;
  search?:   string;
  limit?:    number;
  offset?:   number;
}

export interface ProjectsResponse {
  items: Project[];
}

// Returns project list on success, ApiError otherwise.
// Pass signal to cancel the request (throws DOMException on abort).
export async function getProjects(
  params: GetProjectsParams,
  signal?: AbortSignal,
): Promise<ProjectsResponse | ApiError> {
  const q = new URLSearchParams();
  if (params.status)               q.set('status',   params.status);
  if (params.sort)                 q.set('sort',     params.sort);
  if (params.category)             q.set('category', params.category);
  if (params.search)               q.set('search',   params.search);
  if (params.limit  !== undefined) q.set('limit',    String(params.limit));
  if (params.offset !== undefined) q.set('offset',   String(params.offset));

  const res = await fetch(`${BASE}/projects?${q}`, { signal });
  if (res.status === 200) return res.json() as Promise<ProjectsResponse>;
  return parseError(res);
}

// Returns null on success, ApiError otherwise
export async function signup(payload: SignupPayload): Promise<ApiError | null> {
  const res = await fetch(`${BASE}/signup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (res.status === 201) return null;
  return parseError(res);
}
