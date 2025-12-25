---
description: Guidelines and principles for writing maintainable, traceable, and honest code.
---

# 🧠 Maintainable Code Principles

When writing or refactoring code, you MUST follow these principles to ensure long-term maintainability and debuggability.

## 1. Traceable (✅ Traceable)

Code must be easily traceable from logs to implementation to verification.

- **Clear Flow**: The main execution flow should be obvious.
- **Sensible Stack Traces**: Stack traces should tell a coherent story, not a jumping puzzle.
- **Log-to-Code**: You should be able to map a log message directly to the specific decision point in the code.

## 2. Honest (✅ Honest)

Avoid hidden complexity and implicit behaviors.

- **Explicit Decision Making**: Don't hide important business logic deep in helpers.
- **Explicit State Changes**: State mutations should be visible and predictable.
- **No Magic**: Avoid logic like "if variable X is null, implicit business rule Y applies". Be explicit.

## 3. Local Reasoning Friendly (✅ Local Reasoning Friendly)

A developer should understand a behavior by looking at a small context.

- **1-2 Files Rule**: To understand a feature/behavior, you shouldn't need to keep 12 tabs open.
- **Colocation**: Keep related logic close together.

## 4. Debuggable Under Stress (✅ Debuggable Under Stress)

Code should be readable when you are tired, panicked, or during a production outage.

- **Simplicity over Cleverness**: If it needs a whiteboard to understand an if-else, it's a failed design.
- **Avoid Cognitive Load**: Write boring, predictable code.

## 5. Reframe "Clean Code" Dogma

Adopt these saner interpretations of common advice:

| Traditional Dogma ❌              | Saner Reframe ✅                           |
| :-------------------------------- | :----------------------------------------- |
| "Function max 4 lines"            | **"Function should tell one clear story"** |
| "Hide all implementation details" | **"Hide noise, expose decisions"**         |
| "Abstraction everywhere"          | **"Abstraction where variability exists"** |
| "Read top-down"                   | **"Debug bottom-up, design accordingly"**  |

---

**Apply these principles in all coding tasks.**
