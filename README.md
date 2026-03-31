# Riftbound — Next.js App

A full-stack card database and community app for the Riftbound TCG, built with Next.js 14 (App Router).

## Project Structure

```txt
riftbound/
├── content/
│   └── news/                  # Markdown blog posts (add .md files here)
├── src/
│   ├── app/
│   │   ├── layout.js          # Root layout (Navbar, fonts, global styles)
│   │   ├── page.js            # Card search page (/)
│   │   ├── user/
│   │   │   └── page.js        # User profile (/user)
│   │   └── news/
│   │       ├── page.js        # News index (/news)
│   │       └── [slug]/
│   │           └── page.js    # Individual post (/news/[slug])
│   ├── components/
│   │   └── Navbar.js          # Shared navigation bar
│   └── lib/
│       ├── data.js            # Card data, color config, design tokens
│       └── posts.js           # Markdown post utilities
```

## Getting Started

### 1. Install dependencies

```bash
npm install
```

### 2. Run development server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### 3. Build for production

```bash
npm run build
npm start
```

---

## Adding News Posts

Create a new `.md` file in `content/news/`. Frontmatter fields:

```markdown
---
title: "Your Post Title"
date: "2026-03-28"
author: "Author Name"
category: "Set Release"        # Set Release | Meta Report | Announcement | Dev Diary | Tournament
excerpt: "Short description shown on the index page."
---

Your post content in **Markdown** here.
```

---

## Connecting to AWS Backend

### Cards (DynamoDB)

Replace the `CARDS` array in `src/lib/data.js` with a fetch call:

```js
// In a Server Component or useEffect:
const res = await fetch("https://YOUR_API_ID.execute-api.ap-southeast-2.amazonaws.com/prod/cards");
const cards = await res.json();
```

### Auth (Cognito)

Install the Amplify SDK:

```bash
npm install aws-amplify
```

Add `src/lib/amplify.js`:

```js
import { Amplify } from "aws-amplify";
Amplify.configure({
  Auth: {
    region: "ap-southeast-2",
    userPoolId: "YOUR_USER_POOL_ID",
    userPoolWebClientId: "YOUR_CLIENT_ID",
  },
});
```

Import this in `src/app/layout.js` to initialise on every page.

### User Data (DynamoDB)

Replace mock `USER`, `DECKS`, and `MATCH_HISTORY` in `src/app/user/page.js` with API calls to your user/decks endpoints, using the Cognito JWT token as the `Authorization` header.

---

## AWS Deployment (S3 + CloudFront)

Since the news pages use `generateStaticParams`, you can export as a static site:

```bash
# next.config.js: add output: 'export'
npm run build
# Upload /out folder to your S3 bucket
```

Or deploy as a Node.js app on **AWS Lambda** using the [OpenNext](https://open-next.js.org/) adapter.

---

## Pages

| Route          | Description                                 |
|----------------|---------------------------------------------|
| `/`            | Card search with filters (color, cost, tag) |
| `/user`        | Profile, decks, match history               |
| `/news`        | News/blog index                             |
| `/news/[slug]` | Individual post                             |
