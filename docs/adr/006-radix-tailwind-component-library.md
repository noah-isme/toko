# ADR 006: Radix UI + Tailwind CSS Component Library

## Status

Accepted

## Context

The storefront needs accessible, customizable UI primitives. A fully pre-styled library (like MUI) would conflict with the project's design needs, while building everything from scratch would be too slow.

## Decision

Use unstyled Radix UI primitives (Dialog, Popover, Select, Tabs, Switch, Slider, etc.) styled with Tailwind CSS and Class Variance Authority (CVA). This follows the shadcn/ui pattern — components are owned by the project in `src/components/ui/`, not installed as a package.

The `cn()` utility (clsx + tailwind-merge) is the most-connected function in the codebase (244 edges), used by virtually every component for conditional class composition.

## Consequences

- **Positive:** Full control over styling and behavior. Components can be modified directly without fighting a library's API.
- **Positive:** Radix handles accessibility (ARIA, keyboard navigation, focus management) out of the box.
- **Positive:** Tailwind's utility classes keep styles co-located with markup, reducing context switching.
- **Negative:** The team must maintain component accessibility and edge cases that a full component library would handle automatically.
