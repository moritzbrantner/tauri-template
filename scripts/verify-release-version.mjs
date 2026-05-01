import { readFileSync } from "node:fs";
import path from "node:path";

const repoRoot = process.cwd();
const tagArg = process.argv[2];

if (!tagArg) {
  console.error("Expected a tag argument such as v0.1.0.");
  process.exit(1);
}

const normalizedTag = tagArg.replace(/^refs\/tags\//, "");

if (!/^v\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?(?:\+[0-9A-Za-z.-]+)?$/.test(normalizedTag)) {
  console.error(
    `Release tag "${normalizedTag}" must match v<major>.<minor>.<patch> with optional prerelease or build metadata.`,
  );
  process.exit(1);
}

const expectedVersion = normalizedTag.slice(1);
const packageJson = JSON.parse(readFileSync(path.join(repoRoot, "package.json"), "utf8"));
const tauriConfig = JSON.parse(readFileSync(path.join(repoRoot, "src-tauri/tauri.conf.json"), "utf8"));
const cargoToml = readFileSync(path.join(repoRoot, "src-tauri/Cargo.toml"), "utf8");

const cargoVersion = readCargoPackageVersion(cargoToml);

const mismatches = [
  compareVersion("package.json", packageJson.version, expectedVersion),
  compareVersion("src-tauri/tauri.conf.json", tauriConfig.version, expectedVersion),
  compareVersion("src-tauri/Cargo.toml", cargoVersion, expectedVersion),
].filter(Boolean);

if (mismatches.length > 0) {
  console.error(`Release version check failed for tag ${normalizedTag}:`);
  for (const mismatch of mismatches) {
    console.error(`- ${mismatch}`);
  }
  process.exit(1);
}

console.log(
  `Release version check passed: ${normalizedTag} matches package.json, src-tauri/tauri.conf.json, and src-tauri/Cargo.toml.`,
);

function compareVersion(label, actualVersion, expectedVersion) {
  if (actualVersion === expectedVersion) {
    return null;
  }

  return `${label} has version ${actualVersion}, expected ${expectedVersion}`;
}

function readCargoPackageVersion(cargoTomlContents) {
  const lines = cargoTomlContents.split(/\r?\n/);
  let insidePackageSection = false;

  for (const line of lines) {
    const trimmed = line.trim();

    if (trimmed.startsWith("[") && trimmed.endsWith("]")) {
      insidePackageSection = trimmed === "[package]";
      continue;
    }

    if (!insidePackageSection) {
      continue;
    }

    const match = trimmed.match(/^version\s*=\s*"([^"]+)"$/);
    if (match) {
      return match[1];
    }
  }

  throw new Error("Could not find [package].version in src-tauri/Cargo.toml.");
}
