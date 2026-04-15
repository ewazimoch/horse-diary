# Horse Diary

A mobile-first Progressive Web App for digitalising equestrian logistics and horse health history. Horse Diary replaces paper notebooks with a fast, offline-capable journal that horse owners can fill in straight from the stable.

## Table of Contents

- [Project Description](#project-description)
- [Tech Stack](#tech-stack)
- [Getting Started Locally](#getting-started-locally)
- [Available Scripts](#available-scripts)
- [Project Scope](#project-scope)
- [Project Status](#project-status)
- [License](#license)

---

## Project Description

Horse Diary is an MVP application built around two core modules:

- **Day Module** — a short, structured daily log capturing the horse's mood (emoji rating), activities (icon-based multi-select), and an optional free-text note.
- **Health Module** — a medical event tracker for farrier visits, vet appointments, vaccinations, and deworming, each with a date and optional note.

Both modules feed a unified **Timeline** — a static weekly view (Monday–Sunday) that surfaces health events at the top of each day, above daily logs, with visual distinction between past and upcoming events. A horse profile switcher in the top navigation bar allows one user account to manage multiple horses.

The app works offline as a PWA: entries are saved to IndexedDB when there is no network connection and automatically synced to Supabase once connectivity is restored, with a Toast notification confirming the background sync.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Application framework | [Astro 5](https://astro.build/) (SSR, `output: "server"`) |
| UI library | [React 19](https://react.dev/) (Islands architecture) |
| Language | [TypeScript 5](https://www.typescriptlang.org/) |
| Styling | [Tailwind CSS 4](https://tailwindcss.com/) |
| Component library | [shadcn/ui](https://ui.shadcn.com/) — New York style variant |
| Backend / Auth / DB | [Supabase](https://supabase.com/) (PostgreSQL + Row Level Security) |
| AI gateway | [OpenRouter.ai](https://openrouter.ai/) |
| CI / CD | [GitHub Actions](https://github.com/features/actions) |
| Hosting | [DigitalOcean](https://www.digitalocean.com/) |
| Runtime | Node.js 22.14.0 |

---

## Getting Started Locally

### Prerequisites

- **Node.js** `22.14.0` (see `.nvmrc` — use `nvm use` to switch automatically)
- **npm**
- A **Supabase** project with its URL and anon key

### Steps

1. **Clone the repository**

   ```bash
   git clone https://github.com/<your-org>/horse-diary.git
   cd horse-diary
   ```

2. **Install dependencies**

   ```bash
   npm install
   ```

3. **Configure environment variables**

   ```bash
   cp .env.example .env
   ```

   Open `.env` and fill in the required values:

   ```env
   SUPABASE_URL=your_supabase_project_url
   SUPABASE_KEY=your_supabase_anon_key
   ```

4. **(Optional) Start a local Supabase instance**

   Requires [Docker](https://www.docker.com/).

   ```bash
   npx supabase start
   ```

5. **Start the development server**

   ```bash
   npm run dev
   ```

   The app is available at `http://localhost:3000`.

---

## Available Scripts

| Script | Description |
|---|---|
| `npm run dev` | Start the development server on port 3000 |
| `npm run build` | Create a production build (SSR via `@astrojs/node` standalone adapter) |
| `npm run preview` | Preview the production build locally |
| `npm run lint` | Run ESLint across the project |
| `npm run lint:fix` | Run ESLint and auto-fix fixable issues |
| `npm run format` | Format all files with Prettier |

> **Pre-commit hooks** (Husky + lint-staged) run `eslint --fix` on `*.{ts,tsx,astro}` and `prettier --write` on `*.{json,css,md}` automatically before each commit.

---

## Project Scope

### In scope (MVP)

- Secure email/password authentication via Supabase
- One-time onboarding screen asking for the first horse's name
- Multiple horse profiles per account with a top-nav profile switcher
- **Day Module**: daily journal with emoji mood rating, activity icon multi-select, and optional text description
- **Health Module**: medical event log (farrier, vet, vaccination, deworming) with date and optional note
- **Timeline**: unified weekly view (Mon–Sun) combining both modules, health events pinned above daily logs
- **Aggregate views**: filter the timeline to a single health event type for long-term history browsing
- Edit and delete entries via a three-dot dropdown menu on each timeline card
- PWA support with offline entry capture (IndexedDB) and automatic background sync to Supabase

### Out of scope

- Push or email reminders and notifications
- Detailed veterinary lab result tracking or blood parameter input
- Multimedia or photo uploads
- Granular daily metrics (temperature, pulse, diet, equipment)
- Report generation, data export, or sharing

---

## Project Status

**MVP — closed beta**

The application is under active development and is being validated with a small closed group (the author and friends, across 2+ horses). The primary success criterion is the adoption of Horse Diary as a full replacement for paper notebooks, measured by an average of at least **4 new entries per user per week** over **4 consecutive weeks** from the start of the production test phase.

---

## License

This project is licensed under the [MIT License](LICENSE).
