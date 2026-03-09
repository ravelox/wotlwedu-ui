# Changelog

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
