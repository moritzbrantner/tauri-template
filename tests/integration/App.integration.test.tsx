import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { invoke } from "@tauri-apps/api/core";
import { beforeEach, describe, expect, it, vi } from "vitest";
import App from "../../src/App";

vi.mock("@tauri-apps/api/core", () => ({
  invoke: vi.fn(),
  isTauri: vi.fn(() => false),
}));

describe("App", () => {
  const mockedInvoke = vi.mocked(invoke);

  beforeEach(() => {
    window.localStorage.clear();
    window.location.hash = "";
    mockedInvoke.mockReset();
    mockedInvoke.mockImplementation(async (command, args) => {
      if (command === "load_settings") {
        return {
          theme: "system",
          accentColor: "#2f6fed",
          autoSave: true,
          compactMode: false,
          defaultProjectName: "Untitled project",
        };
      }

      if (command === "save_settings") {
        return (args as { settings: unknown }).settings;
      }

      throw new Error(`Unhandled command: ${command}`);
    });
  });

  it("renders the manifest shell and navigates to an example page", async () => {
    const user = userEvent.setup();

    render(<App />);

    expect(
      screen.getByRole("heading", {
        name: "Manifest-driven Tauri starter for local-first product work.",
      }),
    ).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /View data table/ }));

    expect(
      await screen.findByRole("heading", {
        name: "Local REST-style data table",
      }),
    ).toBeInTheDocument();

    await user.type(screen.getByLabelText("Search employees"), "Ada");

    expect(screen.getByText("Ada")).toBeInTheDocument();
  });
});
