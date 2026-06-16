import { describe, expect, it } from "vitest";

import { aggregateResults } from "../src/aggregate.js";
import { claudeDaily, codexDaily, codexMonthly } from "./fixtures.js";

describe("aggregateResults", () => {
  it("sums Claude and Codex daily token totals by date across targets", () => {
    const report = aggregateResults({
      view: "daily",
      results: [
        { target: "local", agent: "codex", ok: true, data: codexDaily },
        { target: "remote", agent: "claude", ok: true, data: claudeDaily }
      ]
    });

    expect(report.totals).toMatchObject({
      inputTokens: 13,
      outputTokens: 24,
      cacheCreationTokens: 35,
      cacheReadTokens: 46,
      reasoningOutputTokens: 5,
      totalTokens: 118,
      costUSD: 3.75
    });
    expect(report.periods).toMatchObject([
      {
        period: "2026-06-16",
        inputTokens: 13,
        outputTokens: 24,
        cacheCreationTokens: 35,
        cacheReadTokens: 46,
        reasoningOutputTokens: 5,
        totalTokens: 118,
        costUSD: 3.75
      }
    ]);
    expect(report.byAgent.codex.totalTokens).toBe(100);
    expect(report.byAgent.claude.totalTokens).toBe(18);
    expect(report.breakdowns[0].agents).toMatchObject([
      { agent: "claude", models: ["claude-opus-4-8"], totals: { totalTokens: 18, costUSD: 2.5 } },
      { agent: "codex", models: ["gpt-5.5"], totals: { totalTokens: 100, costUSD: 1.25 } }
    ]);
  });

  it("keeps failed target diagnostics out of totals", () => {
    const report = aggregateResults({
      view: "monthly",
      results: [
        { target: "local", agent: "codex", ok: true, data: codexMonthly },
        { target: "remote", agent: "claude", ok: false, error: "ssh failed" }
      ]
    });

    expect(report.totals.totalTokens).toBe(34);
    expect(report.failures).toEqual([{ target: "remote", agent: "claude", error: "ssh failed" }]);
  });
});
