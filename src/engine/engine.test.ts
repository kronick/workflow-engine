import { SystemDefinition, User } from "../types";
import { FakeInMemoryDataLoader } from "../dataLoader/index";
import PGBusinessEngine, { DescribeTransitionsResult } from "./";

const simpleSystem: SystemDefinition = {
  name: "Simple system",
  roles: ["regular", "admin"],
  resources: {
    Switch: {
      states: ["off", "on", "turbo", "impossible"],
      properties: {
        maxVoltage: {
          type: "number",
          readPermissions: [
            { roles: ["admin"], conditions: ["allow"] },
            {
              roles: ["regular"],
              conditions: [
                {
                  allowIf: { inState: { states: ["off"] } },
                  denyMessage:
                    "You can only view maxVoltage when the switch is off"
                }
              ]
            }
          ]
        },
        password: {
          type: "string",
          readPermissions: [{ roles: ["admin"], conditions: ["allow"] }, "deny"]
        }
      },
      transitions: {
        turnOn: {
          from: ["off", "turbo"],
          to: "on"
        },
        turnOff: {
          from: ["on", "turbo"],
          to: "off"
        },
        turnOnTurbo: {
          from: ["off", "on"],
          to: "turbo",
          permissions: [
            { roles: ["admin"], conditions: ["allow"] },
            { denyWithMessage: "Only admins can turn the switch to turbo." }
          ]
        },
        turnToImpossible: {
          from: ["off", "on", "turbo"],
          to: "impossible",
          conditions: [{ denyWithMessage: "This action is never possible." }],
          permissions: ["allow"]
        }
      }
    }
  }
};

/** Test helper that will create a system with asingle `Switch` resource */
async function createSimpleSystem(n: number = 1) {
  const dataLoader = new FakeInMemoryDataLoader(simpleSystem, n);
  const resource = await dataLoader.list("Switch");
  const engine = new PGBusinessEngine(simpleSystem, dataLoader);
  const adminUser: User = {
    uid: "a",
    firstName: "Admin",
    lastName: "User",
    roles: ["admin"],
    email: "admin@example.com"
  };
  const regularUser: User = {
    uid: "a",
    firstName: "Regular",
    lastName: "User",
    roles: ["regular"],
    email: "user@example.com"
  };
  return { engine, resource: resource[0], adminUser, regularUser };
}

