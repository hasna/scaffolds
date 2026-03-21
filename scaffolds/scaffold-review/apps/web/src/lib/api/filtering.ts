import { z } from "zod";
import { SQL, sql, eq, like, gte, lte, and, inArray } from "drizzle-orm";
import type { PgColumn } from "drizzle-orm/pg-core";

// Filter operator types
export type FilterOperator =
  | "eq" // equals
  | "ne" // not equals
  | "gt" // greater than
  | "gte" // greater than or equal
  | "lt" // less than
  | "lte" // less than or equal
  | "like" // contains (case-insensitive)
  | "in" // in array
  | "nin"; // not in array

export interface FilterCondition {
  field: string;
  operator: FilterOperator;
  value: string | number | boolean | string[] | number[];
}

// Parse filter query params
// Format: filter[field][operator]=value
// Example: filter[status][eq]=active&filter[name][like]=john
export function parseFilterParams(searchParams: URLSearchParams): FilterCondition[] {
  const filters: FilterCondition[] = [];
  const filterRegex = /^filter\[(\w+)\]\[(\w+)\]$/;

  for (const [key, value] of searchParams.entries()) {
    const match = key.match(filterRegex);
    if (match) {
      const field = match[1]!;
      const operator = match[2]!;

      // Parse value - handle arrays for 'in' and 'nin' operators
      let parsedValue: string | number | boolean | string[] | number[] = value;

      if (operator === "in" || operator === "nin") {
        parsedValue = value.split(",").map((v) => v.trim());
      } else if (value === "true") {
        parsedValue = true;
      } else if (value === "false") {
        parsedValue = false;
      } else if (!isNaN(Number(value)) && value !== "") {
        parsedValue = Number(value);
      }

      filters.push({
        field,
        operator: operator as FilterOperator,
        value: parsedValue,
      });
    }
  }

  return filters;
}

// Build SQL condition from filter
export function buildFilterCondition<T extends Record<string, PgColumn>>(
  filter: FilterCondition,
  columns: T
): SQL | null {
  const column = columns[filter.field];
  if (!column) return null;

  switch (filter.operator) {
    case "eq":
      return eq(column, filter.value as string | number | boolean);
    case "ne":
      return sql`${column} != ${filter.value}`;
    case "gt":
      return sql`${column} > ${filter.value}`;
    case "gte":
      return gte(column, filter.value as string | number);
    case "lt":
      return sql`${column} < ${filter.value}`;
    case "lte":
      return lte(column, filter.value as string | number);
    case "like":
      return like(column, `%${filter.value}%`);
    case "in":
      if (Array.isArray(filter.value)) {
        return inArray(column, filter.value as (string | number)[]);
      }
      return null;
    case "nin":
      if (Array.isArray(filter.value)) {
        return sql`${column} NOT IN (${sql.join(
          (filter.value as (string | number)[]).map((v) => sql`${v}`),
          sql`, `
        )})`;
      }
      return null;
    default:
      return null;
  }
}

// Build combined filter SQL from multiple conditions
export function buildFiltersSQL<T extends Record<string, PgColumn>>(
  filters: FilterCondition[],
  columns: T
): SQL | undefined {
  const conditions = filters
    .map((filter) => buildFilterCondition(filter, columns))
    .filter((c): c is SQL => c !== null);

  if (conditions.length === 0) return undefined;
  if (conditions.length === 1) return conditions[0];

  return and(...conditions);
}

// Schema for validating filter values
export const filterSchema = z.object({
  field: z.string(),
  operator: z.enum(["eq", "ne", "gt", "gte", "lt", "lte", "like", "in", "nin"]),
  value: z.union([
    z.string(),
    z.number(),
    z.boolean(),
    z.array(z.string()),
    z.array(z.number()),
  ]),
});
