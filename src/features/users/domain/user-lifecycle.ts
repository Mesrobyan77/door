/** Canonical user roles from the database enum. */
export const USER_ROLES = ["ADMIN", "CUSTOMER"] as const;
export type UserRole = (typeof USER_ROLES)[number];

/** Canonical account statuses from the database enum. */
export const USER_STATUSES = ["ACTIVE", "SUSPENDED", "ANONYMIZED"] as const;
export type UserStatus = (typeof USER_STATUSES)[number];

export function isUserRole(value: string): value is UserRole {
  return (USER_ROLES as readonly string[]).includes(value);
}

export function isUserStatus(value: string): value is UserStatus {
  return (USER_STATUSES as readonly string[]).includes(value);
}

/**
 * Whether demoting/removing this admin would leave zero active admins.
 * `activeAdminCount` includes the target user when they are currently an active admin.
 */
export function wouldRemoveLastActiveAdmin(input: {
  targetRole: UserRole;
  targetStatus: UserStatus;
  nextRole: UserRole;
  nextStatus: UserStatus;
  activeAdminCount: number;
}): boolean {
  const isActiveAdmin =
    input.targetRole === "ADMIN" && input.targetStatus === "ACTIVE";

  if (!isActiveAdmin) {
    return false;
  }

  const remainsActiveAdmin =
    input.nextRole === "ADMIN" && input.nextStatus === "ACTIVE";

  return !remainsActiveAdmin && input.activeAdminCount <= 1;
}

/** Statuses an admin may assign from the current status. */
export function getEligibleUserStatuses(from: UserStatus): UserStatus[] {
  switch (from) {
    case "ACTIVE":
      return ["SUSPENDED", "ANONYMIZED"];
    case "SUSPENDED":
      return ["ACTIVE", "ANONYMIZED"];
    case "ANONYMIZED":
      return [];
  }
}

/** Whether sessions must be revoked after this status/role change. */
export function shouldRevokeSessions(input: {
  fromRole: UserRole;
  fromStatus: UserStatus;
  toRole: UserRole;
  toStatus: UserStatus;
}): boolean {
  if (input.toStatus === "SUSPENDED" || input.toStatus === "ANONYMIZED") {
    return true;
  }

  if (input.fromRole === "ADMIN" && input.toRole === "CUSTOMER") {
    return true;
  }

  return false;
}
