# Page shell contract

**Status:** shipped · `eb43500` (2026-09-15)
**Components:** `components/ui/AppPageShell.tsx`, `components/ui/AppStatLine.tsx`

---

## The problem this solved

Every in-app route hand-rolled its own page heading. Measured at `eff3592`:

| Route | Heading | Content width |
|---|---|---|
| `/clients` | 80px `font-black` | 1200 |
| `/profile` | 72px (`text-7xl`) | 1440 → 10-of-12 grid |
| `/support` | 72px + `<Marker>` highlight | 1440 → 10-of-12 grid |
| `/invoices` | 34px bold | 1200 |
| `/clients/[id]` | 28/32px | 1440 → 10-of-12 grid |
| `/dashboard` | `sr-only`, then a 24–30px **project** name | full-bleed two-pane |
| invoice editor | 13px row + 20px number, bare bottom rule | 1440 |

Content started at a different y-coordinate on every route. That — not differing
page bodies — is what reads as "not designed by one person."

**Homogeneity means the contract is identical, not that the bodies are.** The
bodies legitimately differ; the chrome must not.

## The contract

`AppPageShell` renders a **46px bordered bar** (`--radius-box`, `bg-paper-2`) with
four slots, all optional but the first:

- `title` — the page's identity. Renders the route's only `<h1>`.
- `meta` — quiet mono line: counts, scope, a date range. **Never an action.**
- `actions` — bar-scale controls (sort, export, save). Text, not buttons: a padded
  button does not fit 46px without changing the bar's height.
- `back` — href of the parent route, as a chevron **inside** the bar, not above it
  (anything above the bar reintroduces variable height).

Empty slots shrink; they do not collapse the bar. The height is fixed on `sm+`
so content below starts at the same y everywhere, and wraps below `sm`, where
the viewport decides the layout anyway.

`appPageShellContainerClass` is `max-w-[1200px]` — **the** content width. Do not
override it per page. A page that needs to be wider needs `bare` and its own
layout, not a second width.

### `bare`

Renders only the bar, no container or padding — for panes that already own their
width and scroll. Two legitimate users: the **dashboard detail pane** and the
**invoice editor**.

### `titleAs`

Demotes the title to `<h2>`. Only for a pane inside a master-detail route where
the page already owns an `<h1>` naming the route. `/dashboard` is the only case:
it keeps `<h1 class="sr-only">Dashboard</h1>` and the bar carries the project name
as `h2`. **Do not delete that sr-only h1** — the route otherwise has no h1.
(Before this change the page shipped *two* h1s.)

## `AppStatLine`

The one way numbers are shown above a list. Ambient context for the table, not
the task — which is why it is a line and not cards. Cards are for when the metric
*is* the task, and no route currently qualifies.

**`hero` means acid, and acid means money that is live** — owed, at risk, or
awaiting action. Across the whole app exactly one stat sets it: Outstanding on
`/invoices`. A count of things is never hero. `/clients` previously had a
full-width acid block reading "CLIENTS 4"; that was the doctrine breach.

## Routes on the contract

`/invoices` · `/clients` · `/clients/[id]` · `/profile` · `/support` ·
`/dashboard` (detail pane, `bare` + `h2`) · invoice editor (`bare`)

Deliberately **off** it: `/design-system` (a styleguide, no `AppHeader`, a proving
ground not a product route) and all public/auth/legal routes. `/projects` and
`/project/[id]` are five-line redirects to `/dashboard`.

## Why Option D

Four treatments were canvassed against real `/invoices` content. A, B and C all
pulled the stats *into* the header — which works on `/invoices` and collapses into
an empty shape on the five routes that have no stats. D keeps stats as page
content below the bar. That separation of chrome from content is the only reason
it generalises.

## Rules that follow from this

1. A new route gets `AppPageShell`. It does not get a heading of its own.
2. Numbers above a list get `AppStatLine`. Not cards.
3. `hero` is for live money. If every stat could be hero, none is.
4. No page sets its own content width.
5. A page-level subtitle is **content** (first element in the body), not meta.
   Check the child components first — `FaqSection` carried its own title block and
   produced a duplicate heading when the page's was removed.

