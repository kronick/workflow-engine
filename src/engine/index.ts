import { SystemDefinition, User } from "../types/";
import { DataLoader } from "../dataLoader";
import evaluateConditions from "../rules-engine/conditions";
import evaluatePermissions from "../rules-engine/permissions";
import { ConditionResult } from "../rules-engine/conditions/index";
import { TransitionDefinition } from "../types/resources";

export interface RawUnknownResource {
  [property: string]: unknown;
  state: string;
}
export interface UnknownResource {
  [property: string]: unknown;
  state: string;
  uid: string;
  type: string;
}
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

interface DescribeTransitionsParams {
  uid: string;
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
  to: string;

  /** Whether or not this transition is possible given its current state*/
  possible: boolean;

  /** Whether or not this transition is allowed for the requesting user */
  allowed: boolean;

  /** Reason this transition is not possible in its current state. */
  notPossibleReason?: string;
  /** Reason this transition is not allowed for the requesting user. */
  notAllowedReason?: string;
}>;

interface CanPerformTransitionParams {
  uid: string;
  type: string;
  asUser: User;
  transition: string;
}
interface BusinessEngine {
  /** Get a resource's data including calculated properties.
   *  Will exclude any fields that the requesting user is not permitted to view
   */
  getResource(params: GetResourceParams): Promise<UnknownResource | undefined>;

  /** Update data for a resource. */
  updateResource(params: UpdateResourceParams): Promise<UnknownResource>;
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
}
export default class PGBusinessEngine implements BusinessEngine {
  system: SystemDefinition;
  dataLoader: DataLoader;

  constructor(definition: SystemDefinition, dataLoader: DataLoader) {
    this.system = definition;
    this.dataLoader = dataLoader;
  }

  async getResource({ uid, type, asUser }: GetResourceParams) {
    const rawResult = await this.dataLoader.read(uid, type);
    // TODO: Derive calculated fields

    if (!rawResult) {
      return undefined;
    }

    // Enforce per-field read permissions
    const visibleResult: RawUnknownResource = { state: rawResult.state };
    // TODO: This needs to be updated to work with calculated properties
    const resourceDef = this.system.resources[type];
    for (const property in rawResult) {
      if (
        resourceDef.properties &&
        resourceDef.properties[property] &&
        resourceDef.properties[property].readPermissions
      ) {
        const perms = resourceDef.properties[property].readPermissions;
        const result = evaluatePermissions(perms!, asUser, { self: rawResult });
        if (result.decision === "allow") {
          visibleResult[property] = rawResult[property];
        }
      } else {
        visibleResult[property] = rawResult[property];
      }
    }

    // TODO: Validate data against system definition before returning
    return { ...visibleResult, uid, type };
  }

  async updateResource({ uid, type, asUser, data }: UpdateResourceParams) {
    // TODO: Validate data against system definition before attempting update
    const success = await this.dataLoader.update(uid, type, data);

    // Read the result back
    // TODO: Derive calculated fields and omit fields the user does not
    //  have permission to read
    const rawResult = await this.dataLoader.read(uid, type);

    // TODO: omit fields the user does not have permission to read
    return { ...(rawResult as RawUnknownResource), uid, type };
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

    const resource = await this.dataLoader.read(uid, type);
    if (!resource) {
      throw new Error("The specified resource could not be found.");
    }

    const result: DescribeTransitionsResult = [];
    for (const t in allTransitions) {
      const transition = allTransitions[t];
      if (transition.from.includes(resource.state)) {
        // Figure out if this transition is possible and/or allowed
        const { possible, allowed } = this.evaluateTransitionPermissions(
          transition,
          asUser
        );

        result.push({
          to: t,
          possible: possible.decision === "allow",
          notPossibleReason: possible.reason,
          allowed: allowed.decision === "allow",
          notAllowedReason: allowed.reason
        });
      }
    }

    return result;
  }

  evaluateTransitionPermissions(
    transition: TransitionDefinition,
    asUser: User
  ) {
    // Figure out if this transition is possible given its current state.
    // If no conditions are specified, the transition is always possible.
    const possible: ConditionResult = !transition.conditions
      ? { decision: "allow" }
      : evaluateConditions(transition.conditions);

    // Figure out if this transition is allowed given the current user.
    // If no permissions are specified, the transition is always allowed
    // as long as it is possible.
    const allowed: ConditionResult =
      possible.decision === "deny"
        ? { decision: "deny", reason: possible.reason }
        : !transition.permissions
        ? { decision: "allow" }
        : evaluatePermissions(transition.permissions, asUser, {});

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

    const resource = await this.dataLoader.read(uid, type);
    if (!resource) {
      throw new Error("The specified resource could not be found.");
    }

    if (!allTransitions[transition].from.includes(resource.state)) {
      return false;
    }

    // TODO: Evaluate conditions and permissions to determine if transition
    // is allowed.

    const { allowed } = this.evaluateTransitionPermissions(
      allTransitions[transition],
      asUser
    );

    return allowed.decision === "allow";
  }
}
