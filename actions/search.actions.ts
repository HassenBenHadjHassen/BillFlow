"use server";

import { requireAuth } from "@/lib/auth";
import { SearchService } from "@/services/search.service";

export async function searchAction(query: string) {
  await requireAuth();
  return SearchService.searchAll(query);
}
