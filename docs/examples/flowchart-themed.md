# Flowchart with Full Theming

This example demonstrates flowchart theming with both `themeVariables` and `classDef` styling.

## Basic Themed Flowchart

```mermaid
%%{init: {
  "theme": "base",
  "themeVariables": {
    "primaryColor": "#E6F7FF",
    "primaryBorderColor": "#0A84C1",
    "primaryTextColor": "#003A57",
    "secondaryColor": "#EAF7EA",
    "secondaryBorderColor": "#4CAF50",
    "secondaryTextColor": "#1B5E20",
    "tertiaryColor": "#FFF8D6",
    "tertiaryBorderColor": "#D69E00",
    "tertiaryTextColor": "#705400",
    "lineColor": "#0A84C1",
    "fontFamily": "Inter, sans-serif"
  }
}}%%
graph TD
    A[Start] --> B{Decision?}
    B -- Yes --> C[Process OK]
    B -- No --> D[Handle Error]
    C --> E[End]
    D --> E
```

## Flowchart with classDef Styling

```mermaid
%%{init: {
  "theme": "base",
  "themeVariables": {
    "lineColor": "#333",
    "fontFamily": "Inter, sans-serif"
  }
}}%%
graph LR
    A[Input] --> B[Process]
    B --> C{Valid?}
    C -- Yes --> D[Success]
    C -- No --> E[Retry]
    E --> B
    
    classDef start fill:#E6F7FF,stroke:#0A84C1,stroke-width:2px
    classDef process fill:#EAF7EA,stroke:#4CAF50,stroke-width:2px
    classDef decision fill:#FFF8D6,stroke:#D69E00,stroke-width:2px
    classDef success fill:#C8E6C9,stroke:#388E3C,stroke-width:2px
    classDef error fill:#FFCDD2,stroke:#C62828,stroke-width:2px
    
    class A start
    class B process
    class C decision
    class D success
    class E error
```

## Hospital Workflow Example

```mermaid
%%{init: {
  "theme": "base",
  "themeVariables": {
    "primaryColor": "#E6F7FF",
    "primaryBorderColor": "#0A84C1",
    "secondaryColor": "#FFCDD2",
    "secondaryBorderColor": "#C62828",
    "tertiaryColor": "#FFF8D6",
    "tertiaryBorderColor": "#D69E00",
    "lineColor": "#0A84C1"
  }
}}%%
graph TD
    A[Patient Arrives] --> B{Initial Triage}
    B -- Critical --> C[Resuscitation Bay]
    B -- Urgent --> D[Main Treatment Area]
    B -- Non-Urgent --> E[Waiting Room]
    E --> F[Re-assessment]
    F --> D
    C --> G[Admit to ICU]
    D --> H{Discharge or Admit?}
    H -- Discharge --> I[Discharge Lounge]
    H -- Admit --> J[Admit to Ward]
```
