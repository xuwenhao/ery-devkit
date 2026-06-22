import { describe, expect, it } from "vitest";
import {
  buildChatCompletionsUrl,
  buildRecentConversationText,
  buildTitlePrompt,
  cleanGeneratedTitle,
  normalizeDiscordChannelId,
  resolveApiKey,
  resolveAutonamePluginConfig,
  shouldRenameSession
} from "../src/title.js";

describe("normalizeDiscordChannelId", () => {
  it("strips OpenClaw channel prefixes", () => {
    expect(normalizeDiscordChannelId("channel:1518499906858516590")).toBe("1518499906858516590");
    expect(normalizeDiscordChannelId("topic:1518499906858516590")).toBe("1518499906858516590");
    expect(normalizeDiscordChannelId("1518499906858516590")).toBe("1518499906858516590");
  });

  it("returns null when the id is empty after cleanup", () => {
    expect(normalizeDiscordChannelId("channel:")).toBeNull();
    expect(normalizeDiscordChannelId("")).toBeNull();
  });
});

describe("cleanGeneratedTitle", () => {
  it("removes wrapping quotes and title brackets", () => {
    expect(cleanGeneratedTitle('"Qwen3系列概览"')).toBe("Qwen3系列概览");
    expect(cleanGeneratedTitle("《Qwen3系列概览》")).toBe("Qwen3系列概览");
    expect(cleanGeneratedTitle("【Qwen3系列概览】")).toBe("Qwen3系列概览");
  });

  it("truncates titles to Discord's 100 character limit", () => {
    const title = cleanGeneratedTitle("a".repeat(130));
    expect(title).toHaveLength(100);
  });

  it("returns null for blank titles", () => {
    expect(cleanGeneratedTitle("   ")).toBeNull();
    expect(cleanGeneratedTitle("《》")).toBeNull();
  });
});

describe("shouldRenameSession", () => {
  it("renames the first completed reply", () => {
    expect(shouldRenameSession({ hasInitialRename: false, lastRenameTokenCount: 0 }, 0)).toBe(true);
  });

  it("renames again only after more than 50k new tokens", () => {
    const state = { hasInitialRename: true, lastRenameTokenCount: 10_000 };
    expect(shouldRenameSession(state, 60_000)).toBe(false);
    expect(shouldRenameSession(state, 60_001)).toBe(true);
  });

  it("uses a custom token interval when configured", () => {
    const state = { hasInitialRename: true, lastRenameTokenCount: 10 };
    expect(shouldRenameSession(state, 20, 10)).toBe(false);
    expect(shouldRenameSession(state, 21, 10)).toBe(true);
  });
});

describe("buildRecentConversationText", () => {
  it("serializes the last ten messages only", () => {
    const messages = Array.from({ length: 12 }, (_, index) => ({
      role: index % 2 === 0 ? "user" : "assistant",
      content: `message ${index}`
    }));

    const text = buildRecentConversationText(messages);
    const lines = text.split("\n");

    expect(lines).not.toContain("user: message 0");
    expect(lines).not.toContain("assistant: message 1");
    expect(lines).toContain("user: message 2");
    expect(lines).toContain("assistant: message 11");
  });

  it("extracts text parts from structured message content", () => {
    const text = buildRecentConversationText([
      {
        role: "assistant",
        content: [{ text: "hello" }, { type: "image" }, { text: "world" }]
      }
    ]);

    expect(text).toBe("assistant: hello world");
  });
});

describe("resolveAutonamePluginConfig", () => {
  it("uses generic OpenAI-compatible defaults", () => {
    const config = resolveAutonamePluginConfig(undefined);

    expect(config.baseUrl).toBe("https://api.openai.com/v1");
    expect(config.apiKeyEnv).toBe("OPENAI_API_KEY");
    expect(config.model).toBe("gpt-4o-mini");
    expect(config.tokenInterval).toBe(50_000);
  });

  it("accepts configured provider, model, prompt, and token interval", () => {
    const config = resolveAutonamePluginConfig({
      baseUrl: "https://api.siliconflow.cn/v1/",
      apiKeyEnv: "SILICONFLOW_API_KEY",
      model: "deepseek-ai/DeepSeek-V4-Flash",
      prompt: "短标题：{conversation}",
      tokenInterval: 1000
    });

    expect(config.baseUrl).toBe("https://api.siliconflow.cn/v1/");
    expect(config.apiKeyEnv).toBe("SILICONFLOW_API_KEY");
    expect(config.model).toBe("deepseek-ai/DeepSeek-V4-Flash");
    expect(config.prompt).toBe("短标题：{conversation}");
    expect(config.tokenInterval).toBe(1000);
  });

  it("resolves inline api keys before env-based api keys", () => {
    const config = resolveAutonamePluginConfig({
      apiKey: "from-config",
      apiKeyEnv: "TITLE_API_KEY"
    });

    expect(resolveApiKey(config, { TITLE_API_KEY: "from-env" })).toBe("from-config");
  });
});

describe("buildChatCompletionsUrl", () => {
  it("appends the chat completions path to a base URL", () => {
    expect(buildChatCompletionsUrl("https://api.openai.com/v1/")).toBe("https://api.openai.com/v1/chat/completions");
  });

  it("keeps a complete chat completions URL unchanged", () => {
    expect(buildChatCompletionsUrl("https://proxy.example.test/v1/chat/completions")).toBe(
      "https://proxy.example.test/v1/chat/completions"
    );
  });
});

describe("buildTitlePrompt", () => {
  it("replaces the conversation placeholder", () => {
    expect(buildTitlePrompt("标题：{conversation}", "hello", 100)).toBe("标题：hello");
  });

  it("appends clipped conversation text when the prompt has no placeholder", () => {
    expect(buildTitlePrompt("标题", "1234567890", 4)).toBe("标题\n\n7890");
  });
});
