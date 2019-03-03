import { Expression, BooleanProducingExpression } from "./expressions";

export interface SystemDefinition {
  name: string;
  resources: {
    [name: string]: ResourceDefinition;
  };
  /** Roles are simply defined as an array of role name strings for now.
   *  This could be extended to allow for roles to inherit from each other
   *  or define role constraints.
   */
  roles: string[];
}

export type ResourceReference = {
  referenceTo: string;
  constraints?: Array<"CanBeEmpty" | "NotAlwaysPresent" | "CanHoldMany">;
};
export type PropertyTypeDefinition =
  | "string"
  | "number"
  | "boolean"
  | "datetime"
  | "string[]"
  | "number[]"
  | "boolean[]"
  | "datetime"
  | ResourceReference;

interface BasePropertyDefinition {
  type: PropertyTypeDefinition;

  /** A human-readable description of this property */
  description?: string;

  readPermissions?: PermissionDefinition;

  writePermissions?: PermissionDefinition;
}

export interface PropertyDefinition extends BasePropertyDefinition {
  constraints?: Array<"CanBeEmpty" | "NotAlwaysPresent">;
}

export interface CalculatedPropertyDefinition extends BasePropertyDefinition {
  expression: Expression;
}

export interface ResourceDefinition {
  properties?: {
    [property: string]: PropertyDefinition;
  };

  calculatedProperties?: {
    [property: string]: CalculatedPropertyDefinition;
  };

  states?: string[];
  defaultState?: string;
  transitions?: {
    [transition: string]: TransitionDefinition;
  };

  readPermissions?: {
    [property: string]: PermissionDefinition;
  };

  actionPermissions?: {
    [action: string]: PermissionDefinition;
  };

  // TODO: Define resource-level read and write permissions
}

export interface TransitionDefinition {
  /** Each transition can only specify one `to` state per defintion. */
  to: string;

  /** For convenience, `from` states can be an array. */
  from: string | string[];

  /** If `conditions` are not specified, the transition will always be allowed */
  conditions?: ConditionDefinition;

  /** An optional human-readable description of this transition */
  description?: string;

  /** User permission definitions
   *  A user can only perform this transition if and only if both the
   *  `conditions` checks AND the `permissions` checks evaluate to `allow`.
   */
  permissions?: PermissionDefinition;
}

export type PermissionDefinition = Array<
  | {
      roles: string[];
      conditions: ConditionDefinition;
    }
  | DenyAlwaysDefiniton
  | AllowAlwaysDefiniton
>;

/** Conditions can either `allow` or `deny` and action based on the result of a
 *  boolean expression. Each condition also includes a human-readable
 *  `denyMessage` that can be displayed to a user indicating why the action was
 *  denied.
 *
 *  Conditions are always specified in an array and tested in order until
 *  one returns `true`. If the `true` condition is an `AllowCondition`, the
 *  overall condition will be evaluated to `allow`. If the `true` condition
 *  is a `DenyCondition`, the overall condition will be evaluated to `deny`.
 *
 *  If all conditions return `false`, the overall condition will be evaluated
 *  to the opposite of the final condition type in the conditions array.
 *
 *  If the array is empty, the overall condition will evaluate to `allow`.
 */
export type ConditionDefinition = Array<SingleConditionDefinition>;

export type SingleConditionDefinition =
  | AllowConditionDefinition
  | DenyConditionDefinition
  | DenyAlwaysDefiniton
  | AllowAlwaysDefiniton;
export interface AllowConditionDefinition {
  allowIf: BooleanProducingExpression;
  denyMessage?: string;
}

export interface DenyConditionDefinition {
  denyIf: BooleanProducingExpression;
  denyMessage?: string;
}

export interface DenyWithMessageDefinition {
  denyWithMessage: string;
}

export type DenyAlwaysDefiniton = "deny" | DenyWithMessageDefinition;
export type AllowAlwaysDefiniton = "allow";
