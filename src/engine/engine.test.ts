import { SystemDefinition, User } from "../types";
import { FakeInMemoryDataLoader } from "../dataLoader/index";
import PGBusinessEngine, {
  UnknownResource,
  DescribeTransitionsResult
} from "./";

const simpleSystem: SystemDefinition = {
  name: "Simple system",
  roles: ["regular", "admin"],
  resources: {
    Switch: {
      states: ["off", "on", "turbo"],
      properties: {
        maxVoltage: {
          type: "number"
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
        }
      }
    }
  }
};

/** Test helper that will create a system with asingle `Switch` resource */
async function createSimpleSystem() {
  const dataLoader = new FakeInMemoryDataLoader(simpleSystem, 1);
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
  describe("Performs CRUD operations", () => {
    it("Can read a resource", async () => {
      const {
        engine,
        resource,
        adminUser,
        regularUser
      } = await createSimpleSystem();

      const readResult: UnknownResource | undefined = await engine.getResource({
        ...resource,
        asUser: regularUser
      });

      expect(readResult!.state).toBe("off");
      expect(readResult!.maxVoltage).toBeDefined();
    });

    it("Enforces property-level read permissions", async () => {
      const {
        engine,
        resource,
        adminUser,
        regularUser
      } = await createSimpleSystem();

      const regularResult:
        | UnknownResource
        | undefined = await engine.getResource({
        ...resource,
        asUser: regularUser
      });

      const adminResult: UnknownResource | undefined = await engine.getResource(
        {
          ...resource,
          asUser: adminUser
        }
      );

      // Regular user can't see password
      expect(regularResult!.maxVoltage).toBeDefined();
      expect(regularResult!.password).toBeUndefined();

      // Admin user can see passworrd
      expect(adminResult!.maxVoltage).toBeDefined();
      expect(adminResult!.password).toBeDefined();
    });
  });

  describe("State transitions", () => {
    const includesTransitionTo = (
      transition: DescribeTransitionsResult,
      to: string
    ) => transition.some(t => t.to === to);

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

      expect(includesTransitionTo(transitions, "turnOn")).toBeTruthy();
      expect(includesTransitionTo(transitions, "turnOff")).toBeFalsy();
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
        transitionsForRegular.filter(t => t.to === "turnOnTurbo")[0].possible
      ).toBeTruthy();
      expect(
        transitionsForAdmin.filter(t => t.to === "turnOnTurbo")[0].possible
      ).toBeTruthy();

      expect(
        transitionsForRegular.filter(t => t.to === "turnOnTurbo")[0].allowed
      ).toBeFalsy();
      expect(
        transitionsForAdmin.filter(t => t.to === "turnOnTurbo")[0].allowed
      ).toBeTruthy();
    });

    // it.skip("Can ");
  });
});
