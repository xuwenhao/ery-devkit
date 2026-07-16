import { describe, expect, it } from "vitest";

import { formatTextReport } from "../src/format.js";
import type { AggregateReport } from "../src/types.js";

function buildReport(): AggregateReport {
  return {
      totals: {
        inputTokens: 13,
        outputTokens: 24,
        cacheCreationTokens: 35,
        cacheReadTokens: 46,
        reasoningOutputTokens: 5,
        totalTokens: 118,
        costUSD: 3.75
      },
      periods: [
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
      ],
      breakdowns: [
        {
          period: "2026-06-16",
          totals: {
            inputTokens: 13,
            outputTokens: 24,
            cacheCreationTokens: 35,
            cacheReadTokens: 46,
            reasoningOutputTokens: 5,
            totalTokens: 118,
            costUSD: 3.75
          },
          agents: [
            {
              agent: "claude",
              models: ["claude-opus-4-8"],
              totals: {
                inputTokens: 3,
                outputTokens: 4,
                cacheCreationTokens: 5,
                cacheReadTokens: 6,
                reasoningOutputTokens: 0,
                totalTokens: 18,
                costUSD: 2.5
              }
            },
            {
              agent: "codex",
              models: ["gpt-5.5"],
              totals: {
                inputTokens: 10,
                outputTokens: 20,
                cacheCreationTokens: 30,
                cacheReadTokens: 40,
                reasoningOutputTokens: 5,
                totalTokens: 100,
                costUSD: 1.25
              }
            },
            {
              agent: "openclaw",
              models: ["[openclaw] zai-org/GLM-5.2"],
              totals: {
                inputTokens: 5,
                outputTokens: 6,
                cacheCreationTokens: 7,
                cacheReadTokens: 8,
                reasoningOutputTokens: 0,
                totalTokens: 26,
                costUSD: 0.75
              }
            }
          ]
        }
      ],
      byAgent: {
        claude: {
          inputTokens: 3,
          outputTokens: 4,
          cacheCreationTokens: 5,
          cacheReadTokens: 6,
          reasoningOutputTokens: 0,
          totalTokens: 18,
          costUSD: 2.5
        },
        codex: {
          inputTokens: 10,
          outputTokens: 20,
          cacheCreationTokens: 30,
          cacheReadTokens: 40,
          reasoningOutputTokens: 5,
          totalTokens: 100,
          costUSD: 1.25
        },
        openclaw: {
          inputTokens: 5,
          outputTokens: 6,
          cacheCreationTokens: 7,
          cacheReadTokens: 8,
          reasoningOutputTokens: 0,
          totalTokens: 26,
          costUSD: 0.75
        }
      },
      byTarget: {
        "local-mac": {
          inputTokens: 13,
          outputTokens: 24,
          cacheCreationTokens: 35,
          cacheReadTokens: 46,
          reasoningOutputTokens: 5,
          totalTokens: 118,
          costUSD: 3.75
        }
      },
      failures: []
    };
}

describe("formatTextReport", () => {
  it("hides the Models column by default", () => {
    const output = formatTextReport(buildReport(), { view: "daily" });

    expect(output).toContain("Multi-Machine Token Usage Report - Daily");
    expect(output).toMatch(/│\s*Date\s*│\s*Agent/);
    expect(output).not.toContain("Models");
    expect(output).not.toContain("opus-4-8");
    expect(output).not.toContain("gpt-5.5");
    expect(output).not.toContain("zai-org/GLM-5.2");
    expect(output).toMatch(/│\s*2026-06-16\s*│\s*All/);
    expect(output).toMatch(/│\s*│\s*- OpenClaw/);
    expect(output).toMatch(/│ Total\s+│\s+│/);
    expect(output).toContain("Cost (USD)");
  });

  it("renders the Models column when showModels is enabled", () => {
    const report = buildReport();

    const output = formatTextReport(report, { view: "daily", showModels: true });

    const weeklyOutput = formatTextReport(report, { view: "weekly", showModels: true });
    expect(output).toContain("Multi-Machine Token Usage Report - Daily");
    expect(output).toMatch(/│\s*Date\s*│\s*Agent/);
    expect(output).toMatch(/│\s*2026-06-16\s*│\s*All/);
    expect(output).toMatch(/│\s*│\s*- Claude/);
    expect(output).toMatch(/│\s*│\s*- Codex/);
    expect(output).toMatch(/│\s*│\s*- OpenClaw/);
    expect(output).toContain("- opus-4-8");
    expect(output).toContain("- gpt-5.5");
    expect(output).toContain("- [openclaw] zai-org/GLM-5.2");
    expect(output).toMatch(/│ Total\s+│\s+│\s+│/);
    expect(output).toContain("Cost (USD)");
    expect(output).not.toContain("Reasoning");
    expect(output).not.toContain("By Target");
    expect(output).not.toContain("mccusage aggregate");
    expect(weeklyOutput).toMatch(/│\s*Week\s*│\s*Agent/);
  });
});
