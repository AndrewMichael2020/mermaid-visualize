# State Diagram with Theming

This example demonstrates state diagram theming with `themeVariables`. State diagrams support global theming similar to flowcharts.

## Basic Themed State Diagram

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
stateDiagram-v2
    [*] --> Idle
    Idle --> Running : start
    Running --> Paused : pause
    Paused --> Running : resume
    Running --> [*] : stop
    Paused --> [*] : cancel
```

## Order Processing State Machine

```mermaid
%%{init: {
  "theme": "base",
  "themeVariables": {
    "primaryColor": "#E8F5E9",
    "primaryBorderColor": "#388E3C",
    "primaryTextColor": "#1B5E20",
    "lineColor": "#388E3C",
    "fontFamily": "Inter, sans-serif"
  }
}}%%
stateDiagram-v2
    [*] --> Draft
    
    Draft --> Submitted : submit
    Submitted --> Processing : accept
    Submitted --> Draft : reject
    
    Processing --> Shipped : ship
    Processing --> Cancelled : cancel
    
    Shipped --> Delivered : deliver
    Delivered --> [*]
    
    Cancelled --> [*]
    
    note right of Draft : Order created
    note right of Processing : Payment verified
```

## Epidemic State Model (SIR)

```mermaid
%%{init: {
  "theme": "base",
  "themeVariables": {
    "primaryColor": "#FFCDD2",
    "primaryBorderColor": "#C62828",
    "primaryTextColor": "#B71C1C",
    "lineColor": "#C62828",
    "fontFamily": "Inter, sans-serif"
  }
}}%%
stateDiagram-v2
    [*] --> Susceptible
    Susceptible --> Infected : exposure
    Infected --> Recovered : recovery
    Infected --> Deceased : fatal
    Recovered --> [*]
    Deceased --> [*]
    
    note left of Susceptible : Not yet infected
    note right of Infected : Contagious
    note right of Recovered : Immune
```
