import { SystemDefinition, User } from "../types";
import { FakeInMemoryDataLoader } from "../dataLoader";
import PGBusinessEngine from "../engine";

export const switchSystem: SystemDefinition = {
  name: "Simple system!!",
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
      actions: {
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
