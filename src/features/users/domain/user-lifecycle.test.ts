import { describe, expect, it } from "vitest";

import {
  getEligibleUserStatuses,
  shouldRevokeSessions,
  wouldRemoveLastActiveAdmin,
} from "@/features/users/domain/user-lifecycle";

describe("user lifecycle guards", () => {
  it("blocks demoting the last active admin", () => {
    expect(
      wouldRemoveLastActiveAdmin({
        targetRole: "ADMIN",
        targetStatus: "ACTIVE",
        nextRole: "CUSTOMER",
        nextStatus: "ACTIVE",
        activeAdminCount: 1,
      }),
    ).toBe(true);
  });

  it("allows demoting an admin when another active admin exists", () => {
    expect(
      wouldRemoveLastActiveAdmin({
        targetRole: "ADMIN",
        targetStatus: "ACTIVE",
        nextRole: "CUSTOMER",
        nextStatus: "ACTIVE",
        activeAdminCount: 2,
      }),
    ).toBe(false);
  });

  it("blocks suspending the last active admin", () => {
    expect(
      wouldRemoveLastActiveAdmin({
        targetRole: "ADMIN",
        targetStatus: "ACTIVE",
        nextRole: "ADMIN",
        nextStatus: "SUSPENDED",
        activeAdminCount: 1,
      }),
    ).toBe(true);
  });

  it("does not treat customers as last-admin risk", () => {
    expect(
      wouldRemoveLastActiveAdmin({
        targetRole: "CUSTOMER",
        targetStatus: "ACTIVE",
        nextRole: "CUSTOMER",
        nextStatus: "SUSPENDED",
        activeAdminCount: 1,
      }),
    ).toBe(false);
  });

  it("treats anonymized as terminal", () => {
    expect(getEligibleUserStatuses("ANONYMIZED")).toEqual([]);
    expect(getEligibleUserStatuses("ACTIVE")).toEqual([
      "SUSPENDED",
      "ANONYMIZED",
    ]);
  });

  it("revokes sessions on suspend, anonymize, or admin demotion", () => {
    expect(
      shouldRevokeSessions({
        fromRole: "CUSTOMER",
        fromStatus: "ACTIVE",
        toRole: "CUSTOMER",
        toStatus: "SUSPENDED",
      }),
    ).toBe(true);

    expect(
      shouldRevokeSessions({
        fromRole: "ADMIN",
        fromStatus: "ACTIVE",
        toRole: "CUSTOMER",
        toStatus: "ACTIVE",
      }),
    ).toBe(true);

    expect(
      shouldRevokeSessions({
        fromRole: "CUSTOMER",
        fromStatus: "SUSPENDED",
        toRole: "CUSTOMER",
        toStatus: "ACTIVE",
      }),
    ).toBe(false);
  });
});
