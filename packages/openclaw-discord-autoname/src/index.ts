import { definePluginEntry } from "openclaw/plugin-sdk/plugin-entry";
import {
  buildRecentConversationText,
  cleanGeneratedTitle,
  normalizeDiscordChannelId,
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
        const state = renameState.get(ctx.sessionKey) || DEFAULT_RENAME_STATE;
        const currentTokens = sessionTokens.get(ctx.sessionKey) || 0;
        if (!shouldRenameSession(state, currentTokens)) return;

        renameState.set(ctx.sessionKey, {
          hasInitialRename: true,
          lastRenameTokenCount: currentTokens
        });

        const recentMessages = buildRecentConversationText(event.messages || []);
        runAsyncRenameTask(channelId, recentMessages);
      } catch (err) {
        console.error("[discord-autoname] Error in agent_end hook:", err);
      }
    });
  }
});

function runAsyncRenameTask(channelId: string, contextText: string) {
  Promise.resolve().then(async () => {
    try {
      const sfKey = process.env.SILICONFLOW_API_KEY;
      const discordToken = process.env.DISCORD_BOT_TOKEN;

      if (!sfKey || !discordToken) {
        console.warn("[discord-autoname] Missing SILICONFLOW_API_KEY or DISCORD_BOT_TOKEN in env. Skipping.");
        return;
      }

      const prompt = `根据以下的对话片段，总结出一个5到10个字以内的精确短标题作为Discord讨论串的名字。只需输出最终标题文本，绝不能包含引号、标点符号、前缀、说明等任何多余字符。\n\n对话片段：\n${contextText.slice(-3000)}`;

      const sfRes = await fetch("https://api.siliconflow.cn/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${sfKey}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          model: "deepseek-ai/DeepSeek-V4-Flash",
          messages: [{ role: "user", content: prompt }],
          max_tokens: 20,
          temperature: 0.3
        })
      });

      if (!sfRes.ok) {
        console.error("[discord-autoname] SiliconFlow API Error:", await sfRes.text());
        return;
      }

      const sfData = (await sfRes.json()) as any;
      const title = cleanGeneratedTitle(sfData.choices?.[0]?.message?.content);
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
