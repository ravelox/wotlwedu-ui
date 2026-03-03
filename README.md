# wotlwedu-ui

React + Vite frontend for the wotlwedu ecosystem. This app provides the browser UI for authentication, profile management, voting flows, elections, notifications, preferences, and workgroup-scoped content management against the wotlwedu backend API.

## Stack

- React 18
- React Router 6
- Axios
- Vite 5
- Nginx runtime image via multi-stage Docker build

## Scripts

```bash
npm install
npm run dev
npm run build
npm run preview
```

## Environment

The app reads these Vite variables at build time:

- `VITE_WOTLWEDU_API_BASE_URL`: backend API origin. Defaults to `https://api.wotlwedu.com:9876`.
- `VITE_APP_VERSION`: version label shown in the app chrome. Defaults to `0.1.0`.

The selected API base URL is also persisted in browser storage under `wotlwedu_ui_api_base_url`.

## Local Storage

- `wotlwedu_ui_session`: authenticated session payload, including auth and refresh tokens.
- `wotlwedu_ui_active_workgroup`: selected workgroup scope for workgroup-scoped resources.

## Main Flows

Public routes:

- `/login`
- `/register`
- `/confirm/:tokenId`
- `/pwdrequest`
- `/pwdreset/:userId/:resetToken`
- `/auth/verify/:userId/:verificationToken`

Authenticated app routes:

- `/app/home`
- `/app/cast-vote`
- `/app/cast-vote/:electionId`
- `/app/elections`
- `/app/friend`
- `/app/notification`
- `/app/profile`
- `/app/preference`
- `/app/statistics/:electionId`
- `/app/image`
- `/app/item`
- `/app/list`
- `/app/election`

Legacy top-level paths redirect into `/app/*` routes to preserve compatibility with older links.

## Backend Dependencies

The UI expects the backend to expose endpoints for:

- authentication and 2FA
- registration and confirmation
- password reset
- user profile and friend relationships
- notifications
- workgroups and categories
- images, items, lists, and elections
- vote retrieval and decision submission
- election statistics

`src/lib/api.js` centralizes axios setup, bearer token injection, JSON defaults, and unauthorized-session handling.

## Docker

The included `Dockerfile` builds the Vite bundle with Node 20 Alpine and serves the static output from `nginx:1.27-alpine` on port `80`.

## Project Layout

- `src/App.jsx`: route graph and session bootstrap
- `src/components/`: shared chrome and reusable UI pieces
- `src/pages/`: route-level screens
- `src/lib/`: API, session, and workgroup scope utilities
- `src/styles.css`: global styling and layout system

