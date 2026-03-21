/**
 * Tools module exports
 */

export {
  ToolRegistry,
  tool,
  textResult,
  jsonResult,
  toolRegistry,
} from "./registry.js";
export type { AnyToolDefinition } from "./registry.js";

export { customTools, registerCustomTools } from "./custom/index.js";
