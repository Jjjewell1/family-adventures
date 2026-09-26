declare global {
  namespace App {
    interface Error {
      message: string;
    }
    interface Locals {}
    interface PageData {}
    // Shallow-routing state: lightboxes/modals push a history entry so the
    // browser back button closes them instead of leaving the page
    interface PageState {
      lightbox?: boolean;
      tagging?: boolean;
    }
    interface Platform {}
  }

  interface ImportMetaEnv {
    /** Commit and build time injected by the build-stamp plugin in vite.config.ts. */
    readonly BUILD_COMMIT: string;
    readonly BUILD_AT: string;
  }
}

export {};
