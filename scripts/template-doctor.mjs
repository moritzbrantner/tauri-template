import { readFile } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { checkCapabilityBudget } from "./check-capability-budget.mjs";
import { readToolchainPins, validateStateShape } from "./template-state.mjs";

const TEMPLATE_NAME = "tauri-template";
const STATE_PATH = ".tauri-template.json";
const REGISTRY_PATH = "recipes/registry.json";
const CAPABILITY_PATH = "src-tauri/capabilities/default.json";

async function read(root, relativePath) {
  return readFile(path.join(root, relativePath), "utf8");
}

function rustLibName(name) {
  return `${name.replaceAll("-", "_")}_lib`;
}

function sameStrings(actual, expected) {
  return actual.length === expected.length && actual.every((value, index) => value === expected[index]);
}

function assertSortedUnique(values, label) {
  if (new Set(values).size !== values.length || !sameStrings(values, [...values].sort())) {
    throw new Error(`${label} must be sorted and unique`);
  }
}

function parseCargoIdentity(cargoToml) {
  const packageMatch = cargoToml.match(/\[package\][\s\S]*?\nname = "([^"]+)"/);
  const libMatch = cargoToml.match(/\[lib\][\s\S]*?\nname = "([^"]+)"/);
  if (!packageMatch || !libMatch) {
    throw new Error("src-tauri/Cargo.toml must declare package and library names");
  }
  return { packageName: packageMatch[1], libName: libMatch[1] };
}

function cargoDependencyLine(dependency) {
  if (dependency.features.length === 0) {
    return `${dependency.name} = "${dependency.version}"`;
  }
  const features = dependency.features.map((feature) => JSON.stringify(feature)).join(", ");
  return `${dependency.name} = { version = "${dependency.version}", features = [${features}] }`;
}

function permissionIdentifier(permission) {
  if (typeof permission === "string") {
    return permission;
  }
  if (permission && typeof permission === "object" && typeof permission.identifier === "string") {
    return permission.identifier;
  }
  throw new Error(`Unsupported capability permission shape: ${JSON.stringify(permission)}`);
}

function assertProvenance(provenance) {
  if (!provenance || typeof provenance !== "object") {
    throw new Error(`${STATE_PATH} application state must contain provenance`);
  }
  if (
    provenance.sourceRevision !== null &&
    (typeof provenance.sourceRevision !== "string" || !/^[0-9a-f]{40}$/.test(provenance.sourceRevision))
  ) {
    throw new Error("provenance sourceRevision must be null or a full lowercase Git commit SHA");
  }
  if (
    typeof provenance.sourceFingerprint !== "string" ||
    !/^[0-9a-f]{64}$/.test(provenance.sourceFingerprint)
  ) {
    throw new Error("provenance sourceFingerprint must be a SHA-256 digest");
  }
  if (
    !provenance.toolchains ||
    typeof provenance.toolchains.bun !== "string" ||
    typeof provenance.toolchains.rust !== "string"
  ) {
    throw new Error("provenance must record Bun and Rust source toolchain pins");
  }
}

