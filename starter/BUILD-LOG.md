# BUILD-LOG

Append to this as you go. Commit it with the code it describes — the timestamps are part of the
evidence, and a log that arrives in one commit at the end reads as what it is.

Five lines is a real entry. Short and dated is better than long and reconstructed.

The categories we look for are listed in `DISCOVERY-BRIEF.md`. The example below shows the
*shape* of a good entry; it is a recreation of something already printed in `README.md`, so it
gives nothing away.

---

<!-- EXAMPLE — delete this block, keep the shape.

## 2026-03-04 · Phase 0 — orientation

Expected the unknown-permission test to fail on my validation code.
Observed: it passed, with foreign_keys ON, and *also* passed with the pragma removed — so the
check was never running, and the "pass" was the schema loading fine while enforcing nothing.
Changed: moved `foreign_keys = ON` to connection open and re-ran; now it raises
`FOREIGN KEY constraint failed` as the README said it would.
Note: this is the failure mode where a passing test is worse than a failing one.

-->

## Phase 0 — orientation

### 2026-09-27 · Initial repository inspection

Installed the dependencies, inspected the starter structure, database schema, candidate-facing documents, and supplied test scripts.

The repository separates authentication, caller context, permission resolution, lifecycle, audit, routes, and the web console. The database is also the source of truth for roles and permissions.

The first implementation target was `server/auth.js`, as the repository instructions indicated that the rest of the application depends on authenticated caller context.

I also noted that the fixture contains role/permission data not described in the documents, so the implementation must remain database-driven rather than hardcoding the documented examples.

## Phase 1 — token verification

### 2026-09-27 · JWT verification

I expected the main work to be validating the JWT structure and signature, but the supplied tests showed the verifier also has to distinguish access tokens from refresh tokens and enforce issuer, audience, JTI, and the `exp <= now` boundary.

Observed: `node scripts/check-jwt.js` passed all 43 cases, including algorithm substitution, malformed tokens, signature tampering, missing claims, and refresh-token inputs.

Changed: implemented `verifyAccessToken` with explicit HS256/JWT checks, signature verification, claim validation, and the half-open expiration rule.

Evidence: `node scripts/check-jwt.js` — 43 passed, 0 failed.

The important implementation constraint I took from this was that token-provided algorithm metadata must not determine how the token is verified.

## Phase 2 — caller context and the resolution engine

### 2026-09-27 · Context and permission resolution

I initially expected permission resolution to be mostly a role lookup followed by grant checks. The implementation showed that the caller context has to be established first because membership state, organization scope, and `perm_version` all affect whether permission resolution should happen.

I kept the permission catalogue database-driven after checking the personalisation fixture. The catalogue is loaded from `permissions`, rather than encoding the permissions listed in the documentation.

The permission tests also showed that explicit deny has precedence over allow. Time-bounded grants use a half-open interval, so `expires_at == now` is inactive.

The final Phase 2 implementation passed:
- `check-permissions.js`: 35/35
- `check-personalisation.js`: 18/18
- `check-jwt.js`: 43/43

Evidence:
- `server/context.js`
- `server/permissions.js`
- `scripts/check-permissions.js`
- `scripts/check-personalisation.js`

Evidence:
- `node scripts/check-permissions.js`: 35 passed
- `node scripts/check-personalisation.js`: 18 passed
- relevant implementation: `server/context.js`, `server/permissions.js`

## Phase 3 — orgs, members, invites

### 1. Reviewed existing authentication and authorization

Before implementing Phase 3, reviewed:

- `server/context.js`
- `server/permissions.js`
- `server/auth.js`
- `PERMISSIONS.md`
- `WORKFLOW.md`
- `AUTH-DATA-MODEL.md`
- `db/schema.sql`
- Relevant API and permission tests

The existing authentication flow establishes organization context from the authenticated token and verifies membership before route logic runs.

The existing permission system resolves role permissions, explicit grants, denies, membership status, device-scoped permissions, and permission versions.

Phase 3 was implemented on top of these existing mechanisms rather than replacing them.

### 2. Implemented organization management

Implemented:

- List organizations for the authenticated user
- Create an organization
- Update organization name
- Soft-delete an organization

Organization routes remain scoped to the organization in the authenticated context.

Creating an organization creates the initial membership with the `owner` role.

### 3. Implemented member management

Implemented:

- List organization members
- Change a member's role
- Suspend a member
- Reinstate a suspended member
- Remove a member
- Allow a member to leave their own organization

