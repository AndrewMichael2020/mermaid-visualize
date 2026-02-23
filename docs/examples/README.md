# Theming Examples

This folder contains working, colorized Mermaid diagram examples for each major diagram type.

## Files

- `flowchart-themed.md` - Flowchart with full theming and classDef styling
- `class-diagram-themed.md` - Class diagram with global themeVariables
- `sequence-diagram-themed.md` - Sequence diagram with actor/signal theming
- `state-diagram-themed.md` - State diagram with theming

## Usage

Copy and paste these examples into the Mermaid Exporter application to see themed diagrams in action.

## Notes

- **ER diagrams** are intentionally excluded as they don't support theming
- **classDiagram** and **sequenceDiagram** only support global palette colors (per-element styling is not available in Mermaid v10.9.x)
- **flowchart** and **stateDiagram** support per-node classDef styling
