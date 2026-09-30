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

const EDITORIAL_FALLBACKS: Record<string, string> = {
  law: "https://images.unsplash.com/photo-1589829545856-d10d557cf95f?auto=format&fit=crop&w=800&q=80",
  netherlands: "https://images.unsplash.com/photo-1512470876302-972faa2aa9a4?auto=format&fit=crop&w=800&q=80",
  community: "https://images.unsplash.com/photo-1529156069898-49953e39b3ac?auto=format&fit=crop&w=800&q=80",
  culture: "https://images.unsplash.com/photo-1492684223066-81342ee5ff30?auto=format&fit=crop&w=800&q=80",
  economy: "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=800&q=80",
  islamic: "https://images.unsplash.com/photo-1564769625905-50e93615e769?auto=format&fit=crop&w=800&q=80",
  general: "https://images.unsplash.com/photo-1504711434969-e33886168f5c?auto=format&fit=crop&w=800&q=80",
};

export function getImageUrl(imagePath: string | null | undefined, title?: string, category?: string): string {
  if (!imagePath || imagePath.includes("fbcdn.net") || imagePath.trim() === "") {
    const combined = `${title || ""} ${category || ""}`.toLowerCase();
    if (/حج|سفارة|بروكسل|إسلام|عيد|رمضان|مبارك/.test(combined)) return EDITORIAL_FALLBACKS.islamic;
    if (/لجوء|إقامة|ind|محكمة|قانون|حقوق|جواز|شمل/.test(combined)) return EDITORIAL_FALLBACKS.law;
    if (/هولندا|لاهاي|أمستردام|شيوخ|برلمان/.test(combined)) return EDITORIAL_FALLBACKS.netherlands;
    if (/اقتصاد|أعمال|مال|عمل|وظائف/.test(combined)) return EDITORIAL_FALLBACKS.economy;
    if (/ثقافة|فن|معرض|موسيقى/.test(combined)) return EDITORIAL_FALLBACKS.culture;
    return EDITORIAL_FALLBACKS.community;
  }
  if (imagePath.startsWith("http://") || imagePath.startsWith("https://") || imagePath.startsWith("data:")) {
    return imagePath;
  }
  const baseUrl = API_URL.replace(/\/api$/, "");
  const cleanPath = imagePath.startsWith("/") ? imagePath : `/${imagePath}`;
  return `${baseUrl}${cleanPath}`;
}
