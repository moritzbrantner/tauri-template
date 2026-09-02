import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import App from "../../src/App";

vi.mock("../../src/greet", () => ({
  greet: vi.fn(async (name: string) => `Hello, ${name}!`),
}));

describe("App", () => {
  it("renders the minimal Tauri starter", () => {
    render(<App />);

    expect(
      screen.getByRole("heading", { name: "Small by default, ready to grow." }),
    ).toBeInTheDocument();
    expect(screen.getByText("Ready to build a Tauri 2 app.")).toBeInTheDocument();
  });

  it("demonstrates the typed native command boundary", async () => {
    const user = userEvent.setup();
    render(<App />);

    const input = screen.getByLabelText("Native command smoke test");
    await user.clear(input);
    await user.type(input, "Ada");
    await user.click(screen.getByRole("button", { name: "Call Rust" }));

    expect(await screen.findByText("Hello, Ada!")).toBeInTheDocument();
  });
});
