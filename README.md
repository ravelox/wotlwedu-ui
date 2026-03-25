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
- `VITE_APP_VERSION`: version label shown in the app chrome. Defaults to `0.1.7`.
- `VITE_GOOGLE_CLIENT_ID`: Google web client ID used to render the Google sign-in button.

An example file is included at [`.env.example`](/Users/dkelly/Projects/wotlwedu/wotlwedu-ui/.env.example).

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

The profile route now includes:

- linked sign-in method visibility with unlink controls for removable social identities
- recent account activity sourced from the backend auth audit feed
- organization invite history and organization audit activity for organization admins

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

- `GET /user/:userId`: load the signed-in user profile
- `PUT /user/:userId`: update profile details
- `GET /user/:userId/signin-method`: load linked sign-in methods and password-login status
- `DELETE /user/:userId/signin-method/:identityId`: unlink a removable social identity
- `GET /user/:userId/authaudit`: load recent auth and invite-related account activity
- `GET /user/friend`: list friend and relationship records
- `POST /user/request`: send a friend request by email
- `POST /user/accept/:token`: accept a friend request from a notification token
- `DELETE /user/relationship/:id`: remove a relationship
- `PUT /user/block/:userId`: block a user

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

- `GET /election`: list elections for dashboard and elections pages
- `GET /election/:electionId`: load election details
- `GET /election/:electionId/stats`: load election statistics
- `GET /vote/next/all`: fetch the next available vote across visible workgroups
- `GET /vote/:electionId/next`: fetch the next vote inside a specific election
- `POST /cast/:voteId/decision`: submit a vote decision

Workgroup-scoped content management:

- `GET /workgroup`: populate the workgroup scope selector and content forms
- `GET /category`: populate category assignments
- `GET /group`: populate list and election targeting data
- `GET|POST|PUT|DELETE /image` and `/image/:id`
- `POST /image/file/:imageId`: upload image binary content
- `GET|POST|PUT|DELETE /item` and `/item/:id`
- `GET|POST|PUT|DELETE /list` and `/list/:id`
- `POST /list/:listId/bulkitemadd`: add items to a list in bulk
- `POST /list/:listId/bulkitemdel`: remove items from a list in bulk
- `GET|POST|PUT|DELETE /election` and `/election/:id`

Most collection requests use `page` and `items` query parameters. Workgroup-scoped resources also pass `workgroupId` when the user selects a specific scope.

`src/lib/api.js` centralizes axios setup, bearer token injection, JSON defaults, and unauthorized-session handling.

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
  --build-arg VITE_APP_VERSION=0.1.7 \
  -t wotlwedu-ui .
```

## Deployment Notes

- This is a static single-page application. Deep links such as `/app/profile` or `/app/election/123` must be rewritten to `index.html` by the serving layer.
- The current `Dockerfile` uses the default Nginx configuration and does not add an SPA fallback rule. In production, either add a custom Nginx config to the image or ensure an upstream reverse proxy or CDN handles the rewrite.
- `VITE_WOTLWEDU_API_BASE_URL` is compiled into the bundle at build time. Changing the backend origin requires a rebuild unless the user overrides it in browser storage.
- The frontend sends bearer tokens from local storage. Deploy only over HTTPS and ensure the API allows the frontend origin via CORS.
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
