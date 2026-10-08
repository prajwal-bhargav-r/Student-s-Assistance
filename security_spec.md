# Security Specification — Student Academic Assistant

## 1. Data Invariants

1. **Identity & Ownership Invariant**: Every private academic document (`users`, `exams`, `tasks`, `notes`, `timetable`, `studyPlans`, `notifications`) MUST have an `ownerId` strictly matching `request.auth.uid` on creation, and `ownerId` MUST be immutable on update.
2. **Verified Email Invariant**: Every write operation across all collections requires `request.auth != null && request.auth.token.email_verified == true`.
3. **Strict Schema & Anti-Shadow-Field Invariant**: Every `create` and `update` operation MUST pass the entity's `isValid[Entity](incoming())` helper, enforcing exact key sets (`hasAll` and `hasOnly`), strict types, and maximum string lengths.
4. **Action-Based Update Invariant**: Every `update` rule begins with `isValid[Entity](incoming())` and restricts modified fields using `incoming().diff(existing()).affectedKeys().hasOnly(...)` while enforcing `incoming().ownerId == existing().ownerId`, `incoming().createdAt == existing().createdAt`, and `incoming().updatedAt == request.time`.
5. **Relational Master Gate Invariant**: Any post in `/groups/{groupId}/posts/{postId}` can only be read, created, updated, or deleted if the parent `/groups/{groupId}` document exists (`exists(/databases/$(database)/documents/groups/$(groupId))`) and `incoming().groupId == groupId`.
6. **Zero-Blanket-List Invariant**: Every `allow list` rule enforces filtering on `resource.data` (`resource.data.ownerId == request.auth.uid` for personal collections, `resource.data.visibility == 'campus'` for groups, and `resource.data.groupId == groupId` for group posts).

## 2. The "Dirty Dozen" Payloads

1. **Unverified Email Spoof**: Write to `/exams/exam_1` with `auth.token.email_verified = false`.
2. **Cross-User Identity Spoofing**: Create `/tasks/task_1` where `ownerId = "victim_uid"` while authenticated as `"attacker_uid"`.
3. **Shadow Field Injection**: Update `/exams/exam_1` adding `"isAdmin": true` alongside valid fields.
4. **Owner Mutation on Update**: Update `/notes/note_1` changing `ownerId` to another user's UID.
5. **Timestamp Forgery on Create**: Create `/tasks/task_1` with a past/future client timestamp (`createdAt != request.time`).
6. **Timestamp Forgery on Update**: Update `/tasks/task_1` modifying `createdAt` or setting `updatedAt != request.time`.
7. **Denial-of-Wallet Oversized String**: Create `/notes/note_1` with a `title` exceeding 160 characters or `content` exceeding 50,000 characters.
8. **Path ID Poisoning**: Create `/exams/invalid$id!with/slashes` or an ID > 128 chars.
9. **Unauthorized Private Read**: Authenticated user `"attacker_uid"` attempts `get` or `list` on `/notes` belonging to `"victim_uid"`.
10. **Orphaned Subcollection Write**: Create `/groups/non_existent_group/posts/post_1` where parent group does not exist.
11. **Value Poisoning on Update**: Update `/tasks/task_1` setting `priority` to `"SUPER_CRITICAL"` (not in enum) or `completed` to `"yes"` (string instead of boolean).
12. **Group Post Cross-Group Mismatch**: Create `/groups/group_a/posts/post_1` with payload `groupId: "group_b"`.
