import { appendFile, readFile, stat } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";

export async function reportNativeSize(root = process.cwd()) {
  const packageJson = JSON.parse(await readFile(path.join(root, "package.json"), "utf8"));
  if (typeof packageJson.name !== "string" || !packageJson.name) {
    throw new Error("package.json must declare the application name");
  }

  const executableName =
    process.platform === "win32" ? `${packageJson.name}.exe` : packageJson.name;
  const executablePath = path.join(root, "src-tauri", "target", "release", executableName);
  const metadata = await stat(executablePath);
  const result = { executable: executableName, bytes: metadata.size };
  const line = `native binary size: ${result.executable} = ${result.bytes} bytes`;
  process.stdout.write(`${line}\n`);

  if (process.env.GITHUB_STEP_SUMMARY) {
    await appendFile(
      process.env.GITHUB_STEP_SUMMARY,
      `### Native binary size\n\n- \`${result.executable}\`: ${result.bytes.toLocaleString("en-US")} bytes\n`,
      "utf8",
    );
  }
  return result;
}

const invokedPath = process.argv[1] ? pathToFileURL(path.resolve(process.argv[1])).href : null;
if (invokedPath === import.meta.url) {
  reportNativeSize().catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  });
}
