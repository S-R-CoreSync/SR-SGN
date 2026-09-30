import { apiFetch } from "./api";

export async function getGalleryImages(locale: string = "ar"): Promise<any[]> {
  const data = await apiFetch(`/uploads?locale=${locale}`);
  return Array.isArray(data) ? data : [];
}
