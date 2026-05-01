# Project Rules

- Prefer URL-based navigation for application views.
- When state benefits from being shareable, bookmarkable, restorable, or deep-linkable, put it in URL query parameters.
- Keep purely transient or sensitive UI state local instead of encoding it in the URL.
- Use clean code and SOLID principles: keep modules focused on one reason to change, depend on clear contracts, and split files before they become overly long.
