import { PUBLIC_API_URL } from '$env/static/public';

const BASE = PUBLIC_API_URL;

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

function clearAuth() {
  localStorage.removeItem('accessToken');
  localStorage.removeItem('refreshToken');
  window.location.href = '/signin';
}

// Fetch with automatic token refresh on 401.
// On refresh failure -> clears auth and redirects to /signin.
async function authFetch(url: string, options: RequestInit, accessToken: string): Promise<Response> {
  const res = await fetch(url, {
    ...options,
    headers: { ...options.headers, Authorization: `Bearer ${accessToken}` },
  });

  if (res.status !== 401) return res;

  const refreshToken = localStorage.getItem('refreshToken');
  if (!refreshToken) { clearAuth(); return res; }

  const refreshRes = await fetch(`${BASE}/auth/refresh`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refreshToken }),
  });

  if (refreshRes.status === 401) { clearAuth(); return res; }
  if (refreshRes.status !== 200) return res;

  const tokens: SigninTokens = await refreshRes.json();
  localStorage.setItem('accessToken', tokens.accessToken);
  localStorage.setItem('refreshToken', tokens.refreshToken);

  // Retry original request with new token
  return fetch(url, {
    ...options,
    headers: { ...options.headers, Authorization: `Bearer ${tokens.accessToken}` },
  });
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
  const res = await fetch(`${BASE}/auth/signin`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (res.status === 200) return res.json() as Promise<SigninTokens>;
  return parseError(res);
}

// Returns null on success, ApiError otherwise
export async function signout(accessToken: string, refreshToken: string): Promise<ApiError | null> {
  const res = await fetch(`${BASE}/auth/signout`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
    body: JSON.stringify({ refreshToken }),
  });

  if (res.status === 200) return null;
  return parseError(res);
}

export interface UserProfile {
  id:          string;
  username:    string;
  displayName: string;
  description: string;
  avatarUrl:   string;
}

// Returns public profile of any user by ID
export async function getUser(id: string): Promise<UserProfile | ApiError> {
  const res = await fetch(`${BASE}/users/${encodeURIComponent(id)}`);
  if (res.status === 200) return res.json() as Promise<UserProfile>;
  return parseError(res);
}

// Returns user profile on success, ApiError otherwise
export async function getMe(accessToken: string): Promise<UserProfile | ApiError> {
  const res = await authFetch(`${BASE}/users/me`, {}, accessToken);
  if (res.status === 200) return res.json() as Promise<UserProfile>;
  return parseError(res);
}

export interface AuthMe {
  email: string;
  role:  'user' | 'moder' | 'admin';
}

export async function getAuthMe(accessToken: string): Promise<AuthMe | ApiError> {
  const res = await authFetch(`${BASE}/auth/me`, {}, accessToken);
  if (res.status === 200) return res.json() as Promise<AuthMe>;
  return parseError(res);
}

export interface UpdateProfilePayload {
  username?:    string;
  displayName?: string;
  description?: string;
}

// Returns updated profile on success, ApiError otherwise
export async function updateMe(
  accessToken: string,
  payload: UpdateProfilePayload,
): Promise<UserProfile | ApiError> {
  const res = await authFetch(`${BASE}/users/me/profile`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  }, accessToken);
  if (res.status === 200) return res.json() as Promise<UserProfile>;
  return parseError(res);
}

export type ProjectStatus   = 'active' | 'finished';
export type ProjectSort     = 'default' | 'date';
export type ProjectCategory = 'science' | 'tech' | 'architecture_and_urban' | 'sport' | 'music' | 'art' | 'film' | 'games' | 'education' | 'food' | 'fashion' | 'health';

export interface ProjectImage {
  id:  string;
  url: string;
}

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
  status:        'draft' | 'review' | 'active' | 'finished';
  isBoosted:     boolean;
  boostedUntil:  string | null;
  coverURL?:     string;
  images?:       ProjectImage[];
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

export interface ProjectStats {
  currentAmount:    number;
  contributionsNum: number;
  contributersNum:  number;
}

// Returns payment stats for the author's project (403 if not the author)
export async function getProjectStats(accessToken: string, projectID: string): Promise<ProjectStats | ApiError> {
  const res = await authFetch(`${BASE}/payments/stats/project/${encodeURIComponent(projectID)}`, {}, accessToken);
  if (res.status === 200) return res.json() as Promise<ProjectStats>;
  return parseError(res);
}

export interface Payout {
  projectID: string;
  createdAt: string;
}

// Returns payout info for the author's project. Returns ApiError with code payout_not_found if not yet paid out.
export async function getPayout(accessToken: string, projectID: string): Promise<Payout | ApiError> {
  const res = await authFetch(`${BASE}/payments/payouts/${encodeURIComponent(projectID)}`, {}, accessToken);
  if (res.status === 200) return res.json() as Promise<Payout>;
  return parseError(res);
}

