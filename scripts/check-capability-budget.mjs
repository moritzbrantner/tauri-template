import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";

const CAPABILITIES_DIR = "src-tauri/capabilities";
const DEFAULT_CAPABILITY = "default.json";

function sameStrings(actual, expected) {
  return actual.length === expected.length && actual.every((value, index) => value === expected[index]);
}

export function assertDefaultCapability(capability) {
  if (capability.identifier !== "default") {
    throw new Error(`default capability identifier must be "default", got ${JSON.stringify(capability.identifier)}`);
  }
  if (!Array.isArray(capability.windows) || !sameStrings(capability.windows, ["main"])) {
    throw new Error('default capability must target only the "main" window');
  }
  if (!Array.isArray(capability.permissions) || capability.permissions.length !== 0) {
    throw new Error(
      `default template capability must expose no Tauri core/plugin permissions; got ${JSON.stringify(capability.permissions)}`,
    );
  }
  if (capability.remote !== undefined) {
    throw new Error("default template capability must not authorize remote origins");
  }
}

export async function checkCapabilityBudget(root = process.cwd()) {
  const capabilityDir = path.join(root, CAPABILITIES_DIR);
  const capabilityFiles = (await readdir(capabilityDir))
    .filter((entry) => entry.endsWith(".json") || entry.endsWith(".json5") || entry.endsWith(".toml"))
    .sort();

  if (!sameStrings(capabilityFiles, [DEFAULT_CAPABILITY])) {
    throw new Error(
      `default template must contain exactly ${CAPABILITIES_DIR}/${DEFAULT_CAPABILITY}; got ${JSON.stringify(capabilityFiles)}`,
    );
  }

  const capability = JSON.parse(await readFile(path.join(capabilityDir, DEFAULT_CAPABILITY), "utf8"));
  assertDefaultCapability(capability);
}

const invokedPath = process.argv[1] ? pathToFileURL(path.resolve(process.argv[1])).href : null;
if (invokedPath === import.meta.url) {
  checkCapabilityBudget().catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  });
}
