import { invoke } from "@tauri-apps/api/core";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { greet } from "../../src/greet";

vi.mock("@tauri-apps/api/core", () => ({
  invoke: vi.fn(),
}));

describe("greet", () => {
  const mockedInvoke = vi.mocked(invoke);

  beforeEach(() => {
    mockedInvoke.mockReset();
  });

  it("invokes the Tauri greet command with the provided name", async () => {
    mockedInvoke.mockResolvedValue("Hello, Ada! You've been greeted from Rust!");

    await expect(greet("Ada")).resolves.toBe(
      "Hello, Ada! You've been greeted from Rust!",
    );

    expect(mockedInvoke).toHaveBeenCalledWith("greet", { name: "Ada" });
  });
});
