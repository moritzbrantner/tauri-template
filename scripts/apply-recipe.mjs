import { spawnSync } from "node:child_process";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";

const TEMPLATE_NAME = "tauri-template";
const REGISTRY_PATH = "recipes/registry.json";
const STATE_PATH = ".tauri-template.json";
const PACKAGE_PATH = "package.json";
const CARGO_PATH = "src-tauri/Cargo.toml";
const CARGO_LOCK_PATH = "src-tauri/Cargo.lock";
const LIB_PATH = "src-tauri/src/lib.rs";
const CAPABILITY_PATH = "src-tauri/capabilities/default.json";
const BUN_LOCK_PATH = "bun.lock";
const RECIPE_PLUGIN_START = "        // tauri-template:recipe-plugins:start";
const RECIPE_PLUGIN_END = "        // tauri-template:recipe-plugins:end";

function parseArgs(argv) {
  const options = { dryRun: false, recipeId: null, scope: null };

  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === "--dry-run") {
      options.dryRun = true;
      continue;
    }
    if (argument === "--scope") {
      const value = argv[index + 1];
      if (!value || value.startsWith("--")) {
        throw new Error("--scope requires a value");
      }
      options.scope = validateScope(value);
      index += 1;
      continue;
    }
    if (argument.startsWith("--")) {
      throw new Error(`Unknown argument: ${argument}`);
    }
    if (options.recipeId !== null) {
      throw new Error(`Unexpected argument: ${argument}`);
    }
    options.recipeId = argument;
  }

  if (!options.recipeId) {
    throw new Error(
      "usage: bun run recipe:add -- <recipe-id> [--scope <tauri-path-scope>] [--dry-run]",
    );
  }
  return options;
}

function validateScope(value) {
  const scope = value.trim();
  if (!scope || /[\r\n]/.test(scope)) {
    throw new Error("--scope must be a non-empty single-line Tauri filesystem scope");
  }
  return scope;
}

async function read(root, relativePath) {
  return readFile(path.join(root, relativePath), "utf8");
}

async function readOptional(root, relativePath) {
  try {
    return await read(root, relativePath);
  } catch (error) {
    if (error && typeof error === "object" && "code" in error && error.code === "ENOENT") {
      return null;
    }
    throw error;
  }
}

function sortedObject(object) {
  return Object.fromEntries(
    Object.entries(object).sort(([left], [right]) => left.localeCompare(right)),
  );
}

function cargoDependencyLine(dependency) {
  if (dependency.features.length === 0) {
    return `${dependency.name} = "${dependency.version}"`;
  }
  const features = dependency.features.map((feature) => JSON.stringify(feature)).join(", ");
  return `${dependency.name} = { version = "${dependency.version}", features = [${features}] }`;
}

function dependencyKey(line) {
  const match = line.match(/^([A-Za-z0-9_-]+)\s*=/);
  return match?.[1] ?? null;
}

function insertCargoDependency(content, dependency) {
  const lines = content.split("\n");
  const dependencyHeader = lines.indexOf("[dependencies]");
  if (dependencyHeader === -1) {
    throw new Error(`${CARGO_PATH} does not contain a [dependencies] section`);
  }

  let sectionEnd = lines.length;
  for (let index = dependencyHeader + 1; index < lines.length; index += 1) {
    if (/^\[[^\]]+\]/.test(lines[index])) {
      sectionEnd = index;
      break;
    }
  }

  const expectedLine = cargoDependencyLine(dependency);
  for (let index = dependencyHeader + 1; index < sectionEnd; index += 1) {
    if (dependencyKey(lines[index]) === dependency.name) {
      if (lines[index] !== expectedLine) {
        throw new Error(
          `${CARGO_PATH} already declares ${dependency.name} differently; refusing to overwrite application-owned dependency policy`,
        );
      }
      return content;
    }
  }

  let insertAt = sectionEnd;
  for (let index = dependencyHeader + 1; index < sectionEnd; index += 1) {
    const key = dependencyKey(lines[index]);
    if (key && dependency.name.localeCompare(key) < 0) {
      insertAt = index;
      break;
    }
  }
  lines.splice(insertAt, 0, expectedLine);
  return lines.join("\n");
}

