import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";

const TEMPLATE_NAME = "tauri-template";
const TEMPLATE_LIB_NAME = "tauri_template_lib";

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

async function write(root, relativePath, content) {
  await writeFile(path.join(root, relativePath), content, "utf8");
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

export async function initializeTemplate(root, options) {
  const name = validatePackageName(options.name);
  const identifier = validateIdentifier(options.identifier);
  const title = validateTitle(options.title ?? defaultTitle(name));
  const libName = rustLibName(name);

  const packageJsonPath = "package.json";
  const packageJson = JSON.parse(await read(root, packageJsonPath));
  if (!options.force && packageJson.name !== TEMPLATE_NAME) {
    throw new Error(
      `Refusing to initialize package ${packageJson.name}; expected ${TEMPLATE_NAME}. Use --force only for an intentional rebrand.`,
    );
  }
  packageJson.name = name;
  await write(root, packageJsonPath, `${JSON.stringify(packageJson, null, 2)}\n`);

  const tauriConfigPath = "src-tauri/tauri.conf.json";
  const tauriConfig = JSON.parse(await read(root, tauriConfigPath));
  tauriConfig.productName = title;
  tauriConfig.identifier = identifier;
  if (tauriConfig.app?.windows?.[0]) {
    tauriConfig.app.windows[0].title = title;
  }
  await write(root, tauriConfigPath, `${JSON.stringify(tauriConfig, null, 2)}\n`);

  const cargoTomlPath = "src-tauri/Cargo.toml";
  let cargoToml = await read(root, cargoTomlPath);
  cargoToml = replaceExactlyOnce(
    cargoToml,
    `name = "${TEMPLATE_NAME}"`,
    `name = "${name}"`,
    cargoTomlPath,
  );
  cargoToml = replaceExactlyOnce(
    cargoToml,
    `name = "${TEMPLATE_LIB_NAME}"`,
    `name = "${libName}"`,
    cargoTomlPath,
  );
  await write(root, cargoTomlPath, cargoToml);

  const mainRsPath = "src-tauri/src/main.rs";
  let mainRs = await read(root, mainRsPath);
  mainRs = replaceExactlyOnce(
    mainRs,
    `${TEMPLATE_LIB_NAME}::run()`,
    `${libName}::run()`,
    mainRsPath,
  );
  await write(root, mainRsPath, mainRs);

  const cargoLockPath = "src-tauri/Cargo.lock";
  let cargoLock = await read(root, cargoLockPath);
  cargoLock = replaceExactlyOnce(
    cargoLock,
    `name = "${TEMPLATE_NAME}"\nversion = "0.1.0"`,
    `name = "${name}"\nversion = "0.1.0"`,
    cargoLockPath,
  );
  await write(root, cargoLockPath, cargoLock);

  const bunLockPath = "bun.lock";
  let bunLock = await read(root, bunLockPath);
  bunLock = replaceExactlyOnce(
    bunLock,
    `"name": "${TEMPLATE_NAME}"`,
    `"name": "${name}"`,
    bunLockPath,
  );
  await write(root, bunLockPath, bunLock);

  const indexPath = "index.html";
  let indexHtml = await read(root, indexPath);
  indexHtml = replaceExactlyOnce(
    indexHtml,
    `<title>${TEMPLATE_NAME}</title>`,
    `<title>${title}</title>`,
    indexPath,
  );
  await write(root, indexPath, indexHtml);

  const workflowPath = ".github/workflows/validate.yml";
  let workflow = await read(root, workflowPath);
  workflow = replaceExactlyOnce(
    workflow,
    `component: ${TEMPLATE_NAME}`,
    `component: ${name}`,
    workflowPath,
  );
  await write(root, workflowPath, workflow);

  const readmePath = "README.md";
  let readme = await read(root, readmePath);
  readme = replaceExactlyOnce(readme, `# ${TEMPLATE_NAME}`, `# ${title}`, readmePath);
  readme = readme.replace(
    "A deliberately small Tauri 2 + React + TypeScript starting point for desktop-first applications.\n\nThe template keeps the default application self-contained. It does not require sibling repositories, private packages, application-specific domains, updater credentials, or broad native permissions.",
    `Application initialized from \`${TEMPLATE_NAME}\`, using the same Tauri 2 + React + TypeScript foundation and deterministic validation baseline.`,
  );
  readme = readme.replace(
    "## Scope\n\nThis repository is the reusable application foundation. It is not the place for a sample business product. Feature-rich examples from the older template remain available in Git history and can be extracted into opt-in recipes when they prove broadly useful.",
    `## Template provenance\n\nThis application was initialized from \`${TEMPLATE_NAME}\`. Product-specific code belongs here; broadly reusable native capabilities should remain isolated behind the core/Tauri adapter seams.`,
  );
  await write(root, readmePath, readme);

  const agentsPath = "AGENTS.md";
  let agents = await read(root, agentsPath);
  agents = replaceExactlyOnce(
    agents,
    `\`${TEMPLATE_NAME}\` is a small, reusable Tauri 2 application foundation. Protect the template boundary: changes should improve projects generated from this repository rather than turn the repository into a specific application.`,
    `\`${name}\` is an application initialized from \`${TEMPLATE_NAME}\`. Product-specific code belongs in this repository; preserve the core/Tauri/frontend adapter boundaries so reusable logic stays portable.`,
    agentsPath,
  );
  agents = agents.replace(
    "## Template discipline\n\nBefore adding a feature to the default template, ask whether nearly every derived application needs it. If not, prefer an opt-in recipe or a focused reusable crate/package.",
    "## Application discipline\n\nUse opt-in recipes or focused crates/packages for cross-cutting native capabilities. Keep application-specific behavior local unless it has demonstrated reuse across projects.",
  );
  await write(root, agentsPath, agents);

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
