export type AppLocale = "en" | "de";

export type FeatureKey =
  | "workspace.forms"
  | "workspace.table"
  | "workspace.uploads"
  | "workspace.communication"
  | "desktop.nativeBridge"
  | "settings.featureFlags";

export type PageId =
  | "home"
  | "about"
  | "forms"
  | "table"
  | "uploads"
  | "communication";

export type NavigationCategory = "discover" | "workspace";

export type PublicPage = {
  id: PageId;
  slug: string;
  namespace: string;
  featureKey?: FeatureKey;
};

export type PublicNavigationItem = {
  pageId: PageId;
  category: NavigationCategory;
  hotkey: string;
  order: number;
};

export type FeatureFlags = Record<FeatureKey, boolean>;

export const defaultFeatureFlags: FeatureFlags = {
  "workspace.forms": true,
  "workspace.table": true,
  "workspace.uploads": true,
  "workspace.communication": true,
  "desktop.nativeBridge": true,
  "settings.featureFlags": true,
};

export const appManifest = {
  appId: "desktop",
  slug: "desktop",
  displayName: "Tauri Template",
  platform: "tauri",
  packageName: "tauri-template",
  entryWorkspace: ".",
  releaseCadence: "independent",
  sharedPackages: [],
  featureFlags: Object.keys(defaultFeatureFlags) as FeatureKey[],
  deployment: {
    runtime: "tauri",
    output: "src-tauri/target",
  },
  defaultLocaleMetadata: {
    title: "Tauri Template",
    description:
      "Desktop application scaffold with local-first examples, feature gates, and a manifest-driven shell.",
  },
  publicPages: [
    {
      id: "home",
      slug: "",
      namespace: "HomePage",
    },
    {
      id: "about",
      slug: "about",
      namespace: "AboutPage",
    },
    {
      id: "forms",
      slug: "examples/forms",
      namespace: "FormsPage",
      featureKey: "workspace.forms",
    },
    {
      id: "table",
      slug: "examples/table",
      namespace: "TablePage",
      featureKey: "workspace.table",
    },
    {
      id: "uploads",
      slug: "examples/uploads",
      namespace: "UploadsPage",
      featureKey: "workspace.uploads",
    },
    {
      id: "communication",
      slug: "examples/communication",
      namespace: "CommunicationPage",
      featureKey: "workspace.communication",
    },
  ] satisfies PublicPage[],
  publicNavigation: [
    { pageId: "home", category: "discover", hotkey: "h", order: 10 },
    { pageId: "about", category: "discover", hotkey: "a", order: 20 },
    { pageId: "forms", category: "workspace", hotkey: "f", order: 30 },
    { pageId: "table", category: "workspace", hotkey: "t", order: 40 },
    { pageId: "uploads", category: "workspace", hotkey: "u", order: 50 },
    { pageId: "communication", category: "workspace", hotkey: "c", order: 60 },
  ] satisfies PublicNavigationItem[],
} as const;

export const pageById = new Map<PageId, PublicPage>(
  appManifest.publicPages.map((page) => [page.id, page]),
);
