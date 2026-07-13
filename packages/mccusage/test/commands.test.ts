import { describe, expect, it } from "vitest";

import { buildCcusageArgs, buildTargetCommand } from "../src/commands.js";

describe("command construction", () => {
  it("keeps ccusage cost output by default", () => {
    expect(buildCcusageArgs({ view: "daily" })).toEqual([
      "-y",
      "ccusage",
      "daily",
      "--json",
      "--by-agent"
    ]);
  });

  it("builds unified ccusage args for a view", () => {
    expect(
      buildCcusageArgs({
        view: "daily",
        since: "2026-06-01",
        until: "2026-06-16",
        timezone: "Asia/Shanghai",
        includeCost: false
      })
    ).toEqual([
      "-y",
      "ccusage",
      "daily",
      "--json",
      "--by-agent",
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
    const args = ["-y", "ccusage", "monthly", "--json", "--by-agent"];

    expect(buildTargetCommand({ name: "local", type: "local", enabled: true }, args)).toEqual({
      command: "npx",
      args,
      display: "npx -y ccusage monthly --json --by-agent"
    });

    expect(buildTargetCommand({ name: "box", type: "ssh", host: "box", enabled: true }, args)).toEqual({
      command: "ssh",
      args: [
        "box",
        'if [ -s "$HOME/.nvm/nvm.sh" ]; then . "$HOME/.nvm/nvm.sh"; fi; npx -y ccusage monthly --json --by-agent'
      ],
      display:
        'ssh box \'if [ -s "$HOME/.nvm/nvm.sh" ]; then . "$HOME/.nvm/nvm.sh"; fi; npx -y ccusage monthly --json --by-agent\''
    });

    expect(
      buildTargetCommand(
        { name: "ecap", type: "dev-remote", profile: "ecap-workspace", enabled: true },
        args
      )
    ).toMatchObject({
      command: "bash",
      display: "dev-remote ecap-workspace :: npx -y ccusage monthly --json --by-agent"
    });
  });
});
