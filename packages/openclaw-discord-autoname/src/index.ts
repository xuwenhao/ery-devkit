import { definePluginEntry } from "openclaw/plugin-sdk/plugin-entry";
import {
  buildChatCompletionsUrl,
  buildRecentConversationText,
  buildTitlePrompt,
  cleanGeneratedTitle,
  normalizeDiscordChannelId,
  resolveApiKey,
  resolveAutonamePluginConfig,
  shouldRenameSession,
  type RenameState
} from "./title.js";

type PluginContext = {
  messageProvider?: string;
  channelId?: string;
  sessionKey: string;
};

type LlmOutputEvent = {
  usage?: {
    totalTokens?: number;
  };
};

type AgentEndEvent = {
  messages?: Array<{
    role?: string;
    content?: unknown;
  }>;
};

const DEFAULT_RENAME_STATE: RenameState = {
  hasInitialRename: false,
  lastRenameTokenCount: 0
};

export default definePluginEntry({
  id: "discord-autoname",
  name: "Discord Thread Autoname",
  register(api: any) {
    const renameState = new Map<string, RenameState>();
    const sessionTokens = new Map<string, number>();

    api.on("llm_output", (event: LlmOutputEvent, ctx: PluginContext) => {
      if (ctx.messageProvider !== "discord") return;
      const tokens = event.usage?.totalTokens;
      if (typeof tokens === "number") {
        sessionTokens.set(ctx.sessionKey, tokens);
      }
    });

    api.on("agent_end", async (event: AgentEndEvent, ctx: PluginContext) => {
      if (ctx.messageProvider !== "discord") return;

      const channelId = normalizeDiscordChannelId(ctx.channelId);
      if (!channelId) return;

      try {
        const config = resolveAutonamePluginConfig(api.pluginConfig);
        const state = renameState.get(ctx.sessionKey) || DEFAULT_RENAME_STATE;
        const currentTokens = sessionTokens.get(ctx.sessionKey) || 0;
        if (!shouldRenameSession(state, currentTokens, config.tokenInterval)) return;

        renameState.set(ctx.sessionKey, {
          hasInitialRename: true,
          lastRenameTokenCount: currentTokens
        });

        const recentMessages = buildRecentConversationText(event.messages || []);
        runAsyncRenameTask(channelId, recentMessages, config);
      } catch (err) {
        console.error("[discord-autoname] Error in agent_end hook:", err);
      }
    });
  }
});

function runAsyncRenameTask(channelId: string, contextText: string, config: ReturnType<typeof resolveAutonamePluginConfig>) {
  Promise.resolve().then(async () => {
    try {
      const chatCompletionsApiKey = resolveApiKey(config);
      const discordToken = process.env.DISCORD_BOT_TOKEN;

      if (!chatCompletionsApiKey || !discordToken) {
        const missing = [
          chatCompletionsApiKey ? null : `${config.apiKeyEnv} or configured apiKey`,
          discordToken ? null : "DISCORD_BOT_TOKEN"
        ].filter(Boolean);
        console.warn(`[discord-autoname] Missing ${missing.join(" and ")}. Skipping.`);
        return;
      }

      const prompt = buildTitlePrompt(config.prompt, contextText, config.maxInputChars);

      const completionRes = await fetch(buildChatCompletionsUrl(config.baseUrl), {
        method: "POST",
        headers: {
          Authorization: `Bearer ${chatCompletionsApiKey}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          model: config.model,
          messages: [{ role: "user", content: prompt }],
          max_tokens: config.maxOutputTokens,
          temperature: config.temperature
        })
      });

      if (!completionRes.ok) {
        console.error("[discord-autoname] Chat Completions API Error:", await completionRes.text());
        return;
      }

      const completionData = (await completionRes.json()) as any;
      const title = cleanGeneratedTitle(completionData.choices?.[0]?.message?.content);
      if (!title) {
        console.warn("[discord-autoname] Failed to generate title from LLM response");
        return;
      }

      const discordRes = await fetch(`https://discord.com/api/v10/channels/${channelId}`, {
        method: "PATCH",
        headers: {
          Authorization: `Bot ${discordToken}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ name: title })
      });

      if (!discordRes.ok) {
        const errBody = await discordRes.text();
        console.error(`[discord-autoname] Failed to rename Discord thread ${channelId}:`, discordRes.status, errBody);
      } else {
        console.log(`[discord-autoname] Successfully renamed thread ${channelId} to "${title}"`);
      }
    } catch (err) {
      console.error("[discord-autoname] Rename task error:", err);
    }
  });
}
