import evaluatePermissions from ".";
import { User, PermissionDefinition } from "../../types";

/** Alias the real function so we can easily pass `any` type definitions.
 *  This is useful for testing how the function behaves when given invalid
 *  input without using a ton of inline casts in our tests.
 */
// const evaluatePermissions = (def: any, user: User) =>
//   _evaluatePermissions(def, user);

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
    it("denies when no role match", () => {
      const permissions: PermissionDefinition = [
        { roles: ["bogus"], conditions: ["allow"] }
      ];
      const result = evaluatePermissions(permissions, mockUser(["admin"]));
      expect(result.decision).toEqual("deny");
    });

    it("allows when role matches with trivial condition", () => {
      const permissions: PermissionDefinition = [
        { roles: ["admin"], conditions: ["allow"] }
      ];
      const result = evaluatePermissions(permissions, mockUser(["admin"]));
      expect(result.decision).toEqual("allow");
    });

    it("uses rule when role matches one of many roles", () => {
      const permissions: PermissionDefinition = [
        {
          roles: ["regular", "user", "admin"],
          conditions: ["allow"]
        }
      ];
      const result = evaluatePermissions(permissions, mockUser(["admin"]));
      expect(result.decision).toEqual("allow");
    });

    it("uses only first rule that matches role", () => {
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
      const result = evaluatePermissions(permissions, mockUser(["admin"]));
      expect(result.decision).toEqual("deny");
    });

    it("skips rule with no matching role", () => {
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
      const result = evaluatePermissions(permissions, mockUser(["admin"]));
      expect(result.decision).toEqual("allow");
    });

    it("doesn't match rule with no rules", () => {
      const permissions: PermissionDefinition = [
        {
          roles: [],
          conditions: ["allow"]
        }
      ];
      const result = evaluatePermissions(permissions, mockUser(["admin"]));
      expect(result.decision).toEqual("deny");
    });

    it("matches wildcard role (`*`)", () => {
      const permissions: PermissionDefinition = [
        {
          roles: ["*"],
          conditions: ["allow"]
        }
      ];
      const result = evaluatePermissions(permissions, mockUser(["admin"]));
      expect(result.decision).toEqual("allow");
    });

    it("matches special allow all role", () => {
      const permissions: PermissionDefinition = ["allow", "deny"];
      const result = evaluatePermissions(permissions, mockUser(["admin"]));
      expect(result.decision).toEqual("allow");
    });

    it("matches special deny all role", () => {
      const permissions: PermissionDefinition = ["deny", "allow"];
      const result = evaluatePermissions(permissions, mockUser(["admin"]));
      expect(result.decision).toEqual("deny");
    });

    it("matches special denyWithMessage rule", () => {
      const permissions: PermissionDefinition = [
        { denyWithMessage: "DENIED" },
        "allow"
      ];
      const result = evaluatePermissions(permissions, mockUser(["admin"]));
      expect(result.decision).toEqual("deny");
      expect(result.reason).toEqual("DENIED");
    });

    it("denies when no rules are specified", () => {
      const permissions: PermissionDefinition = [];
      const result = evaluatePermissions(permissions, mockUser(["admin"]));
      expect(result.decision).toEqual("deny");
    });

    it("doesn't match user with empty role (except wildcard rules)", () => {
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

      const result1 = evaluatePermissions(permissions1, empty);
      expect(result1.decision).toEqual("deny");
      const result2 = evaluatePermissions(permissions2, empty);
      expect(result2.decision).toEqual("allow");
      const result3 = evaluatePermissions(permissions3, empty);
      expect(result3.decision).toEqual("allow");
    });
  });

  describe("Role matching with multiple user roles", () => {
    it("matches first rule where at least one role intersects", () => {
      const permissions: PermissionDefinition = [
        { roles: ["admin"], conditions: ["allow"] },
        { roles: ["regular", "busy"], conditions: ["deny"] }
      ];
      const result = evaluatePermissions(
        permissions,
        mockUser(["admin", "regular", "busy"])
      );
      expect(result.decision).toEqual("allow");
    });

    it("matches rule where roles overlap exactly", () => {
      const permissions: PermissionDefinition = [
        { roles: ["admin", "regular", "busy"], conditions: ["allow"] }
      ];
      const result = evaluatePermissions(
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
    it("reports denial reason when returned by condition", () => {
      const permissions: PermissionDefinition = [
        {
          roles: ["admin"],
          conditions: [{ denyIf: true, denyMessage: "You can't do this" }]
        }
      ];
      const result = evaluatePermissions(permissions, mockUser(["admin"]));
      expect(result.decision).toEqual("deny");
      expect(result.reason).toEqual("You can't do this");
    });

    it("reports denial reason when returned by condition", () => {
      const permissions: PermissionDefinition = [
        {
          roles: ["admin"],
          conditions: [{ allowIf: false, denyMessage: "You can't do this" }]
        }
      ];
      const result = evaluatePermissions(permissions, mockUser(["admin"]));
      expect(result.decision).toEqual("deny");
      expect(result.reason).toEqual("You can't do this");
    });
  });

  describe("Error handling", () => {
    it("throws error when given invalid permissions definition", () => {
      const permissions1: any = {};
      const permissions2: any = null;
      const permissions3: any = undefined;
      const permissions4: any = "allow";

      expect(() =>
        evaluatePermissions(permissions1, mockUser(["admin"]))
      ).toThrow();
      expect(() =>
        evaluatePermissions(permissions2, mockUser(["admin"]))
      ).toThrow();
      expect(() =>
        evaluatePermissions(permissions3, mockUser(["admin"]))
      ).toThrow();
      expect(() =>
        evaluatePermissions(permissions4, mockUser(["admin"]))
      ).toThrow();
    });

    it("throws an error when user object has no role", () => {
      const badUser: any = {};
      const badUser2: any = mockUser(["bad"]);
      delete badUser2.roles;

      expect(() => evaluatePermissions(["allow"], badUser)).toThrow();
      expect(() => evaluatePermissions(["allow"], badUser2)).toThrow();
    });
  });
});