export async function boostProject(accessToken: string, projectID: string, promoCode: string): Promise<ApiError | null> {
  const res = await authFetch(`${BASE}/projects/${encodeURIComponent(projectID)}/boost`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ promoCode }),
  }, accessToken);
  if (res.status === 200) return null;
  return parseError(res);
}

export interface ContributePayload {
  projectID: string;
  amount:    number;
}

// Returns null on success, ApiError otherwise
export async function contribute(
  accessToken: string,
  payload: ContributePayload,
): Promise<ApiError | null> {
  const res = await authFetch(`${BASE}/payments/contribute`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  }, accessToken);
  if (res.status === 204) return null;
  return parseError(res);
}

// Returns the current user's own projects (including review status)
export async function getMyProjects(accessToken: string): Promise<Project[] | ApiError> {
  const res = await authFetch(`${BASE}/projects/user`, {}, accessToken);
  if (res.status === 200) {
    const data = await res.json();
    return (data as Project[]) ?? [];
  }
  return parseError(res);
}

// Returns public projects of a specific user (active/finished only)
export async function getUserProjects(userID: string): Promise<Project[] | ApiError> {
  const res = await fetch(`${BASE}/projects/user/${encodeURIComponent(userID)}`);
  if (res.status === 200) {
    const data = await res.json();
    return (data as Project[]) ?? [];
  }
  return parseError(res);
}

// Returns a single project by ID, ApiError otherwise
export async function getProject(id: string, accessToken?: string): Promise<Project | ApiError> {
  const url = `${BASE}/projects/${encodeURIComponent(id)}`;
  const res = accessToken
    ? await authFetch(url, {}, accessToken)
    : await fetch(url);
  if (res.status === 200) return res.json() as Promise<Project>;
  return parseError(res);
}

export interface CreateProjectPayload {
  category:     string;
  name:         string;
  description:  string;
  currency:     string;
  goalAmount:   number;
  durationDays: number;
}

export interface CreatedProject {
  id: string;
}

// Returns created project ID on success, ApiError otherwise
export async function createProject(
  accessToken: string,
  payload: CreateProjectPayload,
): Promise<CreatedProject | ApiError> {
  const res = await authFetch(`${BASE}/projects`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  }, accessToken);
  if (res.status === 201) return res.json() as Promise<CreatedProject>;
  return parseError(res);
}

export interface UpdateProjectPayload {
  name:         string;
  description:  string;
  category:     string;
  currency:     string;
  goalAmount:   number;
  durationDays: number;
}

