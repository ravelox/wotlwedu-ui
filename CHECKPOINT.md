# Checkpoint

Last updated: 2026-03-24
Repo: `wotlwedu-ui`
Current version: `0.1.5`

## Current Focus

This repo has been updated to surface the backend hardening work in the main React UI.

## Implemented State

- Google sign-in and invite-aware onboarding already existed.
- The login flow now shows a friendlier message when a deferred Google-link token has expired.
- The profile flow now includes:
  - linked sign-in method visibility
  - unlink actions for removable social identities
  - recent account activity from `/user/:userId/authaudit`
  - organization audit activity for admins from `/organization/:organizationId/authaudit`
  - richer invite conflict messaging when the backend reports an existing-user-other-organization collision

## Main Files Changed In This Uncommitted Slice

- [src/pages/LoginPage.jsx](/Users/dkelly/Projects/wotlwedu/wotlwedu-ui/src/pages/LoginPage.jsx)
- [src/pages/ProfilePage.jsx](/Users/dkelly/Projects/wotlwedu/wotlwedu-ui/src/pages/ProfilePage.jsx)
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

1. Stage, commit, tag, and push this uncommitted slice if accepted.
2. Optionally add UI polish for audit filtering or support/admin diagnostics if requested.
