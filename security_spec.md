# Firestore Security Specification

This specification defines the security invariants, validation rules, and threat vectors ("Dirty Dozen" test payloads) for the Firebase Firestore implementation of the Double-End Pet Adoption and Smart Matching platform.

## 1. Data Invariants

1. **Pets Collection (`/pets/{petId}`)**:
   - Anyone (authenticated or guest) can read/list available pets to encourage adoption.
   - Only authenticated users can write (create, update, delete) pet documents.
   - Status transitions must be valid (`Available` -> `Pending` -> `Adopted`).

2. **Health Logs Collection (`/health_logs/{logId}`)**:
   - Anyone can read pet health history to verify vaccination and wellness.
   - Only authenticated users can add or edit health logs.
   - Each log must refer to an existing pet ID, with typed structures for weight, vaccines, and veterinarian notes.

3. **Match Inquiries Collection (`/match_inquiries/{inquiryId}`)**:
   - Prospective adopters must be authenticated to list or read their own applications.
   - Authenticated users can only read applications that match their validated email address.
   - Users are strictly forbidden from blanket-reading other people's inquiries or PII.
   - Pre-evaluated AI scores and feedback are system-generated and immutable once submitted by the client.

---

## 2. The "Dirty Dozen" Malicious Payloads

The following payloads attempt to violate security boundaries and must return `PERMISSION_DENIED`.

### Pillar 1: Identity Spoofing & Privilege Escalation
1. **Unauthenticated Write to Pets**: Guest tries to insert a custom pet listing.
2. **Adopter Email Impersonation**: Signed-in user `alice@gmail.com` tries to submit an inquiry with `adopterEmail` set to `bob@gmail.com`.
3. **Owner Modification Attack**: Alice tries to edit Bob's existing inquiry.

### Pillar 2: Schema Modification & Shadow Fields
4. **Pet Injection of Giant Str payload**: Injecting a 5MB string description.
5. **Junk Field Attack (Ghost keys)**: Appending `isAdmin: true` inside a pet document.
6. **Negative Weight Entry**: Submitting a health log with `-10 kg` physical weight.

### Pillar 3: Path and Resource Poisoning
7. **Dangerous ID Attack**: Inserting inquiry with ID containing shell escape or traversal characters.
8. **Unbounded List Exhaustion**: Injecting 500 features into a single pet listing.

### Pillar 4: Temporal and State Integrity
9. **Fake Timestamp Attack**: Submitting a log trying to hardcode a retrospective or future `createdAt` value.
10. **State Skipping**: Updating inquiry status directly from `Pending` straight to `Matched` without proper transition.
11. **Client-side PII Scraper**: Authenticated user trying to crawl all inquiries on the server.
12. **Locked State Mutation**: Attempting to edit medical logs or submitted matches after adoption status is finalized.

---

## 3. Security Rules Validation (Testing Harness)

These assertions are verified against our Zero-Trust `firestore.rules` compiler.
