# Changelog

## 0.1.21 - 2026-04-08

- Add a dedicated workgroup management screen for listing, creating, editing, and deleting workgroups.
- Support assigning categories and bulk-managing workgroup membership from the browser UI.
- Expose the new workgroup management flow from the profile screen and preserve legacy `/workgroup` route redirects.

## 0.1.20 - 2026-03-28

- Add a poll tutorial panel that starts and tracks the real backend tutorial payload from `/tutorial/poll` and `/tutorial/poll/start`.
- Surface tutorial guidance inside the existing list, audience, poll, and statistics screens instead of introducing a separate flow.
- Pre-fill tutorial resource names and bound poll inputs so the browser client walks a new user through creating a genuine poll.
- Add tutorial skip, resume, and restart controls for the current user, plus an operator re-enable/restart action in the support console.

## 0.1.7 - 2026-03-24

- Add a dedicated `/app/support` view to the React UI for organization and system admins.
- Surface support overview metrics, support audit feed filtering, and targeted user investigation from the backend support endpoints.
- Expose support navigation in the main app shell and profile quick links so admin workflows stay in parity with the browser console.

## 0.1.4 - 2026-03-24

- Add invite history filtering to the profile organization admin screen for pending, accepted, revoked, and expired invite states.
- Show invite status metadata in the UI while keeping resend and revoke actions limited to pending invites.
- Document the broader invite-history contract exposed by the backend.

## 0.1.3 - 2026-03-24

- Add invite-aware login UX that resolves invite context from `?invite=` and passes invite tokens through Google sign-in.
- Add org-admin invitation operations in the profile screen, including pending invite listing plus resend and revoke actions.
- Document the expanded invite lifecycle endpoints required by the UI.

## 0.1.2 - 2026-03-21

- Add a Google sign-in button on the login screen when `VITE_GOOGLE_CLIENT_ID` is configured.
- Wire the UI login flow to `POST /login/google` so verified Google web sign-in can enter the backend JIT provisioning path.
- Document the Google client ID build-time configuration for containerized and local builds.

## 0.1.1 - 2026-03-09

- Harden auth/session persistence handling for local storage restoration.
- Improve registration and password-reset flows with stricter token and error-state handling.
- Align UI behavior with backend security updates introduced in the same release window.

## 0.1.0 - 2026-03-02

- Initialized `wotlwedu-ui` as an independent Git repository.
- Added project docs: `README.md`, `CHANGELOG.md`, and `AGENTS.md`.
- Expanded documentation with backend endpoint mapping and deployment notes, including SPA routing requirements.
- Added raw Kubernetes manifests and a Helm chart for `wotlwedu-ui`, including an Nginx config override for SPA route fallback.
- Added `.gitignore` to exclude dependencies, build output, and local environment files.
- Captured the initial React + Vite application state, including auth flows, workgroup-scoped content management, elections, notifications, voting, and profile screens.
