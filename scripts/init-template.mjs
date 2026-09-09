import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
import {
  fingerprintTemplateSource,
  readToolchainPins,
  resolveTemplateSourceRevision,
  validateStateShape,
} from "./template-state.mjs";

const TEMPLATE_NAME = "tauri-template";
const TEMPLATE_LIB_NAME = "tauri_template_lib";
const TEMPLATE_STATE_PATH = ".tauri-template.json";

const TEMPLATE_README_INTRO =
  "A deliberately small Tauri 2 + React + TypeScript starting point for desktop-first applications.\n\nThe template keeps the default application self-contained. It does not require sibling repositories, private packages, application-specific domains, updater credentials, or broad native permissions.";
const TEMPLATE_SCOPE =
  "## Scope\n\nThis repository is the reusable application foundation. It is not the place for a sample business product. Feature-rich examples from the older template remain available in Git history and can be extracted into opt-in recipes when they prove broadly useful.";
const TEMPLATE_AGENT_SENTENCE = `\`${TEMPLATE_NAME}\` is a small, reusable Tauri 2 application foundation. Protect the template boundary: changes should improve projects generated from this repository rather than turn the repository into a specific application.`;
const TEMPLATE_DISCIPLINE =
  "## Template discipline\n\nBefore adding a feature to the default template, ask whether nearly every derived application needs it. If not, prefer an opt-in recipe or a focused reusable crate/package.";
const APPLICATION_DISCIPLINE =
  "## Application discipline\n\nUse opt-in recipes or focused crates/packages for cross-cutting native capabilities. Keep application-specific behavior local unless it has demonstrated reuse across projects.";

export function validatePackageName(value) {
  if (!/^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/.test(value) || value.length > 64) {
    throw new Error("--name must be 1-64 lowercase ASCII letters, digits, or internal hyphens");
  }
  return value;
}

export function validateIdentifier(value) {
  if (!/^[A-Za-z0-9.-]+$/.test(value)) {
    throw new Error("--identifier may contain only ASCII letters, digits, hyphens, and periods");
  }

  const segments = value.split(".");
  if (
    segments.length < 2 ||
    segments.some((segment) => !/^[A-Za-z0-9](?:[A-Za-z0-9-]*[A-Za-z0-9])?$/.test(segment))
  ) {
    throw new Error(
      "--identifier must use reverse-domain-like non-empty segments without leading/trailing hyphens",
    );
  }

  return value;
}

export function validateTitle(value) {
  const title = value.trim();
  if (!title) {
    throw new Error("--title must not be empty");
  }
  return title;
}

export function defaultTitle(name) {
  return name
    .split("-")
    .filter(Boolean)
    .map((part) => part[0].toUpperCase() + part.slice(1))
    .join(" ");
}

export function rustLibName(name) {
  return `${name.replaceAll("-", "_")}_lib`;
}

export function parseArgs(argv) {
  const options = { force: false };

  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === "--force") {
      options.force = true;
      continue;
    }

    if (argument === "--name" || argument === "--identifier" || argument === "--title") {
      const value = argv[index + 1];
      if (!value || value.startsWith("--")) {
        throw new Error(`${argument} requires a value`);
      }
      options[argument.slice(2)] = value;
      index += 1;
      continue;
    }

    throw new Error(`Unknown argument: ${argument}`);
  }

  if (!options.name || !options.identifier) {
    throw new Error(
      "usage: bun run init -- --name <app-slug> --identifier <reverse.domain.id> [--title <Product Name>] [--force]",
    );
  }

  options.name = validatePackageName(options.name);
  options.identifier = validateIdentifier(options.identifier);
  options.title = validateTitle(options.title ?? defaultTitle(options.name));
  return options;
}

async function read(root, relativePath) {
  return readFile(path.join(root, relativePath), "utf8");
}

function replaceExactlyOnce(content, search, replacement, file) {
  const first = content.indexOf(search);
  if (first === -1) {
    throw new Error(`Expected template marker not found in ${file}: ${search}`);
  }
  if (content.indexOf(search, first + search.length) !== -1) {
    throw new Error(`Template marker is ambiguous in ${file}: ${search}`);
  }
  return `${content.slice(0, first)}${replacement}${content.slice(first + search.length)}`;
}

function cargoIdentity(cargoToml) {
  const packageMatch = cargoToml.match(/\[package\][\s\S]*?\nname = "([^"]+)"/);
  const libMatch = cargoToml.match(/\[lib\][\s\S]*?\nname = "([^"]+)"/);
  if (!packageMatch || !libMatch) {
    throw new Error("src-tauri/Cargo.toml must declare both [package] and [lib] names");
  }
  return { packageName: packageMatch[1], libName: libMatch[1] };
}

