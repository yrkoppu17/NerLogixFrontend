# NER-Logix Frontend (React + Vite)

Logistics and Accessibility Management Platform for the North Eastern Region — Frontend Application.

## Tech Stack
- **Framework:** React 18, Vite, TypeScript
- **Styling:** Tailwind CSS, Framer Motion, Lucide Icons, Lenis (smooth scroll)
- **Maps & Charts:** React-Leaflet, CARTO Basemaps, Recharts
- **State & Data Fetching:** TanStack Query, Axios, Context API, SSE (`@microsoft/fetch-event-source`)
- **PWA:** `vite-plugin-pwa`, `idb` for offline persistence

## Local Development

```bash
# Install dependencies
npm install

# Start Vite dev server (proxies /api to http://localhost:8080 by default)
npm run dev

# Run type check, linter, and unit tests
npm run typecheck
npm run lint
npm test
```

## Deployment to Vercel

This frontend app is ready to deploy independently to Vercel.

1. **Import Repository to Vercel:**
   - Select the `NerLogixFrontend` repository (or root directory `/frontend` if using monorepo).
   - Framework Preset: **Vite**
   - Root Directory: `frontend` (or `./` if deploying from the `NerLogixFrontend` repo).

2. **Environment Variables on Vercel:**
   Set the following environment variables in your Vercel project settings:
   - `VITE_API_BASE_URL`: The full URL of your deployed Spring Boot backend on Render, e.g. `https://nerlogix-backend.onrender.com/api`
   - `VITE_GOOGLE_MAPS_API_KEY`: (Optional) Google Maps JS API key
   - `VITE_GOOGLE_MAP_ID`: (Optional) Google Map style ID

3. **Routing Configuration:**
   - `vercel.json` is included in the project root with single-page app rewrite rules:
     ```json
     {
       "rewrites": [
         { "source": "/(.*)", "destination": "/index.html" }
       ]
     }
     ```
