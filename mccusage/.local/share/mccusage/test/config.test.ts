import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import { loadConfig } from "../src/config.js";

describe("loadConfig", () => {
  it("loads enabled targets and applies defaults", async () => {
    const dir = await mkdtemp(join(tmpdir(), "mccusage-config-"));
    const configPath = join(dir, "config.json");
    await writeFile(
      configPath,
      JSON.stringify({
        targets: [
          { name: "local-mac", type: "local", enabled: true },
          { name: "disabled", type: "ssh", host: "example", enabled: false }
        ]
      })
    );

    const config = await loadConfig(configPath);

    expect(config.ccusagePackage).toBe("ccusage");
    expect(config.timezone).toBe("Asia/Shanghai");
    expect(config.targets).toEqual([{ name: "local-mac", type: "local", enabled: true }]);
  });

  it("rejects an enabled ssh target without a host", async () => {
    const dir = await mkdtemp(join(tmpdir(), "mccusage-config-"));
    const configPath = join(dir, "config.json");
    await writeFile(
      configPath,
      JSON.stringify({
        targets: [{ name: "bad-ssh", type: "ssh", enabled: true }]
      })
    );

    await expect(loadConfig(configPath)).rejects.toThrow("bad-ssh");
  });
});
