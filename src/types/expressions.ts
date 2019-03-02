// Expression definitions
///////////////////////////////////////////////////////////////////////////////
export type ExpressionResultTypes =
  | "number"
  | "string"
  | "boolean"
  | "string[]"
  | "number[]"
  | "boolean[]";

export type ExpressionResult =
  | string
  | number
  | boolean
  | Date
  | Array<string | boolean | number | Date>;

export type Expression<T extends ExpressionResultTypes = "string"> =
  | NumberProducingExpression
  | BooleanProducingExpression
  | StringProducingExpression
  | ArrayProducingExpression<T>
  | ResourceProducingExpression
  | IfExpression
  | Date
  | Array<string | boolean | number | Date>;

export type OperatorExpression = {
  [operator: string]: { [key: string]: any } | any[];
};

export type NumberProducingExpression =
  | number
  | SumExpression
  | AdditionExpression
  | SubtractionExpression
  | MultiplicationExpression
  | DivisionExpression
  | ModuloExpression
  | PowerExpression
  | GetExpression<"number">
  | IfExpression;

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
  | EqualExpression
  | IfExpression;

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
export interface InStateExpression {
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

export interface AndExpression {
  and: [BooleanProducingExpression, BooleanProducingExpression];
}
export interface OrExpression {
  or: [BooleanProducingExpression, BooleanProducingExpression];
}
export interface NotExpression {
  not: BooleanProducingExpression;
}

export interface AllExpression {
  all: Array<BooleanProducingExpression>;
}

export interface AnyExpression {
  any: Array<BooleanProducingExpression>;
}
export interface NoneExpression {
  none: Array<BooleanProducingExpression>;
}

// Mathematical Expression definitions
///////////////////////////////////////////////////////////////////////////////
export interface GreaterThanExpression {
  ">": [NumberProducingExpression, NumberProducingExpression];
}
export interface LessThanExpression {
  "<": [NumberProducingExpression, NumberProducingExpression];
}
export interface EqualExpression {
  "=": Array<NumberProducingExpression>;
}

export interface AdditionExpression {
  "+": [NumberProducingExpression, NumberProducingExpression];
}
export interface SubtractionExpression {
  "-": [NumberProducingExpression, NumberProducingExpression];
}
export interface DivisionExpression {
  "/": [NumberProducingExpression, NumberProducingExpression];
}
export interface MultiplicationExpression {
  "*": [NumberProducingExpression, NumberProducingExpression];
}
export interface ModuloExpression {
  "%": [NumberProducingExpression, NumberProducingExpression];
}
export interface PowerExpression {
  pow: [NumberProducingExpression, NumberProducingExpression];
}

// Special forms
///////////////////////////////////////////////////////////////////////////////
export interface IfExpression {
  if: Expression;
  then: Expression;
  else: Expression;
}
