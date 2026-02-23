# **App Name**: Mermaid Cloud Viz

## Core Features:

- Mermaid Diagram Input: Allow users to input Mermaid diagram code via text area or URL.
- Real-time Visualization: Dynamically render the Mermaid diagram based on the input code using Next.js.
- Visualization Options: Offer several built-in diagram themes/styles for enhanced visualization. Implement functionality for the LLM to act as a 'tool', incorporating information regarding diagram parameters (i.e. parameters a user can specify) to enhance the rendered diagram based on user needs.
- Google Authentication: Secure the application behind Google Authentication to control access.
- Cloud Run Deployment: Deploy the Next.js application to Cloud Run in the specified project (agents-mcp-training).
- **Diagram Gallery**: An extensive gallery of pre-built, audience-specific diagrams (e.g., healthcare) to provide inspiration and starting templates for users.

## Style Guidelines:

- Primary color: Dark Indigo (#4B0082), evokes professionalism and intelligence, ideal for data visualization.
- Background color: Light Gray (#F0F0F0), provides a neutral backdrop, allowing diagrams to stand out.
- Accent color: Deep Purple (#9400D3), adds visual interest and highlights interactive elements.
- Body and headline font: 'Inter', sans-serif, for a clean, readable, modern UI.
- Use clean, minimalist icons for diagram elements and actions.
- Employ a clean, intuitive layout to make the app easy to use.
- Implement smooth transitions and subtle animations to enhance user experience.

## UI Architecture Decisions

### Diagram Editor Layout
We encountered significant challenges with the layout of the `DiagramEditor` component, specifically regarding input alignment and resizability.
- **Problem**: Using a deeply nested `Card` -> `Tabs` -> `TabsContent` structure from shadcn/ui caused issues where:
    1. The text inputs in "Generate" and "Enhance" tabs were vertically centered or pushed down due to flexbox behavior (`flex-1` growing behavior on containers).
    2. The "Code" tab editor was difficult to make resizable because `flex-1` forced it to a calculated height, overriding user resizing interactions.
    3. An "invisible grid" or unwanted spacing appeared due to default margins and flex alignment in the library components.

- **Solution**: We refactored the `DiagramEditor` to decouple the layout from the `Tabs` component logic.
    1. **Navigation Only**: The `Tabs` component is now used *only* for the header navigation (tab switching). It does not wrap the content.
    2. **Direct Rendering**: Content panels are rendered directly as standard `div` elements based on the `activeTab` state.
    3. **Explicit Control**:
        - **Code Tab**: Uses `min-h-full` to ensure it fills the available space but allows expansion.
        - **Generate/Enhance Tabs**: Uses a simple flex column with `justify-start` to force inputs to the absolute top, eliminating unwanted vertical centering or gaps.
    4. **Parent Container**: The parent column in `src/app/viz/page.tsx` uses `overflow-y-auto` to allow the editor to grow beyond the viewport height if the user resizes the input, preventing content clipping.

This "manual layout" approach provides superior control and predictability compared to relying on the default styles of the component library wrappers for complex, full-height editor interfaces.
