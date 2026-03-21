export interface EnvVar {
  key: string;
  label: string;
  description: string;
  default?: string;
  required: boolean;
  secret: boolean;
  group: string;
  hint?: string;
}

export const ENV_VARS: EnvVar[] = [
  // AI
  {
    key: "ANTHROPIC_API_KEY",
    label: "Anthropic API Key",
    description: "API key for Claude models (primary provider)",
    required: true,
    secret: true,
    group: "AI",
    hint: "Get from https://console.anthropic.com/settings/keys",
  },
  {
    key: "OPENAI_API_KEY",
    label: "OpenAI API Key",
    description: "Optional — API key for OpenAI models (fallback provider)",
    required: false,
    secret: true,
    group: "AI",
    hint: "Get from https://platform.openai.com/api-keys",
  },

  // Agent
  {
    key: "AGENT_PROVIDER",
    label: "Agent Provider",
    description: "Which AI provider to use: anthropic or openai",
    default: "anthropic",
    required: false,
    secret: false,
    group: "Agent",
  },
  {
    key: "AGENT_MODEL",
    label: "Agent Model",
    description: "The model name to use (e.g. claude-opus-4-5, gpt-4o)",
    default: "claude-opus-4-5",
    required: false,
    secret: false,
    group: "Agent",
    hint: "Anthropic models: claude-opus-4-5, claude-sonnet-4-5. OpenAI: gpt-4o, o3",
  },
  {
    key: "AGENT_SYSTEM_PROMPT",
    label: "Agent System Prompt",
    description: "System prompt that defines the agent's persona and behavior",
    default: "You are a helpful AI assistant.",
    required: false,
    secret: false,
    group: "Agent",
  },
  {
    key: "AGENT_TASK",
    label: "Agent Task",
    description: "The task or goal the agent should execute in its loop",
    required: false,
    secret: false,
    group: "Agent",
  },
  {
    key: "AGENT_LOOP_INTERVAL_MS",
    label: "Agent Loop Interval (ms)",
    description: "Milliseconds between each iteration of the agent task loop",
    default: "5000",
    required: false,
    secret: false,
    group: "Agent",
  },
];
