---
type: design
---

# Pinterest OS — Design Standards

The application's visual standard, adapted from **Fluid Functionalism**:
[Surfaces](https://www.fluidfunctionalism.com/docs/surfaces) ·
[Motion](https://www.fluidfunctionalism.com/docs/motion) ·
[Scrolling lists](https://www.fluidfunctionalism.com/docs/scrolling-list).

The color palette is pulled from **personal-vault-v2** (`frontend/src/app/globals.css`)
using `gh`: charcoal neutrals, white primary text, muted gray secondary text,
and vault yellow (`#f5c542`) as the sole action accent.

We don't pull the shadcn/framer-motion source packages (overkill for a manual
studio - see AGENTS.md "Coding style"). Instead the three systems live as CSS
tokens + utilities in [`app/globals.css`](../../app/globals.css) and one small
component, [`ScrollArea`](../../app/components/ScrollArea.tsx). **Use these tokens —
never hard-code colors, shadows, durations, or easings in components.**

---

## 1. Surfaces

Eight nesting levels (`--surface-0` … `--surface-7`). This app is dark-only, so
elevation reads as a progressively **lighter background** plus a **layered
shadow**. A panel reads its substrate from its parent and **lifts exactly one
step**, so a card on the page sits at `2`, a popover over it at `5`, a dialog
over that at `7`.

| Level | Token | Used for |
|------|-------|----------|
| 0 | `--surface-0` | page background / sunken surface |
| 1 | `--surface-1` | sidebar, insets (avatars, `.code`, buttons) |
| 2 | `--surface-2` | cards / primary panels |
| 3 | `--surface-3` | hovered card, active nav |
| 4 | `--surface-4` | nested panel inside a card |
| 5 | `--surface-5` | popover / menu |
| 6 | `--surface-6` | nested popover, scrollbar thumb (hover) |
| 7 | `--surface-7` | dialog over a popover (deepest) |

Shadows: `--shadow-1` … `--shadow-4`. Shadow appearance stays **stable** so a
popover still reads as a popover several levels deep.

**Rules**
- ✅ Each nested surface = parent level + 1. Use `.surface-N` utility classes or
  the raw `--surface-N` / `--shadow-N` tokens.
- ✅ Light-on-dark elevation comes from background **and** shadow together.
- ❌ Don't invent intermediate hex values; pick the nearest ladder step or an
  existing semantic token (`--accent`, `--ok`, `--warn`, `--danger`).

## 2. Motion

Three speeds. **Exits always move a little faster than entrances.** Bounce is
baked into the easing curve, not set per-component.

| Speed | Entrance | Exit | Easing | Use for |
|-------|----------|------|--------|---------|
| Fast | `--dur-fast` 80ms | `--dur-fast-exit` 60ms | `--ease-fast` (bounce 0) | hover, fades, small toggles |
| Moderate | `--dur-moderate` 160ms | `--dur-moderate-exit` 120ms | `--ease-moderate` (slight overshoot) | dropdowns, tabs, card hover |
| Slow | `--dur-slow` 240ms | `--dur-slow-exit` 160ms | `--ease-slow` (more overshoot) | dialogs, drawers, page entrance |

Shared entrance keyframe: `@keyframes rise` (opacity + 6px translate).

**Rules**
- ✅ Every `transition` / `animation` references these tokens — no literal `ms`
  or `cubic-bezier()` in component CSS.
- ✅ Exit transitions use the matching `-exit` duration.
- ✅ Reduced motion is honored globally via
  `@media (prefers-reduced-motion: reduce)` (mirrors `<MotionConfig
  reducedMotion="user">`): positional motion collapses, content stays readable.

## 3. Scrolling lists

A clipped list looks finished, so users don't scroll it — especially where
native scrollbars are hidden. Every bounded scroll region uses
[`ScrollArea`](../../app/components/ScrollArea.tsx), which renders the `.scroll-area`
utility: a **gradient edge-fade** that appears only on an edge with hidden
content, plus overlay scrollbars styled to the surface ladder (native on touch).

```tsx
<ScrollArea cueSize="comfortable">{/* list */}</ScrollArea>
```

| Prop | Values | Default |
|------|--------|---------|
| `cueSize` | `"comfortable"` (60px) / `"tight"` (32px) | `comfortable` |
| `className` | extra layout/padding classes | — |

The fade is driven by `--fade-top` / `--fade-bottom`, which the component sets
from scroll position (tracking scroll, resize, and content mutations).

**Rules**
- ✅ Wrap **every** scrollable surface in `ScrollArea` — the main column and the
  sidebar nav already are.
- ✅ Use `tight` (32px) on dense data, `comfortable` (60px) elsewhere.
- ❌ Don't let the `<body>` scroll; the app shell is `height: 100vh` and the main
  column is the scroller, so cues have a bounded container to attach to.
