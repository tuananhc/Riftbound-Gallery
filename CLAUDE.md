# CLAUDE.md — Riftbound Project Guidelines

This file defines the architecture rules, coding conventions, and best practices for the Riftbound TCG card database project. Follow these guidelines in every code change.

---

## Project Stack

- **Frontend:** Next.js 14 (App Router), React, hosted on Vercel
- **Backend:** AWS Lambda + API Gateway
- **Auth:** AWS Cognito (User Pool, JWT only — no Groups or roles)
- **Database:** DynamoDB (Cards, Users, Decks, DeckVersions, MatchHistory)
- **News/Blog:** Markdown files in `content/news/`
- **Styling:** Inline styles only — no CSS modules, no Tailwind, no styled-components
- **Theme:** flat grey surfaces (dark by default, light via the navbar toggle), hairline grey borders, square corners, one blue accent
- **Fonts:** Geist Mono (whole UI, via `FONT_MONO` in `src/lib/data.js`), except the `/devlog` pages, which use DM Sans (`FONT_SANS`)

---

## Architecture Rules

### Server / Client Boundary

- `page.js` files are **server components by default** — never add `"use client"` to a page file unless there is a specific, justified reason
- **Server components** handle all data fetching — database calls, markdown reads, API calls
- **Client components** handle interactivity only — `onClick`, `useState`, animations, event handlers
- Pass data from server to client via **props**, never the other way around
- Never import Node.js modules (`fs`, `path`, `postgres`) inside a `"use client"` file — this will throw a `Module not found` error at runtime
- Add `import "server-only"` to any `lib/` file that must never run on the client

```js
// CORRECT — server component fetches, client component renders
// page.js (server)
export default async function CardsPage() {
  const cards = await getAllCards();
  return <CardGrid initialCards={cards} />;
}

// CardGrid.js (client)
"use client";
export default function CardGrid({ initialCards }) { ... }
```

```js
// WRONG — never fetch from DB inside a client component
"use client";
import { getAllCards } from "../../lib/cards"; // throws if cards.js uses Node.js
```

### Data Fetching

- All database queries live in `src/lib/` — never inline queries in components or pages
- Cards are fetched **once** on page load via a full DynamoDB Scan — never re-fetched on filter change
- All card filtering happens **client-side** in `useMemo` — never send filter params to the backend
- When Lambda is wired up, all API calls go through `src/lib/api.js` — never call `fetch()` directly in a component

### State Management

- Use `useState` for simple local UI state (open/closed, selected item)
- Use `useReducer` for complex multi-value state — card filters use `useCardFilters` hook
- Use custom hooks in `src/hooks/` to encapsulate reusable logic — never duplicate reducer logic across components
- No Redux, no Zustand, no global state library — the component tree is shallow enough that neither is needed
- Context (`useContext`) is not currently used and should not be added without a clear justification — prop drilling is not a problem at this project's depth

### DynamoDB

- All tables use **On-demand billing** — never switch to provisioned capacity
- All tables use **Standard table class** — not Standard-IA (cards are frequently accessed)
- Never add GSIs unless a specific server-side query pattern requires one — there are currently none
- Never store `null` values in DynamoDB — strip null and empty string fields before writing
- MatchHistory and DeckVersions items persist indefinitely — do **not** set a `ttl` field on them (users own this data and can edit it, so it must not auto-expire). Bound read size with `Query` `Limit` + pagination (`LastEvaluatedKey`), not deletion
- Deck saves must use `TransactWriteCommand` to atomically write both the Decks record and DeckVersions snapshot

### Infrastructure

