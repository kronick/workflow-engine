// Expression definitions
///////////////////////////////////////////////////////////////////////////////
export type ExpressionResultTypes =
  | "number"
  | "string"
  | "boolean"
  | "string[]"
  | "number[]"
  | "boolean[]";
export type Expression = GetExpression | SumExpression | string;

export type NumberProducingExpression =
  | number
  | SumExpression
  | GetExpression<"number">;

export type BooleanProducingExpression =
  | boolean
  | GetExpression<"boolean">
  | ExistsExpression
  | DoesNotExistExpression
  | InStateExpression
  | CanTransitionExpression
  | AndExpression
  | AllExpression
  | OrExpression
  | AnyExpression
  | NoneExpression
  | NotExpression
  | GreaterThanExpression
  | LessThanExpression
  | EqualExpression;

export type StringProducingExpression = GetExpression<"string"> | string;

/** An expression that produces an array of primitives */
export type ArrayProducingExpression<
  T extends ExpressionResultTypes
> = T extends "number"
  ? (NumberProducingExpression[] | GetAllExpression<"number[]">)
  : T extends "string"
  ? (StringProducingExpression[] | GetAllExpression<"string[]">)
  : T extends "boolean"
  ? (BooleanProducingExpression[] | GetAllExpression<"boolean[]">)
  : never;

export type ResourceProducingExpression =
  | DereferenceExpression
  | MostRecentExpression;

/** An expression that extracts a value from a single resource object */
interface GetExpression<TResult extends ExpressionResultTypes = "string"> {
  get: {
    property: StringProducingExpression;
    /** If `from` is not specified, the current resource is used */
    from?: ResourceProducingExpression;
    asType: TResult;
  };
}

/** An expression that extracts a value from a resource object */
interface GetAllExpression<TResult extends ExpressionResultTypes = "string[]"> {
  getAll: {
    property: StringProducingExpression;
    from: string | ResourceProducingExpression;
    asType: TResult;
  };
}

/** An expression that returns a resource referenced by the current resouce */
interface DereferenceExpression {
  ref: StringProducingExpression;
}

/** An expression that returns the last resource in an array of references
 *  on the current resource.
 */
interface MostRecentExpression {
  mostRecent: StringProducingExpression;
}

interface SumExpression {
  sum: ArrayProducingExpression<"number">;
}

/** An expression that returns `true` if a property exists and has a non-null value
 *  on the specified resource.
 */
interface ExistsExpression {
  exists: {
    property: StringProducingExpression;
    /** If `from` is not specified, the current resource is used */
    from?: ResourceProducingExpression;
  };
}

/** An expression that returns `true` if a property does not exist or has a non-null
 *  value on the specified resource.
 */
interface DoesNotExistExpression {
  doesNotExist: {
    property: StringProducingExpression;
    /** If `from` is not specified, the current resource is used */
    from?: ResourceProducingExpression;
  };
}

/** An expression that returns `true` if the specified resource is in one of
 *  the specified `states`.
 */
interface InStateExpression {
  inState: {
    resource?: ResourceProducingExpression;
    states: ArrayProducingExpression<"string">;
  };
}

/** An expression that returns `true` if the specified resource can transition
 *  to specified `state`.
 */
interface CanTransitionExpression {
  canTransition: {
    resource?: ResourceProducingExpression;
    toState: StringProducingExpression;
  };
}

interface AndExpression {
  and: [BooleanProducingExpression, BooleanProducingExpression];
}
interface OrExpression {
  or: [BooleanProducingExpression, BooleanProducingExpression];
}
interface NotExpression {
  not: BooleanProducingExpression;
}
/** Behaves the same as `all` for now */
interface AllExpression {
  all: Array<BooleanProducingExpression>;
}
/** Behaves the same as `or` for now */
interface AnyExpression {
  any: Array<BooleanProducingExpression>;
}
interface NoneExpression {
  none: Array<BooleanProducingExpression>;
}

// Mathematical Expression definitions
///////////////////////////////////////////////////////////////////////////////
interface GreaterThanExpression {
  ">": [NumberProducingExpression, NumberProducingExpression];
}
interface LessThanExpression {
  "<": [NumberProducingExpression, NumberProducingExpression];
}
interface EqualExpression {
  "=": Array<NumberProducingExpression>;
}
