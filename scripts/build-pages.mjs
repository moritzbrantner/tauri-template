import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const manifestPath = path.join(root, "portfolio", "examples.json");
const outputRoot = path.join(root, "_site");
const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
const repositoryName = process.env.GITHUB_REPOSITORY?.split("/").at(-1) ?? "tauri-template";
const configuredBasePath = process.env.GITHUB_PAGES_BASE_PATH ?? `/${repositoryName}`;
const basePath = configuredBasePath === "/" ? "" : configuredBasePath.replace(/\/$/, "");

const escapeHtml = (value) =>
  String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");

const exampleUrl = (slug) => `${basePath}/${slug}/`;

function run(command, args, cwd, env = process.env) {
  const result = spawnSync(command, args, { cwd, env, stdio: "inherit" });
  if (result.error) {
    throw result.error;
  }
  if (result.status !== 0) {
    throw new Error(`${command} ${args.join(" ")} failed with exit code ${result.status}`);
  }
}

function validateManifest() {
  if (!manifest.title || !manifest.description || !Array.isArray(manifest.examples)) {
    throw new Error("portfolio/examples.json must contain title, description, and an examples array");
  }

  const slugs = new Set();
  for (const example of manifest.examples) {
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(example.slug ?? "")) {
      throw new Error(`Invalid example slug: ${example.slug}`);
    }
    if (slugs.has(example.slug)) {
      throw new Error(`Duplicate example slug: ${example.slug}`);
    }
    slugs.add(example.slug);

    if (!example.name || !example.description || !example.category || !example.status || !example.runtime) {
      throw new Error(`Example ${example.slug} is missing required portfolio metadata`);
    }
    if (!example.source) {
      continue;
    }

    const sourceDirectory = path.resolve(root, example.source);
    const relativeSource = path.relative(root, sourceDirectory);
    if (relativeSource.startsWith("..") || path.isAbsolute(relativeSource)) {
      throw new Error(`Example ${example.slug} source must stay inside the repository`);
    }
    for (const requiredFile of ["package.json", "bun.lock", "vite.config.ts"]) {
      if (!fs.existsSync(path.join(sourceDirectory, requiredFile))) {
        throw new Error(`Example ${example.slug} source is missing ${requiredFile}`);
      }
    }
  }
}

function pageShell({ title, description, body }) {
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <meta name="color-scheme" content="light dark" />
  <meta name="description" content="${escapeHtml(description)}" />
  <title>${escapeHtml(title)}</title>
  <style>
    :root { color-scheme: light dark; font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; }
    * { box-sizing: border-box; }
    body { margin: 0; min-height: 100vh; background: Canvas; color: CanvasText; }
    main { width: min(1080px, calc(100% - 32px)); margin: 0 auto; padding: 64px 0 80px; }
    .eyebrow { margin: 0 0 12px; font-size: 0.78rem; font-weight: 700; letter-spacing: 0.12em; text-transform: uppercase; opacity: 0.6; }
    h1 { max-width: 820px; margin: 0; font-size: clamp(2.35rem, 7vw, 5.2rem); line-height: 0.96; letter-spacing: -0.055em; }
    .lede { max-width: 760px; margin: 24px 0 0; font-size: clamp(1rem, 2.4vw, 1.22rem); line-height: 1.65; opacity: 0.72; }
    .notice { max-width: 760px; margin: 32px 0 0; padding: 18px 20px; border-left: 2px solid color-mix(in srgb, CanvasText 30%, transparent); line-height: 1.55; opacity: 0.72; }
    .section-title { margin: 46px 0 0; font-size: 0.82rem; font-weight: 800; letter-spacing: 0.12em; text-transform: uppercase; opacity: 0.58; }
    .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(270px, 1fr)); gap: 16px; margin-top: 14px; }
    .card { min-height: 230px; display: flex; flex-direction: column; justify-content: space-between; gap: 28px; border: 1px solid color-mix(in srgb, CanvasText 14%, transparent); border-radius: 24px; padding: 24px; color: inherit; text-decoration: none; background: color-mix(in srgb, Canvas 96%, CanvasText 4%); transition: transform 150ms ease, border-color 150ms ease; }
    .card:hover { transform: translateY(-2px); border-color: color-mix(in srgb, CanvasText 32%, transparent); }
    .card h2 { margin: 8px 0; font-size: 1.4rem; letter-spacing: -0.025em; }
    .card p { margin: 0; line-height: 1.55; opacity: 0.68; }
    .meta { display: grid; gap: 8px; font-size: 0.78rem; }
    .runtime { opacity: 0.58; }
    .cta { font-weight: 700; }
    .placeholder { max-width: 720px; margin-top: 48px; padding: 28px; border: 1px solid color-mix(in srgb, CanvasText 14%, transparent); border-radius: 24px; background: color-mix(in srgb, Canvas 96%, CanvasText 4%); }
    .back { display: inline-block; margin-top: 24px; color: inherit; font-weight: 700; }
    @media (max-width: 560px) { main { padding-top: 40px; } .card { min-height: 210px; } }
  </style>
