import OpenAI from "openai";
import type { ChatProvider, GenericTool, CompletionResult, ProviderMessage, ToolCall } from "./types";
import type { ChatImage } from "@/lib/chat";
import type { ChatCompletionMessageParam, ChatCompletionTool, ChatCompletionToolMessageParam } from "openai/resources/chat/completions";

function buildUserContent(
  text: string,
  images?: ChatImage[]
): string | Array<OpenAI.ChatCompletionContentPart> {
  if (!images?.length) return text;
  const parts: OpenAI.ChatCompletionContentPart[] = [];
  for (const img of images) {
    parts.push({
      type: "image_url",
      image_url: {
        url: `data:${img.mediaType};base64,${img.data}`,
        detail: "auto",
      },
    });
  }
  parts.push({ type: "text", text });
  return parts;
}

function toOpenAITools(tools: GenericTool[]): ChatCompletionTool[] {
  return tools.map((t) => ({
    type: "function" as const,
    function: {
      name: t.name,
      description: t.description,
      parameters: {
        type: "object" as const,
        properties: t.parameters.properties || {},
        required: t.parameters.required || [],
      },
    },
  }));
}

export function createOpenAIProvider(apiKey: string, modelId: string, baseURL?: string): ChatProvider {
  const isNativeOpenAI = !baseURL;
  console.log(`[OpenAI Provider] Creating client: modelId=${modelId}, baseURL=${baseURL || "https://api.openai.com/v1"}, key=${apiKey.slice(0, 12)}..., native=${isNativeOpenAI}`);
  const client = new OpenAI({ apiKey, ...(baseURL ? { baseURL } : {}) });

  return {
    name: "GPT",
    supportsImages: true,

    buildMessages(messages: ProviderMessage[], systemPrompt: string): ChatCompletionMessageParam[] {
      const result: ChatCompletionMessageParam[] = [
        { role: "system", content: systemPrompt },
      ];
      for (const m of messages) {
        if (m.role === "user") {
          result.push({
            role: "user",
            content: buildUserContent(m.content, m.images),
          });
        } else {
          result.push({
            role: "assistant",
            content: m.content,
          });
        }
      }
      return result;
    },

    async createCompletion({ messages, tools, maxTokens }): Promise<CompletionResult> {
      console.log(`[OpenAI Provider] createCompletion: model=${modelId}, messages=${(messages as ChatCompletionMessageParam[]).length}, tools=${tools.length}, maxTokens=${maxTokens}, native=${isNativeOpenAI}`);
      try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const params: any = {
        model: modelId,
        max_tokens: maxTokens,
        messages: messages as ChatCompletionMessageParam[],
        tools: toOpenAITools(tools),
      };
      // Only add OpenAI-specific params for native OpenAI — compatibility endpoints may reject them
      if (isNativeOpenAI) {
        params.tool_choice = "auto";
        params.parallel_tool_calls = true;
      }
      console.log(`[OpenAI Provider] Request params keys: ${Object.keys(params).join(", ")}`);
      const response = await client.chat.completions.create(params);

      console.log(`[OpenAI Provider] Response received: choices=${response.choices?.length}, usage=${JSON.stringify(response.usage)}, finish_reason=${response.choices?.[0]?.finish_reason}`);

      const choice = response.choices[0];
      const message = choice.message;
      let text = message.content || "";
      const toolCalls: ToolCall[] = [];

      if (message.tool_calls) {
        for (const tc of message.tool_calls) {
          if (tc.type !== "function") continue;
          let parsedArgs: Record<string, unknown> = {};
          try {
            parsedArgs = JSON.parse(tc.function.arguments);
          } catch {
            parsedArgs = {};
          }
          toolCalls.push({
            id: tc.id,
            name: tc.function.name,
            input: parsedArgs,
          });
        }
      }

      return {
        text,
        toolCalls,
        // Store the full assistant message for continuing the conversation
        rawMessages: [message],
        usage: {
          inputTokens: response.usage?.prompt_tokens || 0,
          outputTokens: response.usage?.completion_tokens || 0,
        },
      };
      } catch (err: unknown) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const error = err as any;
        console.error(`[OpenAI Provider] ERROR: status=${error.status}, message=${error.message}`);
        console.error(`[OpenAI Provider] Error type: ${error.constructor?.name}`);
        console.error(`[OpenAI Provider] Full error:`, JSON.stringify(error.error || { msg: error.message, status: error.status }, null, 2));
        // Try to read raw body if available
        if (error.response?.body) {
          try {
            const reader = error.response.body.getReader?.();
            if (reader) {
              const { value } = await reader.read();
              const rawBody = new TextDecoder().decode(value);
              console.error(`[OpenAI Provider] Raw response body: ${rawBody}`);
            }
          } catch { /* ignore */ }
        }
        if (error.headers) {
          console.error(`[OpenAI Provider] Response headers:`, Object.fromEntries?.(error.headers) || error.headers);
        }
        throw err;
      }
    },

    appendToolResults(currentMessages, rawAssistantContent, toolResults) {
      const assistantMsg = (rawAssistantContent as OpenAI.ChatCompletionMessage[])[0];

      const toolMsgs: ChatCompletionToolMessageParam[] = toolResults.map((r) => ({
        role: "tool" as const,
        tool_call_id: r.toolCallId,
        content: r.output,
      }));

      return [
        ...(currentMessages as ChatCompletionMessageParam[]),
        assistantMsg as ChatCompletionMessageParam,
        ...toolMsgs,
      ];
    },
  };
}
