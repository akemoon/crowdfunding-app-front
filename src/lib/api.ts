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
