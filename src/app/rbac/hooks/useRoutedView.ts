import { startTransition, useEffect, useState } from "react";
import { createViewUrl, readViewFromUrl } from "../routing";
import { viewMeta } from "../catalog";
import type { GroupId, ViewId } from "../types";

export function useRoutedView() {
  const [activeView, setActiveView] = useState<ViewId>(() => readViewFromUrl());
  const [openGroupId, setOpenGroupId] = useState<GroupId | null>(
    () => viewMeta[readViewFromUrl()].groupId,
  );

  useEffect(() => {
    function handlePopState() {
      const nextView = readViewFromUrl();
      setActiveView(nextView);
      setOpenGroupId(viewMeta[nextView].groupId);
    }

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  function navigate(viewId: ViewId) {
    setOpenGroupId(viewMeta[viewId].groupId);
    window.history.pushState({}, "", createViewUrl(viewId));
    startTransition(() => setActiveView(viewId));
  }

  return {
    activeMeta: viewMeta[activeView],
    activeView,
    navigate,
    openGroupId,
    setOpenGroupId,
  };
}

