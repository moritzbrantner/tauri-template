import { beforeEach, describe, expect, it, vi } from "vitest";
import { readQueryState, writeQueryState, type QueryStateCodec } from "../../src/app/routing/queryState";
import { createViewUrl, readViewFromUrl, viewQueryCodec } from "../../src/app/rbac/routing";

describe("query state helpers", () => {
  const tabCodec: QueryStateCodec<"overview" | "details"> = {
    read(params) {
      return params.get("tab") === "details" ? "details" : "overview";
    },
    write(params, value) {
      if (value === "overview") {
        params.delete("tab");
        return;
      }

      params.set("tab", value);
    },
  };

  beforeEach(() => {
    window.history.replaceState({}, "", "/");
    vi.restoreAllMocks();
  });

  it("reads default values when the query parameter is absent", () => {
    expect(readQueryState(tabCodec, "/workspace")).toBe("overview");
  });

  it("falls back safely for invalid values", () => {
    expect(readQueryState(viewQueryCodec, "/?view=unknown")).toBe("overview");
  });

  it("pushes or replaces the current URL", () => {
    const pushSpy = vi.spyOn(window.history, "pushState");
    const replaceSpy = vi.spyOn(window.history, "replaceState");

    writeQueryState(tabCodec, "details", { mode: "push" });
    writeQueryState(tabCodec, "overview", { mode: "replace" });

    expect(pushSpy).toHaveBeenCalledWith({}, "", "/?tab=details");
    expect(replaceSpy).toHaveBeenCalledWith({}, "", "/");
  });

  it("preserves unrelated path and hash while writing", () => {
    expect(
      writeQueryState(tabCodec, "details", {
        currentUrl: "/workspace?filter=open#row-2",
      }),
    ).toBe("/workspace?filter=open&tab=details#row-2");
  });

  it("removes default query params for clean routed URLs", () => {
    expect(writeQueryState(viewQueryCodec, "overview", { currentUrl: "/?view=audit" })).toBe("/");
    expect(createViewUrl("overview")).toBe("/");
    expect(createViewUrl("intake")).toBe("/?view=intake");
  });

  it("keeps existing routed view behavior", () => {
    window.history.replaceState({}, "", "/?view=handoff");
    expect(readViewFromUrl()).toBe("handoff");
  });
});
