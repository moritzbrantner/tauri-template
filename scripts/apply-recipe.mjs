import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { spawnSync } from "node:child_process";
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

function parseArgs(argv) {
  const options = { dryRun: false, recipeId: null };
  for (const argument of argv) {
    if (argument === "--dry-run") {
      options.dryRun = true;
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
    throw new Error("usage: bun run recipe:add -- <recipe-id> [--dry-run]");
  }
  return options;
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
  return Object.fromEntries(Object.entries(object).sort(([left], [right]) => left.localeCompare(right)));
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

function insertPlugins(content, expressions) {
  if (expressions.length === 0) {
    return content;
  }

  const lines = content.split("\n");
  const invokeIndex = lines.findIndex((line) => line.includes(".invoke_handler("));
  if (invokeIndex === -1) {
    throw new Error(`${LIB_PATH} does not contain the expected Tauri invoke handler seam`);
  }

  let pluginStart = invokeIndex;
  while (pluginStart > 0 && lines[pluginStart - 1].trimStart().startsWith(".plugin(")) {
    pluginStart -= 1;
  }

  const existing = lines
    .slice(pluginStart, invokeIndex)
    .map((line) => line.trim())
    .filter((line) => line.startsWith(".plugin(") && line.endsWith(")"))
    .map((line) => line.slice(".plugin(".length, -1));
  const plugins = [...new Set([...existing, ...expressions])].sort();
  const pluginLines = plugins.map((expression) => `        .plugin(${expression})`);
  lines.splice(pluginStart, invokeIndex - pluginStart, ...pluginLines);
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

function addPermissions(capability, permissions) {
  if (!Array.isArray(capability.permissions)) {
    throw new Error(`${CAPABILITY_PATH} must contain a permissions array`);
  }
  const existingIds = new Set(capability.permissions.map(permissionIdentifier));
  const additions = permissions.filter((permission) => !existingIds.has(permission));
  const stringPermissions = [...capability.permissions.filter((permission) => typeof permission === "string"), ...additions]
    .sort();
  const scopedPermissions = capability.permissions.filter((permission) => typeof permission !== "string");
  capability.permissions = [...stringPermissions, ...scopedPermissions];
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

async function loadRecipe(root, recipeId) {
  const registry = JSON.parse(await read(root, REGISTRY_PATH));
  if (registry.schemaVersion !== 2 || !Array.isArray(registry.recipes)) {
    throw new Error(`${REGISTRY_PATH} must use executable recipe schema version 2`);
  }
  const recipe = registry.recipes.find((candidate) => candidate.id === recipeId);
  if (!recipe) {
    throw new Error(`Unknown recipe ${JSON.stringify(recipeId)}`);
  }
  return recipe;
}

export async function planRecipe(root, recipeId) {
  const recipe = await loadRecipe(root, recipeId);
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
  if (state.kind !== "application" || !Array.isArray(state.activatedRecipes)) {
    throw new Error(`${STATE_PATH} does not describe an initialized application`);
  }
  if (state.activatedRecipes.includes(recipe.id)) {
    return { recipe, alreadyActive: true, mutations: [], dependencyChanges: false };
  }

  packageJson.dependencies ??= {};
  for (const dependency of recipe.frontendDependencies) {
    const existing = packageJson.dependencies[dependency.name] ?? packageJson.devDependencies?.[dependency.name];
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

  const libRs = insertPlugins(originals[LIB_PATH], recipe.plugins);
  const capability = JSON.parse(originals[CAPABILITY_PATH]);
  addPermissions(capability, recipe.permissions);

  state.activatedRecipes = [...state.activatedRecipes, recipe.id].sort();

  const mutationMap = new Map();
  const addMutation = (relativePath, before, after) => {
    mutationMap.set(relativePath, { path: relativePath, before, after });
  };
  addMutation(PACKAGE_PATH, originals[PACKAGE_PATH], `${JSON.stringify(packageJson, null, 2)}\n`);
  addMutation(CARGO_PATH, originals[CARGO_PATH], cargoToml);
  addMutation(LIB_PATH, originals[LIB_PATH], libRs);
  addMutation(CAPABILITY_PATH, originals[CAPABILITY_PATH], `${JSON.stringify(capability, null, 2)}\n`);
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

  const mutations = [...mutationMap.values()].filter((mutation) => mutation.before !== mutation.after);
  return {
    recipe,
    alreadyActive: false,
    mutations,
    dependencyChanges: recipe.frontendDependencies.length > 0 || recipe.rustDependencies.length > 0,
  };
}

export async function applyRecipe(root, recipeId, { dryRun = false } = {}) {
  const plan = await planRecipe(root, recipeId);
  const summary = {
    recipe: plan.recipe.id,
    alreadyActive: plan.alreadyActive,
    changedFiles: plan.mutations.map((mutation) => mutation.path),
    frontendDependencies: plan.recipe.frontendDependencies,
    rustDependencies: plan.recipe.rustDependencies,
    plugins: plan.recipe.plugins,
    permissions: plan.recipe.permissions,
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
  } catch (error) {
    await rollbackMutations(root, applied);
    await writeFile(path.join(root, BUN_LOCK_PATH), lockBackups[BUN_LOCK_PATH], "utf8");
    await writeFile(path.join(root, CARGO_LOCK_PATH), lockBackups[CARGO_LOCK_PATH], "utf8");
    throw error;
  }

  process.stdout.write(`${JSON.stringify(summary, null, 2)}\n`);
  return summary;
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  await applyRecipe(process.cwd(), options.recipeId, { dryRun: options.dryRun });
}

const invokedPath = process.argv[1] ? pathToFileURL(path.resolve(process.argv[1])).href : null;
if (invokedPath === import.meta.url) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  });
}
