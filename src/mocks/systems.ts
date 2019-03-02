import { SystemDefinition, User } from "../types";
import { FakeInMemoryDataLoader } from "../dataLoader";
import PGBusinessEngine from "../engine";

export const switchSystem: SystemDefinition = {
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

/** Test helper that will create a system with a single `Switch` resource */
export async function createSimpleSystem(
  system: SystemDefinition,
  listType: string,
  nResources = 1
) {
  const dataLoader = new FakeInMemoryDataLoader(system, nResources);
  const resources = await dataLoader.list(listType);
  const engine = new PGBusinessEngine(system, dataLoader);
  const adminUser: User = {
    uid: "a",
    firstName: "Admin",
    lastName: "User",
    role: "admin",
    email: "admin@example.com"
  };
  const regularUser: User = {
    uid: "a",
    firstName: "Regular",
    lastName: "User",
    role: "regular",
    email: "user@example.com"
  };
  return { engine, resources, adminUser, regularUser };
}
