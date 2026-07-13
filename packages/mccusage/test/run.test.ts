import { describe, expect, it } from "vitest";

import { collectUsage } from "../src/run.js";
import { unifiedDaily } from "./fixtures.js";

describe("collectUsage", () => {
  it("runs once per enabled target and filters the unified report", async () => {
    const calls: Array<{ command: string; args: string[] }> = [];
    const report = await collectUsage({
      config: {
        ccusagePackage: "ccusage",
        timezone: "Asia/Shanghai",
        targets: [
          { name: "local", type: "local", enabled: true },
          { name: "box", type: "ssh", host: "box", enabled: true }
        ]
      },
      agents: ["codex"],
      view: "daily",
      since: "2026-06-16",
      until: "2026-06-16",
      includeCost: false,
      exec: async (command, args) => {
        calls.push({ command, args });
        if (command === "ssh") {
          return { exitCode: 1, stdout: "", stderr: "unreachable" };
        }
        return { exitCode: 0, stdout: JSON.stringify(unifiedDaily), stderr: "" };
      }
    });

    expect(calls).toHaveLength(2);
    expect(report.totals.totalTokens).toBe(100);
    expect(report.failures).toEqual([{ target: "box", agent: "all", error: "unreachable" }]);
  });
});
