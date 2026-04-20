import type { AppLocale, PageId } from "./manifest";

export type Messages = (typeof messages)[AppLocale];

export const messages = {
  en: {
    app: {
      localeName: "English",
      navigation: "Navigation",
      discover: "Discover",
      workspace: "Workspace",
      settings: "Settings",
      theme: "Theme",
      light: "Light",
      dark: "Dark",
      language: "Language",
      features: "Features",
      enabled: "Enabled",
      disabled: "Disabled",
      nativeStatus: "Native bridge",
      browserPreview: "Browser preview",
    },
    pages: {
      home: "Home",
      about: "About",
      forms: "Forms",
      table: "Table",
      uploads: "Uploads",
      communication: "Communication",
    } satisfies Record<PageId, string>,
    home: {
      eyebrow: "Desktop app-pack scaffold",
      title: "Manifest-driven Tauri starter for local-first product work.",
      description:
        "This template mirrors the Next scaffold's shape where it fits desktop apps: explicit app metadata, feature gates, localized messages, shortcut-aware navigation, and example accelerators.",
      primary: "Open form example",
      secondary: "View data table",
      foundationTitle: "App manifest",
      foundationDescription:
        "Pages, navigation, feature flags, platform metadata, and release assumptions live in one typed place.",
      interactionTitle: "Desktop shell",
      interactionDescription:
        "Hash routing, hotkeys, language, theme, and feature settings are handled locally without a server dependency.",
      deliveryTitle: "Example accelerators",
      deliveryDescription:
        "Forms, uploads, tables, and notifications are present as practical starting points for common product flows.",
    },
    about: {
      title: "Template foundations",
      description:
        "The scaffold keeps the frontend portable while still leaving room for Tauri commands and native capabilities.",
      metadata: "Repository metadata",
      platform: "Platform",
      runtime: "Runtime",
      package: "Package",
      cadence: "Release cadence",
      bridge: "Native bridge check",
      bridgeAction: "Ping Tauri command",
    },
    forms: {
      title: "Employee profile form",
      description:
        "A small, validated form that can be reused as a starting point for local settings, account, or workspace data entry.",
      save: "Save profile",
      reset: "Reset",
      saved: "Profile saved locally.",
      required: "This field is required.",
      emailInvalid: "Enter a valid email address.",
      salaryInvalid: "Salary must be 0 or higher.",
    },
    table: {
      title: "Local REST-style data table",
      description:
        "Sortable and filterable mock data without a backend, shaped like a client consuming an app-pack example API.",
      search: "Search employees",
      showing: "Showing",
      of: "of",
      activeOnly: "Active only",
      allTeams: "All teams",
    },
    uploads: {
      title: "Upload playground",
      description:
        "Drop files or choose them from disk. Files stay in memory, which keeps the template safe for desktop experiments.",
      choose: "Choose files",
      drop: "Drop files here",
      clear: "Clear list",
      empty: "No files selected.",
    },
    communication: {
      title: "Notification center",
      description:
        "A local message feed and outbox model for in-app notifications, announcements, and queued work feedback.",
      compose: "Compose announcement",
      send: "Queue message",
      markAll: "Mark all read",
      queued: "Queued",
      inbox: "Inbox",
      messagePlaceholder: "Write a short update...",
    },
  },
  de: {
    app: {
      localeName: "Deutsch",
      navigation: "Navigation",
      discover: "Entdecken",
      workspace: "Arbeitsbereich",
      settings: "Einstellungen",
      theme: "Darstellung",
      light: "Hell",
      dark: "Dunkel",
      language: "Sprache",
      features: "Funktionen",
      enabled: "Aktiv",
      disabled: "Inaktiv",
      nativeStatus: "Native Bridge",
      browserPreview: "Browser-Vorschau",
    },
    pages: {
      home: "Start",
      about: "Info",
      forms: "Formulare",
      table: "Tabelle",
      uploads: "Uploads",
      communication: "Kommunikation",
    } satisfies Record<PageId, string>,
    home: {
      eyebrow: "Desktop App-Pack Scaffold",
      title: "Manifest-gesteuerter Tauri-Starter fuer lokale Produktarbeit.",
      description:
        "Dieses Template uebernimmt die passende Struktur des Next-Scaffolds: App-Metadaten, Feature-Gates, lokalisierte Texte, Navigation mit Shortcuts und Beispielmodule.",
      primary: "Formular oeffnen",
      secondary: "Datentabelle ansehen",
      foundationTitle: "App-Manifest",
      foundationDescription:
        "Seiten, Navigation, Feature Flags, Plattformdaten und Release-Annahmen liegen typisiert an einer Stelle.",
      interactionTitle: "Desktop Shell",
      interactionDescription:
        "Hash-Routing, Hotkeys, Sprache, Theme und Feature-Einstellungen laufen lokal ohne Server-Abhaengigkeit.",
      deliveryTitle: "Beispielmodule",
      deliveryDescription:
        "Formulare, Uploads, Tabellen und Benachrichtigungen dienen als Startpunkte fuer typische Produktablaeufe.",
    },
    about: {
      title: "Template-Grundlagen",
      description:
        "Das Scaffold haelt das Frontend portabel und laesst gleichzeitig Raum fuer Tauri Commands und native Funktionen.",
      metadata: "Repository-Metadaten",
      platform: "Plattform",
      runtime: "Runtime",
      package: "Package",
      cadence: "Release-Rhythmus",
      bridge: "Native-Bridge-Test",
      bridgeAction: "Tauri Command pruefen",
    },
    forms: {
      title: "Mitarbeiterprofil",
      description:
        "Ein kleines validiertes Formular als Ausgangspunkt fuer lokale Einstellungen, Account- oder Workspace-Daten.",
      save: "Profil speichern",
      reset: "Zuruecksetzen",
      saved: "Profil lokal gespeichert.",
      required: "Dieses Feld ist erforderlich.",
      emailInvalid: "Bitte eine gueltige E-Mail-Adresse eingeben.",
      salaryInvalid: "Gehalt muss mindestens 0 sein.",
    },
    table: {
      title: "Lokale REST-artige Datentabelle",
      description:
        "Sortierbare und filterbare Mock-Daten ohne Backend, geformt wie ein Client fuer eine App-Pack-Beispiel-API.",
      search: "Mitarbeiter suchen",
      showing: "Zeige",
      of: "von",
      activeOnly: "Nur aktive",
      allTeams: "Alle Teams",
    },
    uploads: {
      title: "Upload-Playground",
      description:
        "Dateien ablegen oder auswaehlen. Sie bleiben im Speicher, damit Desktop-Experimente sicher bleiben.",
      choose: "Dateien waehlen",
      drop: "Dateien hier ablegen",
      clear: "Liste leeren",
      empty: "Keine Dateien ausgewaehlt.",
    },
    communication: {
      title: "Benachrichtigungen",
      description:
        "Ein lokaler Feed mit Outbox-Modell fuer App-Hinweise, Ankuendigungen und Rueckmeldungen aus Jobs.",
      compose: "Ankuendigung schreiben",
      send: "Nachricht einreihen",
      markAll: "Alle als gelesen markieren",
      queued: "Eingereiht",
      inbox: "Eingang",
      messagePlaceholder: "Kurzes Update schreiben...",
    },
  },
} as const;
