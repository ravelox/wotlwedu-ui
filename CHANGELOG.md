# Changelog

## Unreleased

## 0.1.32 - 2026-05-14

- Add a task-based Create Poll wizard with templates, ideas, audience selection, public/private sharing, email invites, and SMS/share-link handoff.
- Improve poll results with winner/tie summaries, participation completion, ranked outcomes, copyable summaries, and a Decide Now close-poll action.
- Add consumer notification preference toggles and connect the app shell to Socket.IO for live notification and poll-update refreshes.
- Add the unauthenticated `/public/poll/:token` consumer experience with public poll details, guest-session voting, invite-token acceptance, and abuse reporting.
- Add owner public-poll controls in the poll editor for share links, guest voting, platform invites, invite history, and public participation/report counts.
- Automatically refresh expired access tokens with refresh-token rotation.
- Add Profile controls to view active sessions, revoke another device, log out the current device, and log out all devices.
- Simplify consumer registration by removing the alias requirement, optionally naming the first space, and matching the backend personal-space onboarding flow.
- Replace raw backend IDs in common consumer onboarding and poll surfaces with friendly space/list/circle labels.

## 0.1.29 - 2026-05-10

- Align client auth/error handling with backend Priority 1 hardening: only `401` clears the session, while `403` stays visible as an authorization error.
- Add rate-limit, body-size, upload-validation, and network/CORS-aware API error messages.
- Validate picture uploads client-side before multipart submission, including PNG/JPEG extension, MIME type, and size checks.

## 0.1.28 - 2026-05-10

- Refresh Codex agent guidance for the UI repository.
- Update README release metadata and deployment notes.

## 0.1.27 - 2026-05-07

- Add a tutorial dismiss control wired to the backend tutorial dismissal endpoint.
- Allow users to hide the current tutorial prompt without permanently skipping the tutorial.

## 0.1.26 - 2026-05-07

- Fix app navigation state handling around the global menu.
- Correct space/workgroup organization handling in the workgroups flow.

## 0.1.25 - 2026-05-07

- Add a global app menu to improve navigation across authenticated app areas.
- Update Docker/Nginx serving configuration alongside the navigation changes.

## 0.1.24 - 2026-05-07

- Fix themed dropdown option colors so select controls remain readable across themes.

## 0.1.23 - 2026-05-06

- Improve label/value separation with clearer typography and whitespace in forms and detail sections.

## 0.1.22 - 2026-05-05

- Update visible UI terminology to Circle, Picture, Person, Space, and Poll.
- Replace Options terminology with Ideas in tutorial and voting UI copy.
- Move frontend API calls to clean terminology endpoints and the `/v1` API base.

## 0.1.21 - 2026-04-08

- Add a dedicated workgroup management screen for listing, creating, editing, and deleting workgroups.
- Support assigning categories and bulk-managing workgroup membership from the browser UI.
- Expose the new workgroup management flow from the profile screen and preserve legacy `/space` route redirects.

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
