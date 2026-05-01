import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@moritzbrantner/ui", async () => {
  const React = await import("react");
  const Wrapper =
    (Tag: keyof React.JSX.IntrinsicElements) =>
    ({ children, ...props }: Record<string, unknown>) =>
      React.createElement(Tag, props, children);

  return {
    Alert: Wrapper("div"),
    AlertDescription: Wrapper("div"),
    AlertTitle: Wrapper("strong"),
    Badge: Wrapper("span"),
    Button: ({
      children,
      onClick,
      type = "button",
      ...props
    }: Record<string, unknown>) =>
      React.createElement("button", { type, onClick, ...props }, children),
    Card: Wrapper("section"),
    CardAction: Wrapper("div"),
    CardContent: Wrapper("div"),
    CardDescription: Wrapper("p"),
    CardFooter: Wrapper("div"),
    CardHeader: Wrapper("header"),
    CardTitle: Wrapper("h2"),
    Input: ({
      onChange,
      ...props
    }: Record<string, unknown>) => React.createElement("input", { onChange, ...props }),
    PlatformNavbar: ({
      brand,
      groups,
      actions,
      onNavigate,
    }: Record<string, unknown>) =>
      React.createElement(
        "nav",
        {},
        brand,
        actions,
        React.createElement(
          "div",
          {},
          ...(Array.isArray(groups)
            ? groups.flatMap((group) =>
                Array.isArray(group.items)
                  ? group.items.map((item: Record<string, unknown>) =>
                      React.createElement(
                        "button",
                        {
                          key: String(item.id),
                          type: "button",
                          onClick: () => onNavigate?.(item),
                        },
                        item.label,
                      ),
                    )
                  : [],
              )
            : []),
        ),
      ),
    Progress: ({ value }: Record<string, unknown>) =>
      React.createElement("progress", { max: 100, value: Number(value) || 0 }),
    StudioTheme: Wrapper("div"),
    Textarea: ({
      children,
      onChange,
      ...props
    }: Record<string, unknown>) =>
      React.createElement("textarea", { onChange, ...props }, children),
  };
});

import App from "../../src/App";

describe("App", () => {
  beforeEach(() => {
    window.location.hash = "";
  });

  it("renders the RBAC shell and supports approving an operator", async () => {
    const user = userEvent.setup();

    render(<App />);

    expect(
      screen.getByRole("heading", { name: "RBAC-ready operator workspace" }),
    ).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Open approval board" }));

    expect(
      await screen.findByRole("heading", { name: "Approval board" }),
    ).toBeInTheDocument();

    await user.type(screen.getByLabelText("Search reviewers"), "Ada");
    await user.click(screen.getByRole("button", { name: /Review Ada Lovelace/i }));
    await user.click(screen.getByRole("button", { name: "Approve operator" }));

    expect(
      await screen.findByText(
        "Ada Lovelace was approved as the accountable launch operator.",
      ),
    ).toBeInTheDocument();
  });

  it("locks read access when the current role lacks the required permission", async () => {
    const user = userEvent.setup();

    render(<App />);

    await user.click(screen.getAllByRole("button", { name: "Requester" })[0]);
    await user.click(screen.getAllByRole("button", { name: "Release handoff" })[0]);

    expect(await screen.findByText("Release handoff is locked")).toBeInTheDocument();
    expect(
      screen.getByText(
        "The current persona cannot load this screen because the server would require artifacts.read.",
      ),
    ).toBeInTheDocument();
  });
});
