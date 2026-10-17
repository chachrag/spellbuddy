# Firestore Security Specification & Invariants

## 1. Data Invariants

1. **User Identity & Data Isolation**:
   - Every document under `/users/{userId}/**` belongs strictly to the authenticated user where `request.auth.uid == userId`.
   - Users cannot view, query, or modify other users' profiles, child speller profiles, or word history records.

2. **Privilege Escalation Protection**:
   - Users cannot grant themselves the `admin` role or mark their account as `approved` if they are not already an administrator.
   - Master bootstrap administrator `gaurav.ssc@gmail.com` possesses elevated administrator privileges to manage `/approved_users`.

3. **Speller Profile Integrity**:
   - `userId` on any speller profile document must match the path's `userId` and `request.auth.uid`.
   - Name must be a non-empty string under 50 characters.
   - Difficulty level must strictly be an integer between 1 and 5.
   - Child age must be an integer between 4 and 14.

4. **Word History Immutability**:
   - Once a word history log is created, it cannot be updated or modified by clients to prevent tampering with spelling performance logs.

5. **Approved Users Management**:
   - Only authenticated administrators (`gaurav.ssc@gmail.com` or users with `role == 'admin'`) can create, modify, or delete entries in `/approved_users`.
   - Any authenticated user can read their own entry in `/approved_users` to verify their access status.

---

## 2. The "Dirty Dozen" Malicious Payloads

1. **Payload 1 (Identity Hijacking)**: Attacker attempts to write a speller profile with `userId: "victim_123"` under victim's collection.
2. **Payload 2 (Self-Elevation)**: Non-admin user tries to create a `/users/{userId}` document with `role: "admin"` and `approved: true`.
3. **Payload 3 (Cross-Account Word History Tamper)**: Attacker attempts to inject fake word history records into another user's subcollection.
4. **Payload 4 (Unauthenticated Read)**: Anonymous or unauthenticated request attempts to list `/users` or `/approved_users`.
5. **Payload 5 (Unapproved Whitelist Injection)**: Regular user attempts to add an unapproved email into `/approved_users`.
6. **Payload 6 (Oversized Payload / Wallet Drain)**: Malicious actor sends a 2MB payload into `struggledWords` array.
7. **Payload 7 (Invalid Difficulty Level Poisoning)**: Malicious actor sends `difficultyLevel: 999` to crash the word generator.
8. **Payload 8 (Negative Child Age)**: Payload with `age: -5` or string `"five"`.
9. **Payload 9 (History Modification Attack)**: Attempting an `update` on an immutable word history record to change status from `"wrong"` to `"correct"`.
10. **Payload 10 (Document ID Path Traversal / Poisoning)**: Creating documents with forbidden non-alphanumeric ID characters.
11. **Payload 11 (Blanket Scrape Query)**: Executing a query across all user collections without specifying `userId == request.auth.uid`.
12. **Payload 12 (Email Spoofing Attack)**: Request with unverified token claiming to be admin email with `email_verified == false`.

---

## 3. Security Assertions & Expected Rules Behavior

All 12 malicious payloads must be blocked at the security rule boundary and return `PERMISSION_DENIED`.
