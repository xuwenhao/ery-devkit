export type RenameState = {
  hasInitialRename: boolean;
  lastRenameTokenCount: number;
};

export type ConversationMessage = {
  role?: string;
  content?: unknown;
};

export type AutonamePluginConfig = {
  baseUrl: string;
  apiKey?: string;
  apiKeyEnv: string;
  model: string;
  prompt: string;
  tokenInterval: number;
  maxInputChars: number;
  maxOutputTokens: number;
  temperature: number;
};

const OPENCLAW_CHANNEL_PREFIX = /^(channel|user|group|topic):/;
const WRAPPER_CHARS = /^["'《【\[]+|["'》】\]]+$/g;
const DISCORD_NAME_LIMIT = 100;
export const DEFAULT_RENAME_TOKEN_INTERVAL = 50_000;
export const DEFAULT_TITLE_PROMPT =
  "根据以下的对话片段，总结出一个5到10个字以内的精确短标题作为Discord讨论串的名字。只需输出最终标题文本，绝不能包含引号、标点符号、前缀、说明等任何多余字符。\n\n对话片段：\n{conversation}";

const DEFAULT_CONFIG: AutonamePluginConfig = {
  baseUrl: "https://api.openai.com/v1",
  apiKeyEnv: "OPENAI_API_KEY",
  model: "gpt-4o-mini",
  prompt: DEFAULT_TITLE_PROMPT,
  tokenInterval: DEFAULT_RENAME_TOKEN_INTERVAL,
  maxInputChars: 3000,
  maxOutputTokens: 20,
  temperature: 0.3
};

export function normalizeDiscordChannelId(rawChannelId: string | undefined | null): string | null {
  const channelId = (rawChannelId || "").replace(OPENCLAW_CHANNEL_PREFIX, "").trim();
  return channelId.length > 0 ? channelId : null;
}

export function cleanGeneratedTitle(rawTitle: string | undefined | null): string | null {
  const title = (rawTitle || "").trim().replace(WRAPPER_CHARS, "").trim();
  if (!title) return null;
  return title.length > DISCORD_NAME_LIMIT ? title.slice(0, DISCORD_NAME_LIMIT) : title;
}

export function shouldRenameSession(
  state: RenameState,
  currentTokens: number,
  tokenInterval = DEFAULT_RENAME_TOKEN_INTERVAL
): boolean {
  if (!state.hasInitialRename) return true;
  return currentTokens > 0 && currentTokens - state.lastRenameTokenCount > tokenInterval;
}

export function buildRecentConversationText(messages: ConversationMessage[]): string {
  return messages
    .slice(-10)
    .map((message) => `${message.role || "unknown"}: ${contentToText(message.content)}`)
    .join("\n");
}

export function resolveAutonamePluginConfig(rawConfig: Record<string, unknown> | undefined): AutonamePluginConfig {
  return {
    baseUrl: readString(rawConfig?.baseUrl, DEFAULT_CONFIG.baseUrl),
    apiKey: readOptionalString(rawConfig?.apiKey),
    apiKeyEnv: readString(rawConfig?.apiKeyEnv, DEFAULT_CONFIG.apiKeyEnv),
    model: readString(rawConfig?.model, DEFAULT_CONFIG.model),
    prompt: readString(rawConfig?.prompt, DEFAULT_CONFIG.prompt),
    tokenInterval: readPositiveNumber(rawConfig?.tokenInterval, DEFAULT_CONFIG.tokenInterval),
    maxInputChars: readPositiveNumber(rawConfig?.maxInputChars, DEFAULT_CONFIG.maxInputChars),
    maxOutputTokens: readPositiveNumber(rawConfig?.maxOutputTokens, DEFAULT_CONFIG.maxOutputTokens),
    temperature: readNonNegativeNumber(rawConfig?.temperature, DEFAULT_CONFIG.temperature)
  };
}

export function resolveApiKey(config: AutonamePluginConfig, env: NodeJS.ProcessEnv = process.env): string | null {
  return config.apiKey || env[config.apiKeyEnv] || null;
}

export function buildChatCompletionsUrl(baseUrl: string): string {
  const normalized = baseUrl.replace(/\/+$/, "");
  return normalized.endsWith("/chat/completions") ? normalized : `${normalized}/chat/completions`;
}

export function buildTitlePrompt(prompt: string, conversationText: string, maxInputChars: number): string {
  const clippedConversation = conversationText.slice(-maxInputChars);
  if (prompt.includes("{conversation}")) {
    return prompt.replaceAll("{conversation}", clippedConversation);
  }
  return `${prompt.trim()}\n\n${clippedConversation}`;
}

function contentToText(content: unknown): string {
  if (typeof content === "string") return content;
  if (Array.isArray(content)) {
    return content
      .map((part) => {
        if (part && typeof part === "object" && "text" in part) {
          const text = (part as { text?: unknown }).text;
          return typeof text === "string" ? text : "";
        }
        return "";
      })
      .filter(Boolean)
      .join(" ");
  }
  if (content == null) return "";
  return JSON.stringify(content);
}

function readString(value: unknown, fallback: string): string {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function readOptionalString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function readPositiveNumber(value: unknown, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value) && value > 0 ? value : fallback;
}

function readNonNegativeNumber(value: unknown, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value) && value >= 0 ? value : fallback;
}
