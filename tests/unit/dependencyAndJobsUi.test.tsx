import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { SystemDependencyCard } from "../../src/app/dependencies/SystemDependencyCard";
import { DemoTaskPanel } from "../../src/app/jobs/DemoTaskPanel";

const mocks = vi.hoisted(() => ({
  cancelJob: vi.fn(),
  checkSystemDependencies: vi.fn(),
  clearFinishedJobs: vi.fn(),
  listenToJobProgress: vi.fn(),
  listJobs: vi.fn(),
  startDemoTask: vi.fn(),
}));

vi.mock("../../src/app/backend/dependencies", () => ({
  checkSystemDependencies: mocks.checkSystemDependencies,
}));

vi.mock("../../src/app/backend/jobs", () => ({
  cancelJob: mocks.cancelJob,
  clearFinishedJobs: mocks.clearFinishedJobs,
  listenToJobProgress: mocks.listenToJobProgress,
  listJobs: mocks.listJobs,
  startDemoTask: mocks.startDemoTask,
}));

describe("desktop primitive UI", () => {
  beforeEach(() => {
    mocks.checkSystemDependencies.mockReset();
    mocks.startDemoTask.mockReset();
    mocks.listJobs.mockReset();
    mocks.cancelJob.mockReset();
    mocks.clearFinishedJobs.mockReset();
    mocks.listenToJobProgress.mockReset();
    mocks.listenToJobProgress.mockResolvedValue(vi.fn());
  });

  it("renders dependency reports and refreshes them", async () => {
    mocks.checkSystemDependencies.mockResolvedValue({
      dependencies: [
        {
          name: "git",
          required: false,
          available: true,
          version: "git version 2.43.0",
          resolvedPath: "/usr/bin/git",
        },
      ],
    });
    const user = userEvent.setup();

    render(<SystemDependencyCard />);

    expect(await screen.findByText("git")).toBeInTheDocument();
    expect(screen.getByText("git version 2.43.0")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Refresh" }));

    await waitFor(() => expect(mocks.checkSystemDependencies).toHaveBeenCalledTimes(2));
  });

  it("starts demo tasks and applies progress events", async () => {
    let progressHandler:
      | ((event: {
          jobId: string;
          label: string;
          status: "running";
          progress: number;
          message: string;
          updatedAt: string;
        }) => void)
      | undefined;
    mocks.listJobs.mockResolvedValue([]);
    mocks.startDemoTask.mockResolvedValue({
      id: "job-1",
      kind: "demo",
      label: "Desktop primitive demo",
      status: "running",
      progress: 0,
      createdAt: "now",
      updatedAt: "now",
    });
    mocks.listenToJobProgress.mockImplementation(async (handler) => {
      progressHandler = handler;
      return vi.fn();
    });
    const user = userEvent.setup();

    render(<DemoTaskPanel />);
    await user.click(await screen.findByRole("button", { name: "Start task" }));
    progressHandler?.({
      jobId: "job-1",
      label: "Desktop primitive demo",
      status: "running",
      progress: 0.5,
      message: "Processing 1/2",
      updatedAt: "later",
    });

    expect(mocks.startDemoTask).toHaveBeenCalledWith("Desktop primitive demo", 8);
    expect(await screen.findByText("Processing 1/2")).toBeInTheDocument();
  });
});
