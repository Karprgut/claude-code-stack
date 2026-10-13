import { createAnthropicProvider } from "./anthropic";
import { createOpenAIProvider } from "./openai";
import type { ChatProvider, ModelEntry } from "./types";

export type { ChatProvider, GenericTool, ProviderMessage, ToolCall, ToolResult, CompletionResult, ModelEntry, TokenUsage } from "./types";
export { routeMessage } from "./router";

// --- Model registry ---
export const MODELS: ModelEntry[] = [
  {
    id: "auto",
    label: "Auto",
    provider: "auto",
    modelId: "",
    maxTokens: 8192,
  },
  // Anthropic
  {
    id: "claude-sonnet",
    label: "Claude Sonnet",
    provider: "anthropic",
    modelId: "claude-sonnet-4-6",
    maxTokens: 8192,
    pricing: { inputPerMillion: 3, outputPerMillion: 15 },
  },
  // OpenAI
  {
    id: "gpt-4o",
    label: "GPT-4o",
    provider: "openai",
    modelId: "gpt-4o",
    maxTokens: 4096,
    pricing: { inputPerMillion: 2.5, outputPerMillion: 10 },
  },
  {
    id: "gpt-4o-mini",
    label: "GPT-4o Mini",
    provider: "openai",
    modelId: "gpt-4o-mini",
    maxTokens: 4096,
    pricing: { inputPerMillion: 0.15, outputPerMillion: 0.6 },
  },
  // Google Gemini (OpenAI-compatible endpoint)
  {
    id: "gemini-2.5-pro",
    label: "Gemini 2.5 Pro",
    provider: "gemini",
    modelId: "gemini-2.5-pro",
    maxTokens: 8192,
    pricing: { inputPerMillion: 1.25, outputPerMillion: 10 },
  },
  // xAI Grok
  {
    id: "grok-3",
    label: "Grok 3",
    provider: "xai",
    modelId: "grok-3",
    maxTokens: 4096,
    pricing: { inputPerMillion: 3, outputPerMillion: 15 },
  },
  // DeepSeek
  {
    id: "deepseek-r1",
    label: "DeepSeek R1",
    provider: "deepseek",
    modelId: "deepseek-reasoner",
    maxTokens: 8192,
    pricing: { inputPerMillion: 0.55, outputPerMillion: 2.19 },
  },
  // Mistral
  {
    id: "mistral-large",
    label: "Mistral Large",
    provider: "mistral",
    modelId: "mistral-large-latest",
    maxTokens: 4096,
    pricing: { inputPerMillion: 2, outputPerMillion: 6 },
  },
];

// Haiku router pricing (used internally)
export const ROUTER_PRICING = { inputPerMillion: 0.8, outputPerMillion: 4 };

export const DEFAULT_MODEL = "auto";

// Provider configs — base URLs for OpenAI-compatible APIs
const PROVIDER_CONFIG: Record<string, { envKey: string; baseURL?: string }> = {
  anthropic: { envKey: "ANTHROPIC_API_KEY" },
  openai: { envKey: "OPENAI_API_KEY" },
  gemini: { envKey: "GEMINI_API_KEY", baseURL: "https://generativelanguage.googleapis.com/v1beta/openai/" },
  xai: { envKey: "XAI_API_KEY", baseURL: "https://api.x.ai/v1" },
  deepseek: { envKey: "DEEPSEEK_API_KEY", baseURL: "https://api.deepseek.com" },
  mistral: { envKey: "MISTRAL_API_KEY", baseURL: "https://api.mistral.ai/v1" },
};

// --- Factory ---
export function getProvider(modelSlug: string): { provider: ChatProvider; model: ModelEntry } {
  const model = MODELS.find((m) => m.id === modelSlug) || MODELS[1]; // fallback to claude-sonnet
  console.log(`[getProvider] slug=${modelSlug} provider=${model.provider} modelId=${model.modelId}`);

  if (model.provider === "anthropic") {
    const key = process.env.ANTHROPIC_API_KEY;
    if (!key) throw new Error("ANTHROPIC_API_KEY not set");
    console.log(`[getProvider] Using Anthropic native SDK, key=${key.slice(0, 12)}...`);
    return { provider: createAnthropicProvider(key, model.modelId), model };
  }

  // All other providers use the OpenAI-compatible client
  const config = PROVIDER_CONFIG[model.provider];
  if (!config) throw new Error(`Unknown provider: ${model.provider}`);

  const key = process.env[config.envKey];
  if (!key) throw new Error(`${config.envKey} not set`);

  console.log(`[getProvider] Using OpenAI-compatible client for ${model.provider}, baseURL=${config.baseURL || "default"}, key=${key.slice(0, 12)}..., modelId=${model.modelId}`);
  return {
    provider: createOpenAIProvider(key, model.modelId, config.baseURL),
    model,
  };
}

// Return only models that have their API key configured
export function getAvailableModels(): ModelEntry[] {
  return MODELS.filter((m) => {
    if (m.provider === "auto") return true;
    const config = PROVIDER_CONFIG[m.provider];
    if (!config) return false;
    return !!process.env[config.envKey];
  });
}
