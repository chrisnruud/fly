# A320-251N Seat Map

A small Vue 3 + Pinia app that renders a A320-251N (A20N) cabin, pre-filled from
`src/seatassignments.txt`. Click any seat to view the passenger, edit the name,
or move/swap them to another seat. Changes can be saved to the browser session.

## Features

- A320-251N (A20N) 3–3 cabin layout (rows derived from the data file).
- Two flights: **Utreise** (outbound) and **Retur** (return).
- Passenger names stored in a Pinia store, seeded from `seatassignments.txt`.
- Click a seat → popup showing the passenger name.
- Edit, clear, or move/swap seat assignments.
- **Save to session** persists edits to `sessionStorage`; **Reset** restores the
  original assignments.

## Develop

```bash
npm install
npm run dev
```

## Build

```bash
npm run build      # type-checks then outputs static files to dist/
npm run preview    # serve the production build locally
```

## Deploy to GitHub Pages

The build uses a relative `base` (`./`), so it works on any Pages URL.

1. Push to the `main` branch.
2. In the repo settings, set **Settings → Pages → Build and deployment →
   Source** to **GitHub Actions**.
3. The included workflow (`.github/workflows/deploy.yml`) builds and publishes
   `dist/` automatically.

## Data format

`src/seatassignments.txt` uses section headers `Utreise` / `Retur` followed by
lines like:

```
27B – AMIRI/YASNA
```
