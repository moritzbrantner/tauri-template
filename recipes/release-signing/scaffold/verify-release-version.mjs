import { appendFileSync, readFileSync } from "node:fs";

function fail(message) {
  throw new Error(message);
}

function requiredEnvironment(name) {
  const value = process.env[name]?.trim();
  if (!value) {
    fail(`release signing requires GitHub secret/environment ${name}`);
  }
  return value;
}

function packageVersion(cargoToml) {
  const match = cargoToml.match(/\[package\][\s\S]*?\nversion = "([^"]+)"/);
  if (!match) fail("src-tauri/Cargo.toml does not declare the root package version");
  return match[1];
}

function writeOutput(name, value) {
  if (process.env.GITHUB_OUTPUT) {
    appendFileSync(process.env.GITHUB_OUTPUT, `${name}=${value}\n`, "utf8");
  }
}

const tag = process.argv[2];
if (!tag || !/^v[0-9]+\.[0-9]+\.[0-9]+(?:-[0-9A-Za-z.-]+)?$/.test(tag)) {
  fail("release tag must use v<major>.<minor>.<patch> with an optional semver prerelease suffix");
}
const version = tag.slice(1);

const packageJson = JSON.parse(readFileSync("package.json", "utf8"));
const cargoToml = readFileSync("src-tauri/Cargo.toml", "utf8");
const tauriConfig = JSON.parse(readFileSync("src-tauri/tauri.conf.json", "utf8"));
const state = JSON.parse(readFileSync(".tauri-template.json", "utf8"));

if (state.kind !== "application" || state.application?.name !== packageJson.name) {
  fail("release workflow may run only for an initialized application with coherent template state");
}
for (const [owner, actual] of [
  ["package.json", packageJson.version],
  ["src-tauri/Cargo.toml", packageVersion(cargoToml)],
  ["src-tauri/tauri.conf.json", tauriConfig.version],
]) {
  if (actual !== version) {
    fail(`${owner} version ${JSON.stringify(actual)} does not match release tag ${tag}`);
  }
}

const updaterEnabled = state.activatedRecipes.includes("updater");
if (updaterEnabled) {
  requiredEnvironment("TAURI_SIGNING_PRIVATE_KEY");
  if (tauriConfig.bundle?.createUpdaterArtifacts !== true) {
    fail("updater recipe is active but bundle.createUpdaterArtifacts is not true");
  }
  const updater = tauriConfig.plugins?.updater;
  if (
    !updater ||
    typeof updater.pubkey !== "string" ||
    !updater.pubkey.trim() ||
    !Array.isArray(updater.endpoints) ||
    updater.endpoints.length === 0 ||
    updater.endpoints.some((endpoint) => typeof endpoint !== "string" || !endpoint.startsWith("https://"))
  ) {
    fail("updater recipe is active but app-owned HTTPS updater pubkey/endpoints are incomplete");
  }
}

if (process.env.RUNNER_OS === "macOS") {
  requiredEnvironment("APPLE_CERTIFICATE");
  requiredEnvironment("APPLE_CERTIFICATE_PASSWORD");
}

if (process.env.RUNNER_OS === "Windows") {
  requiredEnvironment("WINDOWS_CERTIFICATE");
  requiredEnvironment("WINDOWS_CERTIFICATE_PASSWORD");
  const windows = tauriConfig.bundle?.windows;
  if (
    !windows ||
    typeof windows.certificateThumbprint !== "string" ||
    !windows.certificateThumbprint.trim() ||
    typeof windows.digestAlgorithm !== "string" ||
    !windows.digestAlgorithm.trim() ||
    typeof windows.timestampUrl !== "string" ||
    !/^https:\/\//.test(windows.timestampUrl)
  ) {
    fail("Windows release signing requires app-owned certificateThumbprint, digestAlgorithm, and HTTPS timestampUrl in Tauri config");
  }
}

writeOutput("version", version);
writeOutput("updater_enabled", updaterEnabled ? "true" : "false");
process.stdout.write(`release preflight: ${tag}; updater=${updaterEnabled ? "enabled" : "disabled"}\n`);
