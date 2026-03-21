import { describe, it, expect } from "vitest";
import {
  cn,
  generateRandomString,
  slugify,
  formatCurrency,
  formatDate,
  formatRelativeTime,
  truncate,
  capitalize,
  isValidEmail,
  isStrongPassword,
  wait,
  sleep,
  chunk,
  groupBy,
  pick,
  omit,
  clamp,
  debounce,
  isDefined,
  getInitials,
  generateApiKeyPrefix,
  generateApiKey,
  parseCursor,
  createCursor,
  getExponentialBackoffDelay,
} from "./index";

describe("cn", () => {
  it("should merge class names", () => {
    expect(cn("foo", "bar")).toBe("foo bar");
  });

  it("should handle conditional classes", () => {
    const condition = false;
    expect(cn("foo", condition && "bar", "baz")).toBe("foo baz");
  });

  it("should merge tailwind classes correctly", () => {
    expect(cn("px-2", "px-4")).toBe("px-4");
  });
});

describe("generateRandomString", () => {
  it("should generate string of specified length", () => {
    expect(generateRandomString(16)).toHaveLength(16);
    expect(generateRandomString(32)).toHaveLength(32);
  });

  it("should generate unique strings", () => {
    const a = generateRandomString(16);
    const b = generateRandomString(16);
    expect(a).not.toBe(b);
  });
});

describe("slugify", () => {
  it("should convert to lowercase slug", () => {
    expect(slugify("Hello World")).toBe("hello-world");
  });

  it("should handle special characters", () => {
    expect(slugify("Hello & World!")).toBe("hello-and-world");
  });

  it("should trim and remove extra dashes", () => {
    expect(slugify("  Hello   World  ")).toBe("hello-world");
  });
});

describe("formatCurrency", () => {
  it("should format USD by default", () => {
    expect(formatCurrency(1000)).toBe("$1,000.00");
  });

  it("should format with cents", () => {
    expect(formatCurrency(1234, "USD", "en-US", true)).toBe("$12.34");
  });

  it("should format other currencies", () => {
    expect(formatCurrency(1000, "EUR", "de-DE")).toMatch(/1\.000,00/);
  });
});

describe("formatDate", () => {
  it("should format date", () => {
    const date = new Date("2024-01-15");
    const formatted = formatDate(date);
    expect(formatted).toContain("2024");
  });
});

describe("truncate", () => {
  it("should truncate long strings", () => {
    expect(truncate("Hello World", 5)).toBe("Hello...");
  });

  it("should not truncate short strings", () => {
    expect(truncate("Hi", 5)).toBe("Hi");
  });
});

describe("capitalize", () => {
  it("should capitalize first letter", () => {
    expect(capitalize("hello")).toBe("Hello");
  });

  it("should handle empty string", () => {
    expect(capitalize("")).toBe("");
  });
});

describe("isValidEmail", () => {
  it("should validate correct emails", () => {
    expect(isValidEmail("test@example.com")).toBe(true);
    expect(isValidEmail("user.name@domain.org")).toBe(true);
  });

  it("should reject invalid emails", () => {
    expect(isValidEmail("invalid")).toBe(false);
    expect(isValidEmail("@domain.com")).toBe(false);
    expect(isValidEmail("user@")).toBe(false);
  });
});

describe("wait", () => {
  it("should wait for specified time", async () => {
    const start = Date.now();
    await wait(100);
    const elapsed = Date.now() - start;
    expect(elapsed).toBeGreaterThanOrEqual(90);
  });
});

describe("chunk", () => {
  it("should split array into chunks", () => {
    expect(chunk([1, 2, 3, 4, 5], 2)).toEqual([[1, 2], [3, 4], [5]]);
  });

  it("should handle empty array", () => {
    expect(chunk([], 2)).toEqual([]);
  });
});

describe("groupBy", () => {
  it("should group by key", () => {
    const items = [
      { type: "a", value: 1 },
      { type: "b", value: 2 },
      { type: "a", value: 3 },
    ];
    const grouped = groupBy(items, "type");
    expect(grouped.a).toHaveLength(2);
    expect(grouped.b).toHaveLength(1);
  });
});

describe("pick", () => {
  it("should pick specified keys", () => {
    const obj = { a: 1, b: 2, c: 3 };
    expect(pick(obj, ["a", "c"])).toEqual({ a: 1, c: 3 });
  });
});

describe("omit", () => {
  it("should omit specified keys", () => {
    const obj = { a: 1, b: 2, c: 3 };
    expect(omit(obj, ["b"])).toEqual({ a: 1, c: 3 });
  });
});

describe("clamp", () => {
  it("should clamp values", () => {
    expect(clamp(5, 0, 10)).toBe(5);
    expect(clamp(-5, 0, 10)).toBe(0);
    expect(clamp(15, 0, 10)).toBe(10);
  });
});

describe("formatRelativeTime", () => {
  it("should format seconds ago", () => {
    const date = new Date(Date.now() - 30 * 1000);
    const result = formatRelativeTime(date);
    expect(result).toMatch(/30 seconds ago|seconds ago/i);
  });

  it("should format minutes ago", () => {
    const date = new Date(Date.now() - 5 * 60 * 1000);
    const result = formatRelativeTime(date);
    expect(result).toMatch(/5 minutes ago|minutes ago/i);
  });

  it("should format hours ago", () => {
    const date = new Date(Date.now() - 2 * 60 * 60 * 1000);
    const result = formatRelativeTime(date);
    expect(result).toMatch(/2 hours ago|hours ago/i);
  });

  it("should format days ago", () => {
    const date = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000);
    const result = formatRelativeTime(date);
    expect(result).toMatch(/3 days ago|days ago/i);
  });
});

