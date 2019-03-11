import { SystemDefinition, User } from "../types/";
import { DataLoader, UnknownResourceData, HistoryEvent } from "../dataLoader";
import evaluateConditions from "../rules-engine/conditions";
import evaluatePermissions from "../rules-engine/permissions";
import evaluateExpression, { $boolean } from "../rules-engine/expression";
import { ConditionResult } from "../rules-engine/conditions/index";
import { TransitionDefinition, ResourceDefinition } from "../types/resources";
import { stdlibCtx } from "../rules-engine/expression/stdlib";
import evaluateEffects, { EffectResult, UpdateEffectResult } from "../effects";

export interface RawUnknownResource {
  [property: string]: unknown;
  state: string;
}
export type UnknownResource = {
  [property: string]: GetPropertyResult<unknown>;
} & { state: string; uid: string; type: string };

interface GetResourceParams {
  /** Unique identifier of the resource being requested.  */
  uid: string;

  /** Type of the resource being requested.
   *  Will be used to validate the result.
   */
  type: string;

  /** User definition requesting access to this resource. */
  asUser: User;

  /** Optional list of properties too include in the result. If omitted,
   *  all properties will be returned.
   */
  includeProperties?: string[];
}
type GetResourceResult = Result<UnknownResource, "resource">;
type GetPropertyResult<T> = Result<T, "value">;

interface GetHistoryParams {
  uid: string;
  type: string;
  asUser: User;
}
type GetHistoryResult = Result<HistoryEvent[], "history">;

/** Generic type to represent a request result.
 *  Allows for two keys: `errors` (required) and a dynamically-named `TDataKey`
 *  key (defaults to "data").
 *
 *  A successful result will have data in the `TDataKey` key and an empty
 *  `errors` array. An unsuccessful result will have error strings in the
 *  `errors` array and a `TDataKey` value of `undefined`.
 */
export type Result<TData, TDataKey extends string = "data"> = {
  [key in TDataKey]: TData | undefined
} & {
  errors: string[];
};

interface DescribeTransitionsParams {
  uid: string;
  type: string;
  asUser: User;
}

interface ListResourceParams {
  type: string;
  asUser: User;
}

interface UpdateResourceParams {
  /** Unique identifier of the resource to be updated.  */
  uid: string;

  /** Type of the resource to be updated.
   *  Will be used to validate the input.
   */
  type: string;

  /** User requesting access to update this resource. */
  asUser: User;

  /** New data to store on resource.
   *  Note that you cannot change calculated properties via this method.
   */
  data: { [property: string]: unknown };
}

export type DescribeTransitionsResult = Array<{
  /** Target state */
  action: string;

  /** Whether or not this transition is possible given its current state*/
  possible: boolean;

  /** Whether or not this transition is allowed for the requesting user */
  allowed: boolean;

  /** Reason this transition is not possible in its current state. */
  possibleReason?: string;
  /** Reason this transition is not allowed for the requesting user. */
  allowedReason?: string;
}>;

interface CanPerformTransitionParams {
  uid: string;
  type: string;
  asUser: User;
  transition: string;
}

export interface PerformActionParams {
  uid: string;
  type: string;
  action: string;
  asUser: User;
  input?: unknown;
}

export type PerformActionResult = Result<boolean, "success">;

interface BusinessEngine {
  /** Get a resource's data including calculated properties.
   *  Will exclude any fields that the requesting user is not permitted to view
   */
  getResource(params: GetResourceParams): Promise<GetResourceResult>;

  /** Update data for a resource. */
  updateResource(params: UpdateResourceParams): Promise<GetResourceResult>;
  // TODO: Other CRUD methods
  // createResource(params: CreateResourceParams): Promise<UnknownResource>;
  // deleteResource(params: DeleteResourceParams): Promise<UnknownResource>;

  /** Returns information about all defined transitions on the specified
   *  resource. Will return all transitions whether currently possible
   *  or allowed or not. Mostly useful for debugging and visualization.
   */
  describeTransitions(
    params: DescribeTransitionsParams
  ): Promise<DescribeTransitionsResult>;

  /** Returns a boolean indicating whether the specified user can perform the
   *  specified transition on the specified resource.
   */
  canPerformTransition(params: CanPerformTransitionParams): Promise<boolean>;

