import { getSetting } from "../db.js";

const API_KEY = process.env.ANTHROPIC_API_KEY;
const MODEL = process.env.ANTHROPIC_MODEL || "claude-sonnet-4-5";
const DEFAULT_PROMPT =
  process.env.AI_SYSTEM_PROMPT ||
  "You are a helpful, friendly assistant replying to customers on WhatsApp. Keep replies short (2-4 sentences), clear, and polite.";

export function isAiEnabled() {
  const flag = getSetting("ai_enabled", process.env.AI_ENABLED ?? "true");
  return String(flag).toLowerCase() === "true";
}

export function getSystemPrompt() {
  return getSetting("system_prompt", DEFAULT_PROMPT);
}

/**
 * history: array of { direction: 'in'|'out', body: string }, oldest first.
 * Returns the assistant's reply text, or null if AI is not configured/enabled.
 */
export async function generateReply(history, latestUserMessage) {
  if (!API_KEY) {
    throw new Error("ANTHROPIC_API_KEY is not configured");
  }

  const messages = [
    ...history.map((m) => ({
      role: m.direction === "in" ? "user" : "assistant",
      content: m.body,
    })),
    { role: "user", content: latestUserMessage },
  ];

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": API_KEY,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 512,
      system: getSystemPrompt(),
      messages,
    }),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const message = data?.error?.message || `Anthropic API error (${res.status})`;
    throw new Error(message);
  }

  return data.content?.map((block) => block.text).join("").trim() || null;
}
