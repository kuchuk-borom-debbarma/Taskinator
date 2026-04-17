import type { AuthUser } from '../types';

const API_BASE = 'http://127.0.0.1:3000';
const GRAPHQL_URL = `${API_BASE}/graphql`;

export function decodeToken(token: string): AuthUser | null {
  try {
    return JSON.parse(atob(token.split('.')[1] ?? ''));
  } catch {
    return null;
  }
}

export async function signIn(email: string, password: string) {
  const response = await fetch(`${API_BASE}/auth/signin`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  const payload = await response.json();
  if (!response.ok) throw new Error(payload.error ?? 'Sign in failed');
  return payload as { token: string };
}

export async function signUp(email: string, username: string, password: string) {
  const response = await fetch(`${API_BASE}/auth/signup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, username, password }),
  });
  const payload = await response.json();
  if (!response.ok) throw new Error(payload.error ?? 'Sign up failed');
  return payload as { message: string };
}

export async function gql<T>(query: string, variables: Record<string, unknown> = {}, token?: string) {
  const response = await fetch(GRAPHQL_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ query, variables }),
  });
  const payload = await response.json();
  if (!response.ok || payload.errors?.length) {
    throw new Error(payload.errors?.[0]?.message ?? 'GraphQL request failed');
  }
  return payload.data as T;
}
