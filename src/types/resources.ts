import {
  Expression,
  BooleanProducingExpression,
  StringProducingExpression,
  ArrayProducingExpression,
  ResourceProducingExpression
} from "./expressions";

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
  actions?: {
    [action: string]: ActionDefinition;
  };

  readPermissions?: PermissionDefinition;

  actionPermissions?: {
    [action: string]: PermissionDefinition;
  };

  // TODO: Define resource-level read and write permissions
}

export interface ActionDefinition {
  /** Each action can only specify at most one `to` state. */
  to?: string;

  /** For convenience, `from` states can be an array. */
  from: string | string[];

  /** If `conditions` are not specified, the action will always be allowed */
  conditions?: ConditionDefinition;

  /** An optional human-readable description of this action */
  description?: string;

  /** User permission definitions
   *  A user can only perform this action if and only if both the
   *  `conditions` checks AND the `permissions` checks evaluate to `allow`.
   */
  permissions?: PermissionDefinition;

  /** An optional list of effects to apply as a result of the action. */
  effects?: EffectListDefinition;

  /** A boolean or expression that will determine whether this action and any
   *  associated state action is logged in the resource's history
   */
  includeInHistory?: BooleanProducingExpression;

  input?: InputDefinition;
}

export interface InputDefinition {
  fields: Record<string, InputField>;

  /** Whole-input validation rules. Used to express validation dependencies
   *  between input fields.
   *
   *  These rules are executed in order after each individual field is
   *  validated.
   */
  validation?: ConditionDefinition;
}

export interface InputField {
  type: PropertyTypeDefinition;

  required?: boolean;

  /** Validation rules for this input field */
  validation?: ConditionDefinition;
}

// Effects
///////////////////////////////////////////////////////////////////////////////
export type EffectListDefinition = EffectDefinition[];
export type EffectDefinition =
  | EmailEffectDefinition
  | UpdateEffectDefinition
  | ConditionalEffectDefinition
  | SetEffectDefinition;

export type ConditionalEffectDefinition = {
  effectIf: BooleanProducingExpression;
  effects: EffectListDefinition;
};
export interface EmailEffectDefinition {
  sendEmail: {
    to: StringProducingExpression;
    template: StringProducingExpression;
    params: { [key: string]: Expression };
    includeInHistory?: BooleanProducingExpression;
  };
}

/** Update a resource by merging in properties from another resource */
export interface UpdateEffectDefinition {
  update: {
    /** An array of property names to be updated */
    properties: ArrayProducingExpression<"string">;

    /** Source resource from which properties will be read */
    from: ResourceProducingExpression;

    /** Destination resource that will have its properties updated.
     *  Defaults to `self` */
    to?: ResourceProducingExpression;

    includeInHistory?: BooleanProducingExpression;
  };
}

// TODO: Also need CreateEffectDefintion and DeleteEffectDefinition for
// creating/updating resources as the result of an action

/** Update a resource by setting a single new property value */
export interface SetEffectDefinition {
  set: {
    /** Name of property to be updated */
    property: StringProducingExpression;

    /** Destination resource that will have its property updated.
     *  Defaults to `self` */
    on?: ResourceProducingExpression;

    /** New value for the property */
    value: Expression;

    includeInHistory?: BooleanProducingExpression;
  };
}

export type PermissionDefinition = Array<PermissionRule>;
export type PermissionRule =
  | {
      roles: string[];
      conditions: ConditionDefinition;
    }
  | DenyAlwaysDefiniton
  | AllowAlwaysDefiniton;

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