## Rules earned the hard way

Each of these cost a wrong diagnosis or a shipped bug. They are written down so
the next one costs neither.

### 1. The pair is the unit, not the token

Mirroring every token across `@theme`, `[data-theme="cockpit"]` and
`[data-theme="lance-light"]` is necessary and **not sufficient**. A fill and the
text on it are a *pair*: each half can be a correctly mirrored token and the pair
still be unreadable. Five variants of the same bug shipped before this was
understood:

| What was written | Why it broke |
|---|---|
| `hover:bg-white` | a variant class — the `[data-theme]` override cannot match it |
| `hover:bg-[#efe6d1]` | same, via an arbitrary value |
| `hover:bg-[var(--color-lime-warm)]` with `text-ink` | **both tokens properly mirrored** — still 1.07:1 |
| `text-white` on `bg-acid` | 1.27:1 |
| `.bg-ink.text-white { … }` | compound selector; the two classes sit on different elements |

The fix is structural, not another override. Every accent that can be a
background has an `--on-<accent>` partner — `--on-acid`, `--on-coral`,
`--on-grass`, `--on-ochre`, `--on-gold`, `--on-strong`, `--on-ink`. Set the fill,
set its partner. Type works the same way: `.type-*` carries size **and** leading,
because a size chosen without its leading is half a decision.

You can still write something unreadable. You can no longer do it by accident.

### 2. `overflow-hidden` hides overflow — it does not fix it

`/clients` was reported as "the circular icon is bleeding out of the border".
Three diagnoses were wrong — the avatar's `border-[1.5px]`, then the `ACTIONS`
column being 2px narrower than its contents — before a DevTools screenshot showed
the header word "ACTIONS" *sliced*. The wrapper was `overflow-hidden` around a
table wider than its container. The clipping was not a rounding artifact: the
container was amputating the table's right edge, and every round element near
that edge read as a half-circle.

A wrapper around content that can exceed its width gets `overflow-x-auto`, and
the child declares an honest `min-w-[…]`. `overflow-hidden` there is correct only
when the content is *guaranteed* to fit — and if it were, the wrapper would not
need the rule.

Corollary: when clipping is reported, measure the container before touching the
element. The element is almost never the cause.

### 3. A fixed-width cell must be ≥ content + padding + ring

An explicit width is a promise about the content that nothing enforces. `ACTIONS`
was `w-[100px]` holding two 36px buttons, a gap and `px-3` — over budget before
focus rings, which draw *outside* the box and are the part everyone forgets.

Budget every fixed-width cell as **content + padding + focus ring + border**, or
do not fix the width at all. Anything sized by its own icon (`h-10 w-10` squares)
is exempt: it is sized by its content by construction, which is the point.

### 4. Verify the construct, not the prose

Every audit in this track that passed while the change was incomplete failed the
same way — it matched text instead of code. `"46px"` matched the doc comments
explaining it. `<AppPageShell` matched `<AppPageShellAction`. `grep -c
"text-white"` matched a comment saying why `text-white` is wrong.
`--leading-\w+` missed `--leading-body-lg`, because `-` is not `\w`. And an audit
scoped to the files the migration touched confirmed only that the migration
touched them — `lib/ui-foundation.ts` is `.ts`, the glob was `*.tsx`, and the
gap was invisible to its own check.

Strip comments, match the construct exactly, and scope the audit *wider* than the
change.

## Known follow-ups

- `/clients` meta reads "0 intl · 1 no GSTIN" — describes composition where
  `/invoices` describes scope. Should read "All clients · N results".
- `/clients` search + filter row is visually heavier than the ledger's filter chips.
- `/clients/[id]` puts Save in the global `AppHeader` slot while `/profile` uses a
  sticky bottom bar. Two answers to "where does save live"; unresolved.
