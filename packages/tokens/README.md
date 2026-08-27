# @appshell/tokens

The design token contract an Application supplies and every package it composes consumes.

A catalogue of components that cannot be themed to their host is not composable — visual
coherence is the point. This package is the vocabulary that makes it possible: 41 CSS
custom properties, a set of presets, and the contrast validation that keeps a theme
legible.

## For a package author

Author against the names, always with a fallback so the package still renders standalone:

```css
.button {
  background: var(--appshell-primary, #0284c7);
  color: var(--appshell-on-primary, #fff);
  border-radius: var(--appshell-radius-md, 0.5rem);
  padding: var(--appshell-space-sm, 0.5rem) var(--appshell-space-md, 1rem);
}
.button:hover  { background: var(--appshell-primary-hover); }
.button:focus-visible { outline: 2px solid var(--appshell-focus-ring); outline-offset: 2px; }
```

Never write a literal colour you expect to be themed. That is the one rule.

## The contract

**Colour is semantic; dimensions are a scale.** `--appshell-surface` says what a colour
*means*; `--appshell-space-md` is honestly just a size. Nobody wants
`--appshell-space-card-padding`.

**Every colour that carries text has an `on-` partner.** Write
`background: var(--appshell-primary); color: var(--appshell-on-primary)` and you cannot
produce an illegible control whatever palette the Application supplies. It is also what
makes dark mode a change of values rather than a change of logic.

| Group | Roles |
| --- | --- |
| Surface | `surface`, `on-surface`, `surface-raised`, `on-surface-raised` |
| Text & line | `text-muted`, `border` |
| Action | `primary`, `on-primary`, `secondary`, `on-secondary` |
| Derived | `primary-hover`, `primary-active`, `secondary-hover`, `secondary-active`, `focus-ring` |
| Status | `danger`, `warning`, `success` and their `on-` partners |
| Type | `font-body`, `font-mono`, `font-size-h1`…`h6`, `-body`, `-small`, `line-height-tight`, `-normal` |
| Dimension | `space-xs`…`xl`, `radius-sm`/`md`/`lg` |

Type sizes are named for their role rather than a `sm/md/lg` scale on purpose. A numeric
scale reintroduces the divergence the contract exists to prevent — one author maps `h1` to
`2xl`, another to `xl`, and headings stop matching across a composed page.

**Derived roles cost a theme nothing.** Hover and active are a `color-mix` from their
accent, and the focus ring is picked per base and accent. A theme may override any of
them; none has to be supplied. So the contract publishes 41 names while an Application
authors 36 at most — and usually none, because it picks presets.

## Presets: base × accent

Themes are two choices, not 41 values:

```ts
import { toCss } from '@appshell/tokens';

toCss({ base: 'midnight', accent: 'ice' });
```

**Bases** carry surfaces, text, border and status, as a light/dark pair: `neutral`,
`midnight`. **Accents** carry the two action colours: `ice`, `ember`, `emerald`, `violet`,
`steel`. Either slot also accepts raw token values, and `overrides` adjusts a preset
without forking it.

Every combination is verified — see below — and `midnight`/`ice` is derived from the first
application scheduled to migrate.

## Contrast is the validation that matters

Syntax checking earns little. It catches `--appshell-primary: bananas`; it misses
`--appshell-on-primary: #fff` on `--appshell-primary: #fff`, which is perfectly valid CSS
and invisible text.

```ts
import { composeTheme, validateTheme, describeFinding } from '@appshell/tokens';

validateTheme(composeTheme({ base: 'neutral', accent: 'ice' }, 'light')).map(describeFinding);
```

Text pairs are checked at WCAG AA (4.5:1), the focus ring at 3:1 against its surface
(1.4.11, non-text). A value that will not parse is reported rather than thrown, so one bad
token does not hide the rest.

Two things this caught while the presets were being chosen, both of which would otherwise
have shipped:

- **Tailwind's `indigo-500` fails against both black and white** — 4.28 and 4.22. There is
  no legible text colour for it. The `violet` accent uses `indigo-600` instead.
- **A focus ring that is simply the accent disappears** on 7 of the 20 preset combinations.
  The rings are derived instead: hue and chroma are kept, lightness moves only as far as it
  must to clear 3:1.

The presets are held to the same standard as everyone else's themes — the test suite
composes all 20 combinations and asserts no findings.

## Colour format

Values are `oklch`. Tailwind v4 consumes them directly and uses `color-mix` for its opacity
modifiers. Tailwind v3 implements `bg-primary/50` as `rgb(var(--x) / <alpha-value>)` and
needs channel-separated values, so a v3 package either forgoes opacity modifiers on themed
colours or derives channel-split locals in its own stylesheet. The contract is not deformed
for the older version.

## Modes

Three states, not two — an explicit choice in either direction plus the system default:

```css
:root                                        { /* light */ }
@media (prefers-color-scheme: dark) {
  :root:not([data-appshell-theme="light"])   { /* dark, unless light was chosen */ }
}
:root[data-appshell-theme="dark"]            { /* dark, chosen */ }
```

Only the roles that actually differ are restated in the dark blocks. Type and dimensions
never vary, and repeating them would triple the size of something the registry inlines into
every page it serves.
