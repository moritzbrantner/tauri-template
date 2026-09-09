import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";

const CAPABILITIES_DIR = "src-tauri/capabilities";
const DEFAULT_CAPABILITY = "default.json";
const STATE_PATH = ".tauri-template.json";
const REGISTRY_PATH = "recipes/registry.json";

function sameStrings(actual, expected) {
  return (
    actual.length === expected.length && actual.every((value, index) => value === expected[index])
  );
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

function expectedPermissions(state, registry) {
  if (state.kind === "template") {
    if (state.activatedRecipes.length !== 0) {
      throw new Error("template state must not contain activated recipes");
    }
    return [];
  }
  if (state.kind !== "application") {
    throw new Error(`${STATE_PATH} kind must be "template" or "application"`);
  }

  const recipesById = new Map(registry.recipes.map((recipe) => [recipe.id, recipe]));
  const permissions = [];
  for (const recipeId of state.activatedRecipes) {
    const recipe = recipesById.get(recipeId);
    if (!recipe) {
      throw new Error(
        `activated recipe ${JSON.stringify(recipeId)} is missing from ${REGISTRY_PATH}`,
      );
    }
    permissions.push(...recipe.permissions);
  }
  return [...new Set(permissions)].sort();
}

export function assertDefaultCapability(capability, expectedPermissionIds = []) {
  if (capability.identifier !== "default") {
    throw new Error(
      `default capability identifier must be "default", got ${JSON.stringify(capability.identifier)}`,
    );
  }
  if (!Array.isArray(capability.windows) || !sameStrings(capability.windows, ["main"])) {
    throw new Error('default capability must target only the "main" window');
  }
  if (!Array.isArray(capability.permissions)) {
    throw new Error("default capability must contain a permissions array");
  }
  const actualPermissionIds = capability.permissions.map(permissionIdentifier).sort();
  if (new Set(actualPermissionIds).size !== actualPermissionIds.length) {
    throw new Error(
      `default capability contains duplicate permissions: ${JSON.stringify(actualPermissionIds)}`,
    );
  }
  if (!sameStrings(actualPermissionIds, expectedPermissionIds)) {
    throw new Error(
      `default capability permissions must match activated recipe declarations; expected ${JSON.stringify(expectedPermissionIds)}, got ${JSON.stringify(actualPermissionIds)}`,
    );
  }
  if (capability.remote !== undefined) {
    throw new Error("default capability must not authorize remote origins");
  }
}

export async function checkCapabilityBudget(root = process.cwd()) {
  const capabilityDir = path.join(root, CAPABILITIES_DIR);
  const capabilityFiles = (await readdir(capabilityDir))
    .filter(
      (entry) => entry.endsWith(".json") || entry.endsWith(".json5") || entry.endsWith(".toml"),
    )
    .sort();

  if (!sameStrings(capabilityFiles, [DEFAULT_CAPABILITY])) {
    throw new Error(
      `application foundation must contain exactly ${CAPABILITIES_DIR}/${DEFAULT_CAPABILITY}; got ${JSON.stringify(capabilityFiles)}`,
    );
  }

  const [capabilityContent, stateContent, registryContent] = await Promise.all([
    readFile(path.join(capabilityDir, DEFAULT_CAPABILITY), "utf8"),
    readFile(path.join(root, STATE_PATH), "utf8"),
    readFile(path.join(root, REGISTRY_PATH), "utf8"),
  ]);
  const capability = JSON.parse(capabilityContent);
  const state = JSON.parse(stateContent);
  const registry = JSON.parse(registryContent);

  if (state.schemaVersion !== 1 || !Array.isArray(state.activatedRecipes)) {
    throw new Error(`${STATE_PATH} must use schema version 1 with an activatedRecipes array`);
  }
  if (registry.schemaVersion !== 2 || !Array.isArray(registry.recipes)) {
    throw new Error(`${REGISTRY_PATH} must use executable recipe schema version 2`);
  }

  assertDefaultCapability(capability, expectedPermissions(state, registry));
}

const invokedPath = process.argv[1] ? pathToFileURL(path.resolve(process.argv[1])).href : null;
if (invokedPath === import.meta.url) {
  checkCapabilityBudget().catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  });
}
