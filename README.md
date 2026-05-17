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
npm run validate:support-console
```

Live support-console validation:

```bash
export WOTLWEDU_VALIDATE_BASE_URL="https://api.example.com"
export WOTLWEDU_VALIDATE_TOKEN="REPLACE_WITH_BEARER_TOKEN"
export WOTLWEDU_VALIDATE_ORGANIZATION_ID="org_123"   # optional
export WOTLWEDU_VALIDATE_USER_ID="user_123"          # optional
npm run validate:support-console
```

You can also let the script authenticate and auto-discover scope:
```bash
export WOTLWEDU_VALIDATE_BASE_URL="https://api.example.com"
export WOTLWEDU_VALIDATE_EMAIL="admin@example.com"
export WOTLWEDU_VALIDATE_PASSWORD="REPLACE_WITH_PASSWORD"
export WOTLWEDU_VALIDATE_OUTPUT="./support-console-validation.json"   # optional
npm run validate:support-console
```

## Environment

The app reads these Vite variables at build time:

- `VITE_WOTLWEDU_API_BASE_URL`: backend API origin. Defaults to `https://api.wotlwedu.com:9876`.
- `VITE_APP_VERSION`: optional version label shown in the app chrome. Docker builds default this to the package version (`0.1.36`) when no build argument is supplied.
- `VITE_GOOGLE_CLIENT_ID`: Google web client ID used to render the Google sign-in button.
- `VITE_WOTLWEDU_SUPPORT_EMAIL`: optional support contact email shown on the public support page. Defaults to `admin@wotlwedu.net`.

An example file is included at `.env.example`.

The selected API base URL is also persisted in browser storage under `wotlwedu_ui_api_base_url`.

## Local Storage

- `wotlwedu_ui_session`: authenticated session payload, including auth and refresh tokens.
- `wotlwedu_ui_active_workgroup`: selected workgroup scope for workgroup-scoped resources.

## Main Flows

Public routes:

- `/login`
- `/public/poll/:token`
- `/public/unsubscribe/:inviteToken`
- `/terms`
- `/privacy`
- `/abuse`
- `/support`
- `/register`
- `/confirm/:tokenId`
- `/pwdrequest`
- `/pwdreset/:userId/:resetToken`
- `/auth/verify/:userId/:verificationToken`

Registration asks for consumer-facing account details and an optional first-space
name. The backend provisions the personal organization, first space, membership,
and poll tutorial automatically after signup.

Public poll links show poll status, expiration, ideas, guest-voting controls,
and reporting controls without requiring an authenticated session. Guest progress
is stored locally with the backend-provided expiry. The public poll and invite
unsubscribe routes include consent and opt-out copy for non-registered guests.

Authenticated app routes:

- `/app/home`
- `/app/cast-vote`
- `/app/cast-vote/:electionId`
- `/app/polls`
- `/app/create-poll`
- `/app/friend`
- `/app/notification`
- `/app/profile`
- `/app/preference`
- `/app/statistics/:electionId`
- `/app/picture`
- `/app/item`
- `/app/list`
- `/app/poll`
- `/app/space`

The home route is a social activity surface. It highlights polls that need the
user's vote, polls closing soon, recent activity, recent winners, quick-start
templates, and unread notification count.

Core social surfaces use reusable initial avatars, friendlier empty states,
animated loading placeholders, richer poll-card media fallbacks, and lightweight
hover motion so the app feels more personal without adding visual clutter.

Home also includes habit-loop prompts that point users toward the next useful
action: voting when people are waiting, checking closing polls, rematching
recent decisions, reusing a recent list or circle, and resuming the last poll
draft. These prompts deep-link into `/app/create-poll` with prefill query
parameters such as `template`, `listId`, `groupId`, `rematchPollId`, and
`fromLast`.

The notification route groups poll-related updates into actionable cards. Poll
groups include inline actions for voting, viewing results, sending reminders,
opening poll settings, reaching public-link controls, and marking the group
read, while non-poll notifications keep focused actions such as accepting friend
requests.

Circle membership and poll invite flows use a shared people/contact picker. It
supports searchable people, selected-person chips, typed email recipients, and
recent-email shortcuts where available.

