# AGENTS.md (wotlwedu-ui)

Local instructions for Codex-style agents working in this repository.

## Repo Summary

- App: browser frontend for the wotlwedu ecosystem
- Stack: React + Vite + React Router + Axios
- Deploy target: static bundle served by Nginx
- Default backend: `https://api.wotlwedu.com:9876`

## Key Commands

```bash
npm install
npm run dev
npm run build
npm run preview
```

## Runtime Notes

- Auth state is stored in browser local storage under `wotlwedu_ui_session`.
- The selected workgroup scope is stored under `wotlwedu_ui_active_workgroup`.
- The API base URL is built from `VITE_WOTLWEDU_API_BASE_URL` and can also be persisted per browser session.
- Unauthorized API responses trigger a local logout through the axios interceptor in `src/lib/api.js`.

## Where To Make Changes

- Route composition and auth redirects: `src/App.jsx`
- Shared application chrome: `src/components/`
- Route-level screens: `src/pages/`
- API/session/workgroup helpers: `src/lib/`
- Global styling: `src/styles.css`
- Build and container config: `package.json`, `vite.config.js`, `Dockerfile`

## Route Areas

- Public auth flows: login, register, confirmation, password reset, 2FA verification
- Authenticated app flows: dashboard, elections, voting, friends, notifications, profile, preferences, statistics
- Workgroup-scoped content management: images, items, lists, elections

## Repo Hygiene

- Do not commit `node_modules/`, `dist/`, `.env*`, secrets, or generated archives.
- Keep `README.md` and `CHANGELOG.md` aligned with behavior changes.
- Preserve legacy route redirects unless the migration plan explicitly removes them.
- When changing API contracts, verify corresponding backend endpoints and request payloads still match.
