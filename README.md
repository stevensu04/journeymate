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

- **MyJourney** – upcoming / completed / canceled trips, sorted by date
- **Planner** – pick a date range on a calendar, then create or edit a trip (destination, dates, budget, notes); cancel or restore trips
- **AI suggestions** – context-aware tips for the trip you're viewing; applying one costs 🪙1 token and adds it to your notes
- **Daily token** – claim one free token per day (simulated rewarded ad)
- **Map** – embedded Google Maps search, "use my location", and open in Google Maps
- **Share** – native share sheet on mobile, clipboard fallback on desktop
- Installable as a home-screen app (web manifest + icons)

## Tech

Plain HTML, CSS and vanilla JavaScript — no build step, no dependencies.

```
index.html              App shell (bottom nav, AI panel, toast)
app.js                  Hash router, views, state (localStorage)
styles.css              Styles
manifest.webmanifest    PWA manifest
assets/                 Logo and icons
```

## Run locally

```bash
python3 -m http.server 5173
```

Then open <http://localhost:5173>.

## Deploy

The site is served by **GitHub Pages** from the `main` branch root. Any push to `main` redeploys it.
