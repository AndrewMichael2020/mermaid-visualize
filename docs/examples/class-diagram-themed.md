# Class Diagram with Global Theming

This example demonstrates class diagram theming. Note that **per-class coloring is NOT supported** in Mermaid v10.9.x — only global `themeVariables` apply.

## Basic Themed Class Diagram

```mermaid
%%{init: {
  "theme": "base",
  "themeVariables": {
    "primaryColor": "#E6F7FF",
    "primaryBorderColor": "#0A84C1",
    "primaryTextColor": "#003A57",
    "lineColor": "#0A84C1",
    "fontFamily": "Inter, sans-serif"
  }
}}%%
classDiagram
    class Person {
        +String name
        +int age
        +walk()
        +talk()
    }
    class Student {
        +int studentId
        +int marks
        +study()
    }
    class Teacher {
        +String subject
        +teach()
    }
    Person <|-- Student
    Person <|-- Teacher
```

## Class Diagram with Relationships

```mermaid
%%{init: {
  "theme": "base",
  "themeVariables": {
    "primaryColor": "#EAF7EA",
    "primaryBorderColor": "#4CAF50",
    "primaryTextColor": "#1B5E20",
    "lineColor": "#4CAF50",
    "fontFamily": "Inter, sans-serif"
  }
}}%%
classDiagram
    class Animal {
        <<abstract>>
        +String name
        +makeSound()
    }
    class Dog {
        +bark()
    }
    class Cat {
        +meow()
    }
    class Owner {
        +String name
        +feed(animal)
    }
    
    Animal <|-- Dog
    Animal <|-- Cat
    Owner "1" --> "*" Animal : owns
```

## Limitation Note

> ⚠️ **Per-class styling is not supported.** All class boxes share the same colors defined in `themeVariables`. If you need per-element coloring, consider using a flowchart with `classDef` styling to represent similar relationships visually.
