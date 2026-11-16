# Security Specification — Rutas Cataluña

## 1. Data Invariants
1. Every document in `/routes/{routeId}` MUST have a valid `routeId` matching `^[a-zA-Z0-9_\-]+$` (<= 128 chars).
2. Unauthenticated or non-admin users can ONLY `get` or `list` routes where `resource.data.published == true`. Drafts (`published == false`) are invisible to non-admins.
3. Only a verified admin (`request.auth.token.email_verified == true` and `request.auth.token.email == 'miguelmedinatirado2006@gmail.com'`) can create, update, or delete routes, or access `/adminSettings/{settingId}` and `/adminMeta/{metaId}`.
4. `authorId` and `createdAt` are immutable after creation; `createdAt` and `updatedAt` MUST equal `request.time`.
5. `modes` MUST be a non-empty list of size 1..4 containing only values from `['coche', 'moto', 'a_pie', 'otros']`.
6. `/adminSettings` and `/adminMeta` forbid `list` queries and are strictly gated to `isAdmin()`.

## 2. The "Dirty Dozen" Payloads (Expected: PERMISSION_DENIED)
1. **Unauthenticated route creation**: Anonymous/unauthenticated POST to `/routes/test-1`.
2. **Non-admin authenticated route creation**: Signed-in user with a different email creating a route.
3. **Email spoofing attack**: User with `email == 'miguelmedinatirado2006@gmail.com'` and `email_verified == false`.
4. **Shadow field injection**: Admin payload including an unlisted key `isFeaturedHack: true` (`hasOnly` rejects).
5. **ID poisoning**: Creating `/routes/` with an ID > 128 chars or containing invalid characters (`../hack`).
6. **Author ID spoofing**: Setting `authorId` to someone else's UID instead of `request.auth.uid`.
7. **Timestamp forgery**: Setting `createdAt` or `updatedAt` to a client timestamp instead of `request.time`.
8. **Immutable field tampering**: Updating `createdAt` or `authorId` on an existing route.
9. **Array type/value poisoning**: Sending `modes: ['helicoptero']` or `modes: []` or `modes: ['coche', 'moto', 'a_pie', 'otros', 'extra']`.
10. **Value poisoning / resource exhaustion**: Sending `title` of 5,000 characters or `distanceKm: -50`.
11. **Draft leak query**: Non-admin running `list` on `/routes` without filtering `published == true`.
12. **Admin secret theft**: Non-admin attempting `get` or `list` on `/adminSettings/security`.
