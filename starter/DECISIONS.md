# DECISIONS

One section per decision that a reviewer might reasonably have made differently. Every section has
the same four parts, and the third and fourth are the ones we weigh most.

Rules, from `DISCOVERY-BRIEF.md`:

- cite something real in `Why` — a commit, a test, an error string, a file and line
- do not restate what a document says; describe what you did when the documents ran out
- six to twelve decisions is the expected range

---

### JWT verification does not trust the token's algorithm

**What I chose:**

I pin access-token verification to HS256 instead of selecting the verification algorithm from the JWT header.

**Why:**

The authentication test suite explicitly includes `alg: none`, HS512 substitution, and RS256 substitution cases. `node scripts/check-jwt.js` passes these cases with the implementation rejecting the substitutions.

**What I rejected:**

Using the `alg` value supplied by the token to decide how the signature should be verified.

**What would change my mind:**

A repository contract requiring support for multiple trusted signing algorithms with an explicit server-side algorithm allowlist.

### Permission freshness is checked against the membership version

**What I chose:**

Reject a token when its `pv` claim differs from the current membership `perm_version`.

**Why:**

`server/context.js` calls `assertFresh()` for active memberships, while `bumpPermVersion()` increments the database value when permission-relevant membership changes occur.

**What I rejected:**

Trusting the token's original role and permissions until the token expires.

**What would change my mind:**

A repository contract explicitly stating that permission changes do not invalidate existing access tokens.

### Explicit deny takes precedence over allow

**What I chose:**

Resolve a matching explicit deny before accepting an allow from a role baseline or grant.

**Why:**

`server/permissions.js` records deny grants separately and the permission tests include conflicting allow/deny cases. The permission suite passes 35/35.

**What I rejected:**

Allowing a role baseline or narrower allow grant to override an explicit deny.

**What would change my mind:**

A test or specification case showing an explicit allow is intentionally permitted to override an explicit deny.

### The permission catalogue is loaded from the database

**What I chose:**

Load permissions from the `permissions` table at runtime.

**Why:**

The personalisation fixture adds an undocumented permission. `loadCatalogue()` reads from the database, and `check-personalisation.js` passes with the additional permission.

**What I rejected:**

Hardcoding the permission list from `PERMISSIONS.md`.

**What would change my mind:**

A repository contract explicitly requiring the documented permission list to be fixed in application code.

### Stub — the shape of a weak "Why"

**What I chose:** the obvious thing.
**Why:** it is what the brief says to do.
**What I rejected:** nothing, the alternative seemed worse.
**What would change my mind:** I do not know.

_Reads as a memory of the document, not a model of the system. Scores nothing._

---

## 1. Keep organization authorization in the existing request context

Decision:
Use the existing authenticated context to establish the caller's organization.

Problem:
Routes receive an `:org` parameter, but a client-supplied organization ID must not establish authorization.

Rejected alternative:
Trust the organization ID supplied in the route and perform authorization later.

Why the alternative is worse:
It increases the risk of cross-organization access and duplicates organization-isolation logic across routes.

---

## 2. Keep permission resolution centralized

Decision:
Use the existing permission functions in `server/permissions.js` for Phase 3 authorization.

Problem:
Member and invite operations require permission checks and role-based administrative rules.

Rejected alternative:
Implement permission checks independently inside each route.

Why the alternative is worse:
Permission rules would become duplicated and could behave differently between endpoints.

---

## 3. Treat invite status as derived from existing database fields

Decision:
Determine invite state from `accepted_at`, `revoked_at`, and `expires_at`.

Problem:
The database does not contain a separate invite-status column.

Rejected alternative:
Add a new `status` column and maintain it separately.

Why the alternative is worse:
It duplicates state already represented by the existing fields and introduces another value that could become inconsistent.

---

## 4. Keep invite acceptance transactional

Decision:
Process invite acceptance inside a database transaction.