  /** List the available resource types in the system */
  listResourceTypes(): string[];

  /** List all resources of a given type that are visible to the requesting user */
  listResources(
    params: ListResourceParams
  ): Promise<Array<{ uid: string; type: string }>>;

  /** Perform a named action on a resource */
  performAction(params: PerformActionParams): Promise<PerformActionResult>;

  /** Get the history event log for a resource */
  getHistory(params: GetHistoryParams): Promise<GetHistoryResult>;
}

const RESOURCE_NOT_FOUND = {
  resource: undefined,
  errors: ["Resource not found."]
};
const RESOURCE_ACCESS_DENIED = {
  resource: undefined,
  errors: ["Access denied."]
};
const HISTORY_NOT_FOUND = {
  history: undefined,
  errors: ["Resource not found."]
};
const HISTORY_ACCESS_DENIED = {
  history: undefined,
  errors: ["Access denied."]
};

export default class PGBusinessEngine implements BusinessEngine {
  system: SystemDefinition;
  dataLoader: DataLoader;

  constructor(definition: SystemDefinition, dataLoader: DataLoader) {
    this.system = definition;
    this.dataLoader = dataLoader;
  }

  listResourceTypes() {
    return Object.keys(this.system.resources);
  }

  /** List all resources of a given type that are visible to the requesting user */
  async listResources(params: ListResourceParams) {
    // TODO: Filter non-visible resources when per-resource visibility
    // permissions are set up
    return await this.dataLoader.list(params.type);
  }

  /** Get a resource using the data loader and calculate its calculated
   *  properties
   */
  async _getRawResource({ uid, type, asUser }: GetResourceParams) {
    const resourceDef = this.system.resources[type];
    if (!resourceDef) {
      return undefined;
    }

    const rawResult = await this.dataLoader.read(uid, type);
    if (!rawResult) {
      return undefined;
    }

    return {
      ...rawResult,
      ...this._calculateProperties(resourceDef, rawResult)
    };
  }

  async getResource({ uid, type, asUser }: GetResourceParams) {
    const rawResult = await this._getRawResource({ uid, type, asUser });

    if (!rawResult) {
      return RESOURCE_NOT_FOUND;
    }

    const ctx = stdlibCtx({ self: rawResult });

    const resourceDef = this.system.resources[type];

    if (!resourceDef) {
      return RESOURCE_NOT_FOUND;
    }

    // Enforce resource-level read permissions
    const permissions = this.system.resources[type].readPermissions;
    if (permissions) {
      const result = evaluatePermissions(permissions, asUser, ctx);
      if (result.decision === "deny") {
        this._evaluateTransitionPermissions;
        if (result.reason) {
          return { resource: undefined, errors: [result.reason] };
        }
        return RESOURCE_ACCESS_DENIED;
      }
    }

    // Enforce per-field read permissions
    const visibleResult = {
      state: rawResult.state,
      uid,
      type
    } as UnknownResource;

    // TODO: This needs to be updated to work with calculated properties
    for (const property in rawResult) {
      // Special case for `state` — don't enforce read permissions
      if (property === "state") continue;

      // Figure out whether this is a calculated or regular property
      const section =
        resourceDef.properties && resourceDef.properties[property]
          ? resourceDef.properties
          : resourceDef.calculatedProperties &&
            resourceDef.calculatedProperties[property]
          ? resourceDef.calculatedProperties
          : undefined;
      if (!section) continue;

      if (section[property].readPermissions) {
        const perms = section[property].readPermissions;
        const result = evaluatePermissions(perms!, asUser, ctx);
        if (result.decision === "allow") {
          visibleResult[property] = { value: rawResult[property], errors: [] };
        } else {
          visibleResult[property] = {
            value: undefined,
            errors: [result.reason || "Access denied."]
          };
        }
      } else {
        // No read permissions specified means we should allow read access
        // by default.
        visibleResult[property] = { value: rawResult[property], errors: [] };
      }
    }

    // TODO: Validate data against system definition before returning
    return {
      resource: visibleResult,
      errors: []
    };
  }

