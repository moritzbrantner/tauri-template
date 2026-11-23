import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";

// Generated or machine-local paths that never identify the template source.
const FINGERPRINT_EXCLUDED_DIRECTORIES = new Set([
  ".cache",
  ".git",
  ".vite",
  "coverage",
  "dist",
  "dist-ssr",
  "node_modules",
  "playwright-report",
  "storybook-static",
  "target",
  "test-results",
]);
const FINGERPRINT_EXCLUDED_FILE = /(?:\.log|\.local|\.tsbuildinfo)$|^\.env(?:\..*)?$|^\.DS_Store$/;

async function read(root, relativePath) {
  return readFile(path.join(root, relativePath), "utf8");
}

// Bun is not pinned: the template and its applications use the latest stable Bun
// (shared convention BUN-001). Rust follows the channel in rust-toolchain.toml.
export const BUN_TOOLCHAIN = "latest";

export async function readToolchainPins(root) {
  const rustContent = await read(root, "rust-toolchain.toml");
  const rustMatch = rustContent.match(/^channel\s*=\s*"([^"]+)"/m);
  if (!rustMatch) {
    throw new Error("rust-toolchain.toml must declare a Rust channel");
  }
  return { bun: BUN_TOOLCHAIN, rust: rustMatch[1] };
}

async function walkFiles(root, relativeDirectory = "") {
  const entries = await readdir(path.join(root, relativeDirectory), { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const relativePath = relativeDirectory ? `${relativeDirectory}/${entry.name}` : entry.name;
    if (entry.isDirectory()) {
      if (!FINGERPRINT_EXCLUDED_DIRECTORIES.has(entry.name)) {
        files.push(...(await walkFiles(root, relativePath)));
      }
    } else if (entry.isFile() && !FINGERPRINT_EXCLUDED_FILE.test(entry.name)) {
      files.push(relativePath);
    }
  }
  return files;
}

async function templateSourceFiles(root) {
  const result = spawnSync(
    "git",
    ["ls-files", "-z", "--cached", "--others", "--exclude-standard"],
    {
      cwd: root,
      encoding: "utf8",
    },
  );
  const toplevel = git(root, ["rev-parse", "--show-toplevel"]);
  if (
    !result.error &&
    result.status === 0 &&
    toplevel &&
    path.resolve(toplevel) === path.resolve(root)
  ) {
    const files = [];
    for (const relativePath of result.stdout.split("\0").filter(Boolean)) {
      // Skip tracked files deleted from the working tree.
      if (
        await readFile(path.join(root, relativePath)).then(
          () => true,
          () => false,
        )
      ) {
        files.push(relativePath);
      }
    }
    return files;
  }
  return walkFiles(root);
}

// Hash every template-owned input (tracked plus untracked, non-ignored files, or
// a filtered directory walk outside Git) so different sources get different digests.
export async function fingerprintTemplateSource(root) {
  const hash = createHash("sha256");
  const files = [...new Set(await templateSourceFiles(root))].sort();
  for (const relativePath of files) {
    hash.update(relativePath);
    hash.update("\0");
    hash.update(await readFile(path.join(root, relativePath)));
    hash.update("\0");
  }
  return hash.digest("hex");
}

function git(root, args) {
  const result = spawnSync("git", args, { cwd: root, encoding: "utf8" });
  if (result.error || result.status !== 0) {
    return null;
  }
  return result.stdout.trim() || null;
}

function repositoryMatches(remote, repository) {
  const normalized = remote.replace(/\\/g, "/").replace(/\.git$/, "");
  return (
    normalized.endsWith(`github.com/${repository}`) ||
    normalized.endsWith(`github.com:${repository}`) ||
    normalized === repository
  );
}

export function resolveTemplateSourceRevision(root, repository) {
  const explicit = process.env.TAURI_TEMPLATE_REVISION?.trim();
  if (explicit) {
    if (!/^[0-9a-f]{40}$/i.test(explicit)) {
      throw new Error("TAURI_TEMPLATE_REVISION must be a full 40-character Git commit SHA");
    }
    return explicit.toLowerCase();
  }

  const remote = git(root, ["config", "--get", "remote.origin.url"]);
  if (!remote || !repositoryMatches(remote, repository)) {
    return null;
  }

  // A dirty checkout did not come from HEAD; record no revision rather than a misleading one.
  const status = spawnSync("git", ["status", "--porcelain", "--untracked-files=no"], {
    cwd: root,
    encoding: "utf8",
  });
  if (status.error || status.status !== 0 || status.stdout.trim() !== "") {
    return null;
  }

  const revision = git(root, ["rev-parse", "HEAD"]);
  return revision && /^[0-9a-f]{40}$/i.test(revision) ? revision.toLowerCase() : null;
}

export function validateStateShape(state, statePath = ".tauri-template.json") {
  if (
    state.schemaVersion !== 1 ||
    typeof state.templateRepository !== "string" ||
    !Array.isArray(state.activatedRecipes) ||
    !state.recipeConfig ||
    typeof state.recipeConfig !== "object" ||
    Array.isArray(state.recipeConfig)
  ) {
    throw new Error(
      `${statePath} must use schema version 1 with templateRepository, activatedRecipes, and recipeConfig`,
    );
  }
}
