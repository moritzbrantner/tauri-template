import type { AuthPageId, ViewId } from "./types";

export function readAuthPageFromPath(): AuthPageId | null {
  const slug = window.location.pathname.replace(/^\/+/, "").replace(/\/+$/, "");

  switch (slug) {
    case "login":
    case "register":
    case "password-forgotten":
      return slug;
    default:
      return null;
  }
}

export function readViewFromUrl(): ViewId {
  const slug = new URLSearchParams(window.location.search).get("view");

  switch (slug) {
    case "intake":
    case "access":
    case "approvals":
    case "handoff":
    case "audit":
      return slug;
    default:
      return "overview";
  }
}

export function createViewUrl(viewId: ViewId) {
  return viewId === "overview" ? "/" : `/?view=${viewId}`;
}