  async getHistory({ uid, type, asUser }: GetHistoryParams) {
    const rawResult = await this._getRawResource({ uid, type, asUser });

    if (!rawResult) {
      return HISTORY_NOT_FOUND;
    }

    const ctx = stdlibCtx({ self: rawResult });

    const resourceDef = this.system.resources[type];

    if (!resourceDef) {
      return HISTORY_NOT_FOUND;
    }

    // Enforce resource-level read permissions
    const permissions = this.system.resources[type].readPermissions;
    if (permissions) {
      const result = evaluatePermissions(permissions, asUser, ctx);
      if (result.decision === "deny") {
        this._evaluateTransitionPermissions;
        if (result.reason) {
          return { history: undefined, errors: [result.reason] };
        }
        return HISTORY_ACCESS_DENIED;
      }
    }

    try {
      return {
        history: await this.dataLoader.getHistory(uid, type),
        errors: []
      };
    } catch (e) {
      return {
        history: undefined,
        errors: ["Unexpected error fetching history."]
      };
    }
  }

  _calculateProperties(
    resourceDef: ResourceDefinition,
    rawResult: UnknownResourceData
  ): { [key: string]: unknown } {
    const ctx = stdlibCtx({ self: rawResult });

    if (!resourceDef.calculatedProperties) {
      return {};
    }

    const out: { [key: string]: unknown } = {};
    for (const name in resourceDef.calculatedProperties) {
      const expr = resourceDef.calculatedProperties[name].expression;
      // TODO: A calculated property without an expression should probably
      // throw at least a warning. For now we'll just skip it.
      if (!expr) continue;

      // TODO: This needs to be re-written to handle calculated properties that
      // reference other calculated props.
      out[name] = evaluateExpression(expr, ctx);
    }

    return out;
  }

  async updateResource({ uid, type, asUser, data }: UpdateResourceParams) {
    // TODO: Validate data against system definition before attempting update
    const success = await this.dataLoader.update(uid, type, data);

    // Read the result back
    // TODO: Derive calculated fields and omit fields the user does not
    //  have permission to read
    const rawResult = await this._getRawResource({ uid, type, asUser });

    if (!rawResult) {
      return RESOURCE_NOT_FOUND;
    }

    // TODO: Don't re-fetch after update. Although if the data loader caches
    //  data this shouldn't make a difference.
    return await this.getResource({ uid, type, asUser });
  }

  async describeTransitions({
    uid,
    type,
    asUser
  }: DescribeTransitionsParams): Promise<DescribeTransitionsResult> {
    const allTransitions = this.system.resources[type].transitions;
    if (!allTransitions) {
      throw new Error("This resource has no transitions defined.");
    }

    const resource = await this._getRawResource({ uid, type, asUser });
    if (!resource) {
      throw new Error("The specified resource could not be found.");
    }

    const result: DescribeTransitionsResult = [];
    for (const t in allTransitions) {
      const transition = allTransitions[t];
      if (transition.from.includes(resource.state)) {
        // Figure out if this transition is possible and/or allowed
        const { possible, allowed } = this._evaluateTransitionPermissions(
          transition,
          resource,
          asUser
        );

        result.push({
          action: t,
          possible: possible.decision === "allow",
          possibleReason: possible.reason,
          allowed: allowed.decision === "allow",
          allowedReason: allowed.reason
        });
      }
    }

    return result;
  }

  _evaluateTransitionPermissions(
    transition: TransitionDefinition,
    resource: RawUnknownResource,
    asUser: User
  ) {
    // Figure out if this transition is possible given its current state.
    // If no conditions are specified, the transition is always possible.
    const possible: ConditionResult = !transition.conditions
      ? { decision: "allow" }
      : evaluateConditions(
          transition.conditions,
          stdlibCtx({ self: resource })
        );

    // Figure out if this transition is allowed given the current user.
    // If no permissions are specified, the transition is always allowed
    // as long as it is possible.
    const allowed: ConditionResult =
      possible.decision === "deny"
        ? { decision: "deny", reason: possible.reason }
        : !transition.permissions
        ? { decision: "allow" }
        : evaluatePermissions(
            transition.permissions,
            asUser,
            stdlibCtx({ self: resource })
          );

    return { possible, allowed };
  }

