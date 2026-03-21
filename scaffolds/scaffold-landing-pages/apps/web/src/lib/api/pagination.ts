import { z } from "zod";

// Cursor-based pagination types
export interface PaginationParams {
  cursor?: string;
  limit: number;
  direction: "forward" | "backward";
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    hasNextPage: boolean;
    hasPreviousPage: boolean;
    startCursor: string | null;
    endCursor: string | null;
    totalCount?: number;
  };
}

// Query parameter schema for pagination
export const paginationSchema = z.object({
  cursor: z.string().optional(),
  limit: z.coerce.number().min(1).max(100).default(25),
  direction: z.enum(["forward", "backward"]).default("forward"),
});

// Encode cursor (base64 encoded JSON with id and timestamp)
export function encodeCursor(id: string, timestamp: Date): string {
  const data = { id, ts: timestamp.toISOString() };
  return Buffer.from(JSON.stringify(data)).toString("base64url");
}

// Decode cursor
export function decodeCursor(cursor: string): { id: string; ts: Date } | null {
  try {
    const data = JSON.parse(Buffer.from(cursor, "base64url").toString());
    return {
      id: data.id,
      ts: new Date(data.ts),
    };
  } catch {
    return null;
  }
}

// Build pagination response
export function buildPaginatedResponse<T extends { id: string; createdAt: Date }>(
  items: T[],
  params: PaginationParams,
  totalCount?: number
): PaginatedResponse<T> {
  const hasNextPage = items.length > params.limit;
  const hasPreviousPage = !!params.cursor;

  // Remove the extra item used to check for next page
  const data = hasNextPage ? items.slice(0, params.limit) : items;

  const startCursor = data.length > 0 ? encodeCursor(data[0]!.id, data[0]!.createdAt) : null;
  const endCursor =
    data.length > 0
      ? encodeCursor(data[data.length - 1]!.id, data[data.length - 1]!.createdAt)
      : null;

  return {
    data,
    pagination: {
      hasNextPage,
      hasPreviousPage,
      startCursor,
      endCursor,
      totalCount,
    },
  };
}

// Parse pagination params from URL search params
export function parsePaginationParams(searchParams: URLSearchParams): PaginationParams {
  const parsed = paginationSchema.parse({
    cursor: searchParams.get("cursor") || undefined,
    limit: searchParams.get("limit") || undefined,
    direction: searchParams.get("direction") || undefined,
  });

  return {
    cursor: parsed.cursor,
    limit: parsed.limit,
    direction: parsed.direction,
  };
}
