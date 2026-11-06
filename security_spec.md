# Security Specification: Sakon Nakhon TB ACF Surveillance Platform

## 1. Data Invariants
1. **Strict Ownership Isolation**: Every document in `/users/{userId}` and its subcollections (`datasets`, `alerts`, `alertSettings`) belongs exclusively to the verified user whose `request.auth.uid == userId` and `request.auth.token.email_verified == true`.
2. **Scoped Live Executive Sharing (`/sharedDashboards/{shareId}`)**: Live shared snapshots contain zero PII (only aggregated hospital surveillance counts and dashboard state). Single-document `get` is permitted only when `isPublicLive == true` or for the verified `ownerId`; `list` queries are strictly restricted to `existing().ownerId == request.auth.uid`; all `create`, `update`, and `delete` operations are restricted exclusively to the verified `ownerId`.
3. **Immutable Ownership & Creation Timestamps**: `ownerId`, `shareId`, `uid`, and `createdAt` cannot be modified after creation.
4. **Server Timestamp Integrity**: Every `create` requires `createdAt == request.time && updatedAt == request.time`, and every `update` requires `updatedAt == request.time`.
5. **Strict Key & Volumetric Boundaries**: All document IDs match `^[a-zA-Z0-9_\-]+$` (`size() <= 128`), all strings enforce explicit `.size()` bounds, `payloadJson` is bounded to `<= 800000` bytes, `checkedActionsJson` is bounded to `<= 10000` bytes, and `hasAll` + `hasOnly` prevent shadow fields.
6. **Action-Scoped Updates**: Every `update` block requires `isValid[Entity](incoming())` and restricts mutated keys via `incoming().diff(existing()).affectedKeys().hasOnly(...)`.

## 2. "Dirty Dozen" Adversarial Payloads (Expected: PERMISSION_DENIED)
1. **Unauthenticated Private Read**: `GET /users/userA/datasets/ds1` with `auth == null` -> `PERMISSION_DENIED`.
2. **Paused Shared Dashboard Read**: `GET /sharedDashboards/live-1` with `auth == null` when `isPublicLive == false` -> `PERMISSION_DENIED`.
3. **Public Enumeration / Scraping**: `LIST /sharedDashboards` with `auth == null` or without `where('ownerId', '==', uid)` -> `PERMISSION_DENIED`.
4. **Unverified Email Write**: `CREATE /sharedDashboards/live-1` with `auth.token.email_verified == false` -> `PERMISSION_DENIED`.
5. **Cross-Tenant Read**: `GET /users/userA/datasets/ds1` as `userB` -> `PERMISSION_DENIED`.
6. **Cross-Tenant List**: `LIST /users/userA/alerts` as `userB` -> `PERMISSION_DENIED`.
7. **Identity Spoofing on Create**: `CREATE /sharedDashboards/live-1` as `userA` with `ownerId: "userB"` -> `PERMISSION_DENIED`.
8. **Shadow Field Injection on Create**: `CREATE /sharedDashboards/live-1` with extra key `isAdmin: true` -> `PERMISSION_DENIED`.
9. **Shadow Field Injection on Update**: `UPDATE /sharedDashboards/live-1` adding `priorityOverride: 99` -> `PERMISSION_DENIED`.
10. **Value Poisoning on Update**: `UPDATE /sharedDashboards/live-1` with `isPublicLive: "yes"` or invalid `defaultPage: "admin"` -> `PERMISSION_DENIED`.
11. **Client Timestamp Forgery & Immutable Field Mutation**: `CREATE` with `createdAt != request.time` or `UPDATE` modifying `ownerId`, `shareId`, or `createdAt` -> `PERMISSION_DENIED`.
12. **Path ID Poisoning & Oversized Payload**: `CREATE /sharedDashboards/bad$id!@#` or `payloadJson` > 800,000 chars -> `PERMISSION_DENIED`.