// Returns null on success, ApiError otherwise. Only works while project is draft.
export async function updateProject(
  accessToken: string,
  projectID: string,
  payload: UpdateProjectPayload,
): Promise<ApiError | null> {
  const res = await authFetch(`${BASE}/projects/${encodeURIComponent(projectID)}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  }, accessToken);
  if (res.status === 200) return null;
  return parseError(res);
}

export type ApplicationStatus = 'pending' | 'review' | 'rejected' | 'approved';

export interface Application {
  status:      ApplicationStatus;
  rejectReason: string;
  createdAt:   string;
}

export interface ModeratorApplication {
  status:      ApplicationStatus;
  rejectReason: string;
  createdAt:   string;
  assignedAt:  string | null;
  processedAt: string | null;
  project:     Project & { status: string };
}

// Returns application status for the author's own project
export async function getMyApplication(
  accessToken: string,
  projectID: string,
): Promise<Application | ApiError> {
  const res = await authFetch(`${BASE}/applications/project/${encodeURIComponent(projectID)}`, {}, accessToken);
  if (res.status === 200) return res.json() as Promise<Application>;
  return parseError(res);
}

// Returns list of pending applications (moderator only)
export async function getApplications(
  accessToken: string,
): Promise<ModeratorApplication[] | ApiError> {
  const res = await authFetch(`${BASE}/applications`, {}, accessToken);
  if (res.status === 200) {
    const data = await res.json();
    return (data as ModeratorApplication[]) ?? [];
  }
  return parseError(res);
}

// Returns applications assigned to the current moderator (in_review)
export async function getMyApplications(
  accessToken: string,
): Promise<ModeratorApplication[] | ApiError> {
  const res = await authFetch(`${BASE}/applications/moderator`, {}, accessToken);
  if (res.status === 200) {
    const data = await res.json();
    return (data as ModeratorApplication[]) ?? [];
  }
  return parseError(res);
}

// Take a project application into work (moderator only). projectID used as {id}
export async function takeApplication(
  accessToken: string,
  projectID: string,
): Promise<ApiError | null> {
  const res = await authFetch(`${BASE}/applications/${encodeURIComponent(projectID)}/take`, {
    method: 'POST',
  }, accessToken);
  if (res.status === 200) return null;
  return parseError(res);
}

// Approve a project application (moderator only). projectID used as {id}
export async function approveApplication(
  accessToken: string,
  projectID: string,
): Promise<ApiError | null> {
  const res = await authFetch(`${BASE}/applications/${encodeURIComponent(projectID)}/approve`, {
    method: 'POST',
  }, accessToken);
  if (res.status === 200) return null;
  return parseError(res);
}

// Reject a project application (moderator only). projectID used as {id}
export async function rejectApplication(
  accessToken: string,
  projectID: string,
  reason: string,
): Promise<ApiError | null> {
  const res = await authFetch(`${BASE}/applications/${encodeURIComponent(projectID)}/reject`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ reason }),
  }, accessToken);
  if (res.status === 200) return null;
  return parseError(res);
}

// Submit a draft project for moderation. Returns null on success.
export async function submitProject(
  accessToken: string,
  projectID: string,
): Promise<ApiError | null> {
  const res = await authFetch(
    `${BASE}/projects/${encodeURIComponent(projectID)}/submit`,
    { method: 'POST' },
    accessToken,
  );
  if (res.status === 200) return null;
  return parseError(res);
}

// Upload one image for a project. Returns the created image on success.
export async function uploadProjectImage(
  accessToken: string,
  projectID: string,
  file: File,
): Promise<ProjectImage | ApiError> {
  const body = new FormData();
  body.append('image', file);
  const res = await authFetch(`${BASE}/projects/${encodeURIComponent(projectID)}/images`, {
    method: 'POST',
    body,
  }, accessToken);
  if (res.status === 201) return res.json() as Promise<ProjectImage>;
  return parseError(res);
}

// Upload cover image for a draft project. Returns coverURL on success.
export async function uploadProjectCover(
  accessToken: string,
  projectID: string,
  file: File,
): Promise<{ coverURL: string } | ApiError> {
  const body = new FormData();
  body.append('cover', file);
  const res = await authFetch(`${BASE}/projects/${encodeURIComponent(projectID)}/cover`, {
    method: 'POST',
    body,
  }, accessToken);
  if (res.status === 200) return res.json() as Promise<{ coverURL: string }>;
  return parseError(res);
}

// Delete a project image by imageID. Returns null on success.
export async function deleteProjectImage(
  accessToken: string,
  projectID: string,
  imageID: string,
): Promise<ApiError | null> {
  const res = await authFetch(
    `${BASE}/projects/${encodeURIComponent(projectID)}/images/${encodeURIComponent(imageID)}`,
    { method: 'DELETE' },
    accessToken,
  );
  if (res.status === 204) return null;
  return parseError(res);
}

export interface UserSearchResult {
  id:          string;
  username:    string;
  displayName: string;
  description: string;
  avatarUrl:   string;
}

export interface AdminUserCredentials {
  userID:    string;
  email:     string;
  role:      'user' | 'moder' | 'admin';
  isBlocked: boolean;
}

export type UserRole = 'user' | 'moder' | 'admin';

// Set blocked status for a user (admin only). Returns null on success.
export async function setUserBlocked(
  accessToken: string,
  id: string,
  blocked: boolean,
): Promise<ApiError | null> {
  const res = await authFetch(`${BASE}/auth/users/${encodeURIComponent(id)}/blocked`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ blocked }),
  }, accessToken);
  if (res.status === 200) return null;
  return parseError(res);
}

export interface Promocode {
  code:        string;
  type:        string;
  ownerId:     string;
  effectValue: number;
  usedAt:      string | null;
  createdAt:   string;
}

// Returns list of promocodes belonging to the current user
export async function getPromocodes(accessToken: string): Promise<Promocode[] | ApiError> {
  const res = await authFetch(`${BASE}/promocodes`, {}, accessToken);
  if (res.status === 200) {
    const data = await res.json();
    return (data as Promocode[]) ?? [];
  }
  return parseError(res);
}

// Search users by username (public endpoint)
export async function searchUsers(
  q: string,
  limit: number,
  offset: number,
): Promise<UserSearchResult[] | ApiError> {
  const params = new URLSearchParams({ q, limit: String(limit), offset: String(offset) });
  const res = await fetch(`${BASE}/users/search?${params}`);
  if (res.status === 200) return res.json() as Promise<UserSearchResult[]>;
  return parseError(res);
}

// Get user credentials by ID (admin only)
export async function getAdminUser(
  accessToken: string,
  id: string,
): Promise<AdminUserCredentials | ApiError> {
  const res = await authFetch(`${BASE}/auth/users/${encodeURIComponent(id)}`, {}, accessToken);
  if (res.status === 200) return res.json() as Promise<AdminUserCredentials>;
  return parseError(res);
}

// Change user role (admin only). Returns null on success.
export async function setUserRole(
  accessToken: string,
  id: string,
  role: UserRole,
): Promise<ApiError | null> {
  const res = await authFetch(`${BASE}/auth/users/${encodeURIComponent(id)}/role`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ role }),
  }, accessToken);
  if (res.status === 200) return null;
  return parseError(res);
}

// Returns null on success, ApiError otherwise
export async function signup(payload: SignupPayload): Promise<ApiError | null> {
  const res = await fetch(`${BASE}/auth/signup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (res.status === 201) return null;
  return parseError(res);
}