describe("debounce", () => {
  it("should debounce function calls", async () => {
    let callCount = 0;
    const fn = debounce(() => {
      callCount++;
    }, 50);

    fn();
    fn();
    fn();

    expect(callCount).toBe(0);
    await wait(100);
    expect(callCount).toBe(1);
  });

  it("should pass arguments to debounced function", async () => {
    let lastArg = "";
    const fn = debounce((arg: string) => {
      lastArg = arg;
    }, 50);

    fn("first");
    fn("second");
    fn("third");

    await wait(100);
    expect(lastArg).toBe("third");
  });
});

describe("sleep", () => {
  it("should sleep for specified duration", async () => {
    const start = Date.now();
    await sleep(50);
    const elapsed = Date.now() - start;
    expect(elapsed).toBeGreaterThanOrEqual(40);
  });
});

describe("isDefined", () => {
  it("should return true for defined values", () => {
    expect(isDefined(0)).toBe(true);
    expect(isDefined("")).toBe(true);
    expect(isDefined(false)).toBe(true);
    expect(isDefined({})).toBe(true);
  });

  it("should return false for null", () => {
    expect(isDefined(null)).toBe(false);
  });

  it("should return false for undefined", () => {
    expect(isDefined(undefined)).toBe(false);
  });
});

describe("getInitials", () => {
  it("should get initials from full name", () => {
    expect(getInitials("John Doe")).toBe("JD");
  });

  it("should get initials from single name", () => {
    expect(getInitials("John")).toBe("J");
  });

  it("should limit to 2 characters", () => {
    expect(getInitials("John Michael Doe")).toBe("JM");
  });

  it("should return ? for null", () => {
    expect(getInitials(null)).toBe("?");
  });

  it("should return ? for undefined", () => {
    expect(getInitials(undefined)).toBe("?");
  });
});

describe("isStrongPassword", () => {
  it("should validate strong password", () => {
    expect(isStrongPassword("Test123!@#")).toBe(true);
  });

  it("should reject short password", () => {
    expect(isStrongPassword("Te1!")).toBe(false);
  });

  it("should reject password without uppercase", () => {
    expect(isStrongPassword("test123!@#")).toBe(false);
  });

  it("should reject password without lowercase", () => {
    expect(isStrongPassword("TEST123!@#")).toBe(false);
  });

  it("should reject password without number", () => {
    expect(isStrongPassword("TestTest!@#")).toBe(false);
  });

  it("should reject password without special character", () => {
    expect(isStrongPassword("TestTest123")).toBe(false);
  });
});

describe("generateApiKeyPrefix", () => {
  it("should generate prefix starting with sk_", () => {
    const prefix = generateApiKeyPrefix();
    expect(prefix.startsWith("sk_")).toBe(true);
  });

  it("should generate prefix with correct length", () => {
    const prefix = generateApiKeyPrefix();
    expect(prefix).toHaveLength(11); // "sk_" + 8 chars
  });
});

describe("generateApiKey", () => {
  it("should generate key and prefix", () => {
    const { key, prefix } = generateApiKey();
    expect(key.startsWith(prefix)).toBe(true);
    expect(key.includes("_")).toBe(true);
  });

  it("should generate unique keys", () => {
    const key1 = generateApiKey();
    const key2 = generateApiKey();
    expect(key1.key).not.toBe(key2.key);
  });
});

describe("parseCursor", () => {
  it("should parse valid cursor", () => {
    const cursor = createCursor("test-id", new Date("2024-01-01T00:00:00Z"));
    const result = parseCursor(cursor);
    expect(result).not.toBeNull();
    if (result) {
      expect(result.id).toBe("test-id");
      expect(result.createdAt.toISOString()).toBe("2024-01-01T00:00:00.000Z");
    }
  });

  it("should return null for null cursor", () => {
    expect(parseCursor(null)).toBeNull();
  });

  it("should return null for undefined cursor", () => {
    expect(parseCursor(undefined)).toBeNull();
  });

  it("should return null for invalid cursor", () => {
    expect(parseCursor("invalid-base64")).toBeNull();
  });
});

describe("createCursor", () => {
  it("should create base64 encoded cursor", () => {
    const cursor = createCursor("test-id", new Date("2024-01-01T00:00:00Z"));
    expect(typeof cursor).toBe("string");
    expect(cursor.length).toBeGreaterThan(0);
  });

  it("should create decodable cursor", () => {
    const date = new Date("2024-01-01T00:00:00Z");
    const cursor = createCursor("test-id", date);
    const decoded = Buffer.from(cursor, "base64").toString("utf-8");
    const parsed = JSON.parse(decoded) as { id: string; createdAt: string };
    expect(parsed.id).toBe("test-id");
    expect(parsed.createdAt).toBe(date.toISOString());
  });
});

describe("getExponentialBackoffDelay", () => {
  it("should return base delay for attempt 0", () => {
    const delay = getExponentialBackoffDelay(0, 1000);
    expect(delay).toBeGreaterThanOrEqual(1000);
    expect(delay).toBeLessThanOrEqual(1250); // base + 25% jitter
  });

  it("should double delay for each attempt", () => {
    // Without jitter, attempt 2 would be 4000ms
    const delay = getExponentialBackoffDelay(2, 1000);
    expect(delay).toBeGreaterThanOrEqual(4000);
    expect(delay).toBeLessThanOrEqual(5000);
  });

  it("should respect max delay", () => {
    const delay = getExponentialBackoffDelay(10, 1000, 5000);
    expect(delay).toBeLessThanOrEqual(6250); // max + 25% jitter
  });
});
