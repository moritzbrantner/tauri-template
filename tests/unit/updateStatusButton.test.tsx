import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { UpdateStatusButton } from "../../src/app/updates/UpdateStatusButton";

const mocks = vi.hoisted(() => ({
  check: vi.fn(),
  getVersion: vi.fn(),
  restartApp: vi.fn(),
}));

vi.mock("@tauri-apps/plugin-updater", () => ({
  check: mocks.check,
}));

vi.mock("@tauri-apps/api/app", () => ({
  getVersion: mocks.getVersion,
}));

vi.mock("../../src/app/backend/updates", () => ({
  restartApp: mocks.restartApp,
}));

describe("UpdateStatusButton", () => {
  beforeEach(() => {
    mocks.check.mockReset();
    mocks.getVersion.mockReset();
    mocks.restartApp.mockReset();
  });

  it("shows current version when no update is available", async () => {
    mocks.check.mockResolvedValue(null);
    mocks.getVersion.mockResolvedValue("0.1.0");
    const user = userEvent.setup();

    render(<UpdateStatusButton />);
    await user.click(screen.getByRole("button", { name: "Check for updates" }));

    expect(await screen.findByText("Current 0.1.0")).toBeInTheDocument();
  });

  it("installs an available update", async () => {
    const downloadAndInstall = vi.fn(async (handler?: (event: unknown) => void) => {
      handler?.({ event: "Started", data: { contentLength: 100 } });
      handler?.({ event: "Progress", data: { chunkLength: 100 } });
      handler?.({ event: "Finished" });
    });
    mocks.check.mockResolvedValue({ version: "0.2.0", downloadAndInstall });
    mocks.getVersion.mockResolvedValue("0.1.0");
    const user = userEvent.setup();

    render(<UpdateStatusButton />);
    await user.click(screen.getByRole("button", { name: "Check for updates" }));
    await user.click(await screen.findByRole("button", { name: "Install 0.2.0" }));

    expect(downloadAndInstall).toHaveBeenCalled();
    expect(await screen.findByRole("button", { name: "Restart" })).toBeInTheDocument();
  });

  it("surfaces install failures", async () => {
    mocks.check.mockResolvedValue({
      version: "0.2.0",
      downloadAndInstall: vi.fn().mockRejectedValue(new Error("network failed")),
    });
    mocks.getVersion.mockResolvedValue("0.1.0");
    const user = userEvent.setup();

    render(<UpdateStatusButton />);
    await user.click(screen.getByRole("button", { name: "Check for updates" }));
    await user.click(await screen.findByRole("button", { name: "Install 0.2.0" }));

    expect(await screen.findByText("Update error")).toBeInTheDocument();
  });

  it("invokes restart after installation", async () => {
    mocks.check.mockResolvedValue({
      version: "0.2.0",
      downloadAndInstall: vi.fn().mockResolvedValue(undefined),
    });
    mocks.getVersion.mockResolvedValue("0.1.0");
    const user = userEvent.setup();

    render(<UpdateStatusButton />);
    await user.click(screen.getByRole("button", { name: "Check for updates" }));
    await user.click(await screen.findByRole("button", { name: "Install 0.2.0" }));
    await user.click(await screen.findByRole("button", { name: "Restart" }));

    await waitFor(() => expect(mocks.restartApp).toHaveBeenCalled());
  });
});
