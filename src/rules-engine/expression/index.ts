import { Expression, User } from "../../types";
import { IfExpression, ExpressionResult } from "../../types/expressions";

export interface ExpressionContext {
  // dataLoader: DataLoader;
  // definition: SystemDefinition;

  /** Custom-defined named functions (lambdas) */
  functions?: { [name: string]: Expression };

  /** Variables captured by the context's current lambda*/
  closures?: { [name: string]: any };

  self?: { [property: string]: any } | null;
  user?: User;
  stack?: string[];

  // TODO: Need to store and mark nodes to detect circular references
}

export default function e(
  expression: Expression,
  context: ExpressionContext = { self: null }
): ExpressionResult {
  try {
    // Push current expression onto the stack
    if (!context.stack) {
      context.stack = [];
    }
    //context = { ...context, stack: [...context.stack] };
    context.stack = [...context.stack, stackRepresentation(expression)];

    // Figure out the type of the current expression
    // If it is a primitive type, return the value directly
    if (
      ["string", "boolean", "number"].includes(typeof expression) ||
      expression instanceof Date ||
      Array.isArray(expression)
    ) {
      return expression as ExpressionResult;
    }

    // Expressions that aren't primitives should be objects
    // Get the key to figure out which kind of expression this one is
    const keys = Object.keys(expression);
    if (!keys.length) {
      throw new Error("Invalid expression: no keys specified");
    }

    // Special form for if/then/else
    if (
      keys.length === 3 &&
      keys.includes("if") &&
      keys.includes("then") &&
      keys.includes("else")
    ) {
      return evaluateIf(expression as IfExpression, context);
    }

    // Any other valid expression should have only one key that represents the operator
    if (keys.length !== 1) {
      throw new Error(
        `Invalid expression: more than one operator found ${JSON.stringify(
          expression
        )}`
      );
    }

    const op = keys[0];
    const args = (expression as any)[keys[0]];

    if (!operatorMap[op]) {
      // Look in context for custom function with this operator
      if (context.functions && context.functions[op]) {
        return useDefinition(op, args, context);
      }
      throw new InvalidOperator(op);
    }

    return operatorMap[op](args, context);
  } catch (e) {
    e.message += stackTrace(context.stack);
    throw e;
  }
}

function evaluateIf(expression: IfExpression, context: ExpressionContext) {
  if ($boolean(expression.if, context)) {
    return e(expression.then, context);
  } else {
    return e(expression.else, context);
  }
}

function useDefinition(
  op: string,
  args: any,
  context: ExpressionContext
): ExpressionResult {
  const def = context.functions![op];

  // Put argument values into context's closure
  context = { ...context, closures: { ...context.closures, ...args } };
  try {
    return e(def, context);
  } catch (e) {
    // Augment "MissingArgument" error with name of this defined function
    if (e.name === "MissingArgument") {
      e.message = `Function "${op}" is missing argument "${e.argName}"`;
    }

    if (e.name === "ExpressionTypeError") {
      e.message = `expected "${e.expectedType}" but received "${
        e.receivedType
      } in function "${op}". \n> ${JSON.stringify(e.receivedValue)}`;
    }
    throw e;
  }
}

interface OperatorMap {
  [op: string]: (args: any, context: ExpressionContext) => ExpressionResult;
}