function applicationAgentSentence(name) {
  return `\`${name}\` is an application initialized from \`${TEMPLATE_NAME}\`. Product-specific code belongs in this repository; preserve the core/Tauri/frontend adapter boundaries so reusable logic stays portable.`;
}

function validateTemplateState(state, currentName) {
  validateStateShape(state, TEMPLATE_STATE_PATH);
  if (currentName === TEMPLATE_NAME) {
    if (
      state.kind !== "template" ||
      state.activatedRecipes.length !== 0 ||
      Object.keys(state.recipeConfig).length !== 0
    ) {
      throw new Error(
        `${TEMPLATE_STATE_PATH} must describe an unmodified template before first initialization`,
      );
    }
    return;
  }
  if (state.kind !== "application" || state.application?.name !== currentName) {
    throw new Error(
      `${TEMPLATE_STATE_PATH} application identity must match package.json before an intentional rebrand`,
    );
  }
}

async function commitMutations(root, mutations) {
  const changed = mutations.filter((mutation) => mutation.before !== mutation.after);
  const written = [];

  try {
    for (const mutation of changed) {
      await writeFile(path.join(root, mutation.path), mutation.after, "utf8");
      written.push(mutation);
    }
  } catch (error) {
    const rollbackErrors = [];
    for (const mutation of written.reverse()) {
      try {
        await writeFile(path.join(root, mutation.path), mutation.before, "utf8");
      } catch (rollbackError) {
        rollbackErrors.push(`${mutation.path}: ${String(rollbackError)}`);
      }
    }

    if (rollbackErrors.length > 0) {
      throw new Error(
        `Template initialization failed and rollback was incomplete: ${rollbackErrors.join("; ")}`,
        { cause: error },
      );
    }
    throw error;
  }
}

