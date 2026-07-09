# RocketLab Telemetry Frontend

A React + Vite + TypeScript single-page app for ingesting satellite telemetry
readings and browsing them with filtering and pagination. I choose react for its flexibility and speed in allowing the ui component 
definition and functionality to be present in the same file, perfect for a small application such as this with minimal 
scope. Vite as the fast build tool and typescript to help define the shape of the data and make it easier to validate data in the UI.
A permanent form component was added at the top as there were few UI elements required to be shown apart from the table.
I defined components with more complex logic, managing state in their own controllers along with context objects describing
the values actively holding state variables.  As the mock telemetry data shape is high-structured a table layout made the most sense. 
I chose more interactivity with the table itself, allowing the user to delete multiple records at a time for a better
user experience at the cost of higher complexity for the table component. 

The form validates user input in real-time, displaying messages if the input is not of the accepted type. 

Provided error messages for timeouts and network failure, and cached the most recent result. Upon a failed attempt, 
to refresh the most recent data remains in favor of clearing it and showing nothing. No authentication added as for the
purposes of this evaluation it would make it more complicated to access. A real service would require at the very least some type of token authorization.


## Features

- **Ingest** new readings via a validated form — every field is checked
  client-side with inline error indicators before the request is sent, and
  duplicates (409) are reported.
- **Browse** readings in a sortable table (timestamp, altitude, velocity) with
  filtering by satellite ID and health status, plus paginated navigation.
- **Batch delete**: select readings with checkboxes (or select-all) and delete
  them one by one with live progress.
- **Resilient UX**: cached GETs, a loading spinner while fetching, and
  user-facing messages for every error code — including timeouts when the
  backend is unreachable.

## Stack

- **React 19** + **TypeScript**
- **Vite** dev server / build
- Plain `fetch` + React context/reducer state — no data-fetching or state
  library dependencies.

## Prerequisites

- **Node.js** 20.19+ or 22.12+
- **npm** (bundled with Node)

## Install

```bash
npm install
```

## Commands

| Command           | Description                              |
|-------------------|------------------------------------------|
| `npm install`     | Install dependencies (first run only)    |
| `npm run dev`     | Start the Vite dev server (hot reload)   |
| `npm run build`   | Type-check (`tsc -b`) and build to `dist/` |
| `npm run preview` | Serve the production build locally       |
| `npm run lint`    | Run ESLint                               |
| `npm test`        | Run the unit tests (Vitest + happy-dom)  |
| `npm run test:watch` | Run tests in watch mode               |

### Develop

```bash
npm run dev
```

Then open <http://localhost:5173>.

### Build for production

```bash
npm run build      # outputs to dist/
npm run preview    # preview the built app locally
```

## Configuration

The app reads its configuration from environment variables. Copy the example
file and adjust as needed:

```bash
cp .env.example .env
```

| Variable                | Purpose                                                                 |
|-------------------------|-------------------------------------------------------------------------|
| `VITE_API_BASE_URL`     | API origin the browser calls. Empty ⇒ use the dev proxy (default).      |
| `VITE_API_PROXY_TARGET` | Dev-only proxy target for API requests (default `http://localhost:8000`). |

In development, the Vite dev server proxies API requests to
`VITE_API_PROXY_TARGET`, so no CORS setup is needed. For production, set
`VITE_API_BASE_URL` to the deployed API origin.

## Project structure

```
src/
  api/           HTTP client + typed endpoint wrappers
  components/    UI: ingest form, filters, table, pagination, banners
  test/          Unit tests, test setup, and shared helpers
  types/         Shared TypeScript types
  App.tsx        Dashboard composition
```
