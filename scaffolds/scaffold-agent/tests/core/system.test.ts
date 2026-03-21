/**
 * Tests for the AgentSystem
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { AgentSystem, createAgentSystem } from "../../src/core/system.js";
import { defaultConfig, validateConfig, mergeConfig } from "../../src/core/config.js";

describe("AgentSystem", () => {
  describe("configuration", () => {
    it("should merge partial config with defaults", () => {
      const partial = {
        maxTurns: 100,
        maxBudgetUsd: 20.0,
      };

      const merged = mergeConfig(partial);

      expect(merged.maxTurns).toBe(100);
      expect(merged.maxBudgetUsd).toBe(20.0);
      expect(merged.model).toBe(defaultConfig.model);
    });

    it("should validate configuration", () => {
      const validConfig = { ...defaultConfig };
      const errors = validateConfig(validConfig);
      expect(errors).toHaveLength(0);
    });

    it("should reject invalid maxTurns", () => {
      const invalidConfig = { ...defaultConfig, maxTurns: 0 };
      const errors = validateConfig(invalidConfig);
      expect(errors).toContain("maxTurns must be at least 1");
    });

    it("should reject invalid maxBudgetUsd", () => {
      const invalidConfig = { ...defaultConfig, maxBudgetUsd: -1 };
      const errors = validateConfig(invalidConfig);
      expect(errors).toContain("maxBudgetUsd must be positive");
    });
  });

  describe("createAgentSystem", () => {
    it("should create an agent system with default config", () => {
      const system = createAgentSystem();
      expect(system).toBeInstanceOf(AgentSystem);
    });

    it("should create an agent system with custom config", () => {
      const system = createAgentSystem({
        config: { maxTurns: 25 },
      });
      expect(system.getConfig().maxTurns).toBe(25);
    });
  });

  describe("event bus", () => {
    it("should have an event bus", () => {
      const system = createAgentSystem();
      expect(system.eventBus).toBeDefined();
    });

    it("should register listeners", () => {
      const system = createAgentSystem();
      const handler = vi.fn();

      system.eventBus.register({
        name: "test-listener",
        events: ["task_started"],
        handler,
      });

      expect(system.eventBus.hasListener("test-listener")).toBe(true);
    });
  });
});

describe("defaultConfig", () => {
  it("should have required properties", () => {
    expect(defaultConfig.model).toBeDefined();
    expect(defaultConfig.maxTurns).toBeGreaterThan(0);
    expect(defaultConfig.maxBudgetUsd).toBeGreaterThan(0);
    expect(defaultConfig.tools).toBeDefined();
    expect(defaultConfig.hooks).toBeDefined();
    expect(defaultConfig.skills).toBeDefined();
    expect(defaultConfig.listeners).toBeDefined();
    expect(defaultConfig.agents).toBeDefined();
  });

  it("should have builtin tools", () => {
    expect(defaultConfig.tools.builtin).toContain("Read");
    expect(defaultConfig.tools.builtin).toContain("Write");
    expect(defaultConfig.tools.builtin).toContain("Edit");
  });
});
