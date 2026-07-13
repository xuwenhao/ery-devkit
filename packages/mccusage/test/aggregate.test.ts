import { describe, expect, it } from "vitest";

import { aggregateResults } from "../src/aggregate.js";
import { unifiedDaily, unifiedMonthly, unifiedSession, unifiedWeekly } from "./fixtures.js";

describe("aggregateResults", () => {
  it("sums every detected agent from a unified daily report", () => {
    const report = aggregateResults({
      view: "daily",
      results: [{ target: "local", ok: true, data: unifiedDaily }]
    });

    expect(report.totals).toMatchObject({
      inputTokens: 18,
      outputTokens: 30,
      cacheCreationTokens: 42,
      cacheReadTokens: 54,
      reasoningOutputTokens: 5,
      totalTokens: 144,
      costUSD: 4.5
    });
    expect(report.periods).toMatchObject([
      {
        period: "2026-06-16",
        inputTokens: 18,
        outputTokens: 30,
        cacheCreationTokens: 42,
        cacheReadTokens: 54,
        reasoningOutputTokens: 5,
        totalTokens: 144,
        costUSD: 4.5
      }
    ]);
    expect(report.byAgent.codex.totalTokens).toBe(100);
    expect(report.byAgent.claude.totalTokens).toBe(18);
    expect(report.byAgent.openclaw.totalTokens).toBe(26);
    expect(report.breakdowns[0].agents).toMatchObject([
      { agent: "claude", models: ["claude-opus-4-8"], totals: { totalTokens: 18, costUSD: 2.5 } },
      { agent: "codex", models: ["gpt-5.5"], totals: { totalTokens: 100, costUSD: 1.25 } },
      { agent: "openclaw", models: ["[openclaw] zai-org/GLM-5.2"], totals: { totalTokens: 26, costUSD: 0.75 } }
    ]);
  });

  it("keeps failed target diagnostics out of totals", () => {
    const report = aggregateResults({
      view: "monthly",
      results: [
        { target: "local", ok: true, data: unifiedMonthly },
        { target: "remote", ok: false, error: "ssh failed" }
      ]
    });

    expect(report.totals.totalTokens).toBe(144);
    expect(report.failures).toEqual([{ target: "remote", agent: "all", error: "ssh failed" }]);
  });

  it("reads weekly periods from the unified period field", () => {
    const report = aggregateResults({
      view: "weekly",
      results: [{ target: "local", ok: true, data: unifiedWeekly }]
    });

    expect(report.periods[0].period).toBe("2026-06-15");
    expect(report.totals.totalTokens).toBe(144);
  });

  it("filters arbitrary agent names case-insensitively", () => {
    const report = aggregateResults({
      view: "daily",
      agents: ["OPENCLAW"],
      results: [{ target: "local", ok: true, data: unifiedDaily }]
    });

    expect(report.totals.totalTokens).toBe(26);
    expect(Object.keys(report.byAgent)).toEqual(["openclaw"]);

    const missing = aggregateResults({
      view: "daily",
      agents: ["missing-agent"],
      results: [{ target: "local", ok: true, data: unifiedDaily }]
    });

    expect(missing.totals.totalTokens).toBe(0);
    expect(missing.byAgent).toEqual({});
  });

  it("groups per-agent session rows under the same session period", () => {
    const report = aggregateResults({
      view: "session",
      results: [{ target: "local", ok: true, data: unifiedSession }]
    });

    expect(report.breakdowns).toHaveLength(1);
    expect(report.breakdowns[0].period).toBe("shared-session");
    expect(report.breakdowns[0].agents.map((entry) => entry.agent)).toEqual(["claude", "codex", "openclaw"]);
  });
});
