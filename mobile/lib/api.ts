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

const API_BASE = API_URL.replace(/\/api$/, "");

/**
 * مسار محلي موحّد للصورة الاحتياطية — نفس المصدر المستخدم في الويب،
 * والخادم يحوّله إلى PNG عبر /api/placeholder. بلا خدمة خارجية.
 */
function uniquePlaceholder(title?: string, category?: string): string {
  const params = new URLSearchParams();
  if (title) params.set("title", title.slice(0, 120));
  if (category) params.set("category", category.slice(0, 60));
  const query = params.toString();
  return `${API_BASE}/api/placeholder${query ? `?${query}` : ""}`;
}

/** نفس بوكسي الويب: أي صورة خارجية تُطلب من موقعنا فيُخزَّن في الكاش. */
function proxiedRemoteImage(imagePath: string, title?: string, category?: string): string {
  const params = new URLSearchParams();
  params.set("u", imagePath);
  if (title) params.set("t", title.slice(0, 120));
  if (category) params.set("c", category.slice(0, 60));
  return `${API_BASE}/api/media?${params.toString()}`;
}

export function getImageUrl(imagePath: string | null | undefined, title?: string, category?: string): string {
  if (!imagePath || imagePath.trim() === "") {
    return uniquePlaceholder(title, category);
  }
  if (imagePath.startsWith("data:")) return imagePath;
  if (imagePath.startsWith("http://") || imagePath.startsWith("https://")) {
    // روابط فيسبوك المنتهية لا تُطلب أصلاً — البديل المحلي أسرع وأضمن.
    if (imagePath.includes("fbcdn.net")) return uniquePlaceholder(title, category);
    return proxiedRemoteImage(imagePath, title, category);
  }
  const cleanPath = imagePath.startsWith("/") ? imagePath : `/${imagePath}`;
  return `${API_BASE}${cleanPath}`;
}
