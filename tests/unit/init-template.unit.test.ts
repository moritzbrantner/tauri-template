import { describe, expect, it } from "vitest";
import {
  defaultTitle,
  parseArgs,
  rustLibName,
  validateIdentifier,
  validatePackageName,
} from "../../scripts/init-template.mjs";

describe("template initializer", () => {
  it("derives stable Rust and product names from an app slug", () => {
    expect(rustLibName("media-workbench")).toBe("media_workbench_lib");
    expect(defaultTitle("media-workbench")).toBe("Media Workbench");
  });

  it("accepts a Tauri-compatible reverse-domain identifier", () => {
    expect(validateIdentifier("com.example.media-workbench")).toBe(
      "com.example.media-workbench",
    );
  });

  it("rejects ambiguous package names and identifiers", () => {
    expect(() => validatePackageName("Media_Workbench")).toThrow();
    expect(() => validatePackageName("-media")).toThrow();
    expect(() => validateIdentifier("media-workbench")).toThrow();
    expect(() => validateIdentifier("com.example._media")).toThrow();
  });

  it("parses explicit product identity", () => {
    expect(
      parseArgs([
        "--name",
        "media-workbench",
        "--identifier",
        "com.example.media-workbench",
        "--title",
        "Media Workbench",
      ]),
    ).toEqual({
      force: false,
      name: "media-workbench",
      identifier: "com.example.media-workbench",
      title: "Media Workbench",
    });
  });
});
