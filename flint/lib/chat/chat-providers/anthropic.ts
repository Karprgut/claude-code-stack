import Anthropic from "@anthropic-ai/sdk";
import type { ChatProvider, GenericTool, CompletionResult, ProviderMessage, ToolCall } from "./types";
import type { ChatImage } from "@/lib/chat";

type ImageMediaType = "image/jpeg" | "image/png" | "image/gif" | "image/webp";

function buildContent(
  text: string,
  images?: ChatImage[]
): Anthropic.ContentBlockParam[] | string {
  if (!images?.length) return text;
  const blocks: Anthropic.ContentBlockParam[] = [];
  for (const img of images) {
    blocks.push({
      type: "image",
      source: {
        type: "base64",
        media_type: img.mediaType as ImageMediaType,
        data: img.data,
      },
    });
  }
  blocks.push({ type: "text", text });
  return blocks;
}

function toAnthropicTools(tools: GenericTool[]): Anthropic.Tool[] {
  return tools.map((t) => ({
    name: t.name,
    description: t.description,
    input_schema: {
      type: "object" as const,
      properties: t.parameters.properties || {},
      required: t.parameters.required || [],
    },
  }));
}

export function createAnthropicProvider(apiKey: string, modelId: string): ChatProvider {
  const client = new Anthropic({ apiKey });

  return {
    name: "Claude",
    supportsImages: true,

    buildMessages(messages: ProviderMessage[]): Anthropic.MessageParam[] {
      return messages.map((m) => ({
        role: m.role,
        content: m.role === "user" ? buildContent(m.content, m.images) : m.content,
      }));
    },

    async createCompletion({ systemPrompt, messages, tools, maxTokens }): Promise<CompletionResult> {
      const response = await client.messages.create({
        model: modelId,
        max_tokens: maxTokens,
        system: systemPrompt,
        tools: toAnthropicTools(tools),
        messages: messages as Anthropic.MessageParam[],
      });

      let text = "";
      const toolCalls: ToolCall[] = [];

      for (const block of response.content) {
        if (block.type === "text") {
          text += block.text;
        } else if (block.type === "tool_use") {
          toolCalls.push({
            id: block.id,
            name: block.name,
            input: block.input as Record<string, unknown>,
          });
        }
      }

      return {
        text,
        toolCalls,
        rawMessages: response.content as unknown[],
        usage: {
          inputTokens: response.usage?.input_tokens || 0,
          outputTokens: response.usage?.output_tokens || 0,
        },
      };
    },

    appendToolResults(currentMessages, rawAssistantContent, toolResults) {
      const toolResultBlocks: Anthropic.ToolResultBlockParam[] = toolResults.map((r) => ({
        type: "tool_result" as const,
        tool_use_id: r.toolCallId,
        content: r.output,
      }));

      return [
        ...(currentMessages as Anthropic.MessageParam[]),
        { role: "assistant" as const, content: rawAssistantContent as Anthropic.ContentBlockParam[] },
        { role: "user" as const, content: toolResultBlocks },
      ];
    },
  };
}