describe("Business engine", () => {
  describe("Listing", () => {
    it("can list resource types", async () => {
      const { engine } = await createSimpleSystem();
      expect(engine.listResourceTypes()).toEqual(["Switch"]);
    });

    it("can list resources of a given type", async () => {
      const { engine, adminUser } = await createSimpleSystem(5);
      const resources = await await engine.listResources({
        type: "Switch",
        asUser: adminUser
      });
      expect(resources.length).toEqual(5);
    });
  });
  describe("Performs CRUD operations", () => {
    it("Can read a resource", async () => {
      const {
        engine,
        resource,
        adminUser,
        regularUser
      } = await createSimpleSystem();

      const readResult = await engine.getResource({
        ...resource,
        asUser: regularUser
      });

      expect(readResult.resource!.state).toBe("off");
      expect(readResult.resource!.maxVoltage.value).toBeDefined();
      expect(readResult.resource!.maxVoltage.errors).toEqual([]);
    });

    it("Returns error when getting invalid resource", async () => {
      const {
        engine,
        resource,
        adminUser,
        regularUser
      } = await createSimpleSystem();

      const readResult = await engine.getResource({
        uid: "bogus",
        type: "bad",
        asUser: regularUser
      });

      expect(readResult.resource).toBeUndefined();
      expect(readResult.errors.length).toBeGreaterThan(0);
    });

    it("Enforces property-level read permissions", async () => {
      const {
        engine,
        resource,
        adminUser,
        regularUser
      } = await createSimpleSystem();

      const regularResult = await engine.getResource({
        ...resource,
        asUser: regularUser
      });

      const adminResult = await engine.getResource({
        ...resource,
        asUser: adminUser
      });

      // Regular user can't see password
      expect(regularResult.resource!.maxVoltage.value).toBeDefined();
      expect(regularResult.resource!.password.value).toBeUndefined();
      expect(regularResult.resource!.password.errors.length).toBeGreaterThan(0);

      // Admin user can see passworrd
      expect(adminResult.resource!.maxVoltage.value).toBeDefined();
      expect(adminResult.resource!.password.value).toBeDefined();
      expect(adminResult.resource!.password.errors.length).toBe(0);
      expect(adminResult.resource!.maxVoltage.errors.length).toBe(0);
    });
  });

  describe("State transitions", () => {
    const includesAction = (
      actionResults: DescribeTransitionsResult,
      to: string
    ) => actionResults.some(t => t.action === to);

    it("Can describe the available transitions", async () => {
      const {
        engine,
        resource,
        adminUser,
        regularUser
      } = await createSimpleSystem();

      const transitions = await engine.describeTransitions({
        ...resource,
        asUser: regularUser
      });

      expect(includesAction(transitions, "turnOn")).toBeTruthy();
      expect(includesAction(transitions, "turnOff")).toBeFalsy();
    });

    it("Enforces permissions on state transitions", async () => {
      const {
        engine,
        resource,
        adminUser,
        regularUser
      } = await createSimpleSystem();

      const transitionsForRegular = await engine.describeTransitions({
        ...resource,
        asUser: regularUser
      });

      const transitionsForAdmin = await engine.describeTransitions({
        ...resource,
        asUser: adminUser
      });

      expect(
        transitionsForRegular.filter(t => t.action === "turnOnTurbo")[0]
          .possible
      ).toBeTruthy();
      expect(
        transitionsForAdmin.filter(t => t.action === "turnOnTurbo")[0].possible
      ).toBeTruthy();

      expect(
        transitionsForRegular.filter(t => t.action === "turnOnTurbo")[0].allowed
      ).toBeFalsy();
      expect(
        transitionsForAdmin.filter(t => t.action === "turnOnTurbo")[0].allowed
      ).toBeTruthy();
    });

    it("performs valid action", async () => {
      const {
        engine,
        resource,
        adminUser,
        regularUser
      } = await createSimpleSystem();

      const result = await engine.performAction({
        uid: resource.uid,
        type: resource.type,
        asUser: adminUser,
        action: "turnOn"
      });

      expect(result.success).toBe(true);

      const readResult = await engine.getResource({
        ...resource,
        asUser: regularUser
      });

      expect(readResult.resource!.state).toBe("on");
    });

    it("returns error on invalid action", async () => {
      const {
        engine,
        resource,
        adminUser,
        regularUser
      } = await createSimpleSystem();

      const result = await engine.performAction({
        uid: resource.uid,
        type: resource.type,
        asUser: adminUser,
        action: "invalid"
      });

      expect(result.success).toBe(false);
      // Should have errors
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it("returns error on not allowed action", async () => {
      const {
        engine,
        resource,
        adminUser,
        regularUser
      } = await createSimpleSystem();

      // A regular user is not allowed to turn the switch to turbo
      const result = await engine.performAction({
        uid: resource.uid,
        type: resource.type,
        asUser: regularUser,
        action: "turnOnTurbo"
      });

      expect(result.success).toBe(false);
      // Should have errors
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it("returns error on not possible action", async () => {
      const {
        engine,
        resource,
        adminUser,
        regularUser
      } = await createSimpleSystem();

      // This action is never possible
      const result = await engine.performAction({
        uid: resource.uid,
        type: resource.type,
        asUser: adminUser,
        action: "turnToImpossible"
      });

      expect(result.success).toBe(false);
      // Should have errors
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it("returns error when performing action on invalid resource type", async () => {
      const {
        engine,
        resource,
        adminUser,
        regularUser
      } = await createSimpleSystem();

      // This action is never possible
      const result = await engine.performAction({
        uid: resource.uid,
        type: "bogus",
        asUser: adminUser,
        action: "turnOn"
      });

      expect(result.success).toBe(false);
      // Should have errors
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it("returns error when performing action on invalid resource", async () => {
      const {
        engine,
        resource,
        adminUser,
        regularUser
      } = await createSimpleSystem();

      // This action is never possible
      const result = await engine.performAction({
        uid: "bogus",
        type: resource.type,
        asUser: adminUser,
        action: "turnOn"
      });

      expect(result.success).toBe(false);
      // Should have errors
      expect(result.errors.length).toBeGreaterThan(0);
    });
  });
});
