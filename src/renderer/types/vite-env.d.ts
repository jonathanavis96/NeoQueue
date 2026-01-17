/// <reference types="vite/client" />

interface ImportMetaEnv {
  /**
   * Enables the experimental Canvas prototype.
   *
   * Values treated as true: "true", "1", "yes".
   */
  readonly VITE_EXPERIMENTAL_CANVAS?: string;

  /**
   * Enables experimental tab-autocomplete suggestions.
   *
   * Values treated as true: "true", "1", "yes".
   */
  readonly VITE_EXPERIMENTAL_AUTOCOMPLETE?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
