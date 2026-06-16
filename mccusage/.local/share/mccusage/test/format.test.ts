import { describe, expect, it } from "vitest";

import { formatTextReport } from "../src/format.js";
import type { AggregateReport } from "../src/types.js";

describe("formatTextReport", () => {
  it("renders a ccusage all-report style breakdown table", () => {
    const report: AggregateReport = {
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

    const output = formatTextReport(report, { view: "daily" });

    expect(output).toContain("Multi-Machine Token Usage Report - Daily");
    expect(output).toMatch(/│\s*Date\s*│\s*Agent/);
    expect(output).toMatch(/│\s*2026-06-16\s*│\s*All/);
    expect(output).toMatch(/│\s*│\s*- Claude/);
    expect(output).toMatch(/│\s*│\s*- Codex/);
    expect(output).toContain("- opus-4-8");
    expect(output).toContain("- gpt-5.5");
    expect(output).toMatch(/│ Total\s+│\s+│\s+│/);
    expect(output).toContain("Cost (USD)");
    expect(output).not.toContain("Reasoning");
    expect(output).not.toContain("By Target");
    expect(output).not.toContain("mccusage aggregate");
  });
});