Problem:
Accepting an invite changes several related records, including the invite, user, membership, permission version, and audit record.

Rejected alternative:
Perform each database operation independently.

Why the alternative is worse:
A failure between operations could leave the invite, user, and membership in an inconsistent state.

---

## 5. Preserve removed users

Decision:
Mark the membership as `removed` rather than deleting the user.

Problem:
A user might have memberships in multiple organizations, and audit records reference users.

Rejected alternative:
Delete the user when removing them from an organization.

Why the alternative is worse:
Deleting the user would affect other organization memberships and historical references.

---

## 6. Register `/members/me` before `/members/:userId`

Decision:
Register the self-leave route before the parameterized member route.

Problem:
The router uses first-match-wins routing.

Rejected alternative:
Register `/members/:userId` first.

Why the alternative is worse:
The string `me` would be interpreted as a `userId`, causing the wrong route to execute.

---

## 7. Do not introduce additional architectural abstractions

Decision:
Keep Phase 3 within the existing Node.js module structure.

Problem:
Phase 3 contains several related operations, but the application is still a small Node.js backend.

Rejected alternative:
Introduce repositories, service classes, factories, interfaces, or additional abstraction layers.

Why the alternative is worse:
Those abstractions would add indirection without solving a demonstrated problem in the existing codebase.

---

## 8. Use database constraints where the schema already provides them

Decision:
Rely on existing database constraints for uniqueness and relational integrity.

Problem:
Concurrent requests could otherwise create invalid duplicate state.

Rejected alternative:
Rely exclusively on application-level checks.

Why the alternative is worse:
Application checks alone do not provide the same race-safety as database constraints.

### Phase 5: Session Implementation Verification

Decision:
Keep the existing session implementation unchanged.

Reason:
Repository inspection showed that the Phase 5 session requirements were already implemented and covered by the existing backend test suites.

Verified areas:
- Compound session permission checks
- Session exclusivity
- Authority snapshots
- TTL and lazy expiration
- Grandfathering
- Cascading termination
- Self/admin termination
- Organization isolation
- Audit logging

Evidence:
162 backend assertions passed with 0 failures across the four available test suites.

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

Protected authentication, context, permission, database schema, and test files were left unchanged.

Playwright UI tests were not executed because the environment uses Node.js 18.20.8 while the Playwright setup requires Node.js 20 or newer.

### Stub — the shape of a strong "Why"

**What I chose:** X.
**Why:** I implemented Y first, because Y is the intuitive precedence rule. `node scripts/check-
permissions.js` reported `<the actual reason string it reported>` on the case where the two grants
disagree. That is only reachable if the two are evaluated in a different order than Y assumes.
Moved to X in `<commit>` and the case passed. Logged in `BUILD-LOG.md` under Phase 2.
**What I rejected:** Y, and also "resolve the narrower one last" — both fail the same case for the
same reason.
**What would change my mind:** a case where a narrower grant is expected to survive a broader
refusal. I could not construct one, which is itself evidence for X.

_Shows what you believed, what disproved it, and what you did next._

---

## Where this repo argues with itself

### Candidate-facing section references are stale

`check-permissions.js` refers to sections that do not exist in the trimmed candidate-facing `PERMISSIONS.md`.

I built against the actual candidate-facing behavior and tests rather than treating the stale section numbers as requirements.

### The data-model examples and runtime schema differ

`AUTH-DATA-MODEL.md` contains PostgreSQL-style types, while the runtime schema uses SQLite STRICT tables.

I treated `db/schema.sql` as the runtime ground truth, consistent with the assignment's instruction that the schema wins when documentation disagrees with it.

### roles.rank is not permission precedence

The role table contains a rank, but the permission model does not use rank to determine whether a permission is granted.

I kept rank separate from permission resolution because the repository uses rank for administrative modification authority.

## Deliberately not built

What you chose not to build, and the reason. A scope cut with a stated reason is a senior
judgement. An unmentioned gap is a gap.
