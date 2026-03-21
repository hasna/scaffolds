import { z } from "zod";
import { SQL, asc, desc } from "drizzle-orm";
import type { PgColumn } from "drizzle-orm/pg-core";

export type SortDirection = "asc" | "desc";

export interface SortCondition {
  field: string;
  direction: SortDirection;
}

// Parse sort query params
// Format: sort=field:direction,field2:direction
// Example: sort=createdAt:desc,name:asc
// Default direction is asc if not specified
export function parseSortParams(searchParams: URLSearchParams): SortCondition[] {
  const sortParam = searchParams.get("sort");
  if (!sortParam) return [];

  return sortParam.split(",").map((s) => {
    const parts = s.trim().split(":");
    const field = parts[0]!;
    const dir = parts[1] ?? "asc";
    return {
      field,
      direction: dir.toLowerCase() === "desc" ? "desc" : "asc",
    } as SortCondition;
  });
}

// Build SQL ORDER BY from sort conditions
export function buildSortSQL<T extends Record<string, PgColumn>>(
  sorts: SortCondition[],
  columns: T,
  defaultSort?: { field: keyof T; direction: SortDirection }
): SQL[] {
  const orderBy: SQL[] = [];

  for (const sort of sorts) {
    const column = columns[sort.field];
    if (column) {
      orderBy.push(sort.direction === "desc" ? desc(column) : asc(column));
    }
  }

  // Apply default sort if no sorts specified
  if (orderBy.length === 0 && defaultSort) {
    const column = columns[defaultSort.field as string];
    if (column) {
      orderBy.push(defaultSort.direction === "desc" ? desc(column) : asc(column));
    }
  }

  return orderBy;
}

// Schema for validating sort params
export const sortSchema = z.object({
  field: z.string(),
  direction: z.enum(["asc", "desc"]),
});