Member-management operations use the existing permission system and role-rank rules.

Self-leave and removal preserve the database user record.

Membership changes update `perm_version` where required so existing access tokens become stale after permission changes.

Suspension and removal also terminate the affected user's active sessions according to the existing lifecycle rules.

### 4. Implemented invite lifecycle

Implemented:

- Create an invitation
- List invitations
- Revoke an invitation
- View a public invitation
- Accept an invitation

Invitations use the existing token generation and hashing approach.

Invite validity is determined from:

- `accepted_at`
- `revoked_at`
- `expires_at`

Invite acceptance creates or reuses the user and changes the invited membership to active inside a database transaction.

### 5. Preserved authorization boundaries

Organization IDs supplied through routes were not treated as proof of authorization.

The existing request context establishes the caller's organization from the authenticated token.

Requests targeting another organization return `404`.

Permission checks remain centralized through `server/permissions.js`.

### 6. Preserved existing database contracts

No database schema changes were introduced.

Existing database constraints are relied upon for:

- Unique organization membership
- One live invite per organization/email
- Valid membership states
- Foreign-key integrity
- Audit-event immutability

### 7. Testing

Ran the relevant Phase 3 API and permission tests.

Fixed implementation issues found by the tests without modifying the tests themselves.

### 8. Phase 3 engineering decisions

The main decisions and unresolved behavior discovered during implementation are recorded in `decisions.md`.

## Phase 4 — devices and grants
## Phase 4: Devices, Grants, Sessions, and Audit

Implemented the Phase 4 backend contracts across the device, grant, session, and audit flows.

### Implemented

- Device listing with organization scoping and row-level `device:view` filtering.
- Device CRUD operations with permission checks.
- Inter-organization device transfer with `device:provision` checks in both organizations.
- Removal of grants and termination of active sessions during device transfer.
- Grant creation, listing, and revocation.
- Grant time-window validation and normalization.
- Privilege-laundering prevention through `assertMayGrant`.
- Session creation with compound `session:start` and device-mode permission checks.
- `view` sessions as non-exclusive.
- `control` and `terminal` sessions as exclusive per device.
- `authorized_by` authority snapshots at session creation.
- Session TTL based on `organizations.max_session_minutes`.
- Lazy session expiration.
- Self-termination and administrative session termination.
- Audit log retrieval with pagination and filtering.
- Audit recording for successful mutations and denied attempts.

### Files Changed

- `starter/server/routes/devices.js`
- `starter/server/routes/sessions.js`
- `starter/server/routes/orgs.js`
- `starter/server/routes/index.js`
- `starter/server/lifecycle.js`
- `starter/server/audit.js`

### Validation

- `node scripts/check-api.js`: 66 passed, 0 failed
- `node scripts/check-jwt.js`: 43 passed, 0 failed
- `node scripts/check-permissions.js`: 35 passed, 0 failed
- `node scripts/check-personalisation.js`: 18 passed, 0 failed

Total: 162 passed, 0 failed.




## Phase 5 — sessions
Phase 5: Sessions

Inspected the session requirements against WORKFLOW.md, PERMISSIONS.md, AUTH-DATA-MODEL.md, and the existing session implementation.

No code changes were required. Session functionality was already implemented across the session routes, lifecycle helpers, permission layer, audit layer, and database constraints.

Verified:
- Compound session authorization
- Organization isolation
- User lifecycle enforcement
- Device visibility and ownership
- Session exclusivity
- authorized_by snapshots
- Session TTL and lazy expiration
- Grandfathering after role/grant changes
- Cascading termination
- Self vs admin termination
- Audit logging

Tests:
- check-api.js: 66 passed, 0 failed
- check-jwt.js: 43 passed, 0 failed
- check-permissions.js: 35 passed, 0 failed
- check-personalisation.js: 18 passed, 0 failed

Total: 162 passed, 0 failed.

No implementation changes were made because the existing implementation already satisfied the Phase 5 contract.

## Phase 6 — audit

_What did you decide counts as an auditable event, and what pushed you to that line?_

## Phase 7 — the console

_Where did the server's answer and your instinct disagree about what should be on screen?_

## Phase 8 — hardening

_What did you measure, what did you fix, and what did you deliberately leave alone? Anything you
chose not to build belongs here with its reason._

## Open threads

_Things you know are wrong, unfinished, or that you would do differently with another day. Listing
these honestly is worth more than pretending they do not exist — we will find them anyway._
