import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { checkCapabilityBudget } from "./check-capability-budget.mjs";
import { validateStateShape } from "./template-state.mjs";

const BASELINE_PATH = "template-baseline.json";
const STATE_PATH = ".tauri-template.json";

async function read(root, relativePath) {
  return readFile(path.join(root, relativePath), "utf8");
}

function sameStrings(actual, expected) {
  return (
    actual.length === expected.length && actual.every((value, index) => value === expected[index])
  );
}

function assertStringSet(actual, expected, label) {
  const normalizedActual = [...actual].sort();
  const normalizedExpected = [...expected].sort();
  if (!sameStrings(normalizedActual, normalizedExpected)) {
    throw new Error(
      `${label} drifted; expected ${JSON.stringify(normalizedExpected)}, got ${JSON.stringify(normalizedActual)}`,
    );
  }
}

function cargoDependencyNames(cargoToml) {
  const lines = cargoToml.split("\n");
  const start = lines.indexOf("[dependencies]");
  if (start === -1) {
    return [];
  }
  const names = [];
  for (let index = start + 1; index < lines.length; index += 1) {
    const line = lines[index];
    if (/^\[[^\]]+\]/.test(line)) {
      break;
    }
    const match = line.match(/^([A-Za-z0-9_-]+)\s*=/);
    if (match) {
      names.push(match[1]);
    }
  }
  return names;
}

function tauriPluginExpressions(libRs) {
  return libRs
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.startsWith(".plugin(") && line.endsWith(")"))
    .map((line) => line.slice(".plugin(".length, -1));
}

async function listFiles(root, relativeDirectory) {
  const directory = path.join(root, relativeDirectory);
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const relativePath = path.posix.join(relativeDirectory, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await listFiles(root, relativePath)));
    } else if (entry.isFile()) {
      files.push(relativePath);
    }
  }
  return files;
}

function isNativeFrontendImport(content) {
  return /from\s+["']@tauri-apps\/(?:api|plugin-)/.test(content);
}

export async function checkTemplateBaseline(root = process.cwd()) {
  const [baselineContent, stateContent, packageContent, cargoContent, libRs] = await Promise.all([
    read(root, BASELINE_PATH),
    read(root, STATE_PATH),
    read(root, "package.json"),
    read(root, "src-tauri/Cargo.toml"),
    read(root, "src-tauri/src/lib.rs"),
  ]);

  const baseline = JSON.parse(baselineContent);
  const state = JSON.parse(stateContent);
  validateStateShape(state, STATE_PATH);
  if (baseline.schemaVersion !== 1) {
    throw new Error(`${BASELINE_PATH} must use schema version 1`);
  }

  if (state.kind === "application") {
    return {
      enforced: false,
      reason: "initialized applications own product-specific dependencies",
    };
  }
  if (state.kind !== "template") {
    throw new Error(`${STATE_PATH} has unsupported kind ${JSON.stringify(state.kind)}`);
  }

  const packageJson = JSON.parse(packageContent);
  assertStringSet(
    Object.keys(packageJson.dependencies ?? {}),
    baseline.frontendRuntimeDependencies,
    "default frontend runtime dependencies",
  );
  assertStringSet(
    cargoDependencyNames(cargoContent),
    baseline.rustRootDependencies,
    "default root Rust dependencies",
  );
  assertStringSet(
    tauriPluginExpressions(libRs),
    baseline.defaultTauriPlugins,
    "default Tauri plugins",
  );

  for (const relativePath of baseline.requiredSeams) {
    await read(root, relativePath);
  }

  const sourceFiles = (await listFiles(root, "src")).filter((relativePath) =>
    /\.(?:ts|tsx)$/.test(relativePath),
  );
  const nativeImportOwners = [];
  for (const relativePath of sourceFiles) {
    if (isNativeFrontendImport(await read(root, relativePath))) {
      nativeImportOwners.push(relativePath);
    }
  }
  assertStringSet(
    nativeImportOwners,
    baseline.frontendNativeImportOwners,
    "frontend native-import ownership",
  );

  const appCoreCargo = await read(root, "src-tauri/crates/app-core/Cargo.toml");
  if (cargoDependencyNames(appCoreCargo).length !== 0) {
    throw new Error("default app-core must remain framework-independent and dependency-free");
  }

  await checkCapabilityBudget(root);
  return { enforced: true, reason: "template baseline matches declared budget" };
}

async function main() {
  const result = await checkTemplateBaseline();
  process.stdout.write(
    `template baseline: ${result.enforced ? "enforced" : "skipped"} (${result.reason})\n`,
  );
}

const invokedPath = process.argv[1] ? pathToFileURL(path.resolve(process.argv[1])).href : null;
if (invokedPath === import.meta.url) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  });
}