  async canPerformTransition({
    uid,
    type,
    asUser,
    transition
  }: CanPerformTransitionParams) {
    const allTransitions = this.system.resources[type].transitions;
    if (!allTransitions) {
      throw new Error("This resource has no transitions defined.");
    }
    if (!allTransitions[transition]) {
      throw new Error("That is not a valid transition for this resource.");
    }

    const resource = await this._getRawResource({ uid, type, asUser });
    if (!resource) {
      throw new Error("The specified resource could not be found.");
    }

    if (!allTransitions[transition].from.includes(resource.state)) {
      return false;
    }

    const { allowed } = this._evaluateTransitionPermissions(
      allTransitions[transition],
      resource,
      asUser
    );

    return allowed.decision === "allow";
  }

  async performAction({
    uid,
    type,
    asUser,
    action,
    input
  }: PerformActionParams) {
    // Gather required data to check if this action is possible.
    const resourceDef = this.system.resources[type];
    if (!resourceDef) {
      return { success: false, errors: [`Resource not found.`] };
    }

    const allActions = resourceDef.transitions;
    if (!allActions || allActions[action] === undefined) {
      return { success: false, errors: [`Invalid action: \`${action}\`.`] };
    }
    const actionDef = allActions[action];

    const rawResult = await this._getRawResource({ uid, type, asUser });
    if (!rawResult) {
      return { success: false, errors: [`Resource not found.`] };
    }

    const ctx = stdlibCtx({ self: { ...rawResult, uid, type } });

    const { allowed } = this._evaluateTransitionPermissions(
      actionDef,
      rawResult,
      asUser
    );

    if (allowed.decision === "allow") {
      // The action is allowed. Evaluate the action and create a list of
      // its effects.
      const effects: EffectResult[] = [];

      // Evaluated expression that determines if this action should log a
      // history event.
      const includeInHistory =
        actionDef.includeInHistory !== undefined
          ? $boolean(actionDef.includeInHistory, ctx)
          : false;

      // If there is a `to` state specified, create a `update` effect
      // that sets the `state` property of the current resource
      if (actionDef.to) {
        effects.push({
          type: "update",
          properties: { state: actionDef.to },
          on: { uid, type }, // Current resource
          includeInHistory
        });
      }

      // If there are other effects defined, evaluate those
      if (actionDef.effects) {
        evaluateEffects(actionDef.effects, ctx);
        effects.push(...evaluateEffects(actionDef.effects, ctx));
      }

      // Now that all effects have been evaluated, execute them
      // TODO: Error handling and reporting
      await this._performEffects(effects, { uid, type }, includeInHistory);

      return { success: true, errors: [] };
    } else {
      return { success: false, errors: [allowed.reason || "Access denied."] };
    }
  }

  /** Perform side effects of an action, such as updating resources via the
   *  dataLoader, sending e-mails, and logging history events.
   */
  async _performEffects(
    effects: EffectResult[],
    parent: { uid: string; type: string },
    writeHistory: boolean
  ) {
    effects.forEach(async e => {
      switch (e.type) {
        case "email":
          break;
        case "update":
          // TODO: Should we check write permissions at this step too?
          await this.dataLoader.update(e.on.uid, e.on.type, e.properties);
          break;
      }
    });

    if (writeHistory) {
      // Merge all updated properties on each updated object
      const updated: Map<string, { [key: string]: unknown }> = new Map();
      effects
        // Only include effects that are marked to include in history
        .filter(e => e.type === "update" && e.includeInHistory)
        .map(e => e as UpdateEffectResult)
        .forEach(e => {
          const k = makeKey(e.on.uid, e.on.type);
          updated.set(k, { ...updated.get(k), ...e.properties });
        });

      const event: HistoryEvent = {
        timestamp: new Date().getTime(),
        parentResource: parent,
        changes: Array.from(updated.entries())
          .map(update => {
            const resource = parseKey(update[0]);
            const properties = update[1];
            return Object.keys(properties).map(p => ({
              resource,
              property: p,
              old: null,
              new: properties[p]
            }));
          })
          .reduce((prev, curr) => prev.concat(curr), [])
      };

      // Write a history event
      await this.dataLoader.writeHistory(parent.uid, parent.type, event);
      // this.dataLoader.update(uid, type, { state: toState });
    }
  }
}

// TODO: These probably don't belong here
function makeKey(uid: string, type: string) {
  return `${type}#${uid}`;
}
function parseKey(key: string) {
  const parts = key.split("#");
  return { uid: parts[1], type: parts[0] };
}
