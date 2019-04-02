import evaluatePermissions from ".";
import { User, PermissionDefinition } from "../../types";

/** Helper function to make a mock user with any role */
const mockUser = (roles: string[], uid?: string): User => ({
  uid: uid || "xxx-yyy-zzz",
  firstName: "User",
  lastName: "Name",
  email: "user@example.com",
  roles
});

describe("Permissions evaluator", () => {
  describe("Role matching", () => {
    it("denies when no role match", async () => {
      const permissions: PermissionDefinition = [
        { roles: ["bogus"], conditions: ["allow"] }
      ];
      const result = await evaluatePermissions(
        permissions,
        mockUser(["admin"])
      );
      expect(result.decision).toEqual("deny");
    });

    it("allows when role matches with trivial condition", async () => {
      const permissions: PermissionDefinition = [
        { roles: ["admin"], conditions: ["allow"] }
      ];
      const result = await evaluatePermissions(
        permissions,
        mockUser(["admin"])
      );
      expect(result.decision).toEqual("allow");
    });

    it("uses rule when role matches one of many roles", async () => {
      const permissions: PermissionDefinition = [
        {
          roles: ["regular", "user", "admin"],
          conditions: ["allow"]
        }
      ];
      const result = await evaluatePermissions(
        permissions,
        mockUser(["admin"])
      );
      expect(result.decision).toEqual("allow");
    });

    it("uses only first rule that matches role", async () => {
      const permissions: PermissionDefinition = [
        {
          roles: ["admin"],
          conditions: ["deny"]
        },
        {
          roles: ["admin"],
          conditions: ["allow"]
        }
      ];
      const result = await evaluatePermissions(
        permissions,
        mockUser(["admin"])
      );
      expect(result.decision).toEqual("deny");
    });

    it("skips rule with no matching role", async () => {
      const permissions: PermissionDefinition = [
        {
          roles: ["none"],
          conditions: ["deny"]
        },
        {
          roles: ["regular", "user", "admin"],
          conditions: ["allow"]
        }
      ];
      const result = await evaluatePermissions(
        permissions,
        mockUser(["admin"])
      );
      expect(result.decision).toEqual("allow");
    });

    it("doesn't match rule with no rules", async () => {
      const permissions: PermissionDefinition = [
        {
          roles: [],
          conditions: ["allow"]
        }
      ];
      const result = await evaluatePermissions(
        permissions,
        mockUser(["admin"])
      );
      expect(result.decision).toEqual("deny");
    });

    it("matches wildcard role (`*`)", async () => {
      const permissions: PermissionDefinition = [
        {
          roles: ["*"],
          conditions: ["allow"]
        }
      ];
      const result = await evaluatePermissions(
        permissions,
        mockUser(["admin"])
      );
      expect(result.decision).toEqual("allow");
    });

    it("matches special allow all role", async () => {
      const permissions: PermissionDefinition = ["allow", "deny"];
      const result = await evaluatePermissions(
        permissions,
        mockUser(["admin"])
      );
      expect(result.decision).toEqual("allow");
    });

    it("matches special deny all role", async () => {
      const permissions: PermissionDefinition = ["deny", "allow"];
      const result = await evaluatePermissions(
        permissions,
        mockUser(["admin"])
      );
      expect(result.decision).toEqual("deny");
    });

    it("matches special denyWithMessage rule", async () => {
      const permissions: PermissionDefinition = [
        { denyWithMessage: "DENIED" },
        "allow"
      ];
      const result = await evaluatePermissions(
        permissions,
        mockUser(["admin"])
      );
      expect(result.decision).toEqual("deny");
      expect(result.reason).toEqual("DENIED");
    });

    it("denies when no rules are specified", async () => {
      const permissions: PermissionDefinition = [];
      const result = await evaluatePermissions(
        permissions,
        mockUser(["admin"])
      );
      expect(result.decision).toEqual("deny");
    });

    it("doesn't match user with empty role (except wildcard rules)", async () => {
      const empty = mockUser([""]);
      const permissions1: PermissionDefinition = [
        {
          roles: ["regular"],
          conditions: ["allow"]
        }
      ];
      const permissions2: PermissionDefinition = [
        {
          roles: ["*"],
          conditions: ["allow"]
        }
      ];
      const permissions3: PermissionDefinition = ["allow"];

      const result1 = await evaluatePermissions(permissions1, empty);
      expect(result1.decision).toEqual("deny");
      const result2 = await evaluatePermissions(permissions2, empty);
      expect(result2.decision).toEqual("allow");
      const result3 = await evaluatePermissions(permissions3, empty);
      expect(result3.decision).toEqual("allow");
    });
  });

  describe("Role matching with multiple user roles", async () => {
    it("matches first rule where at least one role intersects", async () => {
      const permissions: PermissionDefinition = [
        { roles: ["admin"], conditions: ["allow"] },
        { roles: ["regular", "busy"], conditions: ["deny"] }
      ];
      const result = await evaluatePermissions(
        permissions,
        mockUser(["admin", "regular", "busy"])
      );
      expect(result.decision).toEqual("allow");
    });

    it("matches rule where roles overlap exactly", async () => {
      const permissions: PermissionDefinition = [
        { roles: ["admin", "regular", "busy"], conditions: ["allow"] }
      ];
      const result = await evaluatePermissions(
        permissions,
        mockUser(["admin", "regular", "busy"])
      );
      expect(result.decision).toEqual("allow");
    });
  });

  describe.skip("User expressions", () => {
    // TODO: Expressions should be allowed to access user data in permissions
    it("allows references to user data in expressions", () => {});
  });

  describe("Reason reporting", () => {
    it("reports denial reason when returned by condition", async () => {
      const permissions: PermissionDefinition = [
        {
          roles: ["admin"],
          conditions: [{ denyIf: true, denyMessage: "You can't do this" }]
        }
      ];
      const result = await evaluatePermissions(
        permissions,
        mockUser(["admin"])
      );
      expect(result.decision).toEqual("deny");
      expect(result.reason).toEqual("You can't do this");
    });

    it("reports denial reason when returned by condition", async () => {
      const permissions: PermissionDefinition = [
        {
          roles: ["admin"],
          conditions: [{ allowIf: false, denyMessage: "You can't do this" }]
        }
      ];
      const result = await evaluatePermissions(
        permissions,
        mockUser(["admin"])
      );
      expect(result.decision).toEqual("deny");
      expect(result.reason).toEqual("You can't do this");
    });
  });

  describe("Error handling", () => {
    it("throws error when given invalid permissions definition", async () => {
      const permissions1: any = {};
      const permissions2: any = null;
      const permissions3: any = undefined;
      const permissions4: any = "allow";

      await expect(
        evaluatePermissions(permissions1, mockUser(["admin"]))
      ).rejects.toThrow();
      await expect(
        evaluatePermissions(permissions2, mockUser(["admin"]))
      ).rejects.toThrow();
      await expect(
        evaluatePermissions(permissions3, mockUser(["admin"]))
      ).rejects.toThrow();
      await expect(
        evaluatePermissions(permissions4, mockUser(["admin"]))
      ).rejects.toThrow();
    });

    it("throws an error when user object has no role", async () => {
      const badUser: any = {};
      const badUser2: any = mockUser(["bad"]);
      delete badUser2.roles;

      await expect(evaluatePermissions(["allow"], badUser)).rejects.toThrow();
      await expect(evaluatePermissions(["allow"], badUser2)).rejects.toThrow();
    });
  });
});