function setRecipePlugins(content, expressions) {
  const plugins = [...new Set(expressions)].sort();
  const lines = content.split("\n");
  const startIndex = lines.indexOf(RECIPE_PLUGIN_START);
  const endIndex = lines.indexOf(RECIPE_PLUGIN_END);

  if ((startIndex === -1) !== (endIndex === -1)) {
    throw new Error(`${LIB_PATH} contains an incomplete recipe plugin marker block`);
  }
  if (startIndex !== -1 && endIndex <= startIndex) {
    throw new Error(`${LIB_PATH} contains an invalid recipe plugin marker block`);
  }

  const block =
    plugins.length === 0
      ? []
      : [
          RECIPE_PLUGIN_START,
          ...plugins.map((expression) => `        .plugin(${expression})`),
          RECIPE_PLUGIN_END,
        ];

  if (startIndex !== -1) {
    lines.splice(startIndex, endIndex - startIndex + 1, ...block);
    return lines.join("\n");
  }

  const invokeIndex = lines.findIndex((line) => line.includes(".invoke_handler("));
  if (invokeIndex === -1) {
    throw new Error(`${LIB_PATH} does not contain the expected Tauri invoke handler seam`);
  }
  lines.splice(invokeIndex, 0, ...block);
  return lines.join("\n");
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

function configuredPermissions(recipe, scope) {
  if (!recipe.requiresScope) {
    if (scope !== null) {
      throw new Error(`${recipe.id} does not accept --scope`);
    }
    return recipe.permissions;
  }
  if (!scope) {
    throw new Error(
      `${recipe.id} requires --scope with the narrow Tauri path pattern the app should watch`,
    );
  }
  if (!recipe.scopePermission || !recipe.permissions.includes(recipe.scopePermission)) {
    throw new Error(`${recipe.id} declares requiresScope without a valid scopePermission`);
  }
  return recipe.permissions.map((permission) =>
    permission === recipe.scopePermission
      ? { identifier: permission, allow: [{ path: scope }] }
      : permission,
  );
}

function addPermissions(capability, additions) {
  if (!Array.isArray(capability.permissions)) {
    throw new Error(`${CAPABILITY_PATH} must contain a permissions array`);
  }

  const byIdentifier = new Map();
  for (const permission of capability.permissions) {
    const identifier = permissionIdentifier(permission);
    if (byIdentifier.has(identifier)) {
      throw new Error(`${CAPABILITY_PATH} already contains duplicate permission ${identifier}`);
    }
    byIdentifier.set(identifier, permission);
  }

  for (const permission of additions) {
    const identifier = permissionIdentifier(permission);
    const existing = byIdentifier.get(identifier);
    if (existing !== undefined) {
      if (JSON.stringify(existing) !== JSON.stringify(permission)) {
        throw new Error(
          `${CAPABILITY_PATH} already configures ${identifier} differently; refusing to overwrite application-owned permission scope`,
        );
      }
      continue;
    }
    byIdentifier.set(identifier, permission);
  }

  capability.permissions = [...byIdentifier.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([, permission]) => permission);
}

function addRustModule(content, moduleName) {
  const declaration = `pub mod ${moduleName};`;
  if (content.split("\n").includes(declaration)) {
    return content;
  }

  const lines = content.split("\n");
  let insertAt = 0;
  while (insertAt < lines.length && lines[insertAt].startsWith("pub mod ")) {
    if (declaration.localeCompare(lines[insertAt]) < 0) {
      break;
    }
    insertAt += 1;
  }
  lines.splice(insertAt, 0, declaration);
  if (insertAt === 0 && lines[1] !== "") {
    lines.splice(1, 0, "");
  }
  return lines.join("\n");
}

function run(command, args, root) {
  const result = spawnSync(command, args, { cwd: root, stdio: "inherit" });
  if (result.error) {
    throw result.error;
  }
  if (result.status !== 0) {
    throw new Error(`${command} ${args.join(" ")} exited with ${result.status}`);
  }
}

async function rollbackMutations(root, mutations) {
  const failures = [];
  for (const mutation of [...mutations].reverse()) {
    try {
      const absolutePath = path.join(root, mutation.path);
      if (mutation.before === null) {
        await rm(absolutePath, { force: true });
      } else {
        await writeFile(absolutePath, mutation.before, "utf8");
      }
    } catch (error) {
      failures.push(`${mutation.path}: ${String(error)}`);
    }
  }
  if (failures.length > 0) {
    throw new Error(`Recipe rollback was incomplete: ${failures.join("; ")}`);
  }
}

async function commitMutations(root, mutations) {
  const applied = [];
  try {
    for (const mutation of mutations) {
      if (mutation.before === mutation.after) {
        continue;
      }
      const absolutePath = path.join(root, mutation.path);
      await mkdir(path.dirname(absolutePath), { recursive: true });
      await writeFile(absolutePath, mutation.after, "utf8");
      applied.push(mutation);
    }
  } catch (error) {
    await rollbackMutations(root, applied);
    throw error;
  }
  return applied;
}

function validateRecipeSchema(recipe) {
  if (
    !Array.isArray(recipe.frontendDependencies) ||
    !Array.isArray(recipe.rustDependencies) ||
    !Array.isArray(recipe.plugins) ||
    !Array.isArray(recipe.permissions) ||
    !Array.isArray(recipe.generatedFiles) ||
    !Array.isArray(recipe.rustModules) ||
    !Array.isArray(recipe.validationCommands) ||
    !Array.isArray(recipe.sourceSeams)
  ) {
    throw new Error(
      `recipe ${JSON.stringify(recipe.id)} does not satisfy executable recipe schema version 2`,
    );
  }
  for (const command of recipe.validationCommands) {
    if (
      !Array.isArray(command) ||
      command.length === 0 ||
      command.some((part) => typeof part !== "string" || !part)
    ) {
      throw new Error(`recipe ${JSON.stringify(recipe.id)} contains an invalid validation command`);
    }
  }
}

async function loadRegistryAndRecipe(root, recipeId) {
  const registry = JSON.parse(await read(root, REGISTRY_PATH));
  if (registry.schemaVersion !== 2 || !Array.isArray(registry.recipes)) {
    throw new Error(`${REGISTRY_PATH} must use executable recipe schema version 2`);
  }
  for (const candidate of registry.recipes) {
    validateRecipeSchema(candidate);
  }
  const recipe = registry.recipes.find((candidate) => candidate.id === recipeId);
  if (!recipe) {
    throw new Error(`Unknown recipe ${JSON.stringify(recipeId)}`);
  }
  return { registry, recipe };
}

export async function planRecipe(root, recipeId, { scope = null } = {}) {
  const { registry, recipe } = await loadRegistryAndRecipe(root, recipeId);
  const recipePermissions = configuredPermissions(recipe, scope);
  const originals = {
    [PACKAGE_PATH]: await read(root, PACKAGE_PATH),
    [CARGO_PATH]: await read(root, CARGO_PATH),
    [LIB_PATH]: await read(root, LIB_PATH),
    [CAPABILITY_PATH]: await read(root, CAPABILITY_PATH),
    [STATE_PATH]: await read(root, STATE_PATH),
  };

  const packageJson = JSON.parse(originals[PACKAGE_PATH]);
  if (packageJson.name === TEMPLATE_NAME) {
    throw new Error("Initialize the application identity before activating recipes");
  }

  const state = JSON.parse(originals[STATE_PATH]);
  if (
    state.kind !== "application" ||
    !Array.isArray(state.activatedRecipes) ||
    !state.recipeConfig ||
    typeof state.recipeConfig !== "object" ||
    Array.isArray(state.recipeConfig)
  ) {
    throw new Error(
      `${STATE_PATH} does not describe an initialized application with recipe configuration`,
    );
  }

  if (state.activatedRecipes.includes(recipe.id)) {
    const existingConfig = state.recipeConfig[recipe.id] ?? {};
    const expectedConfig = recipe.requiresScope ? { scope } : {};
    if (JSON.stringify(existingConfig) !== JSON.stringify(expectedConfig)) {
      throw new Error(
        `${recipe.id} is already active with different configuration; explicit recipe reconfiguration is not automatic`,
      );
    }
    return {
      recipe,
      permissions: recipePermissions,
      alreadyActive: true,
      mutations: [],
    };
  }

  packageJson.dependencies ??= {};
  for (const dependency of recipe.frontendDependencies) {
    const existing =
      packageJson.dependencies[dependency.name] ?? packageJson.devDependencies?.[dependency.name];
    if (existing !== undefined && existing !== dependency.version) {
      throw new Error(
        `${PACKAGE_PATH} already declares ${dependency.name}@${existing}; refusing to overwrite application-owned dependency policy`,
      );
    }
    packageJson.dependencies[dependency.name] = dependency.version;
  }
  packageJson.dependencies = sortedObject(packageJson.dependencies);

  let cargoToml = originals[CARGO_PATH];
  for (const dependency of recipe.rustDependencies) {
    cargoToml = insertCargoDependency(cargoToml, dependency);
  }

  state.activatedRecipes = [...state.activatedRecipes, recipe.id].sort();
  state.recipeConfig[recipe.id] = recipe.requiresScope ? { scope } : {};
  state.recipeConfig = sortedObject(state.recipeConfig);

  const recipesById = new Map(registry.recipes.map((candidate) => [candidate.id, candidate]));
  const activePlugins = state.activatedRecipes.flatMap((activeRecipeId) => {
    const activeRecipe = recipesById.get(activeRecipeId);
    if (!activeRecipe) {
      throw new Error(
        `activated recipe ${JSON.stringify(activeRecipeId)} is missing from ${REGISTRY_PATH}`,
      );
    }
    return activeRecipe.plugins;
  });
  const libRs = setRecipePlugins(originals[LIB_PATH], activePlugins);

  const capability = JSON.parse(originals[CAPABILITY_PATH]);
  addPermissions(capability, recipePermissions);

  const mutationMap = new Map();
  const addMutation = (relativePath, before, after) => {
    mutationMap.set(relativePath, { path: relativePath, before, after });
  };
  addMutation(PACKAGE_PATH, originals[PACKAGE_PATH], `${JSON.stringify(packageJson, null, 2)}\n`);
  addMutation(CARGO_PATH, originals[CARGO_PATH], cargoToml);
  addMutation(LIB_PATH, originals[LIB_PATH], libRs);
  addMutation(
    CAPABILITY_PATH,
    originals[CAPABILITY_PATH],
    `${JSON.stringify(capability, null, 2)}\n`,
  );
  addMutation(STATE_PATH, originals[STATE_PATH], `${JSON.stringify(state, null, 2)}\n`);

  for (const generatedFile of recipe.generatedFiles) {
    const source = await read(root, generatedFile.source);
    const before = await readOptional(root, generatedFile.target);
    if (before !== null && before !== source) {
      throw new Error(
        `${generatedFile.target} already exists with application-owned content; refusing to overwrite it`,
      );
    }
    addMutation(generatedFile.target, before, source);
  }

  for (const rustModule of recipe.rustModules) {
    const existingMutation = mutationMap.get(rustModule.path);
    const before = existingMutation?.before ?? (await read(root, rustModule.path));
    const current = existingMutation?.after ?? before;
    addMutation(rustModule.path, before, addRustModule(current, rustModule.module));
  }

  return {
    recipe,
    permissions: recipePermissions,
    alreadyActive: false,
    mutations: [...mutationMap.values()].filter((mutation) => mutation.before !== mutation.after),
  };
}

export async function applyRecipe(root, recipeId, { dryRun = false, scope = null } = {}) {
  const plan = await planRecipe(root, recipeId, { scope });
  const summary = {
    recipe: plan.recipe.id,
    alreadyActive: plan.alreadyActive,
    changedFiles: plan.mutations.map((mutation) => mutation.path),
    frontendDependencies: plan.recipe.frontendDependencies,
    rustDependencies: plan.recipe.rustDependencies,
    plugins: plan.recipe.plugins,
    permissions: plan.permissions,
    validationCommands: plan.recipe.validationCommands,
    sourceSeams: plan.recipe.sourceSeams,
    requiresScope: plan.recipe.requiresScope,
  };

  if (dryRun || plan.alreadyActive) {
    process.stdout.write(`${JSON.stringify(summary, null, 2)}\n`);
    return summary;
  }

  const lockBackups = {
    [BUN_LOCK_PATH]: await read(root, BUN_LOCK_PATH),
    [CARGO_LOCK_PATH]: await read(root, CARGO_LOCK_PATH),
  };
  const applied = await commitMutations(root, plan.mutations);

  try {
    if (plan.recipe.frontendDependencies.length > 0) {
      run("bun", ["install"], root);
      run("bun", ["install", "--frozen-lockfile"], root);
    }
    if (plan.recipe.rustDependencies.length > 0) {
      run("cargo", ["check", "--manifest-path", CARGO_PATH], root);
      run("cargo", ["check", "--manifest-path", CARGO_PATH, "--locked"], root);
    }
    run("node", ["./scripts/check-capability-budget.mjs"], root);
    for (const [command, ...args] of plan.recipe.validationCommands) {
      run(command, args, root);
    }
  } catch (error) {
    let rollbackError = null;
    try {
      await rollbackMutations(root, applied);
    } catch (candidate) {
      rollbackError = candidate;
    }
    await writeFile(path.join(root, BUN_LOCK_PATH), lockBackups[BUN_LOCK_PATH], "utf8");
    await writeFile(path.join(root, CARGO_LOCK_PATH), lockBackups[CARGO_LOCK_PATH], "utf8");
    if (rollbackError) {
      throw new Error(
        `Recipe activation failed and rollback was incomplete: ${String(rollbackError)}`,
        {
          cause: error,
        },
      );
    }
    throw error;
  }

  process.stdout.write(`${JSON.stringify(summary, null, 2)}\n`);
  return summary;
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  await applyRecipe(process.cwd(), options.recipeId, {
    dryRun: options.dryRun,
    scope: options.scope,
  });
}

const invokedPath = process.argv[1] ? pathToFileURL(path.resolve(process.argv[1])).href : null;
if (invokedPath === import.meta.url) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  });
}
