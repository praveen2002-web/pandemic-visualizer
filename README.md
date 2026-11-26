# Pandemic Visualizer

A React and TypeScript dashboard for viewing COVID-19, Ebola, and West Nile data on an interactive globe or in a country list.

## Requirements

- Node.js
- npm

## Development

```sh
npm install
npm run dev
```

The development server is provided by Vite. Build and verify the project with:

```sh
npm run build
npm run check
npm test
```

## Data sources and freshness

- COVID-19 totals and country data come from disease.sh. Its endpoints are polled every two minutes, but polling does not mean the underlying reports are current; check the dates shown in the historical charts.
- COVID-19 vaccination percentages come from Our World in Data's public vaccination dataset. The dashboard uses the latest available fully vaccinated percentage, falling back to the percentage with at least one dose when needed.
- Ebola and West Nile data are bundled JSON files in `client/public/`.
- The globe's Natural Earth country boundaries are bundled in `client/public/`.

The dashboard uses a built-in 2023 COVID-19 snapshot when disease.sh is unavailable.