function assertRecipePlugins(libRs, recipes) {
  const expected = [...new Set(recipes.flatMap((recipe) => recipe.plugins))].sort();
  const start = "        // tauri-template:recipe-plugins:start";
  const end = "        // tauri-template:recipe-plugins:end";
  const lines = libRs.split("\n");
  const startIndex = lines.indexOf(start);
  const endIndex = lines.indexOf(end);

  if (expected.length === 0) {
    if (startIndex !== -1 || endIndex !== -1) {
      throw new Error("recipe plugin marker block exists without an activated plugin recipe");
    }
    return;
  }
  if (startIndex === -1 || endIndex <= startIndex) {
    throw new Error("activated plugin recipes require one generated recipe plugin block");
  }
  const actual = lines
    .slice(startIndex + 1, endIndex)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      if (!line.startsWith(".plugin(") || !line.endsWith(")")) {
        throw new Error(`unexpected line inside recipe plugin block: ${line}`);
      }
      return line.slice(".plugin(".length, -1);
    });
  if (!sameStrings(actual, expected)) {
    throw new Error(`recipe plugin block drifted; expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
  }
}

function assertRecipeScopes(state, recipes, capability) {
  const permissions = new Map(capability.permissions.map((permission) => [permissionIdentifier(permission), permission]));
  for (const recipe of recipes) {
    const config = state.recipeConfig[recipe.id] ?? {};
    if (!recipe.requiresScope) {
      if (Object.keys(config).length !== 0) {
        throw new Error(`${recipe.id} has unexpected recipe configuration`);
      }
      continue;
    }
    if (typeof config.scope !== "string" || !config.scope.trim()) {
      throw new Error(`${recipe.id} must record its explicit scope`);
    }
    const permission = permissions.get(recipe.scopePermission);
    if (
      !permission ||
      typeof permission === "string" ||
      JSON.stringify(permission.allow) !== JSON.stringify([{ path: config.scope }])
    ) {
      throw new Error(`${recipe.id} capability scope does not match recorded recipe configuration`);
    }
  }
}

export async function doctor(root = process.cwd()) {
  const [
    stateContent,
    packageContent,
    tauriContent,
    cargoContent,
    cargoLock,
    bunLock,
    mainRs,
    libRs,
    workflow,
    capabilityContent,
    registryContent,
  ] = await Promise.all([
    read(root, STATE_PATH),
    read(root, "package.json"),
    read(root, "src-tauri/tauri.conf.json"),
    read(root, "src-tauri/Cargo.toml"),
    read(root, "src-tauri/Cargo.lock"),
    read(root, "bun.lock"),
    read(root, "src-tauri/src/main.rs"),
    read(root, "src-tauri/src/lib.rs"),
    read(root, ".github/workflows/validate.yml"),
    read(root, CAPABILITY_PATH),
    read(root, REGISTRY_PATH),
  ]);

  const state = JSON.parse(stateContent);
  const packageJson = JSON.parse(packageContent);
  const tauriConfig = JSON.parse(tauriContent);
  const capability = JSON.parse(capabilityContent);
  const registry = JSON.parse(registryContent);
  validateStateShape(state, STATE_PATH);
  if (registry.schemaVersion !== 2 || !Array.isArray(registry.recipes)) {
    throw new Error(`${REGISTRY_PATH} must use executable recipe schema version 2`);
  }
  assertSortedUnique(state.activatedRecipes, "activatedRecipes");
  const configIds = Object.keys(state.recipeConfig);
  if (!sameStrings(configIds, [...configIds].sort()) || !sameStrings(configIds, state.activatedRecipes)) {
    throw new Error("recipeConfig keys must exactly match activatedRecipes in sorted order");
  }

  const cargoIdentity = parseCargoIdentity(cargoContent);
  const warnings = [];

  if (state.kind === "template") {
    if (packageJson.name !== TEMPLATE_NAME || cargoIdentity.packageName !== TEMPLATE_NAME) {
      throw new Error("template state must retain the canonical template package identity");
    }
    if (state.activatedRecipes.length !== 0 || state.application !== undefined || state.provenance !== undefined) {
      throw new Error("uninitialized template state must not contain application provenance or activated recipes");
    }
    await checkCapabilityBudget(root);
    return { kind: "template", name: TEMPLATE_NAME, recipes: [], warnings };
  }

  if (state.kind !== "application") {
    throw new Error(`${STATE_PATH} kind must be template or application`);
  }
  assertProvenance(state.provenance);

  const identity = state.application;
  if (!identity || typeof identity.name !== "string" || typeof identity.identifier !== "string" || typeof identity.title !== "string") {
    throw new Error(`${STATE_PATH} must contain application name, identifier, and title`);
  }
  if (packageJson.name !== identity.name || cargoIdentity.packageName !== identity.name) {
    throw new Error("application package identity drifted between template state, package.json, and Cargo.toml");
  }
  if (cargoIdentity.libName !== rustLibName(identity.name)) {
    throw new Error("Cargo library name does not match the initialized application identity");
  }
  if (!mainRs.includes(`${cargoIdentity.libName}::run()`)) {
    throw new Error("Rust binary entry point does not call the initialized library name");
  }
  if (
    tauriConfig.productName !== identity.title ||
    tauriConfig.identifier !== identity.identifier ||
    tauriConfig.app?.windows?.[0]?.title !== identity.title
  ) {
    throw new Error("Tauri product/window/bundle identity drifted from template state");
  }
  if (!bunLock.includes(`"name": "${identity.name}"`) || !cargoLock.includes(`name = "${identity.name}"\n`)) {
    throw new Error("committed dependency lock identity drifted from template state");
  }
  if (!workflow.includes(`component: ${identity.name}`)) {
    throw new Error("coding-tooling workflow component drifted from application identity");
  }

  const recipesById = new Map(registry.recipes.map((recipe) => [recipe.id, recipe]));
  const activeRecipes = state.activatedRecipes.map((recipeId) => {
    const recipe = recipesById.get(recipeId);
    if (!recipe) {
      throw new Error(`activated recipe ${recipeId} no longer exists in ${REGISTRY_PATH}`);
    }
    return recipe;
  });
  for (const recipe of activeRecipes) {
    for (const dependency of recipe.frontendDependencies) {
      if (packageJson.dependencies?.[dependency.name] !== dependency.version) {
        throw new Error(`${recipe.id} frontend dependency ${dependency.name} drifted from its activation contract`);
      }
    }
    for (const dependency of recipe.rustDependencies) {
      if (!cargoContent.split("\n").includes(cargoDependencyLine(dependency))) {
        throw new Error(`${recipe.id} Rust dependency ${dependency.name} drifted from its activation contract`);
      }
    }
  }
  assertRecipePlugins(libRs, activeRecipes);
  assertRecipeScopes(state, activeRecipes, capability);
  await checkCapabilityBudget(root);

  const currentToolchains = await readToolchainPins(root);
  for (const key of ["bun", "rust"]) {
    if (currentToolchains[key] !== state.provenance.toolchains[key]) {
      warnings.push(
        `${key} is now ${currentToolchains[key]} but the application originated from ${state.provenance.toolchains[key]}`,
      );
    }
  }

  return { kind: "application", name: identity.name, recipes: state.activatedRecipes, warnings };
}

async function main() {
  const result = await doctor();
  process.stdout.write(
    `template doctor: ok (${result.kind} ${result.name}; recipes: ${result.recipes.join(", ") || "none"})\n`,
  );
  for (const warning of result.warnings) {
    process.stdout.write(`template doctor warning: ${warning}\n`);
  }
}

const invokedPath = process.argv[1] ? pathToFileURL(path.resolve(process.argv[1])).href : null;
if (invokedPath === import.meta.url) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  });
}
