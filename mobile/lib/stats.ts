import { apiFetch } from "./api";

export async function getStats(): Promise<{
  posts: number;
  users: number;
  events: number;
  volunteers?: number;
  contentCoverage?: number;
  totalViews: number;
}> {
  return apiFetch("/stats");
}
