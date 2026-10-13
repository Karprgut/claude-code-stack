import Anthropic from "@anthropic-ai/sdk";
import { getAvailableModels } from "./index";
import type { TokenUsage } from "./types";

const ROUTER_MODEL = "claude-haiku-4-5-20251001";

function buildRoutingPrompt(): string {
  const available = getAvailableModels().filter((m) => m.provider !== "auto");
  const modelList = available.map((m) => {
    const descs: Record<string, string> = {
      "claude-sonnet": "Best for complex reasoning, nuanced analysis, management advice, multi-step tool use, image/screenshot parsing. Strongest overall.",
      "gpt-4o": "Fast answers, code generation, structured data extraction.",
      "gpt-4o-mini": "Cheapest/fastest. Simple lookups, quick tasks, trivial questions.",
      "gemini-2.5-pro": "Long context (1M tokens), good at analysis and summarization.",
      "grok-3": "Fast, good at real-time info and code.",
      "deepseek-r1": "Strong reasoning, math, logic. Very cheap.",
      "mistral-large": "Good generalist, EU-hosted.",
    };
    return `- ${m.id}: ${descs[m.id] || m.label}`;
  }).join("\n");

  return `You are a model router. Given a user message, pick the best AI model to handle it.

Available models:
${modelList}

Rules:
- Default to claude-sonnet for anything complex, ambiguous, or requiring judgment
- Use gpt-4o-mini for trivial questions, greetings, simple lookups
- Use gpt-4o for straightforward code or data tasks
- Use gemini-2.5-pro for tasks requiring very long context
- Use deepseek-r1 for math, logic puzzles, or reasoning-heavy tasks
- If the message includes images or screenshots, always use claude-sonnet
- If the message involves people management, scoring, or sensitive topics, use claude-sonnet
- If unsure, use claude-sonnet

Respond with ONLY the model id. Nothing else.`;
}

export async function routeMessage(
  userMessage: string,
  hasImages: boolean
): Promise<{ model: string; routerUsage?: TokenUsage }> {
  // Fast paths — skip the router API call for obvious cases
  if (hasImages) return { model: "claude-sonnet" };

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return { model: "claude-sonnet" };

  const lower = userMessage.toLowerCase();

  // People/management questions always need Claude (tool use + deep context)
  if (/\b(who is|tell me about|update on|how is|what about|details about|notes on)\b/i.test(lower)) return { model: "claude-sonnet" };
  if (/\b(beth|mani|brent|scott|trevor|karim|yasel|kari|bryce|jake)\b/i.test(lower)) return { model: "claude-sonnet" };

  // Anything that likely needs tool use → Claude
  if (/\b(todo|todos|add|create|complete|score|feedback|milestone|jira|calendar|invoice|report|metric|summary|log)\b/i.test(lower)) return { model: "claude-sonnet" };
  if (lower.length > 200) return { model: "claude-sonnet" }; // long/complex messages

  // Only truly trivial → let the router decide (it may pick mini)
  if (lower.length < 10) {
    if (/^(hi|hey|hello|thanks|ok|yes|no|sure)\b/.test(lower)) return { model: "gpt-4o-mini" };
  }

  try {
    const client = new Anthropic({ apiKey });
    const response = await client.messages.create({
      model: ROUTER_MODEL,
      max_tokens: 20,
      system: buildRoutingPrompt(),
      messages: [{ role: "user", content: userMessage }],
    });

    const text = response.content[0]?.type === "text"
      ? response.content[0].text.trim().toLowerCase()
      : "";

    const routerUsage: TokenUsage = {
      inputTokens: response.usage?.input_tokens || 0,
      outputTokens: response.usage?.output_tokens || 0,
    };

    // Validate the response is an available model
    const available = getAvailableModels();
    const match = available.find((m) => m.id === text);
    return { model: match ? match.id : "claude-sonnet", routerUsage };
  } catch {
    return { model: "claude-sonnet" };
  }
}
