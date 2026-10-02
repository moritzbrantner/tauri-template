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

const TOML_KEY = String.raw`(?:"[^"]+"|'[^']+'|[A-Za-z0-9_-]+)`;
const NORMAL_DEPENDENCY_TABLE = new RegExp(
  String.raw`^(?:target\.${TOML_KEY}\.)?dependencies(?:\.(${TOML_KEY}))?$`,
);
const DEPENDENCY_KEY = new RegExp(String.raw`^(${TOML_KEY})\s*(?:=|\.)`);

function unquote(key) {
  return key.replace(/^["']|["']$/g, "");
}

// Collects normal (non-dev, non-build) dependency names from every form Cargo
// accepts: [dependencies], [dependencies.<name>], dotted keys such as
// `tauri.workspace = true`, and target-specific [target.<cfg>.dependencies] tables.
export function cargoDependencyNames(cargoToml) {
  const names = new Set();
  let inDependencyTable = false;
  for (const rawLine of cargoToml.split("\n")) {
    const line = rawLine.trim();
    if (line.startsWith("[")) {
      inDependencyTable = false;
      const header = line.match(/^\[\s*([^[\]]+?)\s*\](?:\s*#.*)?$/);
      const table = header?.[1].match(NORMAL_DEPENDENCY_TABLE);
      if (table?.[1]) {
        names.add(unquote(table[1]));
      } else if (table) {
        inDependencyTable = true;
      }
      continue;
    }
    if (inDependencyTable) {
      const key = line.match(DEPENDENCY_KEY);
      if (key) {
        names.add(unquote(key[1]));
      }
    }
  }
  return [...names];
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

// Static (`from "..."`), side-effect (`import "..."`) and dynamic (`import("...")`)
// module specifiers, plus `export ... from "..."`.
export function isNativeFrontendImport(content) {
  return /(?:\bfrom|\bimport)\s*\(?\s*["'`]@tauri-apps\/(?:api|plugin-)/.test(content);
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

  const capability = JSON.parse(await read(root, "src-tauri/capabilities/default.json"));
  assertStringSet(
    (capability.permissions ?? []).map((permission) =>
      typeof permission === "string" ? permission : permission?.identifier,
    ),
    baseline.defaultPermissions,
    "default capability permissions",
  );

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
