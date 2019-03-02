import { SystemDefinition, User } from "../types/";
import { DataLoader } from "../dataLoader";

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

  /** Whether or not this transition is possible for anyone */
  possible: boolean;

  /** Whether or not this transition is allowed for the requesting user */
  allowed: boolean;
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
  getResource(params: GetResourceParams): Promise<UnknownResource>;

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
    // TODO: Omit fields the user does not have permission to read
    // TODO: Validate data against system definition before returning
    return { ...(rawResult as RawUnknownResource), uid, type };
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
      if (allTransitions[t].from.includes(resource.state)) {
        // TODO: Evaluate rules to determine if transition
        // is possible and/or allowed.
        result.push({ to: t, possible: true, allowed: true });
      }
    }

    return result;
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

    return true;
  }
}
