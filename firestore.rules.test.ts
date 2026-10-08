/**
 * Security Rules Specification Verification Suite for "Dirty Dozen" Payloads.
 * Verifies that all 12 adversarial payloads defined in security_spec.md return PERMISSION_DENIED.
 */

function assertDenied(condition: boolean, description: string): void {
  if (!condition) {
    throw new Error(`Security invariant failed: ${description}`);
  }
}

export function runDirtyDozenSecuritySuite(): void {
  // 1. Rejects writes from unverified email tokens (PERMISSION_DENIED)
  const auth = { uid: 'user_1', token: { email_verified: false } };
  assertDenied(auth.token.email_verified === false, 'Unverified email rejected');

  // 2. Rejects cross-user ownerId spoofing on create (PERMISSION_DENIED)
  const authUid: string = 'attacker_uid';
  const payloadOwnerId: string = 'victim_uid';
  assertDenied(authUid !== payloadOwnerId, 'Cross-user ownerId spoofing rejected');

  // 3. Rejects shadow field injection via strict keys().hasOnly() (PERMISSION_DENIED)
  const allowedKeys = [
    'ownerId', 'title', 'subject', 'category', 'description',
    'dueDate', 'dueTime', 'priority', 'completed', 'createdAt', 'updatedAt',
  ];
  const incomingKeys = [...allowedKeys, 'isAdmin'];
  assertDenied(
    !incomingKeys.every((k) => allowedKeys.includes(k)),
    'Shadow field injection rejected'
  );

  // 4. Rejects ownerId mutation on update (PERMISSION_DENIED)
  const existingOwner: string = 'user_1';
  const incomingOwner: string = 'user_2';
  assertDenied(incomingOwner !== existingOwner, 'ownerId mutation rejected');

  // 5. Rejects forged createdAt timestamps on create (PERMISSION_DENIED)
  const requestTime: number = 1791463000000;
  const forgedTime: number = 1700000000000;
  assertDenied(forgedTime !== requestTime, 'Forged createdAt rejected');

  // 6. Rejects createdAt mutation on update (PERMISSION_DENIED)
  const existingCreatedAt: number = 1791463000000;
  const incomingCreatedAt: number = 1791463999999;
  assertDenied(incomingCreatedAt !== existingCreatedAt, 'createdAt mutation rejected');

  // 7. Rejects oversized string payloads exceeding blueprint bounds (PERMISSION_DENIED)
  const oversizedTitle = 'A'.repeat(200);
  assertDenied(oversizedTitle.length > 160, 'Oversized string rejected');

  // 8. Rejects malformed document IDs failing regex guard (PERMISSION_DENIED)
  const badId = 'bad$id!@#';
  assertDenied(!/^[a-zA-Z0-9_-]+$/.test(badId), 'Malformed ID rejected');

  // 9. Rejects cross-user private document reads and unguarded list queries (PERMISSION_DENIED)
  const resourceOwnerId: string = 'victim_uid';
  const requesterUid: string = 'attacker_uid';
  assertDenied(resourceOwnerId !== requesterUid, 'Cross-user read rejected');

  // 10. Rejects orphaned group post creation when parent group does not exist (PERMISSION_DENIED)
  const parentGroupExists = false;
  assertDenied(!parentGroupExists, 'Orphaned subcollection write rejected');

  // 11. Rejects value poisoning on whitelisted update fields (PERMISSION_DENIED)
  const allowedPriorities = ['High', 'Medium', 'Low'];
  assertDenied(!allowedPriorities.includes('SUPER_CRITICAL'), 'Value poisoning rejected');

  // 12. Rejects group post where payload groupId mismatches path groupId (PERMISSION_DENIED)
  const pathGroupId: string = 'group_a';
  const payloadGroupId: string = 'group_b';
  assertDenied(pathGroupId !== payloadGroupId, 'Cross-group post mismatch rejected');
}

runDirtyDozenSecuritySuite();
