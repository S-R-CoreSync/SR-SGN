import { API_URL } from "../constants/api";
import * as SecureStore from "expo-secure-store";

const TOKEN_KEY = "auth_token";

export async function getToken(): Promise<string | null> {
  try {
    return await SecureStore.getItemAsync(TOKEN_KEY);
  } catch {
    return null;
  }
}

export async function setToken(token: string) {
  await SecureStore.setItemAsync(TOKEN_KEY, token);
}

export async function removeToken() {
  await SecureStore.deleteItemAsync(TOKEN_KEY);
}

export async function apiFetch(
  path: string,
  options: RequestInit = {}
): Promise<any> {
  const token = await getToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 15000);

  try {
    const res = await fetch(`${API_URL}${path}`, { 
      ...options, 
      headers,
      signal: controller.signal 
    });
    clearTimeout(timeoutId);
    
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Request failed");
    return data;
  } catch (error) {
    clearTimeout(timeoutId);
    throw error;
  }
}

export async function login(email: string, password: string): Promise<any> {
  const res = await fetch(`${API_URL}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Login failed");

  // For NextAuth, we use a session token approach
  // The mobile app uses credentials-based auth via a custom endpoint
  if (data.token) await setToken(data.token);
  return data;
}

export async function register(name: string, email: string, password: string): Promise<any> {
  const res = await fetch(`${API_URL}/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, email, password }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Registration failed");
  return data;
}

export async function logout() {
  await removeToken();
}

const UNIQUE_PALETTE: Array<[string, string]> = [
  ["113d22", "c8a84e"],
  ["0b2545", "8da9c4"],
  ["451a03", "fde047"],
  ["111827", "fbbf24"],
  ["064e3b", "a7f3d0"],
  ["0f3d3e", "99f6e4"],
  ["1e3a8a", "bfdbfe"],
];

/** إزاحة لونية صغيرة حول لون التصنيف حتى يبقى التباين مقروءاً */
function shiftColor(hex: string, seed: number): string {
  const channel = (offset: number, delta: number) =>
    Math.max(0, Math.min(255, parseInt(hex.slice(offset, offset + 2), 16) + delta))
      .toString(16)
      .padStart(2, "0");
  return (
    channel(0, (seed & 31) - 16) +
    channel(2, ((seed >>> 5) & 31) - 16) +
    channel(4, ((seed >>> 10) & 31) - 16)
  );
}

/** صورة فريدة لكل عنوان — الهاش من العنوان الكامل لا من نصّه المقتطع */
function uniquePlaceholder(title?: string, category?: string): string {
  const seed = `${category || "news"}|${title || "SGN"}`;
  let hash = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    hash ^= seed.charCodeAt(i);
    hash = Math.imul(hash, 16777619) >>> 0;
  }
  const [baseBg, baseFg] = UNIQUE_PALETTE[hash % UNIQUE_PALETTE.length];
  const bg = shiftColor(baseBg, hash);
  const fg = shiftColor(baseFg, hash >>> 15);
  const label = (title || "SGN").slice(0, 18);
  return `https://placehold.co/600x338/${bg}/${fg}/png?text=${encodeURIComponent(label)}`;
}

export function getImageUrl(imagePath: string | null | undefined, title?: string, category?: string): string {
  if (!imagePath || imagePath.includes("fbcdn.net") || imagePath.trim() === "") {
    return uniquePlaceholder(title, category);
  }
  if (imagePath.startsWith("http://") || imagePath.startsWith("https://") || imagePath.startsWith("data:")) {
    return imagePath;
  }
  const baseUrl = API_URL.replace(/\/api$/, "");
  const cleanPath = imagePath.startsWith("/") ? imagePath : `/${imagePath}`;
  return `${baseUrl}${cleanPath}`;
}
