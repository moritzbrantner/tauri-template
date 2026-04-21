import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import App from "../../src/App";
import { greet } from "../../src/greet";

vi.mock("../../src/greet", () => ({
  greet: vi.fn(),
}));

describe("App", () => {
  const mockedGreet = vi.mocked(greet);

  beforeEach(() => {
    mockedGreet.mockReset();
  });

  it("submits a name and renders the greeting", async () => {
    const user = userEvent.setup();
    mockedGreet.mockResolvedValue("Hello, Ada! You've been greeted from Rust!");

    render(<App />);

    await user.type(screen.getByPlaceholderText("Enter a name..."), "Ada");
    await user.click(screen.getByRole("button", { name: "Greet" }));

    expect(mockedGreet).toHaveBeenCalledWith("Ada");
    expect(
      await screen.findByText("Hello, Ada! You've been greeted from Rust!"),
    ).toBeInTheDocument();
  });
});