The primary poll creation route is `/app/create-poll`, a guided flow that starts
with a visual template gallery for dinner, movies, trips, date night, family
activity, team lunch, meeting times, and custom polls. The builder keeps a live
preview visible while the user edits ideas, audience, deadline, and sharing.
Poll editors still include public-sharing controls for link visibility, guest
voting, platform email invites, invite history, and public activity/report counts.

The mobile app shell keeps the primary actions in a thumb-friendly bottom bar:
Home, Vote, Create, Polls, and Alerts. Create is visually emphasized and Alerts
shows the unread notification count.

Legacy top-level paths redirect into `/app/*` routes to preserve compatibility with older links.

The profile route now includes:

- linked sign-in method visibility with unlink controls for removable social identities
- recent account activity sourced from the backend auth audit feed
- account data export and account deletion request controls
- organization invite history and organization audit activity for organization admins
- a direct link into workgroup management for reviewing and administering membership scope

## Backend Dependencies

The UI expects the backend to expose the following endpoint groups.

## Backend Endpoint Map

Authentication and account recovery:

- `POST /login`: primary email/password login
- `POST /login/google`: verify a Google ID token and continue through the backend JIT provisioning flow
- `POST /login/social`: JIT social sign-in; first login links or provisions a user and may auto-create an organization
- `GET /login/invite/:token`: resolve invite context before Google sign-in
- `POST /login/verify2fa`: second-factor verification during login and profile flows
- `POST /login/2fa`: initiate 2FA setup from the profile screen
- `POST /login/resetreq`: request a password reset email
- `PUT /login/password/:userId`: complete password reset with token-backed credentials

Registration:

- `POST /register`: create a pending account
- `POST /register/confirm/:tokenId`: confirm registration token

User profile and relationships:

- `GET /person/:userId`: load the signed-in user profile
- `PUT /person/:userId`: update profile details
- `GET /person/:userId/signin-method`: load linked sign-in methods and password-login status
- `DELETE /person/:userId/signin-method/:identityId`: unlink a removable social identity
- `GET /person/:userId/authaudit`: load recent auth and invite-related account activity
- `GET /person/friend`: list friend and relationship records
- `POST /person/request`: send a friend request by email
- `POST /person/accept/:tokenId`: accept a friend request from a notification token
- `DELETE /person/relationship/:relationshipId`: remove a relationship
- `PUT /person/block/:blockUser`: block a user

Notifications:

- `GET /notification`: list notifications
- `GET /notification/unreadcount`: fetch unread notification count for app chrome and dashboard widgets
- `PUT /notification/status/:notificationId/:statusId`: update notification read/archive state
- `DELETE /notification/:notificationId`: remove a notification

Preferences:

- `GET /preference`
- `GET /preference/:preferenceId`
- `POST /preference`
- `PUT /preference/:preferenceId`
- `DELETE /preference/:preferenceId`

Organizations:

- `GET /organization/:organizationId`: load the signed-in organization when needed
- `GET /organization/:organizationId/invite`: list invites for org-admin tooling, optionally filtered by status
- `POST /organization/:organizationId/invite`: invite an email address into an organization before first social sign-in
- `POST /organization/:organizationId/invite/:inviteId/resend`: regenerate and resend an invite link
- `DELETE /organization/:organizationId/invite/:inviteId`: revoke a pending invite
- `GET /organization/:organizationId/authaudit`: load organization-level auth and invite activity for admin review

Voting and election insights:

- `GET /poll`: list elections for dashboard and elections pages
- `GET /poll/:electionId`: load election details
- `GET /poll/:electionId/stats`: load election statistics
- `POST /poll/:electionId/stop`: close a poll from the results page
- `GET /vote/next/all`: fetch the next available vote across visible workgroups
- `GET /vote/:electionId/next`: fetch the next vote inside a specific election
- `POST /cast/:voteId/decision`: submit a vote decision

Workgroup-scoped content management:

- `GET /space`: populate the workgroup scope selector and content forms
- `GET /category`: populate category assignments
- `GET /circle`: populate list and election targeting data
- `GET|POST|PUT|DELETE /picture` and `/picture/:id`
- `POST /picture/file/:imageId`: upload image binary content
- `GET|POST|PUT|DELETE /item` and `/item/:id`
- `GET|POST|PUT|DELETE /list` and `/list/:id`
- `POST /list/:listId/bulkitemadd`: add items to a list in bulk
- `POST /list/:listId/bulkitemdel`: remove items from a list in bulk
- `GET|POST|PUT|DELETE /poll` and `/poll/:id`

