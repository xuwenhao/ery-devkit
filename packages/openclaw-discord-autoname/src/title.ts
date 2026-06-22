export type RenameState = {
  hasInitialRename: boolean;
  lastRenameTokenCount: number;
};

export type ConversationMessage = {
  role?: string;
  content?: unknown;
};

const OPENCLAW_CHANNEL_PREFIX = /^(channel|user|group|topic):/;
const WRAPPER_CHARS = /^["'《【\[]+|["'》】\]]+$/g;
const DISCORD_NAME_LIMIT = 100;
const RENAME_TOKEN_INTERVAL = 50_000;

export function normalizeDiscordChannelId(rawChannelId: string | undefined | null): string | null {
  const channelId = (rawChannelId || "").replace(OPENCLAW_CHANNEL_PREFIX, "").trim();
  return channelId.length > 0 ? channelId : null;
}

export function cleanGeneratedTitle(rawTitle: string | undefined | null): string | null {
  const title = (rawTitle || "").trim().replace(WRAPPER_CHARS, "").trim();
  if (!title) return null;
  return title.length > DISCORD_NAME_LIMIT ? title.slice(0, DISCORD_NAME_LIMIT) : title;
}

export function shouldRenameSession(state: RenameState, currentTokens: number): boolean {
  if (!state.hasInitialRename) return true;
  return currentTokens > 0 && currentTokens - state.lastRenameTokenCount > RENAME_TOKEN_INTERVAL;
}

export function buildRecentConversationText(messages: ConversationMessage[]): string {
  return messages
    .slice(-10)
    .map((message) => `${message.role || "unknown"}: ${contentToText(message.content)}`)
    .join("\n");
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
