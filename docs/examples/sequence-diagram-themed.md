# Sequence Diagram with Palette Theming

This example demonstrates sequence diagram theming. Note that **per-actor/per-message coloring is NOT supported** in Mermaid v10.9.x — only palette-level `themeVariables` apply. All actors share the same background/border colors.

## Basic Themed Sequence Diagram

```mermaid
%%{init: {
  "theme": "base",
  "themeVariables": {
    "actorBkg": "#E6F7FF",
    "actorBorder": "#0A84C1",
    "actorTextColor": "#003A57",
    "signalColor": "#0A84C1",
    "signalTextColor": "#003A57",
    "labelBoxBkgColor": "#EAF7EA",
    "labelBoxBorderColor": "#4CAF50",
    "labelTextColor": "#1B5E20",
    "loopTextColor": "#705400",
    "noteBkgColor": "#FFF8D6",
    "noteBorderColor": "#D69E00",
    "noteTextColor": "#705400",
    "fontFamily": "Inter, sans-serif"
  }
}}%%
sequenceDiagram
    participant Alice
    participant Bob
    participant Charlie
    
    Alice->>Bob: Hello Bob!
    Bob-->>Alice: Hi Alice!
    Alice->>Charlie: Can you help?
    Note over Charlie: Thinking...
    Charlie-->>Alice: Sure!
```

## Sequence Diagram with Loops and Alt

```mermaid
%%{init: {
  "theme": "base",
  "themeVariables": {
    "actorBkg": "#E8F5E9",
    "actorBorder": "#388E3C",
    "actorTextColor": "#1B5E20",
    "signalColor": "#388E3C",
    "signalTextColor": "#1B5E20",
    "labelBoxBkgColor": "#FFF8E1",
    "labelBoxBorderColor": "#FFA000",
    "labelTextColor": "#E65100",
    "noteBkgColor": "#E3F2FD",
    "noteBorderColor": "#1976D2",
    "noteTextColor": "#0D47A1",
    "fontFamily": "Inter, sans-serif"
  }
}}%%
sequenceDiagram
    participant Patient
    participant Phlebotomist
    participant Lab
    
    Patient->>Phlebotomist: Check in for blood draw
    Phlebotomist->>Patient: Verify ID and order
    
    loop Blood Collection
        Phlebotomist->>Patient: Draw sample
        Phlebotomist->>Lab: Send sample
    end
    
    alt Results Normal
        Lab-->>Patient: Results available online
    else Results Abnormal
        Lab-->>Phlebotomist: Alert physician
        Phlebotomist-->>Patient: Schedule follow-up
    end
    
    Note over Patient,Lab: Process typically takes 24-48 hours
```

## Limitation Note

> ⚠️ **Per-actor and per-message styling is not supported.** All actors share the same `actorBkg`/`actorBorder` colors. All messages share the same `signalColor`. This is a Mermaid limitation in v10.9.x.
