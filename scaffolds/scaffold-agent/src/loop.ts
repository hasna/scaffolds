#!/usr/bin/env bun
import { createCompletion, type Provider } from "./core/providers.js";

const provider = (process.env.AGENT_PROVIDER ?? "anthropic") as Provider;
const model = process.env.AGENT_MODEL;
const systemPrompt = process.env.AGENT_SYSTEM_PROMPT ?? "You are a helpful AI agent.";
const task = process.env.AGENT_TASK ?? "Report the current status.";
const intervalMs = parseInt(process.env.AGENT_LOOP_INTERVAL_MS ?? "5000");

async function runLoop() {
  console.log(`Starting agent loop — provider: ${provider}, interval: ${intervalMs}ms`);
  const history: { role: "user" | "assistant"; content: string }[] = [];

  while (true) {
    history.push({ role: "user", content: task });
    const result = await createCompletion(
      [{ role: "system", content: systemPrompt }, ...history],
      { provider, model }
    );
    console.log(`[${new Date().toISOString()}] ${result.content}`);
    history.push({ role: "assistant", content: result.content });
    if (history.length > 20) history.splice(0, 2); // keep last 10 turns
    await Bun.sleep(intervalMs);
  }
}

process.on("SIGINT", () => { console.log("\nAgent stopped."); process.exit(0); });
runLoop().catch(console.error);
