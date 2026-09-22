<p align="center">
    <img src="assets/icon-192.png" width="96" alt="JourneyMate logo" />
</p>

<h1 align="center">JourneyMate</h1>
<p align="center"><em>Plan less, experience more.</em></p>

<p align="center">
    <a href="https://stevensu04.github.io/journeymate/"><strong>▶ Live demo</strong></a>
</p>

JourneyMate is a mobile-first trip planner prototype built during the **UQ Ventures** program.
It combines a simple trip organiser with an AI assistant that suggests itinerary tweaks
(weather backups, traffic timing, budget tips), using a daily-token reward model.

> This is a front-end prototype: sign-in is mocked and all data is stored in your browser's `localStorage`.
> Click **"Try the demo"** on the sign-in screen to jump straight in.

## Features

The features connect into one loop: **discover → save → plan → travel → review → earn**.

- **MyJourney** – upcoming / completed / canceled trips, with a nudge to review finished trips
- **Planner** – pick dates on a calendar, create or edit a trip, add stops, cancel or restore, save as a template
- **Saved**
  - *Places* – 38 curated Queensland spots, filter by category, add to a trip in one tap
  - *Tips* – bookmark AI suggestions and apply them to any trip later
  - *Templates* – reuse a past trip with new dates
- **My Reviews** – star ratings, tags and notes for trips and places; completed trips show up in a "to review" list
- **Wallet**
  - *Tokens* – balance, ways to earn, achievements and a full history ledger
  - *Expenses* – track spending per trip against the budget, with a category breakdown
- **AI suggestions** – context-aware tips for the trip you're viewing; applying one costs 🪙1
- **Gamification** – daily reward, 3/7-day streak bonuses, review and trip-completion rewards, 7 achievements
  (rewards are once per item and reviews are capped at 3 a day to prevent farming)
- **Map** – embedded Google Maps search, curated picks for the city, "use my location"
- Installable as a home-screen app (web manifest + icons)

## Tech

Plain HTML, CSS and vanilla JavaScript ES modules — no build step, no dependencies.

```
index.html              App shell (bottom nav, AI panel, toast)
styles.css              Styles
js/
  main.js               Boot
  router.js             Hash router
  store.js              State, localStorage persistence + schema migration, token ledger, achievements, demo seed
  utils.js              DOM, date and formatting helpers
  data/places.js        Curated places
  ui/                   Sheet, toast, stars, place cards, review sheet, badges, AI panel
  views/                One module per screen
assets/                 Logo and icons
```

## Run locally

```bash
python3 -m http.server 5173
```

Then open <http://localhost:5173>.

## Deploy

The site is served by **GitHub Pages** from the `main` branch root. Any push to `main` redeploys it.
