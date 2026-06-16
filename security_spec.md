# Security Specification & Threat Model

This document outlines the security architecture, data invariants, and the threat model targeting the `creations` and `likes` collections in our application.

## 1. Data Invariants

- **Creations Integrity:**
  - Every creation must have a valid `userId`, a `type` in `["image", "video", "magazine"]`, and a non-empty `dataUrl` (limited in length).
  - The `userId` of a creation must exactly match the authenticated user UID on document creation (`request.auth.uid`).
  - `userId` and `createdAt` are strictly immutable after a document has been created.
  - The `stars` field represents aggregate upvotes. It must only be incremented or decremented by 1 at a time.

- **Likes Atomicity & Integrity:**
  - A user can only like / favorite a creation once. This is enforced by mapping the document ID directly to `${userId}_${creationId}`.
  - The `userId` stored inside the Like document must match the authenticated user (`request.auth.uid`).
  - Creating a Like document MUST be accompanied by an atomic transaction/batch incrementing the `stars` count of the targeted Creation by exactly `+1`.
  - Deleting a Like document MUST be accompanied by an atomic transaction/batch decrementing the `stars` count of the targeted Creation by exactly `-1`.
  - This synchronized relationship is strictly audited rules-side using `existsAfter` and `getAfter` to guarantee multi-document write atomicity.

---

## 2. The "Dirty Dozen" Threat Payloads

The following payload combinations represent malicious attempts to bypass security policies. Our security rules are designed to guarantee a `PERMISSION_DENIED` response for each:

1. **Spoofed Ownership on Creation:** Authenticated user `user_X` пытается создать Creation со свойством `userId: "user_Y"`.
2. **Missing Essential Fields:** Creation payload omitting `dataUrl`.
3. **Invalid Domain Enum values:** Creation payload where `type` is `"podcast"` or `"unknown"`.
4. **Massive Payload Attack:** Creation payload where `dataUrl` exceeds 1MB or `prompt` is larger than 5KB.
5. **Like Spoofing (Foreign Creator):** User `user_X` tries to write a Like document where `userId` is `"user_Y"`.
6. **Mismatched Like Document ID (Junk poisoning):** User `user_X` creates a Like document targeting `creation_A` but with a random document ID like `"malicious_id"` instead of `"user_X_creation_A"`.
7. **Free-standing Creation Star Inflation:** User `user_X` tries to increment `stars` on a creation without creating a matching Like document.
8. **Double Vote / Mass Stars Injection:** User `user_X` attempts to increment a creation's `stars` count by 5 in a single write.
9. **Spam Star Decreio:** User `user_X` attempts to decrement `stars` on a creation without actually possessing or deleting a corresponding Like document.
10. **Immutability Bypass:** The owner of a creation attempts to write an update altering their original `userId` or their `createdAt` timestamp.
11. **Unauthorized Edit:** A non-owner user attempts to edit a creation's `prompt` or `dataUrl` fields under the guise of liking it.
12. **Tampering with Terminal State / System Fields:** Writing an arbitrary non-numeric value to the `stars` field on a creation.

---

## 3. Test Runner Concept

We verify these invariants using the Firestore Local Emulator and the `@firebase/rules-unit-testing` framework. Each of the "Dirty Dozen" payloads above is executed in isolated unit tests ensuring zero-trust verification:

```typescript
import { assertFails, assertSucceeds, initializeTestEnvironment } from '@firebase/rules-unit-testing';

// Comprehensive test coverage for our Twelve Invariants ensures zero regression during deployment.
```
