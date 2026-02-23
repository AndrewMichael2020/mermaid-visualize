/**
 * Type declarations for Mermaid ESM builds.
 * These modules re-export the same API as the main "mermaid" package.
 */
declare module "mermaid/dist/mermaid.esm.mjs" {
  import mermaid from "mermaid";
  export default mermaid;
}

declare module "mermaid/dist/mermaid.esm.min.mjs" {
  import mermaid from "mermaid";
  export default mermaid;
}
