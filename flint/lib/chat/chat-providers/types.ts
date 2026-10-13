import type { ChatImage } from "@/lib/chat";

// --- Generic tool definition (provider-agnostic) ---
export interface ToolParameter {
  type: string;
  description?: string;
  properties?: Record<string, ToolParameter>;
  required?: string[];
  items?: ToolParameter;
}

export interface GenericTool {
  name: string;
  description: string;
  parameters: ToolParameter;
}

// --- Generic message format for the provider interface ---
export interface ProviderMessage {
  role: "user" | "assistant";
  content: string;
  images?: ChatImage[];
}

// --- Tool call / result (same as chat.ts but re-exported for clarity) ---
export interface ToolCall {
  id: string;
  name: string;
  input: Record<string, unknown>;
}

export interface ToolResult {
  toolCallId: string;
  output: string;
}

// --- Token usage from provider response ---
export interface TokenUsage {
  inputTokens: number;
  outputTokens: number;
}

// --- Provider completion result ---
export interface CompletionResult {
  text: string;
  toolCalls: ToolCall[];
  // Provider-specific raw messages for continuing the tool loop
  // Each provider stores its own format here
  rawMessages: unknown[];
  // Token usage from the provider response
  usage?: TokenUsage;
}

// --- The provider interface ---
export interface ChatProvider {
  /**
   * Run a single completion (may include tool calls).
   * The caller (route.ts) handles the tool execution loop.
   */
  createCompletion(params: {
    systemPrompt: string;
    messages: unknown[]; // Provider-specific message array (built by the provider)
    tools: GenericTool[];
    maxTokens: number;
  }): Promise<CompletionResult>;

  /**
   * Build the initial message array from generic messages.
   * This converts our stored format into provider-specific format.
   */
  buildMessages(messages: ProviderMessage[], systemPrompt: string): unknown[];

  /**
   * Append tool results to the conversation for the next iteration.
   * Takes the raw assistant message and tool results, returns updated messages.
   */
  appendToolResults(
    currentMessages: unknown[],
    rawAssistantContent: unknown,
    toolResults: { toolCallId: string; output: string }[]
  ): unknown[];

  /** Provider display name */
  name: string;

  /** Whether this provider supports image inputs */
  supportsImages: boolean;
}

// --- Model registry entry ---
export interface ModelEntry {
  id: string;          // e.g. "claude-sonnet"
  label: string;       // e.g. "Claude Sonnet"
  provider: string;    // e.g. "anthropic" | "openai"
  modelId: string;     // actual API model ID, e.g. "claude-sonnet-4-6"
  maxTokens: number;
  pricing?: {
    inputPerMillion: number;   // USD per 1M input tokens
    outputPerMillion: number;  // USD per 1M output tokens
  };
}
