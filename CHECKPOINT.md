# Checkpoint

Last updated: 2026-03-24
Repo: `wotlwedu-ui`
Current version: `0.1.9`

## Current Focus

This repo now includes a dedicated support/admin console in the main React UI so the browser support workflow is available without switching clients.

## Implemented State

- Google sign-in and invite-aware onboarding already existed.
- The login flow now shows a friendlier message when a deferred Google-link token has expired.
- The profile flow now includes:
  - linked sign-in method visibility
  - unlink actions for removable social identities
  - recent account activity from `/user/:userId/authaudit`
  - organization audit activity for admins from `/organization/:organizationId/authaudit`
  - richer invite conflict messaging when the backend reports an existing-user-other-organization collision
- A dedicated support/admin view now includes:
  - auth overview metrics from `/support/auth/overview`
  - paged support audit feed from `/support/auth/audit`
  - targeted user lookup with sign-in method inspection and recent audit activity
- A live support-console validation hook now exists via `npm run validate:support-console`, including login-based auto-discovery of user/org scope.
- Support navigation is now exposed directly in the main app shell for organization and system admins.

## Key Files For This Baseline

- [src/pages/LoginPage.jsx](/Users/dkelly/Projects/wotlwedu/wotlwedu-ui/src/pages/LoginPage.jsx)
- [src/pages/ProfilePage.jsx](/Users/dkelly/Projects/wotlwedu/wotlwedu-ui/src/pages/ProfilePage.jsx)
- [src/pages/SupportPage.jsx](/Users/dkelly/Projects/wotlwedu/wotlwedu-ui/src/pages/SupportPage.jsx)
- [src/components/AppShell.jsx](/Users/dkelly/Projects/wotlwedu/wotlwedu-ui/src/components/AppShell.jsx)
- [README.md](/Users/dkelly/Projects/wotlwedu/wotlwedu-ui/README.md)

## Verification Already Run

Passed:

```bash
npm run build
```

## Notes

- There is already a top-level [`.env.example`](/Users/dkelly/Projects/wotlwedu/wotlwedu-ui/.env.example) in this repo for `VITE_WOTLWEDU_API_BASE_URL` and `VITE_GOOGLE_CLIENT_ID`.
- This repo is intended to stay in parity with the backend auth/invite/audit flow.

## Likely Next Actions

1. Run `npm run validate:support-console` against the deployed backend with real admin traffic and representative org/user IDs.
2. Extend the support view only if operations need more than overview, audit feed, and targeted user investigation.
