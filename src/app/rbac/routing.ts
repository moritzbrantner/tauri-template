import type { AuthPageId, ViewId } from "./types";
import {
  readQueryState,
  writeQueryState,
  type QueryStateCodec,
} from "../routing/queryState";

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
  return readQueryState(viewQueryCodec);
}

export function createViewUrl(viewId: ViewId) {
  return writeQueryState(viewQueryCodec, viewId, { currentUrl: "/" });
}

export const viewQueryCodec: QueryStateCodec<ViewId> = {
  read(params) {
    const slug = params.get("view");

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
  },
  write(params, viewId) {
    if (viewId === "overview") {
      params.delete("view");
      return;
    }

    params.set("view", viewId);
  },
};
