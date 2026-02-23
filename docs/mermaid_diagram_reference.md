
# Mermaid Diagram Types — Reference & Examples

This document outlines the major diagram/chart types supported by Mermaid (version 10.9.x) along with minimal working code examples.

> **Theming Support:** For detailed information about theming capabilities per diagram type, see [Theming Support Reference](./theming_support.md). For colorized examples, see the [examples/](./examples/) folder.

## 1. Flowchart
```mermaid
graph TD
  A[Start] --> B{Decision?}
  B -- Yes --> C[Action OK]
  B -- No --> D[Action FAIL]
  C --> E[End]
  D --> E
```

## 2. Sequence Diagram
```mermaid
sequenceDiagram
  participant Alice
  participant Bob
  Alice->>Bob: Hello Bob
  Bob-->>Alice: Hi Alice
```

## 3. Class Diagram
```mermaid
classDiagram
  class Person {
    +String name
    +int age
    +walk()
  }
  class Student {
    +int studentId
    +int marks
    +study()
  }
  Person <|-- Student
```

## 4. State Diagram
```mermaid
stateDiagram-v2
  [*] --> Idle
  Idle --> Running : start
  Running --> Paused : pause
  Paused --> Running : resume
  Paused --> [*] : stop
```

## 5. Gantt Chart
```mermaid
gantt
  title Project Timeline
  dateFormat  YYYY-MM-DD
  section Phase 1
    Task A       :a1, 2025-11-22, 10d
    Task B       :after a1, 7d
  section Phase 2
    Milestone    :milestone, 2025-12-05, 0d
```

## 6. Pie Chart
```mermaid
pie
  title Browser Usage
  "Chrome"  : 60
  "Firefox" : 25
  "Edge"    : 15
```

## 7. ER Diagram
```mermaid
erDiagram
  CUSTOMER ||--o{ ORDER : places
  ORDER ||--|{ LINE_ITEM : contains
  CUSTOMER {
    string name
    string address
  }
```

## 8. Mindmap
```mermaid
mindmap
  root((Life))
    Origins
      Earth
      Mars
    Journey
      Climb
      Ski
```

## 9. Timeline
```mermaid
timeline
  title Major Events
  2000 : Y2K
  2001 : 9/11
  2020 : COVID-19
```

## 10. Sankey Diagram
```mermaid
sankey
  A[Source] --> B[Flow] : 5
  B --> C[Destination] : 5
```

## 11. C4 Diagram
```mermaid
C4Diagram
  Person(user, "User")
  System(system, "System")
  user --> system : uses
```

## 12. Block Diagram
```mermaid
blockDiagram
  system --> subsystem1
  system --> subsystem2
  subsystem1 --> componentA
  subsystem2 --> componentB
```

## 13. XY Chart
```mermaid
xyChart
  title Sales vs Time
  xAxis label Time
  yAxis label Sales
  "Jan": 30, "Feb": 45, "Mar": 60
```

## 14. Quadrant Chart
```mermaid
quadrantChart
  title Risk vs Reward
  "Low Risk/High Reward": 10
  "High Risk/High Reward": 5
  "Low Risk/Low Reward": 2
  "High Risk/Low Reward": 1
```

## 15. Git Graph
```mermaid
gitGraph
  commit
  branch develop
  commit
  checkout main
  merge develop
  commit
```
