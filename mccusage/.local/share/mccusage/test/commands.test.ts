import { describe, expect, it } from "vitest";

import { buildCcusageArgs, buildTargetCommand } from "../src/commands.js";

describe("command construction", () => {
  it("keeps ccusage cost output by default", () => {
    expect(buildCcusageArgs({ agent: "codex", view: "daily" })).toEqual([
      "-y",
      "ccusage",
      "codex",
      "daily",
      "--json"
    ]);
  });

  it("builds focused ccusage args for an agent and view", () => {
    expect(
      buildCcusageArgs({
        agent: "codex",
        view: "daily",
        since: "2026-06-01",
        until: "2026-06-16",
        timezone: "Asia/Shanghai",
        includeCost: false
      })
    ).toEqual([
      "-y",
      "ccusage",
      "codex",
      "daily",
      "--json",
      "--since",
      "2026-06-01",
      "--until",
      "2026-06-16",
      "--timezone",
      "Asia/Shanghai",
      "--no-cost"
    ]);
  });

  it("builds local, ssh, and dev-remote command descriptors", () => {
    const args = ["-y", "ccusage", "claude", "monthly", "--json"];

    expect(buildTargetCommand({ name: "local", type: "local", enabled: true }, args)).toEqual({
      command: "npx",
      args,
      display: "npx -y ccusage claude monthly --json"
    });

    expect(buildTargetCommand({ name: "box", type: "ssh", host: "box", enabled: true }, args)).toEqual({
      command: "ssh",
      args: ["box", "npx -y ccusage claude monthly --json"],
      display: "ssh box 'npx -y ccusage claude monthly --json'"
    });

    expect(
      buildTargetCommand(
        { name: "ecap", type: "dev-remote", profile: "ecap-workspace", enabled: true },
        args
      )
    ).toMatchObject({
      command: "bash",
      display: "dev-remote ecap-workspace :: npx -y ccusage claude monthly --json"
    });
  });
});
