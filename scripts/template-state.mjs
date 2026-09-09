import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";

const FINGERPRINT_FILES = [
  ".bun-version",
  ".coding-tooling.json",
  "conventions.lock.json",
  "recipes/registry.json",
  "rust-toolchain.toml",
  "scripts/init-template.mjs",
].sort();

async function read(root, relativePath) {
  return readFile(path.join(root, relativePath), "utf8");
}

export async function readToolchainPins(root) {
  const [bunContent, rustContent] = await Promise.all([
    read(root, ".bun-version"),
    read(root, "rust-toolchain.toml"),
  ]);
  const bun = bunContent.trim();
  const rustMatch = rustContent.match(/^channel\s*=\s*"([^"]+)"/m);
  if (!bun || !rustMatch) {
    throw new Error("template toolchain pins must declare both Bun and Rust versions");
  }
  return { bun, rust: rustMatch[1] };
}

export async function fingerprintTemplateSource(root) {
  const hash = createHash("sha256");
  for (const relativePath of FINGERPRINT_FILES) {
    hash.update(relativePath);
    hash.update("\0");
    hash.update(await read(root, relativePath));
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
