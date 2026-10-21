import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";

const [command, ...args] = process.argv.slice(2);
const toolEntries = {
  vite: "../node_modules/vite/bin/vite.js",
  vinext: "../node_modules/vinext/dist/cli.js",
};

if (!command || !(command in toolEntries)) {
  console.error(`Expected one of: ${Object.keys(toolEntries).join(", ")}`);
  process.exit(1);
}

const entry = fileURLToPath(new URL(toolEntries[command], import.meta.url));
const child = spawn(process.execPath, [entry, ...args], {
  env: {
    ...process.env,
    WRANGLER_LOG_PATH: ".wrangler/wrangler.log",
  },
  stdio: "inherit",
});

child.on("exit", (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }

  process.exit(code ?? 0);
});