</head>
<body>
  <main>${body}</main>
</body>
</html>`;
}

function renderDashboard() {
  const cards = manifest.examples
    .map(
      (example) => `<a class="card" href="${escapeHtml(exampleUrl(example.slug))}">
        <div>
          <div class="eyebrow">${escapeHtml(example.category)} · ${escapeHtml(example.status)}</div>
          <h2>${escapeHtml(example.name)}</h2>
          <p>${escapeHtml(example.description)}</p>
        </div>
        <div class="meta"><span class="runtime">${escapeHtml(example.runtime)}</span><span class="cta">Open preview →</span></div>
      </a>`,
    )
    .join("\n");

  return pageShell({
    title: manifest.title,
    description: manifest.description,
    body: `<p class="eyebrow">Tauri desktop examples</p>
      <h1>${escapeHtml(manifest.title)}</h1>
      <p class="lede">${escapeHtml(manifest.description)}</p>
      <p class="notice">GitHub Pages hosts browser-rendered shells only. Native commands, OS capabilities, and domain truth remain in Tauri and Rust; previews must fail clearly rather than replacing native behavior with JavaScript.</p>
      <p class="section-title">Examples</p>
      <section class="grid" aria-label="Tauri example applications">${cards}</section>`,
  });
}

function renderPlaceholder(example) {
  return pageShell({
    title: `${example.name} · ${manifest.title}`,
    description: example.description,
    body: `<p class="eyebrow">${escapeHtml(example.category)} · ${escapeHtml(example.status)}</p>
      <h1>${escapeHtml(example.name)}</h1>
      <p class="lede">${escapeHtml(example.description)}</p>
      <div class="placeholder"><p>This stable route is reserved for a browser preview. Add a repository-local source directory to <code>portfolio/examples.json</code> when the example becomes buildable.</p></div>
      <a class="back" href="${escapeHtml(`${basePath}/`)}">← All examples</a>`,
  });
}

function publishExample(example) {
  const targetDirectory = path.join(outputRoot, example.slug);
  fs.rmSync(targetDirectory, { recursive: true, force: true });
  fs.mkdirSync(targetDirectory, { recursive: true });

  if (!example.source) {
    fs.writeFileSync(path.join(targetDirectory, "index.html"), renderPlaceholder(example));
    return;
  }

  const sourceDirectory = path.resolve(root, example.source);
  run("bun", ["install", "--frozen-lockfile"], sourceDirectory);
  run("bun", ["run", "build"], sourceDirectory, {
    ...process.env,
    TAURI_TEMPLATE_PAGES_BASE_PATH: exampleUrl(example.slug),
  });

  const distDirectory = path.join(sourceDirectory, "dist");
  if (!fs.existsSync(path.join(distDirectory, "index.html"))) {
    throw new Error(`Example ${example.slug} build did not produce dist/index.html`);
  }
  fs.cpSync(distDirectory, targetDirectory, { recursive: true });
}

validateManifest();
fs.rmSync(outputRoot, { recursive: true, force: true });
fs.mkdirSync(outputRoot, { recursive: true });
fs.writeFileSync(path.join(outputRoot, "index.html"), renderDashboard());
fs.writeFileSync(path.join(outputRoot, ".nojekyll"), "");
fs.copyFileSync(manifestPath, path.join(outputRoot, "examples.json"));

for (const example of manifest.examples) {
  publishExample(example);
}

console.log(`Built ${manifest.examples.length} Pages routes in ${outputRoot}`);
