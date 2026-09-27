// Per-request context: turn a bearer token into an authenticated caller.
//
// YOURS TO WRITE. This file ships as a stub so the server boots and every
// authenticated request fails loudly instead of appearing to work.
//
// What it has to do (BRIEF.md §3, PERMISSIONS.md §6):
//   - read the bearer token, verify it with verifyAccessToken() from ./auth.js
//   - look the membership up and refuse a token whose org or membership is gone
//   - THE TOKEN'S org CLAIM IS THE ONLY ORG THE CALLER MAY ADDRESS. A request that
//     names a different org is INVISIBLE — 404, never 403. Isolation is structural:
//     the caller cannot name another org, rather than being filtered afterwards.
//   - check freshness against memberships.perm_version (AUTH-DATA-MODEL.md §3), so a
//     role or grant change takes effect on the NEXT request, not at token expiry
//   - throw through the one error path in ./http.js
//
// authenticate(db, secret) returns (req, params) => caller, where caller carries at
// least { userId, orgId, role, membership, claims }.

import { verifyAccessToken, assertFresh } from './auth.js';
import { unauthenticated, notFound } from './http.js';

export function authenticate(db, secret) {
  return function buildContext(req, params = {}) {
    const header = req.headers.authorization ?? '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : null;
    if (!token) throw unauthenticated('missing bearer token');

    const claims = verifyAccessToken(token, secret);

    // Join the org in: a soft-deleted org is an invisible resource, exactly like a
    // missing one (PERMISSIONS.md §6). Without this, a token minted before the delete
    // keeps addressing the org's rows.
    const membership = db
      .prepare(
        `SELECT m.*, o.deleted_at AS org_deleted_at
           FROM memberships m JOIN organizations o ON o.id = m.org_id
          WHERE m.org_id = ? AND m.user_id = ?`
      )
      .get(claims.org, claims.sub);

    if (!membership) throw unauthenticated('not a member of this org');
    if (membership.org_deleted_at) throw notFound();
    if (membership.status === 'removed') throw unauthenticated('membership removed');

    // A suspended membership's token still verifies, but resolves to an empty set, so
    // every permission question is refused with 403 `suspended` (AUTH-DATA-MODEL §10).
    // The version was bumped by the suspension, so freshness must NOT be asserted here:
    // reporting TOKEN_STALE would turn that 403 into a 401 and lose the reason.
    if (membership.status !== 'suspended') assertFresh(claims, membership);

    // Structural isolation. A token scoped to org A cannot address org B at all.
    if (params.org && params.org !== claims.org) throw notFound();

    return {
      userId: claims.sub,
      orgId: claims.org,
      role: membership.role,
      membership,
      claims,
    };
  };
}
