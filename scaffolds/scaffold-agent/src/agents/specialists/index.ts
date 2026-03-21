/**
 * Specialists module exports
 */

export { BaseSpecialist } from "./base-specialist.js";
export { CodeSpecialist } from "./code-specialist.js";
export { ResearchSpecialist } from "./research-specialist.js";
export { DataSpecialist } from "./data-specialist.js";
export { SecuritySpecialist } from "./security-specialist.js";

import { CodeSpecialist } from "./code-specialist.js";
import { ResearchSpecialist } from "./research-specialist.js";
import { DataSpecialist } from "./data-specialist.js";
import { SecuritySpecialist } from "./security-specialist.js";
import type { SpecialistAgent, SpecialistDomain } from "../types.js";

/**
 * Create a specialist by domain
 */
export function createSpecialist(domain: SpecialistDomain): SpecialistAgent {
  switch (domain) {
    case "code":
      return new CodeSpecialist();
    case "research":
      return new ResearchSpecialist();
    case "data":
      return new DataSpecialist();
    case "security":
      return new SecuritySpecialist();
    default:
      throw new Error(`Unknown specialist domain: ${domain}`);
  }
}

/**
 * Create all specialists
 */
export function createAllSpecialists(): Record<string, SpecialistAgent> {
  return {
    code: new CodeSpecialist(),
    research: new ResearchSpecialist(),
    data: new DataSpecialist(),
    security: new SecuritySpecialist(),
  };
}
