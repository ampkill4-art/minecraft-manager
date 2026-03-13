// ============================================================
// Auth helpers — JWT storage and verification
// ============================================================

const TOKEN_KEY = 'nats_manager_token';

export function saveToken(token: string): void {
  if (typeof window !== 'undefined') {
    localStorage.setItem(TOKEN_KEY, token);
  }
}

export function getToken(): string | null {
  if (typeof window !== 'undefined') {
    return localStorage.getItem(TOKEN_KEY);
  }
  return null;
}

export function removeToken(): void {
  if (typeof window !== 'undefined') {
    localStorage.removeItem(TOKEN_KEY);
  }
}

export function isAuthenticated(): boolean {
  const token = getToken();
  if (!token) return false;

  try {
    // Decode JWT payload (not cryptographic validation — server handles that)
    const payload = JSON.parse(atob(token.split('.')[1]));
    return payload.exp * 1000 > Date.now();
  } catch {
    return false;
  }
}

export function getUsername(): string | null {
  const token = getToken();
  if (!token) return null;
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    return payload.username;
  } catch {
    return null;
  }
}
