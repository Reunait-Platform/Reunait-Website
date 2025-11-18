/**
 * Type augmentation for Intl.DisplayNames API
 * 
 * Intl.DisplayNames is a modern browser API that may not be fully typed
 * in all TypeScript versions. This declaration merges with the global Intl
 * namespace to provide proper type support.
 * 
 * Reference: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Intl/DisplayNames
 * TypeScript docs: https://www.typescriptlang.org/docs/handbook/declaration-merging.html
 */

declare namespace Intl {
  interface DisplayNamesOptions {
    type: "currency" | "language" | "region" | "script"
    style?: "long" | "short" | "narrow"
    localeMatcher?: "lookup" | "best fit"
    fallback?: "code" | "none"
  }

  interface DisplayNames {
    of(code: string): string
    resolvedOptions(): DisplayNamesOptions
  }

  interface DisplayNamesConstructor {
    new (locales?: string | string[], options?: DisplayNamesOptions): DisplayNames
  }

  // DisplayNames may not be available in all environments
  // Declaration merging allows us to augment the Intl namespace
  var DisplayNames: DisplayNamesConstructor | undefined
}

