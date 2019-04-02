import {
  ConditionDefinition,
  DenyWithMessageDefinition,
  SingleConditionDefinition
} from "../../types";
import evaluateExpression, { ExpressionContext } from "../expression";
import {
  AllowConditionDefinition,
  DenyConditionDefinition
} from "../../types/resources";

export interface ConditionResult {
  decision: "allow" | "deny";
  reason?: string;
}

/** Function that evaluates an array of conditions and returns the result.
 *
 *  Each non-trivial condition has two parts: a conditional expression that
 *  evaluates to either `true` or `false` and a `denyMessage` that is used
 *  to present a human-readable reason if the condition is denied.
 *
 *  This function not only evaluates each condition in order, but it figures
 *  out which `denyMessage` (if any) is appropriate to return to the caller.
 *  The message of an `allowIf` statement will only be returned if it is the
 *  final condition and its expression evaluates to `false`.
 */
export default async function evaluateConditions(
  def: ConditionDefinition,
  ctx: ExpressionContext = { self: null }
): Promise<ConditionResult> {
  // Validate all up front
  def.forEach(c => {
    if (!validateConditionDefinition(c)) throw new InvalidCondition(c);
  });
  let lastDenyMessage: string | undefined;
  let lastConditionType: "allow" | "deny" | null = "deny";

  for (let i = 0; i < def.length; i++) {
    const d = def[i];
    if (d === "allow") {
      return { decision: "allow", reason: "explicitly allowed" };
    }
    if (d === "deny") {
      return { decision: "deny", reason: "explicitly denied" };
    }
    if (isDenyWithMessage(d)) {
      return { decision: "deny", reason: d.denyWithMessage };
    }
    if (isAllowIf(d)) {
      const result = await evaluateExpression(d.allowIf, ctx);
      if (typeof result !== "boolean") throw new ConditionTypeError(d);

      if (result) {
        return { decision: "allow" };
      }
      lastDenyMessage = d.denyMessage;
      lastConditionType = "allow";
    }
    if (isDenyIf(d)) {
      const result = await evaluateExpression(d.denyIf, ctx);
      if (typeof result !== "boolean") throw new ConditionTypeError(d);

      if (result) {
        return { decision: "deny", reason: d.denyMessage };
      }
      lastConditionType = "deny";
    }
  }

  // If all conditions were `false`, return the opposite of the last rule type
  // If the last rule was an `allowIf`, return its denial message.
  if (lastConditionType === "allow") {
    return { decision: "deny", reason: lastDenyMessage };
  }
  if (lastConditionType === "deny") {
    return {
      decision: "allow",
      reason: "All conditions were `false` and final condition was a `denyIf`."
    };
  }

  return { decision: "allow", reason: "No logic yet" };
}

// Helpers that provide us with Typescript user-defined type guards
// See: https://www.typescriptlang.org/docs/handbook/advanced-types.html
function isDenyWithMessage(
  d: SingleConditionDefinition
): d is DenyWithMessageDefinition {
  return (d as DenyWithMessageDefinition).denyWithMessage !== undefined;
}

function isAllowIf(
  d: SingleConditionDefinition
): d is AllowConditionDefinition {
  return (d as AllowConditionDefinition).allowIf !== undefined;
}

function isDenyIf(d: SingleConditionDefinition): d is DenyConditionDefinition {
  return (d as DenyConditionDefinition).denyIf !== undefined;
}

function validateConditionDefinition(c: any) {
  if (typeof c === "string") {
    if (c === "allow" || c === "deny") {
      return true;
    }
    return false;
  }

  if (typeof c === "object") {
    if (Object.keys(c).length === 2) {
      if (!c["denyMessage"]) {
        return false;
      }
      if (c["allowIf"] !== undefined || c["denyIf"] !== undefined) {
        return true;
      }
      return false;
    } else if (Object.keys(c).length === 1) {
      if (
        c["allowIf"] !== undefined ||
        c["denyIf"] !== undefined ||
        c["denyWithMessage"] !== undefined
      ) {
        return true;
      }
    } else return false;
  }
}

export class InvalidCondition extends Error {
  name = "InvalidCondition";
  constructor(condition: any) {
    super(JSON.stringify(condition));
    this.message = `${JSON.stringify(
      condition
    )} is not a valid condition definition.`;
  }
}

export class ConditionTypeError extends Error {
  name = "ConditionTypeError";
  constructor(condition: any) {
    super(JSON.stringify(condition));
    this.message = `${JSON.stringify(
      condition
    )} returned a non-boolean value while evaluating the expression.`;
  }
}
