#!/usr/bin/env node
/**
 * Runs `vite build` and then forces process.exit(0).
 * Use this when the build completes but something (e.g. a plugin or Bun) keeps
 * the process alive so the deploy script never finishes.
 */
import { spawn } from "child_process";
import { fileURLToPath } from "url";
import path from "path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");

const child = spawn("node", [path.join(root, "node_modules/vite/bin/vite.js"), "build"], {
  cwd: root,
  stdio: ["ignore", "pipe", "pipe"],
  env: { ...process.env, FORCE_COLOR: "1" },
});

let exitScheduled = false;

function forward(chunk, out) {
  const s = chunk.toString();
  if (!exitScheduled && (s.includes("built in") || s.includes("✓ built"))) {
    exitScheduled = true;
    // Child often never exits; force exit 5s after we see build complete
    setTimeout(() => {
      if (child.exitCode == null) {
        child.kill("SIGKILL");
        process.exit(0);
      }
    }, 5000);
  }
  out.write(chunk);
}

child.stdout.on("data", (chunk) => forward(chunk, process.stdout));
child.stderr.on("data", (chunk) => forward(chunk, process.stderr));

child.on("exit", (code, signal) => {
  process.exit(code === 0 ? 0 : code ?? 1);
});

child.on("error", (err) => {
  console.error(err);
  process.exit(1);
});
