/**
 * Global Mermaid configuration utility.
 * 
 * This module provides a centralized way to initialize Mermaid with custom
 * settings that suppress the default "bomb" error widgets on syntax errors.
 * 
 * Key configurations:
 * - `startOnLoad: false` prevents auto-rendering of `<pre class="mermaid">` blocks
 * - `parseError` is set to a no-op to prevent DOM injection of error widgets
 * - Components should use `initializeMermaid()` before rendering
 */

import type { MermaidConfig } from "mermaid";

let mermaidInstance: typeof import("mermaid").default | null = null;

/**
 * Custom parse error handler that logs errors to console without injecting DOM elements.
 * This prevents Mermaid's default "bomb" widget from appearing on syntax errors.
 */
const suppressedParseErrorHandler = (err: unknown) => {
  console.error("Mermaid parse error:", err);
  // No-op: prevent Mermaid from injecting its own error UI
};

/**
 * Dynamically imports and configures the mermaid instance with error suppression.
 * This ensures `parseError` is set before any rendering occurs.
 * 
 * Explicitly imports the ESM build based on NODE_ENV to ensure full modern
 * diagram support (radar-beta, sankey-beta, quadrantChart, etc.).
 */
export async function getMermaidInstance() {
  if (!mermaidInstance) {
    let mermaidModule;
    
    // Explicitly import ESM build for full modern diagram support
    try {
      if (process.env.NODE_ENV === "production") {
        mermaidModule = await import("mermaid/dist/mermaid.esm.min.mjs");
      } else {
        mermaidModule = await import("mermaid/dist/mermaid.esm.mjs");
      }
    } catch (esmError) {
      // Fallback to generic import if ESM import fails
      console.warn("Failed to load Mermaid ESM build, falling back to generic import:", esmError);
      mermaidModule = await import("mermaid");
    }
    
    // Normalize the import result (some bundles expose default, some the module directly)
    const mermaid = mermaidModule?.default ?? mermaidModule;
    
    // Safety check: ensure mermaid instance was resolved
    if (!mermaid) {
      throw new Error("Failed to load Mermaid: module resolved to undefined");
    }
    
    // Runtime verification log
    console.debug("Mermaid loaded", (mermaid as { version?: string })?.version ?? "unknown");
    
    // Override the global parseError handler to suppress DOM error widgets
    // This must be done before any initialization to prevent the "bomb" icons
    mermaid.parseError = suppressedParseErrorHandler;
    
    // Also use setParseErrorHandler API for additional coverage
    if (typeof mermaid.setParseErrorHandler === 'function') {
      mermaid.setParseErrorHandler(suppressedParseErrorHandler);
    }

    mermaidInstance = mermaid;
  }
  return mermaidInstance;
}

/**
 * Returns the base Mermaid configuration with error suppression enabled.
 * Components can extend this with their own theme/styling options.
 */
export function getBaseMermaidConfig(): MermaidConfig {
  return {
    startOnLoad: false,
    securityLevel: "loose",
    fontFamily: "Inter, sans-serif",
  };
}

/**
 * Initializes mermaid with the provided config merged with base error-suppression settings.
 * Call this before using mermaid.render() or mermaid.parse().
 * 
 * @param customConfig - Optional custom configuration to merge with base settings
 */
export async function initializeMermaid(customConfig?: Partial<MermaidConfig>) {
  const mermaid = await getMermaidInstance();
  
  const config: MermaidConfig = {
    ...getBaseMermaidConfig(),
    ...customConfig,
  };

  mermaid.initialize(config);
  
  // Re-apply error suppression after initialize in case it was reset
  mermaid.parseError = suppressedParseErrorHandler;
  if (typeof mermaid.setParseErrorHandler === 'function') {
    mermaid.setParseErrorHandler(suppressedParseErrorHandler);
  }
  
  return mermaid;
}
