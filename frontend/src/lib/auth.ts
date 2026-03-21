const TOKEN_KEY = "databotics_token";
const DUMMY_TOKEN = "test-token-disabled-auth";

interface AuthResponse {
  access_token: string;
  token_type: string;
}

function storeToken(token: string) {
  if (typeof window !== "undefined") {
    localStorage.setItem(TOKEN_KEY, token);
  }
}

export function getToken(): string | null {
  // AUTH DISABLED FOR TESTING - always return dummy token
  return DUMMY_TOKEN;
  // Original code:
  // if (typeof window === "undefined") return null;
  // return localStorage.getItem(TOKEN_KEY);
}

export function isAuthenticated(): boolean {
  // AUTH DISABLED FOR TESTING - always return true
  return true;
}

export function logout(): void {
  // No-op during testing
  // Original code:
  // if (typeof window !== "undefined") {
  //   localStorage.removeItem(TOKEN_KEY);
  // }
}

export async function login(username: string, password: string): Promise<void> {
  // AUTH DISABLED FOR TESTING - just store dummy token
  storeToken(DUMMY_TOKEN);
  return;
  // Original code:
  // const response = await fetch(`${API_BASE_URL}/auth/login`, {
  //   method: "POST",
  //   headers: { "Content-Type": "application/json" },
  //   body: JSON.stringify({ username, password }),
  // });
  // if (!response.ok) {
  //   throw new Error("Login failed");
  // }
  // const data = (await response.json()) as AuthResponse;
  // storeToken(data.access_token);
}

export async function register(username: string, password: string): Promise<void> {
  // AUTH DISABLED FOR TESTING - just store dummy token
  storeToken(DUMMY_TOKEN);
  return;
  // Original code:
  // const response = await fetch(`${API_BASE_URL}/auth/register`, {
  //   method: "POST",
  //   headers: { "Content-Type": "application/json" },
  //   body: JSON.stringify({ username, password }),
  // });
  // if (!response.ok) {
  //   throw new Error("Registration failed");
  // }
  // const data = (await response.json()) as AuthResponse;
  // storeToken(data.access_token);
}