- All backend AWS resources (Lambdas, their IAM roles, the HTTP API and its routes, the `MatchHistory` table) are defined in `infra/backend.yml` and deployed by `.github/workflows/deploy-backend.yml` on every push to `master` — never create or edit them in the AWS console
- Lambda source lives in `lambda/`, one `.mjs` file per function with no npm dependencies (the AWS SDK v3 ships with the runtime); the handler is `<fileName>.handler`
- The Cognito user pool and the `Users` / `RiftboundCards` tables hold real data and are **referenced, not owned**, by the stack — never add them as resources (the pool can't be recreated without losing every account)
- CI's own permissions live in `infra/bootstrap.yml`, deployed by hand; a new AWS service type in `backend.yml` needs a matching permission there first
- See `infra/README.md` for setup, adding a Lambda, and debugging failed deploys

### Auth

- Cognito JWT is the only auth mechanism — no sessions, no cookies beyond the token
- Lambda extracts the user ID from `event.requestContext.authorizer.jwt.claims.sub`
- Never trust user-supplied `userId` in request bodies — always derive it from the verified JWT
- Public routes (card browsing, news) require no auth — do not add Cognito authorisers to these API Gateway routes

---

## File Structure Conventions

```txt
src/
├── app/                  # Next.js App Router pages — server components only
│   ├── layout.js
│   ├── page.js           # / card search
│   ├── user/page.js      # /user profile
│   ├── news/page.js      # /news index
│   └── news/[slug]/page.js
├── components/           # Reusable UI — organised by domain
│   ├── layout/           # Navbar, Footer
│   ├── cards/            # CardGrid, CardItem, CardFilters, CardModal, CardText
│   ├── user/             # DeckList, DeckCard, MatchHistory, ProfileHeader
│   └── news/             # PostCard, PostContent
├── hooks/                # Custom React hooks — client-side logic only
│   ├── useCardFilters.js
│   └── useAuth.js
├── lib/                  # Pure utilities — no React, no UI
│   ├── db.js             # DynamoDB client
│   ├── cards.js          # Card queries
│   ├── posts.js          # Markdown reader (server-only)
│   ├── api.js            # fetch wrappers for API Gateway
│   ├── cardTextParser.js # [Keyword] badge parser
│   └── data.js           # Static constants, design tokens, colour config
└── actions/              # Next.js Server Actions (mutations only)
```

- **Never** put database logic in a component file
- **Never** put UI logic in a `lib/` file
- **Never** create a file outside this structure without a clear reason

---

## Styling Conventions

- **Inline styles only** — all styles are written as JavaScript objects on the element
- **No** CSS files, CSS modules, Tailwind classes, styled-components, or `<style>` tags — not even for hover states
- All shared design values (colours, font names, glow configs) live in `src/lib/data.js` — never hardcode hex values or font names in components
- **Never declare CSS classes in a `<style>` tag** — this includes hover, focus, and animation rules
- For hover effects: use `onMouseEnter`/`onMouseLeave` to mutate `e.currentTarget.style` directly, or drive styles from a React state variable (e.g. `hoveredId`)
- For focus effects: use `onFocus`/`onBlur` to mutate `e.target.style` directly
- For active/selected states: derive styles conditionally from existing state (e.g. `isActive ? colorA : colorB`)

```js
// CORRECT — inline style, hover via event handler
<div
  onMouseEnter={e => { e.currentTarget.style.background = "#0d0f17"; }}
  onMouseLeave={e => { e.currentTarget.style.background = "transparent"; }}
  style={{ background: COLORS.bgCard, borderRadius: 10, padding: 14 }}
/>

// CORRECT — active state from React state
<button style={{ color: isActive ? "#e8d090" : "#6a6a8a" }} />

// WRONG — class declared in a <style> tag
<style>{`.card:hover { background: #0d0f17; }`}</style>
<div className="card" />

// WRONG — className on any element
<div className="card-item" style={{ padding: 14 }}>
```

### Colour and typography tokens (from `src/lib/data.js`)

The site has a dark (default) and a light theme, switched by the toggle at the
top right of the navbar. Each `COLORS` value is a CSS variable (`COLORS.bgCard`
is `"var(--bg-card)"`); `BASE_STYLES` points the variables at the palette in
`THEMES.dark` or `THEMES.light`, keyed off `<html data-theme="light">`. The
choice is saved in localStorage and applied before first paint by the inline
script in `src/app/layout.js`; `useTheme` (`src/hooks/useTheme.js`) reads and flips it.

```js
// token          dark      light
COLORS.bg // #121212 #f3f3f3 — page background
COLORS.bgAlt // #161616 #ebebeb — sidebar background
COLORS.bgCard // #1a1a1a #ffffff — card background
COLORS.bgRaised // #202020 #f7f7f7 — inputs, buttons, raised rows
COLORS.bgHover // #242424 #e9e9e9 — row / menu item hover
COLORS.border // #333333 #d6d6d6 — default hairline border
COLORS.borderHover // #4a4a4a #b4b4b4
COLORS.text // #d8d8d8 #1c1c1c — primary text
COLORS.textStrong // #e8e8e8 #0a0a0a — headings, titles
COLORS.textMuted // #8a8a8d #5e5e62 — secondary text
COLORS.textDim // #5f5f62 #8e8e92 — disabled/hint text
COLORS.accent // #6aa8ff #2563c9 — the one blue (same as draw); deeper in light mode for contrast
COLORS.accentDim // #4a76b3 #93b1e6
COLORS.accentGlow // accent at 20%
COLORS.shadow // popover / lifted-card drop shadow
COLORS.win // #5fbf5f #2e8a3a
COLORS.loss // #cc6060 #c24848
COLORS.draw // #6aa8ff #2563c9
```

- Never write a theme colour as a hex literal in a component — it won't switch
  with the theme. Use the `COLORS` token
- For a translucent token use `alpha(COLORS.accent, 33)` from `src/lib/data.js`.
  Appending a hex alpha suffix (`COLORS.accent + "55"`) produces invalid CSS
  because the token is a `var()`
- To add a token, add it to both `THEMES.dark` and `THEMES.light`; `COLORS` and
  the CSS variables are generated from them

- UI font: `FONT_MONO` from `src/lib/data.js` (Geist Mono, falling back to the
  system monospace stack) — import it, never write a font name in a component
- Dev log font: `FONT_SANS` (DM Sans) is for the `/devlog` routes only.
  `src/app/devlog/layout.js` loads it and sets it as the inherited font there;
  inline `code` in a log stays `FONT_MONO`. Don't use it on other pages
- Corners are square — no `borderRadius` except `50%` for circular avatars
- Emphasis comes from brightness, not hue. The only saturated colours in the UI
  are the semantic win/loss/draw tokens and the game's own rune/rarity colours
  in `src/lib/cards/data.js`
- Never use system fonts (Arial, Inter, Roboto) anywhere in the UI

### Phone layouts

Phones (≤ `MOBILE_MAX_WIDTH`, 640px) get their own layouts; navigation stays at
the top (logo bar + a row of page links), not a bottom tab bar. Two mechanisms,
picked by whether the markup is server-rendered:

- **Server-rendered markup** (navbar, card grid, deck filters, news, dev log,
  sign-in) switches with CSS variables from `src/lib/data.js`, set by one media
  query in `BASE_STYLES` — the same mechanism as the theme, so the first paint is
  already right and nothing flashes. `SHOW.mobileFlex` / `SHOW.desktopBlock` etc.
  show an element on one layout only; `LAYOUT` holds values that differ
  (`navHeight` for sticky offsets, `contentPad`, card-grid gaps); spread `STRIP`
  into a container to get a grid on desktop that swipes sideways on phones.
  Prefer intrinsic CSS (`clamp()`, `min()`, `flexWrap`) when it does the job
- **Client-only UI** (anything that renders after sign-in or a tap — the profile,
  sheets vs popovers) uses `useIsMobile()` from `src/hooks/useIsMobile.js`
- Pickers, filters, detail views and the deck builder are bottom sheets on
  phones: use `src/components/BottomSheet.js` (handle, title + 44px close,
  scrolling body, pinned footer; scrim / Esc / drag-down dismiss)
- Never use a native `<select>` — its option list is drawn by the OS and
  ignores the design. Use `src/components/Dropdown.js` (`variant` "field" /
  "compact" / "text"): a square popover on desktop, a bottom sheet on phones,
  keyboard-operable
- Phone touch targets are ≥ 44px (primary rows and buttons 48px); text inputs
  use 16px type so iOS doesn't zoom on focus
- The phone profile is `src/components/user/MobileProfile.js`; it takes the
  same state and handlers as the desktop profile from `UserProfile.js`

---

## Component Conventions

### Naming

- Component files use **PascalCase**: `CardGrid.js`, `CardModal.js`
- Hook files use **camelCase** with `use` prefix: `useCardFilters.js`
- Lib files use **camelCase**: `cardTextParser.js`, `posts.js`
- Page files are always named `page.js` per Next.js App Router convention

### Formatting

- **Never vertically align code with extra spaces.** Do not pad assignments, object keys, or values to line up `=`, `:`, or values across adjacent lines. Use a single space after `:` and around `=`, always.
- Alignment breaks the moment one line's name changes length, producing noisy diffs where only whitespace moved — and it fights the formatter, which strips it back out.

```js
// WRONG — padded to align
const winRate    = 0.72;
const rank       = "Platinum";
username:  "ShadowRift",
avatar:    "🧙",

// CORRECT — single space, no alignment
const winRate = 0.72;
const rank = "Platinum";
username: "ShadowRift",
avatar: "🧙",
```

### Client components

- Always declare `"use client"` as the **first line** of the file
- Never import server-only modules (`fs`, `path`, `postgres`, `server-only`)
- Receive all external data via props — never fetch inside a client component

### Card text rendering

- Never render `ability_text` or `effect_text` as raw strings — always pass through `CardText` component
- `_html` fields from the database may be rendered with `dangerouslySetInnerHTML` for display only — never use `_html` fields for logic or filtering
- `[Keyword]` badges use `skewX(-12deg)` parallelogram shape and map to `KEYWORD_STYLES` in `cardTextParser.js`

### Next.js Image

- Always use `<Image>` from `next/image` for card images — never a plain `<img>` tag
- Card images use `objectFit: "contain"` not `"cover"` to avoid distortion
- Allowed external domains: `cmsassets.rgpub.io`, `assetcdn.rgpub.io` (configured in `next.config.js`)

---

## Known Pitfalls — Do Not Repeat

| Issue | Cause | Fix |
| --- | --- | --- |
| `Module not found: fs` | Node.js import inside `"use client"` file | Move DB/file reads to server component |
| Hydration mismatch | Inline `<style>` tags rendered on server | Add `suppressHydrationWarning` to root or avoid inline style tags |
| Event handlers on server component | `onMouseEnter`/`onMouseLeave` in non-client file | Use CSS hover classes or mark component `"use client"` |
| `undefined.md` on Vercel | `params.slug` accessed directly in Next.js 15 | Use `await props.params` instead |
| `.next` tracked by git | Committed before `.gitignore` rule existed | Run `git rm -r --cached .next` |
| Vercel build failing | Output directory set to `build` | Set output directory to `.next` in Vercel project settings |
| `Error: Region is missing` on Vercel build | `AWS_*` env names are reserved by Vercel and never reach the build | Set `RIFTBOUND_AWS_REGION` / `RIFTBOUND_AWS_ACCESS_KEY_ID` / `RIFTBOUND_AWS_SECRET_ACCESS_KEY` in Vercel project settings |
| 0 cards returned | Table name casing mismatch or missing env var | Check `DYNAMODB_TABLE_CARDS` in `.env.local`, verify table name in AWS Console |

---

## Environment Variables

All environment variables must be defined in `.env.local` for local development and in Vercel project settings for production. Never commit `.env.local` to git.

```bash
# Local only — Vercel reserves the AWS_* names, see below
AWS_REGION=ap-southeast-2
AWS_ACCESS_KEY_ID=
AWS_SECRET_ACCESS_KEY=
DYNAMODB_TABLE_CARDS=Cards
DYNAMODB_TABLE_USERS=Users
DYNAMODB_TABLE_DECKS=Decks
DYNAMODB_TABLE_DECK_VERSIONS=DeckVersions
DYNAMODB_TABLE_HISTORY=MatchHistory
NEXT_PUBLIC_API_URL=              # API Gateway base URL (when Lambda is deployed)
NEXT_PUBLIC_COGNITO_POOL_ID=      # Cognito User Pool ID
NEXT_PUBLIC_COGNITO_CLIENT_ID=    # Cognito App Client ID
```

- **On Vercel, set `RIFTBOUND_AWS_REGION`, `RIFTBOUND_AWS_ACCESS_KEY_ID` and `RIFTBOUND_AWS_SECRET_ACCESS_KEY` instead of the `AWS_*` names.** Vercel reserves `AWS_*` for its own Lambda runtime, so those values never reach the build and prerendering fails with `Error: Region is missing`. `src/lib/db.js` reads the `RIFTBOUND_AWS_*` names first and falls back to `AWS_*` locally
- Variables prefixed `NEXT_PUBLIC_` are exposed to the browser — never put secrets here
- AWS credentials, secret keys, and connection strings must never have the `NEXT_PUBLIC_` prefix
- Restart `npm run dev` after any change to `.env.local`

---

## Git Conventions

- Never commit `.next/`, `node_modules/`, or `.env.local`
- Confirm `.gitignore` includes all three before the first commit on any new machine
- Use descriptive commit messages referencing what changed and why, not just what file changed

---

## SUMMARISE Command

When the user types `SUMMARISE`, generate a dev log entry and write it to a markdown file at `content/dev-log/DevLog_YYYYMMDD.md` using today's date.

If a file for today already exists, append to it rather than overwriting it.

### File naming

```txt
content/devlog/2026-04-06.md
content/devlog/2026-04-07.md
```

### Log number

Before writing, count the number of existing `.md` files in `content/devlog/`. The log number is that count + 1. If today's file already exists, keep its existing log number.

### Required format

```markdown
# [Full date e.g. Monday 6 April 2026] - Dev Log No. [N]

[2-3 sentence overview of what the session covered at a high level]

---

## Decisions Made
List every architectural or design decision reached this session.
For each decision include:
- What was decided
- Why it was decided (reasoning, trade-offs considered)

---

## Changes in Code
List every file created, modified, or deleted this session.
For each change include:
- File path
- What changed and why

---

## Topics Discussed
A concise summary of everything covered this session — questions asked,
concepts explored, options compared — even if they didn't result in a
code change or firm decision.

---

## Bug Fixes
List any bugs identified and fixed this session.
For each bug include:
- What the bug was
- Root cause
- How it was fixed

---

## Outstanding
Carry forward any unresolved issues, pending tasks, or follow-up questions
identified this session.
```

### Example header

```markdown
# Monday 6 April 2026 - Dev Log No. 1

Established the core architecture for Riftbound, migrated the database from
Neon Postgres to DynamoDB, and finalised the client-side filtering strategy.
Resolved six bugs across server/client boundaries, hydration, and Vercel
deployment configuration.
```

### Rules

- Always write the file — do not just print the summary to the chat
- Count existing files in `content/devlog/` to determine the log number before writing
- If a file for today already exists, append to it and keep the same log number
- Use today's actual date for the filename and the heading
- Be specific about file paths in the Changes section — `src/lib/cards.js` not just "the cards file"
- If no code changes occurred in a section, write "None this session" rather than omitting the section
- Decisions section must include the reasoning — not just what was decided

---

## Outstanding Work

- [ ] Populate Cards table via Python import script
- [ ] Resolve "0 cards found" bug on card search page
- [ ] Wire `getAllCards()` to live DynamoDB
- [ ] Deploy Lambda + API Gateway
- [ ] Implement Cognito sign up / sign in UI
- [ ] Build deck management UI with version history
- [ ] Connect `useAuth` hook to live Cognito pool
