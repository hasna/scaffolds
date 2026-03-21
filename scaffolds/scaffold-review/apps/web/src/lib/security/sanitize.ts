/**
 * Security utilities for input sanitization and validation
 */

// HTML entities to escape
const HTML_ENTITIES: Record<string, string> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#x27;",
  "/": "&#x2F;",
  "`": "&#x60;",
  "=": "&#x3D;",
};

/**
 * Escape HTML characters to prevent XSS attacks
 */
export function escapeHtml(str: string): string {
  return str.replace(/[&<>"'`=/]/g, (char) => HTML_ENTITIES[char] ?? char);
}

/**
 * Remove HTML tags from a string
 */
export function stripHtml(str: string): string {
  return str.replace(/<[^>]*>/g, "");
}

/**
 * Sanitize a string for safe display (escape HTML + strip tags)
 */
export function sanitizeForDisplay(str: string): string {
  return escapeHtml(stripHtml(str));
}

/**
 * Validate and sanitize email address
 */
export function sanitizeEmail(email: string): string | null {
  const trimmed = email.trim().toLowerCase();
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  if (!emailRegex.test(trimmed)) {
    return null;
  }

  // Additional checks
  if (trimmed.length > 254) {
    return null;
  }

  return trimmed;
}

/**
 * Sanitize URL to prevent javascript: and data: attacks
 */
export function sanitizeUrl(url: string): string | null {
  const trimmed = url.trim();

  // Block dangerous protocols
  const dangerousProtocols = [
    "javascript:",
    "data:",
    "vbscript:",
    "file:",
  ];

  const lowerUrl = trimmed.toLowerCase();
  for (const protocol of dangerousProtocols) {
    if (lowerUrl.startsWith(protocol)) {
      return null;
    }
  }

  // Must be a valid URL
  try {
    const parsed = new URL(trimmed);
    // Only allow http and https protocols
    if (!["http:", "https:"].includes(parsed.protocol)) {
      return null;
    }
    return parsed.href;
  } catch {
    // If it's a relative URL, allow it
    if (trimmed.startsWith("/") && !trimmed.startsWith("//")) {
      return trimmed;
    }
    return null;
  }
}

/**
 * Sanitize filename to prevent path traversal attacks
 */
export function sanitizeFilename(filename: string): string {
  return filename
    .replace(/[/\\]/g, "") // Remove path separators
    .replace(/\.\./g, "") // Remove parent directory references
    .replace(/[\x00-\x1f\x80-\x9f]/g, "") // Remove control characters
    .replace(/[<>:"|?*]/g, "") // Remove invalid filename characters
    .trim();
}

/**
 * Sanitize object keys to prevent prototype pollution
 */
export function sanitizeObjectKeys<T extends Record<string, unknown>>(
  obj: T
): T {
  const dangerousKeys = [
    "__proto__",
    "constructor",
    "prototype",
    "__defineGetter__",
    "__defineSetter__",
    "__lookupGetter__",
    "__lookupSetter__",
  ];

  const result: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(obj)) {
    if (dangerousKeys.includes(key.toLowerCase())) {
      continue;
    }

    if (value && typeof value === "object" && !Array.isArray(value)) {
      result[key] = sanitizeObjectKeys(value as Record<string, unknown>);
    } else {
      result[key] = value;
    }
  }

  return result as T;
}

/**
 * Truncate string to max length safely
 */
export function truncate(str: string, maxLength: number): string {
  if (str.length <= maxLength) {
    return str;
  }
  return str.slice(0, maxLength);
}

/**
 * Validate string length within bounds
 */
export function validateLength(
  str: string,
  min: number,
  max: number
): boolean {
  return str.length >= min && str.length <= max;
}

/**
 * Remove null bytes from strings (prevents null byte injection)
 */
export function removeNullBytes(str: string): string {
  return str.replace(/\x00/g, "");
}

/**
 * Sanitize SQL-like input (for display only, always use parameterized queries)
 */
export function escapeSqlLike(str: string): string {
  return str
    .replace(/'/g, "''")
    .replace(/%/g, "\\%")
    .replace(/_/g, "\\_");
}