Most collection requests use `page` and `items` query parameters. Workgroup-scoped resources also pass `workgroupId` when the user selects a specific scope.

`src/lib/api.js` centralizes axios setup, bearer token injection, JSON defaults, unauthorized-session handling, and user-safe API errors for rate limits, body limits, upload validation, and CORS/network failures.

The API client automatically refreshes expired access tokens with `/login/refresh` when a refresh token is present. The Profile screen lists active sessions and supports revoking individual sessions, logging out the current device, and logging out all devices.

Picture uploads are prevalidated in the browser before calling `POST /picture/file/:imageId`. The UI accepts PNG/JPEG files only and defaults to a 5 MB client-side limit, matching the backend default. Override the client limit at build time with `VITE_WOTLWEDU_IMAGE_UPLOAD_MAX_BYTES` when the backend uses a different `WOTLWEDU_UPLOAD_MAX_BYTES`.

## Docker

The included `Dockerfile` builds the Vite bundle with Node 20 Alpine and serves the static output from `nginx:1.27-alpine` on port `80`.

Build and run locally:

```bash
docker build -t wotlwedu-ui .
docker run --rm -p 8080:80 wotlwedu-ui
```

Build with a custom backend origin:

```bash
docker build \
  --build-arg VITE_WOTLWEDU_API_BASE_URL=https://api.example.com \
  -t wotlwedu-ui .
```

## Deployment Notes

- This is a static single-page application. Deep links such as `/app/profile` or `/app/poll/123` must be rewritten to `index.html` by the serving layer.
- The `Dockerfile` copies `nginx.conf`, which includes an SPA fallback rule. Keep the image config, raw manifests, and Helm chart aligned if route rewrite behavior changes.
- `VITE_WOTLWEDU_API_BASE_URL` is compiled into the bundle at build time. Changing the backend origin requires a rebuild unless the user overrides it in browser storage.
- The frontend sends bearer tokens from local storage. Deploy only over HTTPS and ensure the API allows the frontend origin via CORS.
- Set `VITE_WOTLWEDU_REFRESH_COOKIE_ENABLED=true` when the backend uses HTTP-only refresh-token cookies so Axios sends credentials on refresh/logout requests.
- Backend Priority 1 hardening means `403` responses are shown as authorization errors instead of clearing the session; only `401` is treated as an expired/invalid session.
- Because the API base URL defaults to `https://api.wotlwedu.com:9876`, production builds should set this explicitly for each environment instead of relying on the default.

## Kubernetes

Raw manifests live in `k8s/`:

- `configmap.yaml`: overrides the default Nginx site config with `try_files $uri $uri/ /index.html` for SPA route support
- `deployment.yaml`: runs two replicas of the frontend container and mounts the Nginx config
- `service.yaml`: exposes the pods internally on port `80`
- `ingress.yaml`: publishes the app at `ui.wotlwedu.com`
- `kustomization.yaml`: applies the full manifest set together

Apply the plain manifests:

```bash
kubectl apply -k k8s/
```

## Helm

The Helm chart lives in `helm/wotlwedu-ui/` and mirrors the raw manifests with environment-specific ingress overrides.

Render the chart:

```bash
helm template wotlwedu-ui ./helm/wotlwedu-ui
```

Install the chart:

```bash
helm upgrade --install wotlwedu-ui ./helm/wotlwedu-ui
```

Useful overrides:

- `image.repository`
- `image.tag`
- `replicaCount`
- `ingress.hosts`
- `ingress.tls`
- `environment` plus `environments.<name>` overrides
- `nginx.defaultServerConfig` if the SPA fallback or asset policy needs to change

## Project Layout

- `src/App.jsx`: route graph and session bootstrap
- `src/components/`: shared chrome and reusable UI pieces
- `src/pages/`: route-level screens
- `src/lib/`: API, session, and workgroup scope utilities
- `src/styles.css`: global styling and layout system