export async function initializeTemplate(root, options) {
  const name = validatePackageName(options.name);
  const identifier = validateIdentifier(options.identifier);
  const title = validateTitle(options.title ?? defaultTitle(name));
  const libName = rustLibName(name);

  const paths = [
    "package.json",
    "src-tauri/tauri.conf.json",
    "src-tauri/Cargo.toml",
    "src-tauri/src/main.rs",
    "src-tauri/Cargo.lock",
    "bun.lock",
    "index.html",
    ".github/workflows/validate.yml",
    "README.md",
    "AGENTS.md",
    TEMPLATE_STATE_PATH,
  ];
  const originals = Object.fromEntries(
    await Promise.all(
      paths.map(async (relativePath) => [relativePath, await read(root, relativePath)]),
    ),
  );

  const packageJson = JSON.parse(originals["package.json"]);
  if (typeof packageJson.name !== "string") {
    throw new Error("package.json must contain a string package name");
  }
  const currentName = validatePackageName(packageJson.name);
  if (!options.force && currentName !== TEMPLATE_NAME) {
    throw new Error(
      `Refusing to initialize package ${currentName}; expected ${TEMPLATE_NAME}. Use --force only for an intentional rebrand.`,
    );
  }

  const templateState = JSON.parse(originals[TEMPLATE_STATE_PATH]);
  validateTemplateState(templateState, currentName);

  const tauriConfig = JSON.parse(originals["src-tauri/tauri.conf.json"]);
  const currentTitle = validateTitle(String(tauriConfig.productName ?? defaultTitle(currentName)));

  const currentCargoIdentity = cargoIdentity(originals["src-tauri/Cargo.toml"]);
  if (currentCargoIdentity.packageName !== currentName) {
    throw new Error(
      `Repository identity drift: package.json is ${currentName} but Cargo package is ${currentCargoIdentity.packageName}`,
    );
  }

  if (currentName === TEMPLATE_NAME) {
    const [sourceFingerprint, toolchains] = await Promise.all([
      fingerprintTemplateSource(root),
      readToolchainPins(root),
    ]);
    templateState.provenance = {
      sourceRevision: resolveTemplateSourceRevision(root, templateState.templateRepository),
      sourceFingerprint,
      toolchains,
    };
  }

  packageJson.name = name;
  tauriConfig.productName = title;
  tauriConfig.identifier = identifier;
  if (tauriConfig.app?.windows?.[0]) {
    tauriConfig.app.windows[0].title = title;
  }
  templateState.kind = "application";
  templateState.application = { name, identifier, title };

  let cargoToml = replaceExactlyOnce(
    originals["src-tauri/Cargo.toml"],
    `name = "${currentName}"`,
    `name = "${name}"`,
    "src-tauri/Cargo.toml",
  );
  cargoToml = replaceExactlyOnce(
    cargoToml,
    `name = "${currentCargoIdentity.libName}"`,
    `name = "${libName}"`,
    "src-tauri/Cargo.toml",
  );

  const mainRs = replaceExactlyOnce(
    originals["src-tauri/src/main.rs"],
    `${currentCargoIdentity.libName}::run()`,
    `${libName}::run()`,
    "src-tauri/src/main.rs",
  );
  const cargoLock = replaceExactlyOnce(
    originals["src-tauri/Cargo.lock"],
    `name = "${currentName}"\nversion = "0.1.0"`,
    `name = "${name}"\nversion = "0.1.0"`,
    "src-tauri/Cargo.lock",
  );
  const bunLock = replaceExactlyOnce(
    originals["bun.lock"],
    `"name": "${currentName}"`,
    `"name": "${name}"`,
    "bun.lock",
  );
  const indexHtml = replaceExactlyOnce(
    originals["index.html"],
    `<title>${currentTitle}</title>`,
    `<title>${title}</title>`,
    "index.html",
  );
  const workflow = replaceExactlyOnce(
    originals[".github/workflows/validate.yml"],
    `component: ${currentName}`,
    `component: ${name}`,
    ".github/workflows/validate.yml",
  );

  let readme = replaceExactlyOnce(
    originals["README.md"],
    `# ${currentTitle}`,
    `# ${title}`,
    "README.md",
  );
  if (currentName === TEMPLATE_NAME) {
    readme = readme.replace(
      TEMPLATE_README_INTRO,
      `Application initialized from \`${TEMPLATE_NAME}\`, using the same Tauri 2 + React + TypeScript foundation and deterministic validation baseline.`,
    );
    readme = readme.replace(
      TEMPLATE_SCOPE,
      `## Template provenance\n\nThis application was initialized from \`${TEMPLATE_NAME}\`. Machine-readable source revision/fingerprint, toolchain provenance, application identity, and activated recipes live in \`${TEMPLATE_STATE_PATH}\`. Product-specific code belongs here; broadly reusable native capabilities should remain isolated behind the core/Tauri adapter seams.`,
    );
  }

  let agents = originals["AGENTS.md"];
  if (currentName === TEMPLATE_NAME) {
    agents = replaceExactlyOnce(
      agents,
      TEMPLATE_AGENT_SENTENCE,
      applicationAgentSentence(name),
      "AGENTS.md",
    );
    agents = agents.replace(TEMPLATE_DISCIPLINE, APPLICATION_DISCIPLINE);
  } else {
    agents = replaceExactlyOnce(
      agents,
      applicationAgentSentence(currentName),
      applicationAgentSentence(name),
      "AGENTS.md",
    );
  }

  const mutations = [
    {
      path: "package.json",
      before: originals["package.json"],
      after: `${JSON.stringify(packageJson, null, 2)}\n`,
    },
    {
      path: "src-tauri/tauri.conf.json",
      before: originals["src-tauri/tauri.conf.json"],
      after: `${JSON.stringify(tauriConfig, null, 2)}\n`,
    },
    { path: "src-tauri/Cargo.toml", before: originals["src-tauri/Cargo.toml"], after: cargoToml },
    { path: "src-tauri/src/main.rs", before: originals["src-tauri/src/main.rs"], after: mainRs },
    { path: "src-tauri/Cargo.lock", before: originals["src-tauri/Cargo.lock"], after: cargoLock },
    { path: "bun.lock", before: originals["bun.lock"], after: bunLock },
    { path: "index.html", before: originals["index.html"], after: indexHtml },
    {
      path: ".github/workflows/validate.yml",
      before: originals[".github/workflows/validate.yml"],
      after: workflow,
    },
    { path: "README.md", before: originals["README.md"], after: readme },
    { path: "AGENTS.md", before: originals["AGENTS.md"], after: agents },
    {
      path: TEMPLATE_STATE_PATH,
      before: originals[TEMPLATE_STATE_PATH],
      after: `${JSON.stringify(templateState, null, 2)}\n`,
    },
  ];

  await commitMutations(root, mutations);
  return { name, identifier, title, libName };
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const result = await initializeTemplate(process.cwd(), options);
  process.stdout.write(
    `Initialized ${result.name} (${result.identifier}) as ${JSON.stringify(result.title)}.\n`,
  );
}

const invokedPath = process.argv[1] ? pathToFileURL(path.resolve(process.argv[1])).href : null;
if (invokedPath === import.meta.url) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  });
}
