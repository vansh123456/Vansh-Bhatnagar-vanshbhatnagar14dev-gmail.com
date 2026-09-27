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
