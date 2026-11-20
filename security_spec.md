# SakaySense Security Specification (Phase 0: Payload-First Security TDD)

## 1. Data Invariants
1. **Identity Integrity:** A user can only create or update `/users/{userId}` where `userId == request.auth.uid` and `uid == request.auth.uid`.
2. **No Self-Escalation:** A non-admin user cannot create `/users/{userId}` with `role: 'driver'` or mutate `role` / `jeepneyId` after creation. Only the bootstrapped Fleet Admin (`rebldys@gmail.com` with `email_verified == true`) can assign driver roles and jeepney ownership.
3. **Driver-Only GPS Publishing:** Passengers can never create or update `/jeepneys/{jeepneyId}` or `/trips/{tripId}`. Only an authenticated driver whose `uid == existing().driverId` (and whose `/users/{uid}` document has `role == 'driver'`) can update telemetry for their assigned jeepney.
4. **Active-Only Public Vehicle List:** `allow list` on `/jeepneys` requires `resource.data.isActive == true || resource.data.driverId == request.auth.uid || isAdmin()`. Inactive/offline GPS coordinates cannot be queried by passengers.
5. **Terminal Trip Locking:** Once a trip reaches `status == 'completed'`, it cannot be reopened or modified by a non-admin driver.
6. **Master Gate & Referential Existence:** Subcollection writes under `/users/{userId}/journeys/{journeyId}` require `exists(/users/{userId})`. Trip creation requires both the referenced jeepney and route documents to exist.
7. **Temporal & Structural Integrity:** `createdAt`, `updatedAt`, `startedAt`, `endedAt`, and `lastUpdated` must equal `request.time`. All IDs match `^[a-zA-Z0-9_-]+$` and all strings/arrays have explicit max sizes.

## 2. The "Dirty Dozen" Attack Payloads (All Must Return PERMISSION_DENIED)
1. **Self-Role Escalation on Registration:** User creates `/users/u1` with `{ role: "driver", jeepneyId: "JEEP-101" }` as a non-admin.
2. **Profile Role Mutation:** Existing passenger updates `/users/u1` with `{ role: "driver" }`.
3. **Passenger GPS Injection:** Authenticated passenger updates `/jeepneys/JEEP-101` with `{ isActive: true, latitude: 14.63, longitude: 121.07 }`.
4. **Cross-Driver Hijacking:** Driver A (`drvA`) attempts to update `JEEP-204` (`driverId: "drvB"`).
5. **Shadow Ghost Field:** Driver A updates `JEEP-101` adding `{ isVerified: true }` or `{ adminOverride: true }`.
6. **Spoofed Unverified Admin:** Request where `email == "rebldys@gmail.com"` but `email_verified == false`.
7. **Forged Future Timestamp:** Driver creates trip with `startedAt` set to a client-chosen past/future date instead of `request.time`.
8. **Out-of-Bounds Coordinates:** Driver writes `latitude: 999` or `longitude: -450` to `/jeepneys/JEEP-101`.
9. **Reopening Completed Trip:** Driver updates `/trips/TRIP-1` where existing `status == "completed"` back to `status: "active"`.
10. **Orphaned Trip Route:** Driver creates a trip referencing non-existent `routeId: "FAKE-ROUTE"`.
11. **Unbounded Array / Resource Poisoning:** User updates `favoriteRouteIds` with 50 items or a 10KB string ID.
12. **Blanket Unfiltered Jeepney Query:** Passenger runs `getDocs(collection(db, 'jeepneys'))` without `where('isActive', '==', true)`.
