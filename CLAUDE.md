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
- **Fonts:** Cinzel (display/headings), Crimson Pro (body text)

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
- MatchHistory and DeckVersions writes must always include a `ttl` field (Unix timestamp, 90 days)
- Deck saves must use `TransactWriteCommand` to atomically write both the Decks record and DeckVersions snapshot

### Auth

- Cognito JWT is the only auth mechanism — no sessions, no cookies beyond the token
- Lambda extracts the user ID from `event.requestContext.authorizer.jwt.claims.sub`
- Never trust user-supplied `userId` in request bodies — always derive it from the verified JWT
- Public routes (card browsing, news) require no auth — do not add Cognito authorisers to these API Gateway routes

---

## File Structure Conventions

```
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
- **No** CSS files, CSS modules, Tailwind classes, or styled-components
- All shared design values (colours, font names, glow configs) live in `src/lib/data.js` — never hardcode hex values or font names in components
- Use CSS class strings only for hover states and animations where inline styles are insufficient — define these in a `<style>` tag in the nearest layout or page file

```js
// CORRECT
<div style={{ background: COLORS.bgCard, borderRadius: 10, padding: 14 }}>

// WRONG
<div className="card-item" style={{ padding: 14 }}>
```

### Colour and typography tokens (from `src/lib/data.js`)

```js
COLORS.bg         // #080b12 — page background
COLORS.bgAlt      // #090c14 — sidebar background
COLORS.bgCard     // #10121a — card background
COLORS.border     // #1a1c28 — default border
COLORS.text       // #e8e0d0 — primary text
COLORS.textMuted  // #6a6a8a — secondary text
COLORS.textDim    // #3a3a5a — disabled/hint text
COLORS.gold       // #e8d090 — accent gold
```

- Display font: `Cinzel, serif` — headings, labels, nav, card names
- Body font: `Crimson Pro, serif` — body text, card descriptions, prose
- Never use system fonts (Arial, Inter, Roboto) anywhere in the UI

---

## Component Conventions

### Naming
- Component files use **PascalCase**: `CardGrid.js`, `CardModal.js`
- Hook files use **camelCase** with `use` prefix: `useCardFilters.js`
- Lib files use **camelCase**: `cardTextParser.js`, `posts.js`
- Page files are always named `page.js` per Next.js App Router convention

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
|---|---|---|
| `Module not found: fs` | Node.js import inside `"use client"` file | Move DB/file reads to server component |
| Hydration mismatch | Inline `<style>` tags rendered on server | Add `suppressHydrationWarning` to root or avoid inline style tags |
| Event handlers on server component | `onMouseEnter`/`onMouseLeave` in non-client file | Use CSS hover classes or mark component `"use client"` |
| `undefined.md` on Vercel | `params.slug` accessed directly in Next.js 15 | Use `await props.params` instead |
| `.next` tracked by git | Committed before `.gitignore` rule existed | Run `git rm -r --cached .next` |
| Vercel build failing | Output directory set to `build` | Set output directory to `.next` in Vercel project settings |
| 0 cards returned | Table name casing mismatch or missing env var | Check `DYNAMODB_TABLE_CARDS` in `.env.local`, verify table name in AWS Console |

---

## Environment Variables

All environment variables must be defined in `.env.local` for local development and in Vercel project settings for production. Never commit `.env.local` to git.

```bash
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
```
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