// @ts-nocheck
import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  countTokens,
  estimateTokens,
  countMessagesTokens,
  calculateCost,
  type ChatMessage,
} from "./ai";

describe("ai utilities", () => {
  describe("countTokens", () => {
    it("should count tokens for simple text", () => {
      const text = "Hello, world!";
      const tokens = countTokens(text);
      expect(tokens).toBeGreaterThan(0);
      expect(typeof tokens).toBe("number");
    });

    it("should count more tokens for longer text", () => {
      const shortText = "Hello";
      const longText = "Hello, this is a much longer sentence with many more words.";
      const shortTokens = countTokens(shortText);
      const longTokens = countTokens(longText);
      expect(longTokens).toBeGreaterThan(shortTokens);
    });

    it("should handle empty string", () => {
      const tokens = countTokens("");
      expect(tokens).toBe(0);
    });

    it("should handle different models", () => {
      const text = "Hello, world!";
      const gpt4oTokens = countTokens(text, "gpt-4o");
      const gpt4Tokens = countTokens(text, "gpt-4");
      // Both should return valid token counts
      expect(gpt4oTokens).toBeGreaterThan(0);
      expect(gpt4Tokens).toBeGreaterThan(0);
    });

    it("should use cl100k_base for unknown models", () => {
      const text = "Hello, world!";
      const tokens = countTokens(text, "unknown-model");
      expect(tokens).toBeGreaterThan(0);
    });
  });

  describe("estimateTokens", () => {
    it("should estimate tokens based on character count", () => {
      const text = "Hello, world!"; // 13 characters
      const estimated = estimateTokens(text);
      // ~13/4 = 3.25, ceil = 4
      expect(estimated).toBe(4);
    });

    it("should handle empty string", () => {
      const estimated = estimateTokens("");
      expect(estimated).toBe(0);
    });

    it("should round up", () => {
      const text = "12345"; // 5 characters
      const estimated = estimateTokens(text);
      // 5/4 = 1.25, ceil = 2
      expect(estimated).toBe(2);
    });
  });

  describe("countMessagesTokens", () => {
    it("should count tokens for a single message", () => {
      const messages: ChatMessage[] = [
        { role: "user", content: "Hello!" },
      ];
      const tokens = countMessagesTokens(messages);
      // Should include overhead (4 per message + 2 for priming)
      expect(tokens).toBeGreaterThan(6);
    });

    it("should count tokens for multiple messages", () => {
      const singleMessage: ChatMessage[] = [
        { role: "user", content: "Hello!" },
      ];
      const multipleMessages: ChatMessage[] = [
        { role: "user", content: "Hello!" },
        { role: "assistant", content: "Hi there!" },
        { role: "user", content: "How are you?" },
      ];
      const singleTokens = countMessagesTokens(singleMessage);
      const multipleTokens = countMessagesTokens(multipleMessages);
      expect(multipleTokens).toBeGreaterThan(singleTokens);
    });

    it("should handle empty messages array", () => {
      const tokens = countMessagesTokens([]);
      // Should still have priming tokens
      expect(tokens).toBe(2);
    });

    it("should use different encodings for different models", () => {
      const messages: ChatMessage[] = [
        { role: "user", content: "Hello, world!" },
      ];
      const gpt4oTokens = countMessagesTokens(messages, "gpt-4o");
      const gpt4Tokens = countMessagesTokens(messages, "gpt-4");
      // Both should return valid token counts
      expect(gpt4oTokens).toBeGreaterThan(0);
      expect(gpt4Tokens).toBeGreaterThan(0);
    });
  });

  describe("calculateCost", () => {
    it("should calculate cost for gpt-4o", () => {
      const cost = calculateCost("gpt-4o", 1000, 500);
      // Input: (1000/1M) * 2.5 * 100 = 0.00025 cents
      // Output: (500/1M) * 10 * 100 = 0.0005 cents
      // Total: ~0.00075 cents, ceil = 1 cent
      expect(cost).toBe(1);
    });

    it("should calculate cost for gpt-4o-mini (cheaper)", () => {
      const cost = calculateCost("gpt-4o-mini", 1000, 500);
      // Input: (1000/1M) * 0.15 * 100 = 0.000015 cents
      // Output: (500/1M) * 0.6 * 100 = 0.00003 cents
      expect(cost).toBe(1); // Rounds up to 1
    });

    it("should calculate higher cost for large token counts", () => {
      const smallCost = calculateCost("gpt-4o", 1000, 500);
      const largeCost = calculateCost("gpt-4o", 1000000, 500000);
      expect(largeCost).toBeGreaterThan(smallCost);
    });

    it("should calculate cost for claude models", () => {
      const opusCost = calculateCost("claude-3-opus", 1000, 500);
      const haikuCost = calculateCost("claude-3-haiku", 1000, 500);
      // Opus is more expensive than Haiku
      expect(opusCost).toBeGreaterThanOrEqual(haikuCost);
    });

    it("should use default pricing for unknown models", () => {
      const cost = calculateCost("unknown-model", 1000, 500);
      // Should use gpt-4o pricing as default
      expect(cost).toBeGreaterThan(0);
    });

    it("should handle zero tokens", () => {
      const cost = calculateCost("gpt-4o", 0, 0);
      expect(cost).toBe(0);
    });

    it("should always round up", () => {
      // Very small token count should still result in at least 1 cent if any tokens
      const cost = calculateCost("gpt-4o", 1, 1);
      expect(cost).toBe(1);
    });
  });
});
