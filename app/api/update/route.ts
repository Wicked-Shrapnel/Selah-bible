import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

export const runtime = "nodejs";

async function runGit(args: string[]) {
  return execFileAsync("git", args, {
    cwd: process.cwd(),
    timeout: 120000,
    windowsHide: true,
    maxBuffer: 1024 * 1024,
  });
}

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

export async function POST() {
  try {
    const insideWorkTree = await runGit(["rev-parse", "--is-inside-work-tree"]);
    if (insideWorkTree.stdout.trim() !== "true") {
      return jsonResponse({ error: "This Selah copy is not connected to a GitHub checkout." }, 409);
    }

    const localChanges = await runGit(["status", "--porcelain", "--untracked-files=no"]);
    if (localChanges.stdout.trim()) {
      return jsonResponse({
        error: "Selah found local file changes, so it stopped before overwriting anything.",
      }, 409);
    }

    const before = await runGit(["rev-parse", "--short", "HEAD"]);
    await runGit(["fetch", "origin", "main"]);
    await runGit(["merge", "--ff-only", "origin/main"]);
    const after = await runGit(["rev-parse", "--short", "HEAD"]);

    return jsonResponse({
      ok: true,
      before: before.stdout.trim(),
      after: after.stdout.trim(),
      changed: before.stdout.trim() !== after.stdout.trim(),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "The local updater could not finish.";
    return jsonResponse({ error: message }, 500);
  }
}
