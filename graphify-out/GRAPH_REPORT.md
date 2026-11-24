# Graph Report - covid-visualizer  (2026-11-23)

## Corpus Check
- Corpus is ~41,045 words - fits in a single context window. You may not need a graph.

## Summary
- 516 nodes · 849 edges · 20 communities (19 shown, 1 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 12 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- Package Manifest
- Runtime Dependencies
- Country UI Components
- App Shell & Routing
- COVID Data Fetcher
- Globe View
- Redux Store & Selectors
- Dev Tooling Deps
- TypeScript Config
- shadcn Config
- Constants & tRPC Client
- Map & Composition Hooks
- Color Utilities
- Chart Components
- NPM Scripts
- Vite Build Config
- Vite Entry Page
- Vercel Deploy Config
- Logo Image
- Todo Notes

## God Nodes (most connected - your core abstractions)
1. `cn()` - 21 edges
2. `react` - 21 edges
3. `Home()` - 17 edges
4. `useAppDispatch()` - 17 edges
5. `compilerOptions` - 16 edges
6. `GlobeView()` - 15 edges
7. `useAppSelector` - 14 edges
8. `CountryList()` - 12 edges
9. `getPandemicConfig()` - 12 edges
10. `PandemicType` - 12 edges

## Surprising Connections (you probably didn't know these)
- `CountryDetailModal()` --indirect_call--> `selectSelectedCountryData()`  [INFERRED]
  client/src/components/CountryDetailModal.tsx → client/src/store/pandemicSelectors.ts
- `CountryInfoPanel()` --indirect_call--> `selectSelectedCountryData()`  [INFERRED]
  client/src/components/CountryInfoPanel.tsx → client/src/store/selectors.ts
- `CountryList()` --calls--> `getPandemicConfig()`  [EXTRACTED]
  client/src/components/CountryList.tsx → client/src/config/pandemicConfig.ts
- `CountryList()` --indirect_call--> `selectActiveCountriesList()`  [INFERRED]
  client/src/components/CountryList.tsx → client/src/store/pandemicSelectors.ts
- `CountryList()` --indirect_call--> `selectActivePandemic()`  [INFERRED]
  client/src/components/CountryList.tsx → client/src/store/pandemicSelectors.ts

## Import Cycles
- None detected.

## Communities (20 total, 1 thin omitted)

### Community 0 - "Package Manifest"
Cohesion: 0.03
Nodes (76): license, name, type, version, add, autoprefixer, @aws-sdk/client-s3, @aws-sdk/s3-request-presigner (+68 more)

### Community 1 - "Runtime Dependencies"
Cohesion: 0.03
Nodes (76): dependencies, @aws-sdk/client-s3, @aws-sdk/s3-request-presigner, axios, baseline-browser-mapping, class-variance-authority, clsx, cmdk (+68 more)

### Community 2 - "Country UI Components"
Cohesion: 0.10
Nodes (35): CountryDetailModal(), CountryInfoPanel(), CountryList(), severity(), severityColor(), SortIcon(), SortKey, SortOrder (+27 more)

### Community 3 - "App Shell & Routing"
Cohesion: 0.07
Nodes (37): App(), Router(), ErrorBoundary, Props, State, Button(), buttonVariants, Card() (+29 more)

### Community 4 - "COVID Data Fetcher"
Cohesion: 0.07
Nodes (18): dataFetcher, DiseaseShCountry, DiseaseShGlobal, FALLBACK_COUNTRIES, FALLBACK_GLOBAL, normalizeCountry(), normalizeGlobal(), COUNTRY_CODE_MAP (+10 more)

### Community 5 - "Globe View"
Cohesion: 0.12
Nodes (31): GlobeLegend(), GlobeLegendProps, CountryMetrics, getMetricValue(), getPolygonCentroid(), GlobeView(), GlobeViewProps, hexToRgb() (+23 more)

### Community 6 - "Redux Store & Selectors"
Cohesion: 0.08
Nodes (9): CountryData, covidSlice, CovidState, GlobalStats, initialState, AppDispatch, RootState, store (+1 more)

### Community 7 - "Dev Tooling Deps"
Cohesion: 0.08
Nodes (25): devDependencies, add, autoprefixer, cross-env, drizzle-kit, esbuild, pnpm, postcss (+17 more)

### Community 8 - "TypeScript Config"
Cohesion: 0.10
Nodes (19): compilerOptions, allowImportingTsExtensions, baseUrl, esModuleInterop, incremental, jsx, lib, module (+11 more)

### Community 9 - "shadcn Config"
Cohesion: 0.12
Nodes (16): aliases, components, hooks, lib, ui, utils, rsc, $schema (+8 more)

### Community 10 - "Constants & tRPC Client"
Cohesion: 0.15
Nodes (11): APP_LOGO, APP_TITLE, getLoginUrl(), trpc, queryClient, redirectToLoginIfUnauthorized(), react-dom, superjson (+3 more)

### Community 11 - "Map & Composition Hooks"
Cohesion: 0.22
Nodes (10): loadMapScript(), MapView(), MapViewProps, Window, TimerResponse, useComposition(), UseCompositionOptions, UseCompositionReturn (+2 more)

### Community 12 - "Color Utilities"
Cohesion: 0.21
Nodes (7): getMetricColor(), hexToRgb(), interpolateColor(), MetricType, NormalizationType, normalizeValue(), rgbToHex()

### Community 13 - "Chart Components"
Cohesion: 0.24
Nodes (11): ChartConfig, ChartContainer(), ChartContext, ChartContextProps, ChartLegendContent(), ChartStyle(), ChartTooltipContent(), getPayloadConfigFromPayload() (+3 more)

### Community 14 - "NPM Scripts"
Cohesion: 0.20
Nodes (10): scripts, build, check, client:build, client:dev, db:push, dev, format (+2 more)

### Community 15 - "Vite Build Config"
Cohesion: 0.20
Nodes (6): @tailwindcss/vite, vite, vite-plugin-manus-runtime, @vitejs/plugin-react, vitest, plugins

### Community 16 - "Vite Entry Page"
Cohesion: 0.60
Nodes (5): index.html Vite entry page, src/main.tsx module script, div#root mount point, Umami analytics script, VITE_* env placeholders (app title, logo, analytics)

### Community 17 - "Vercel Deploy Config"
Cohesion: 0.40
Nodes (4): buildCommand, devCommand, outputDirectory, rewrites

### Community 18 - "Logo Image"
Cohesion: 0.67
Nodes (3): COVID Visualizer logo (virus with warning triangle), Red-orange coronavirus illustration split into quadrants by crosshair, White-outlined warning triangle with exclamation mark

## Knowledge Gaps
- **75 isolated node(s):** `@aws-sdk/client-s3`, `@aws-sdk/s3-request-presigner`, `@radix-ui/react-accordion`, `@radix-ui/react-alert-dialog`, `@radix-ui/react-aspect-ratio` (+70 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 318 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **1 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `dependencies` connect `Runtime Dependencies` to `Package Manifest`?**
  _High betweenness centrality (0.241) - this node is a cross-community bridge._
- **Are the 3 inferred relationships involving `Home()` (e.g. with `selectActiveLastFetch()` and `selectError()`) actually correct?**
  _`Home()` has 3 INFERRED edges - model-reasoned connections that need verification._
- **What connects `@aws-sdk/client-s3`, `@aws-sdk/s3-request-presigner`, `@radix-ui/react-accordion` to the rest of the system?**
  _75 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Package Manifest` be split into smaller, more focused modules?**
  _Cohesion score 0.025974025974025976 - nodes in this community are weakly interconnected._
- **Why does `react` connect `Country UI Components` to `Package Manifest`, `App Shell & Routing`, `Globe View`, `Map & Composition Hooks`, `Chart Components`?**
  _High betweenness centrality (0.235) - this node is a cross-community bridge._
- **Should `Runtime Dependencies` be split into smaller, more focused modules?**
  _Cohesion score 0.02631578947368421 - nodes in this community are weakly interconnected._
- **Why does `devDependencies` connect `Dev Tooling Deps` to `Package Manifest`?**
  _High betweenness centrality (0.082) - this node is a cross-community bridge._