/** Map of operators to their native functions */
const operatorMap: OperatorMap = {
  and: ([A, B], ctx) => $boolean(A, ctx) && $boolean(B, ctx),
  or: ([A, B], ctx) =>
    $boolean(A, ctx) ? true : $boolean(B, ctx) ? true : false,
  not: (E, ctx) => !$boolean(E, ctx),

  ">": ([A, B], ctx) => $number(A, ctx) > $number(B, ctx),
  "<": ([A, B], ctx) => $number(A, ctx) < $number(B, ctx),
  "=": ([A, B], ctx) => $number(A, ctx) === $number(B, ctx),
  "+": ([A, B], ctx) => $number(A, ctx) + $number(B, ctx),
  "-": ([A, B], ctx) => $number(A, ctx) - $number(B, ctx),
  "*": ([A, B], ctx) => $number(A, ctx) * $number(B, ctx),
  "/": ([A, B], ctx) => $number(A, ctx) / $number(B, ctx),
  "%": ([A, B], ctx) => $number(A, ctx) % $number(B, ctx),
  pow: ([A, B], ctx) => Math.pow($number(A, ctx), $number(B, ctx)),

  eq: ([A, B], ctx) => $string(A, ctx) === $string(B, ctx),

  exists: ({ property, from }, ctx) => {
    if (from) throw new NotImplemented("exists from");
    if (!ctx.self) throw new ExpressionTypeError("self", null);

    return ctx.self[property] !== undefined;
  },

  stringLength: (string, ctx) => {
    return $string(string, ctx).length;
  },

  /** Join an array of strings with an optional separator */
  joinStrings: (args, ctx) => {
    let strings: string[];
    let separator: string;
    if (Array.isArray(args)) {
      // Strings to join are specified in an array
      strings = args.map(el => $string(el, ctx));
      separator = "";
    } else if (args.strings) {
      // Strings to join are specified in an object
      strings = $array(args.strings, ctx).map(el => $string(el, ctx));
      separator = $string(args.separator || "", ctx);
    } else {
      // Strings to join must be a string-producing expression
      strings = $array(args, ctx).map(el => $string(el, ctx));
      separator = "";
    }

    return strings.join(separator);
  },

  /** Returns a boolean indicating whether the `needle` object occurs in the
   *  `haystack` array */
  contains: ({ needle, haystack }, ctx) => {
    if (needle === undefined || haystack === undefined) {
      throw new SyntaxError(
        "'contains' expression requires both a 'needle' and a 'haystack' parameter"
      );
    }

    haystack = $array(haystack, ctx).map(el => e(el, ctx));
    needle = e(needle, ctx);
    const firstType = typeof haystack[0];
    if (haystack.some((a: unknown) => typeof a !== firstType)) {
      // TODO: This should be a different exception
      throw new ExpressionTypeError(firstType, haystack);
    }
    if (typeof needle !== typeof firstType) {
      throw new ExpressionTypeError(firstType, needle);
    }

    return haystack.includes(needle);
  },

  /** This function accesses a property on an object in the current context.
   *  If the `from` argument is not specified, this argument uses the object
   *  in the context's `self` property.
   *  If the `from` argument is specified, this function reads
   */
  get: (args, ctx) => {
    let property, from;
    if (typeof args === "string") {
      property = args;
    } else {
      property = $string(args.property, ctx);
      from = args.from;
    }

    if (from) throw new NotImplemented("get from");
    if (!ctx.self) throw new ExpressionTypeError("self", null);

    return ctx.self[property];
  },

  /** This function access an argument set in a lambda / defined function */
  $: (name: string | number, ctx) => {
    if (!ctx.closures || !ctx.closures.hasOwnProperty(name))
      throw new MissingArgument(name);
    return e(ctx.closures[name], ctx);
  }
};

/** Evaluate an expression and expect a number as a return value.
 *  Throws an error if it is any other type */
export function $number(n: any, ctx: ExpressionContext) {
  const evaluated = e(n, ctx);
  if (typeof evaluated !== "number")
    throw new ExpressionTypeError("number", evaluated);

  return evaluated;
}

/** Evaluate an expression and expect a string as a return value.
 *  Throws an error if it is any other type */
export function $string(n: any, ctx: ExpressionContext) {
  const evaluated = e(n, ctx);
  if (typeof evaluated !== "string")
    throw new ExpressionTypeError("string", evaluated);

  return evaluated;
}

/** Evaluate an expression and expect a boolean as a return value.
 *  Throws an error if it is any other type */
export function $boolean(n: any, ctx: ExpressionContext) {
  const evaluated = e(n, ctx);
  if (typeof evaluated !== "boolean")
    throw new ExpressionTypeError("boolean", evaluated);

  return evaluated;
}

/** Evaluate an expression and expect an array as a return value.
 *  Throws an error if it is any other type */
export function $array(n: any, ctx: ExpressionContext) {
  const evaluated = e(n, ctx);
  if (!Array.isArray(evaluated))
    throw new ExpressionTypeError("array", evaluated);

  return (evaluated as unknown) as Array<string | number | boolean>;
}

export function stackRepresentation(e: Expression) {
  const keys = typeof e === "object" ? Object.keys(e) : [];
  if (!keys.length) return String(e);
  return keys.length ? keys.join("/") : String(e);
}

// TODO: Better stack traces :-(
function stackTrace(stack?: string[]) {
  let trace = "";
  if (stack) {
    stack.forEach(
      (frame, depth) =>
        (trace += `${new Array(depth).fill(" ").join("")}${frame}\n`)
    );
  }
  return "\n- - - \n\nExpression stack trace: \n" + trace;
}

// Custom errors
///////////////////////////////////////////////////////////////////////////////
export class NotImplemented extends Error {
  name = "NotImplemented";
  constructor(operation: string) {
    super(operation);
    this.message = operation + " has not yet been implemented.";
  }
}
export class InvalidOperator extends Error {
  name = "InvalidOperator";
  constructor(op: string) {
    super(`${op}`);
  }
}
export class ExpressionTypeError extends Error {
  name = "ExpressionTypeError";
  expectedType: string;
  receivedType: string;
  receivedValue: any;
  constructor(expected: string, received: any) {
    super();
    this.expectedType = expected;
    this.receivedType = typeof received;
    this.receivedValue = received;

    this.message = `expected "${this.expectedType}" but received "${
      this.receivedType
    }". \n> ${JSON.stringify(received)}`;
  }
}

export class MissingArgument extends Error {
  name = "MissingArgument";
  argName: string | number;
  constructor(argName: string | number) {
    super(String(argName));
    this.message = `"${argName}" is not defined in the current context.`;
    this.argName = argName;
  }
}
