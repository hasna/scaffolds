/**
 * Permissions module exports
 */

export {
  defaultPolicy,
  strictPolicy,
  permissivePolicy,
  getPolicy,
} from "./policy.js";
export type {
  PermissionPolicy,
  PermissionRule,
  PermissionConditions,
} from "./policy.js";

export { PermissionEvaluator } from "./evaluator.js";
export type { PermissionResult } from "./evaluator.js";
