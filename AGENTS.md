# AGENTS.md (wotlwedu-ui)

Local instructions for Codex-style agents working in this repository.

## Repo Summary

- App: main browser frontend for the wotlwedu ecosystem.
- Package: `wotlwedu-ui` version `0.1.28`.
- Stack: React 18, Vite 5, React Router 6, Axios.
- Deploy target: static bundle served by Nginx.
- Default backend: `https://api.wotlwedu.com:9876`.
- Product wording: user-facing screens should generally say **polls**, even when
  API payloads and routes use `election`.

## Key Commands

```bash
npm install
npm run dev
npm run build
npm run preview
npm run validate:support-console
```

`npm run build` is the main verification command for most UI code changes.

## Runtime Notes

- API base URL comes from `VITE_WOTLWEDU_API_BASE_URL`, with client-side session
  handling in `src/lib/api.js`.
- Auth state is stored in `localStorage["wotlwedu_ui_session"]`.
- Active workgroup scope is stored in
  `localStorage["wotlwedu_ui_active_workgroup"]`.
- Unauthorized API responses trigger local logout via the Axios interceptor in
  `src/lib/api.js`.
- Client-side routes require SPA fallback rewrites to `index.html`; keep
  `nginx.conf`, `Dockerfile`, `k8s/`, and `helm/wotlwedu-ui/` aligned.

## Backend Contract Areas

- Auth: `/login`, `/login/verify2fa`, `/login/2fa`, `/login/resetreq`,
  `/login/password/:userId`.
- Registration: `/register`, `/register/confirm/:tokenId`.
- User graph: `/person/:userId`, `/person/friend`, `/person/request`,
  `/person/accept/:token`, `/person/relationship/:id`, `/person/block/:userId`.
- Notifications: `/notification`, `/notification/unreadcount`,
  `/notification/status/:notificationId/:statusId`.
- Preferences: `/preference`, `/preference/:preferenceId`.
- Voting and polls/elections: `/vote/next/all`, `/vote/:electionId/next`,
  `/cast/:voteId/decision`, `/poll`, `/poll/:id`, `/poll/:id/stats`.
- Content management: `/space`, `/category`, `/circle`, `/picture`,
  `/picture/file/:imageId`, `/item`, `/list`, `/list/:listId/bulkitemadd`,
  `/list/:listId/bulkitemdel`.

## Where To Make Changes

- Route composition, auth gates, and redirects: `src/App.jsx`.
- App entry: `src/main.jsx`.
- Shared application chrome: `src/components/`.
- Route-level screens: `src/pages/`.
- API/session/workgroup/tutorial helpers: `src/lib/`.
- Global styling and design tokens: `src/styles.css`.
- Build config: `package.json`, `vite.config.js`.
- Static serving/container behavior: `Dockerfile`, `nginx.conf`.
- Raw Kubernetes manifests: `k8s/`.
- Helm chart: `helm/wotlwedu-ui/`.
- Deployed support-console validation: `scripts/validate-support-console.mjs`.

## UX And Routing Notes

- Public auth flows include login, registration, confirmation, password reset,
  and 2FA verification.
- Authenticated flows include dashboard, polls/elections, voting, friends,
  notifications, profile, preferences, statistics, support, and workgroups.
- Workgroup-scoped content management includes images, items, lists, and
  elections/polls.
- Preserve legacy route redirects unless a migration plan explicitly removes
  them.
- Keep UI copy focused on user tasks; avoid exposing backend-only terminology
  when the product language should be clearer.

## Testing Expectations

- Run `npm run build` for UI implementation changes when practical.
- Run `npm run validate:support-console` when changing support-console behavior
  or deployed support routes.
- For visual or interaction changes, start `npm run dev` and inspect the changed
  flow in a browser when practical.
- Mention any skipped tests or environment blockers in the final response.

## Repo Hygiene

- Do not commit `node_modules/`, `dist/`, `.env*`, secrets, or generated
  archives.
- Keep `README.md` and `CHANGELOG.md` aligned with behavior changes.
- When changing API contracts, verify corresponding backend endpoints, payloads,
  auth, and tenancy/workgroup scoping.
- Keep raw manifests and Helm chart behavior aligned, especially Nginx SPA
  fallback behavior.
