import {
  PermissionDefinition,
  User,
  PermissionRule,
  DenyWithMessageDefinition,
  AllowConditionDefinition,
  DenyConditionDefinition,
  AllowAlwaysDefiniton,
  DenyAlwaysDefiniton
} from "../../types";
import evaluateExpression, {
  ExpressionContext,
  ExpressionTypeError
} from "../expression";
import evaluateConditions, { ConditionResult } from "../conditions";

export default function evaluatePermissions(
  def: PermissionDefinition,
  user: User
): ConditionResult {
  // Loop through each of the permissions definitions
  // If `user.role` matches the `roles` for a given definition,
  // evaluate the `conditions` to determine whether the user is permitted
  // to take the requested action.
  //
  // The first `role` list that matches the user's role will be used to make
  // a final decision for that user. Subsequent permissions definitions that
  // have matching roles will not be used.
  //
  // A `roles` array containing the special character `*` or special
  // permissions definition `"allow"` and `"deny"` will match all roles.
  //
  // If no role matches the user, the permission will be evlauated to `deny`.

  // First, check for an invalid user missing role definition
  if (
    !user ||
    !user.roles ||
    !Array.isArray(user.roles) ||
    user.roles.some(r => typeof r !== "string")
  ) {
    throw new Error("Invalid user. Must include `role`.");
  }

  // Validate overall permissions definition
  if (!def || !Array.isArray(def)) {
    throw new Error(
      "Invalid permissions definition. Must be an array of permissions rules."
    );
  }

  for (let i = 0; i < def.length; i++) {
    const d = def[i];
    // Check special rules first
    if (d === "allow") {
      return { decision: "allow" };
    }
    if (d === "deny") {
      return { decision: "deny" };
    }
    if (isDenyWithMessage(d)) {
      return { decision: "deny", reason: d.denyWithMessage };
    }
    // Validate to make sure what remains is a regular rule
    if (
      !d ||
      !d.roles ||
      !d.conditions ||
      !Array.isArray(d.roles) ||
      !Array.isArray(d.conditions)
    ) {
      throw new Error(
        "Invalid permissions rule. Must include `roles` and `conditions` arrays"
      );
    }

    // Regular rules have to match at least one of the user's roles
    if (d.roles.includes("*") || user.roles.some(r => d.roles.includes(r))) {
      // Evaluate conditions
      // TODO: Pass user into conditions context so it can be used in
      // when evaluating expressions.
      return evaluateConditions(d.conditions, {});
    }
  }
  return { decision: "deny", reason: "Not allowed for this user." };
}

// Helpers that provide us with Typescript user-defined type guards
// See: https://www.typescriptlang.org/docs/handbook/advanced-types.html
function isDenyWithMessage(d: PermissionRule): d is DenyWithMessageDefinition {
  return (d as DenyWithMessageDefinition).denyWithMessage !== undefined;
}
