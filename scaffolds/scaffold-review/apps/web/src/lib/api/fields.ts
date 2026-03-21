import { z } from "zod";

// Parse field selection (sparse fieldsets)
// Format: fields=field1,field2,field3
// Example: fields=id,name,email,createdAt
export function parseFieldParams(searchParams: URLSearchParams): string[] | null {
  const fieldsParam = searchParams.get("fields");
  if (!fieldsParam) return null;

  return fieldsParam.split(",").map((f) => f.trim()).filter(Boolean);
}

// Filter object to only include selected fields
export function selectFields<T extends Record<string, unknown>>(
  obj: T,
  fields: string[] | null
): Partial<T> {
  if (!fields || fields.length === 0) return obj;

  const result: Partial<T> = {};
  for (const field of fields) {
    if (field in obj) {
      (result as Record<string, unknown>)[field] = obj[field];
    }
  }
  return result;
}

// Filter array of objects to only include selected fields
export function selectFieldsArray<T extends Record<string, unknown>>(
  items: T[],
  fields: string[] | null
): Partial<T>[] {
  if (!fields || fields.length === 0) return items;
  return items.map((item) => selectFields(item, fields));
}

// Build Drizzle columns object from field list
export function buildColumnsSelection<T extends Record<string, boolean>>(
  fields: string[] | null,
  allColumns: (keyof T)[]
): T {
  const columns = {} as T;

  if (!fields || fields.length === 0) {
    // Select all columns
    for (const col of allColumns) {
      (columns as Record<string, boolean>)[col as string] = true;
    }
  } else {
    // Select only specified columns
    for (const field of fields) {
      if (allColumns.includes(field as keyof T)) {
        (columns as Record<string, boolean>)[field] = true;
      }
    }
    // Always include id
    if (!fields.includes("id") && allColumns.includes("id" as keyof T)) {
      (columns as Record<string, boolean>)["id"] = true;
    }
  }

  return columns;
}

// Schema for validating fields
export const fieldsSchema = z.array(z.string()).optional();
