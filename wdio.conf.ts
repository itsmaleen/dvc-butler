import type { Options } from "@wdio/types";
import { join } from "path";
import { homedir } from "os";
import { spawn } from "child_process";

let tauriDriver: any;

export const config: Options.Testrunner = {
  runner: "local",
  autoCompileOpts: {
    autoCompile: true,
    tsNodeOpts: {
      project: "./tsconfig.json",
      transpileOnly: true,
    },
  },
  specs: ["./tests/e2e/**/*.e2e.ts"],
  exclude: [],
  maxInstances: 1,
  capabilities: [
    {
      browserName: "tauri",
      "tauri:options": {
        application: "../../src-tauri/target/release/fenn-app",
      },
    },
  ],
  reporters: ["spec"],
  framework: "mocha",
  mochaOpts: {
    ui: "bdd",
    timeout: 60000,
  },
  beforeSession: async () => {
    const tauriDriverPath = join(homedir(), ".cargo", "bin", "tauri-driver");
    tauriDriver = spawn(tauriDriverPath, [], { stdio: "inherit" });
    await new Promise((resolve) => setTimeout(resolve, 5000));
  },
  afterSession: async () => {
    tauriDriver.kill();
  },
};
