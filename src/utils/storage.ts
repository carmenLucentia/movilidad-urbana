export function loadJSON<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

export function saveJSON(key: string, value: unknown) {
  localStorage.setItem(key, JSON.stringify(value));
}

export function isAuthenticated(): boolean {
  return localStorage.getItem("auth") === "true";
}

export function getAuthUser(): string {
  return localStorage.getItem("authUser") || "";
}

export function login(username: string) {
  localStorage.setItem("auth", "true");
  localStorage.setItem("authUser", username);
}

export function logout() {
  localStorage.removeItem("auth");
  localStorage.removeItem("authUser");
}
