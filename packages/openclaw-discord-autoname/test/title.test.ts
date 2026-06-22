import { describe, expect, it } from "vitest";
import {
  buildRecentConversationText,
  cleanGeneratedTitle,
  normalizeDiscordChannelId,
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
