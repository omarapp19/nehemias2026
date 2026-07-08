# JWT rotation + session expiration/refresh — design

Trello card: [Rotación de JWT_SECRET y expiración/refresh de sesión](https://trello.com/c/3vYymUj4/6-rotaci%C3%B3n-de-jwtsecret-y-expiraci%C3%B3n-refresh-de-sesi%C3%B3n)
GUIA_DESARROLLADORES.md checklist item, P1 — Seguridad crítica.

## Problem

Today (`apps/api/src/auth/jwt.ts`, `cookies.ts`, `middleware.ts`, `env.ts`):

- `JWT_EXPIRES_IN` defaults to `7d`. A stolen or leaked cookie stays valid for a week.
- There's no way to rotate `JWT_SECRET` without instantly invalidating every admin session
  (everyone gets logged out the moment the secret changes).
- There's no refresh mechanism — sessions are a flat TTL from login, no sliding extension for
  active admins.

## Goals

1. Support rotating `JWT_SECRET` without forcing all admins to re-login immediately.
2. Shorten the token lifetime and add sliding refresh so active admins stay logged in, but idle
   or compromised sessions expire quickly.
3. Cap total session age regardless of activity, so a permanently-active session can't live
   forever.

## Design

### Token lifetime & session cap

- `JWT_EXPIRES_IN` default changes from `7d` to `2h`.
- New constant `ABSOLUTE_SESSION_MAX_SECONDS = 12h` (12 * 60 * 60), defined alongside the JWT
  helpers in `apps/api/src/auth/jwt.ts`.
- `AdminTokenPayload` gains a `sessionStart` claim (epoch seconds). Set once at login. Carried
  forward unchanged on every refresh — this is what lets us enforce the 12h absolute cap even
  though `iat`/`exp` get reset on each refresh.

### Sliding refresh

Implemented inside `requireAdmin` (`apps/api/src/auth/middleware.ts`), no new endpoint:

1. Verify the token (see rotation section below). Decoded payload includes `iat` and
   `sessionStart`.
2. If `now - sessionStart > ABSOLUTE_SESSION_MAX_SECONDS` → throw 401 (`Necesitas iniciar
   sesión.`). This forces a real re-login; `sessionStart` is not renewed by refreshing.
3. Else if `now - iat > halfLife` (`halfLife` = half of the configured token TTL, i.e. 1h at the
   2h default) → re-sign a fresh token with the same `sub/role/name/sessionStart` (new `iat`/
   `exp`) and call `setSessionCookie` again on the response. This is silent — no client-side
   change needed.
4. Otherwise proceed as today.

An admin making requests at least once per `halfLife` window never sees an expiry. One idle for
longer than the full TTL (2h) does. Either way, the session dies at 12h wall-clock from login.

### Cookie lifetime

`setSessionCookie` (`apps/api/src/auth/cookies.ts`) changes `maxAge` from the current flat
`SEVEN_DAYS` constant to match `env.jwtExpiresIn`'s equivalent in ms, so the browser-side cookie
expiry always agrees with the token it holds. Every refresh re-sets the cookie with a fresh
`maxAge`, matching the reissued token.

### Secret rotation

- `env.ts` adds an optional `jwtSecretPrevious` read from `JWT_SECRET_PREVIOUS` (undefined if
  unset — no validation requiring it).
- `signAdminToken` is unchanged in spirit: always signs with `env.jwtSecret` (the current
  secret). It gains a second parameter to carry forward `sessionStart` on refresh.
- `verifyAdminToken` tries `env.jwtSecret` first. On verification failure, if
  `env.jwtSecretPrevious` is set, retries with that secret before returning `null`.

Rotation runbook (documented in `GUIA_DESARROLLADORES.md`):
1. Set `JWT_SECRET_PREVIOUS` to the current value of `JWT_SECRET`.
2. Set `JWT_SECRET` to a new random value.
3. Redeploy. Tokens signed with the old secret keep verifying (via fallback) until they expire
   naturally — at most 2h later, not 7 days.
4. On the *next* rotation (or once satisfied all old tokens have expired), drop
   `JWT_SECRET_PREVIOUS`.

### Files touched

- `apps/api/src/auth/jwt.ts` — `sessionStart` claim, `ABSOLUTE_SESSION_MAX_SECONDS`,
  `signAdminToken` second param, `verifyAdminToken` fallback-secret retry + return `iat`/
  `sessionStart`.
- `apps/api/src/auth/cookies.ts` — `maxAge` derived from `env.jwtExpiresIn` instead of a flat
  7-day constant.
- `apps/api/src/auth/middleware.ts` — absolute-cap check + sliding refresh logic in
  `requireAdmin`.
- `apps/api/src/env.ts` — `jwtSecretPrevious`, `JWT_EXPIRES_IN` default `2h`.
- `.env.example` — document `JWT_SECRET_PREVIOUS`, updated `JWT_EXPIRES_IN` default.
- `GUIA_DESARROLLADORES.md` — check off the checklist item, add rotation runbook note near the
  existing CSRF/security notes (section 9 area).

### Edge cases

- Login (`POST /auth/login`) calls `signAdminToken` with no `sessionStart` override → defaults to
  `now`, starting a fresh session.
- A token signed before this change (no `sessionStart` claim) — `verifyAdminToken` should treat a
  missing `sessionStart` as invalid (reject), forcing re-login rather than crashing on `undefined`
  arithmetic. This only affects sessions live at deploy time, which is acceptable given the 2h/7d
  TTL shrink already forces most of them to re-login soon anyway.
- Bearer-token auth path (`bearer()` in middleware.ts) goes through the same `requireAdmin`
  verify/refresh logic; refresh still sets a cookie via `setSessionCookie` even for bearer
  callers, which is harmless (no cookie-based client will read it) and keeps the logic in one
  place rather than branching.

## Testing

No test infra exists in the repo yet (separate P2 checklist item). Verify manually against a
running API:
1. Login → confirm cookie is set with `maxAge` ~2h and token has `sessionStart`.
2. Wait past `halfLife` (or temporarily lower `JWT_EXPIRES_IN` for the manual check) → make an
   authenticated request → confirm a new `Set-Cookie` is sent with a later `exp`.
3. Simulate a token whose `sessionStart` is >12h old (temporarily patch/sign one) → confirm 401
   even though the token itself hasn't expired.
4. Set `JWT_SECRET_PREVIOUS` to the old secret, rotate `JWT_SECRET` → confirm a token signed
   under the old secret still verifies via fallback.
