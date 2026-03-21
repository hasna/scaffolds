#!/usr/bin/env bun
/**
 * Claude Code Hook: Check API Documentation
 *
 * PRE-TOOL BLOCKER for Write/Edit operations.
 * Detects when code is being written that uses external APIs and blocks
 * until the AI searches for the latest official documentation.
 *
 * Supported APIs:
 * - AI: OpenAI, Anthropic, Google Gemini, xAI (Grok), Mistral, Cohere, Replicate
 * - Voice: ElevenLabs, AssemblyAI, Deepgram
 * - Productivity: Slack, Notion, Google Suite (Gmail, Drive, Calendar, Sheets)
 * - Payments: Stripe, PayPal
 * - Auth: Auth0, Clerk, NextAuth
 * - Database: Supabase, Firebase, PlanetScale
 * - Other: Twilio, SendGrid, Resend, Cloudflare, Vercel, AWS
 */

import { existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

// Get the project root (where this hook file lives is .claude/hooks/)
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const PROJECT_ROOT = join(__dirname, "..", "..");

interface HookInput {
  session_id: string;
  hook_event_name: string;
  tool_name: string;
  tool_input: {
    file_path?: string;
    content?: string;
    new_string?: string;
    old_string?: string;
  };
}

interface HookOutput {
  decision: "approve" | "block";
  reason?: string;
}

// API detection patterns with their official documentation URLs
const API_PATTERNS: Record<string, { patterns: RegExp[]; docUrl: string; name: string }> = {
  openai: {
    patterns: [
      /openai/i,
      /ChatCompletion/i,
      /gpt-4/i,
      /gpt-3\.5/i,
      /dall-e/i,
      /whisper/i,
      /text-embedding/i,
      /from\s+['"]openai['"]/,
      /import\s+OpenAI/i,
    ],
    docUrl: "https://platform.openai.com/docs",
    name: "OpenAI",
  },
  anthropic: {
    patterns: [
      /anthropic/i,
      /claude-3/i,
      /claude-opus/i,
      /claude-sonnet/i,
      /claude-haiku/i,
      /from\s+['"]@anthropic-ai/,
      /import\s+Anthropic/i,
    ],
    docUrl: "https://docs.anthropic.com",
    name: "Anthropic",
  },
  gemini: {
    patterns: [
      /gemini/i,
      /google.*generative/i,
      /@google\/generative-ai/,
      /gemini-pro/i,
      /gemini-ultra/i,
      /gemini-nano/i,
      /gemini-flash/i,
    ],
    docUrl: "https://ai.google.dev/docs",
    name: "Google Gemini",
  },
  xai: {
    patterns: [/x\.ai/i, /grok/i, /xai.*api/i],
    docUrl: "https://docs.x.ai",
    name: "xAI (Grok)",
  },
  mistral: {
    patterns: [
      /mistral/i,
      /@mistralai/,
      /mistral-large/i,
      /mistral-medium/i,
      /mistral-small/i,
      /mixtral/i,
    ],
    docUrl: "https://docs.mistral.ai",
    name: "Mistral AI",
  },
  cohere: {
    patterns: [/cohere/i, /from\s+['"]cohere/, /command-r/i],
    docUrl: "https://docs.cohere.com",
    name: "Cohere",
  },
  replicate: {
    patterns: [/replicate/i, /from\s+['"]replicate/],
    docUrl: "https://replicate.com/docs",
    name: "Replicate",
  },
  elevenlabs: {
    patterns: [/elevenlabs/i, /eleven.*labs/i, /text-to-speech.*eleven/i, /from\s+['"]elevenlabs/],
    docUrl: "https://elevenlabs.io/docs",
    name: "ElevenLabs",
  },
  assemblyai: {
    patterns: [/assemblyai/i, /assembly.*ai/i, /from\s+['"]assemblyai/],
    docUrl: "https://www.assemblyai.com/docs",
    name: "AssemblyAI",
  },
  deepgram: {
    patterns: [/deepgram/i, /@deepgram/],
    docUrl: "https://developers.deepgram.com/docs",
    name: "Deepgram",
  },
  slack: {
    patterns: [/slack.*api/i, /@slack\/web-api/, /@slack\/bolt/, /slack.*webhook/i, /SlackAPI/i],
    docUrl: "https://api.slack.com/docs",
    name: "Slack",
  },
  notion: {
    patterns: [/notion.*api/i, /@notionhq\/client/, /notion.*client/i],
    docUrl: "https://developers.notion.com/docs",
    name: "Notion",
  },
  google_gmail: {
    patterns: [/gmail.*api/i, /googleapis.*gmail/i, /google.*mail/i],
    docUrl: "https://developers.google.com/gmail/api/guides",
    name: "Gmail API",
  },
  google_drive: {
    patterns: [/drive.*api/i, /googleapis.*drive/i, /google.*drive/i],
    docUrl: "https://developers.google.com/drive/api/guides",
    name: "Google Drive API",
  },
  google_calendar: {
    patterns: [/calendar.*api/i, /googleapis.*calendar/i, /google.*calendar/i],
    docUrl: "https://developers.google.com/calendar/api/guides",
    name: "Google Calendar API",
  },
  google_sheets: {
    patterns: [/sheets.*api/i, /googleapis.*sheets/i, /google.*sheets/i],
    docUrl: "https://developers.google.com/sheets/api/guides",
    name: "Google Sheets API",
  },
  stripe: {
    patterns: [
      /stripe/i,
      /@stripe\/stripe-js/,
      /@stripe\/react-stripe-js/,
      /PaymentIntent/i,
      /SetupIntent/i,
      /Stripe\.customers/i,
    ],
    docUrl: "https://stripe.com/docs/api",
    name: "Stripe",
  },
  twilio: {
    patterns: [/twilio/i, /from\s+['"]twilio/],
    docUrl: "https://www.twilio.com/docs",
    name: "Twilio",
  },
  sendgrid: {
    patterns: [/sendgrid/i, /@sendgrid\/mail/],
    docUrl: "https://docs.sendgrid.com",
    name: "SendGrid",
  },
  resend: {
    patterns: [/resend/i, /from\s+['"]resend/],
    docUrl: "https://resend.com/docs",
    name: "Resend",
  },
  supabase: {
    patterns: [/supabase/i, /@supabase\/supabase-js/, /createClient.*supabase/i],
    docUrl: "https://supabase.com/docs",
    name: "Supabase",
  },
  firebase: {
    patterns: [/firebase/i, /from\s+['"]firebase/, /firestore/i],
    docUrl: "https://firebase.google.com/docs",
    name: "Firebase",
  },
  clerk: {
    patterns: [/clerk/i, /@clerk\/nextjs/, /@clerk\/clerk-react/],
    docUrl: "https://clerk.com/docs",
    name: "Clerk",
  },
  auth0: {
    patterns: [/auth0/i, /@auth0/],
    docUrl: "https://auth0.com/docs",
    name: "Auth0",
  },
  vercel: {
    patterns: [/vercel.*api/i, /@vercel\/analytics/, /@vercel\/og/, /vercel.*sdk/i],
    docUrl: "https://vercel.com/docs",
    name: "Vercel",
  },
  cloudflare: {
    patterns: [/cloudflare.*api/i, /cloudflare.*workers/i, /@cloudflare/],
    docUrl: "https://developers.cloudflare.com",
    name: "Cloudflare",
  },
  aws: {
    patterns: [/aws-sdk/i, /@aws-sdk/, /AWS\.S3/i, /AWS\.Lambda/i, /AWS\.DynamoDB/i],
    docUrl: "https://docs.aws.amazon.com",
    name: "AWS",
  },
  banana: {
    patterns: [/banana/i, /banana.*dev/i],
    docUrl: "https://docs.banana.dev",
    name: "Banana.dev",
  },
  huggingface: {
    patterns: [/huggingface/i, /hugging.*face/i, /@huggingface/, /transformers/i],
    docUrl: "https://huggingface.co/docs",
    name: "Hugging Face",
  },
  langchain: {
    patterns: [/langchain/i, /from\s+['"]langchain/, /@langchain/],
    docUrl: "https://js.langchain.com/docs",
    name: "LangChain",
  },
  pinecone: {
    patterns: [/pinecone/i, /@pinecone-database/],
    docUrl: "https://docs.pinecone.io",
    name: "Pinecone",
  },
};

function output(result: HookOutput): void {
  const json = JSON.stringify(result);
  process.stdout.write(json + "\n");
}

function detectAPIs(content: string): { name: string; docUrl: string }[] {
  const detected: { name: string; docUrl: string }[] = [];
  const seenNames = new Set<string>();

  for (const [key, config] of Object.entries(API_PATTERNS)) {
    for (const pattern of config.patterns) {
      if (pattern.test(content) && !seenNames.has(config.name)) {
        detected.push({ name: config.name, docUrl: config.docUrl });
        seenNames.add(config.name);
        break;
      }
    }
  }

  return detected;
}

async function main() {
  try {
    const input = await Bun.stdin.text();
    let hookInput: HookInput;

    try {
      hookInput = JSON.parse(input);
    } catch {
      output({ decision: "approve" });
      process.exit(0);
    }

    // Only check Write and Edit tools
    const toolName = hookInput.tool_name?.toLowerCase() || "";
    if (!toolName.includes("write") && !toolName.includes("edit")) {
      output({ decision: "approve" });
      process.exit(0);
    }

    // Get the content being written
    const content = hookInput.tool_input?.content || hookInput.tool_input?.new_string || "";

    if (!content) {
      output({ decision: "approve" });
      process.exit(0);
    }

    // Skip if it's not a code file
    const filePath = hookInput.tool_input?.file_path || "";
    const codeExtensions = [".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs", ".py", ".go", ".rs"];
    const isCodeFile = codeExtensions.some((ext) => filePath.endsWith(ext));

    if (!isCodeFile) {
      output({ decision: "approve" });
      process.exit(0);
    }

    // Detect APIs in the content
    const detectedAPIs = detectAPIs(content);

    if (detectedAPIs.length === 0) {
      output({ decision: "approve" });
      process.exit(0);
    }

    // Block and instruct to search for docs
    const apiList = detectedAPIs.map((api) => `  - ${api.name}: ${api.docUrl}`).join("\n");

    const reason = `🚫 BLOCKED: Detected API usage that requires latest documentation!

APIs detected in your code:
${apiList}

⚠️ BEFORE WRITING THIS CODE, YOU MUST:
1. Use WebSearch or WebFetch to get the LATEST official documentation
2. Verify the API methods, parameters, and types are current
3. Check for any recent breaking changes or deprecations

Only use OFFICIAL documentation sources listed above.
After reviewing docs, you may proceed with writing the code.

This ensures your code uses up-to-date API patterns and avoids deprecated methods.`;

    output({
      decision: "block",
      reason: reason,
    });
    process.exit(0);
  } catch (error) {
    // On error, approve to avoid blocking
    output({ decision: "approve" });
    process.exit(0);
  }
}

main();
