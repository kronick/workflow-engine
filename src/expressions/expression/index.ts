import { Expression } from "../../types";
import { DataLoader } from "../../dataLoader";
import { UnknownResource } from "../../engine";
import {
  IfExpression,
  ExpressionResult,
  OperatorExpression
} from "../../types/expressions";

interface ExpressionContext {
  // dataLoader: DataLoader;
  // definition: SystemDefinition;
  currentResource: UnknownResource | null;
  stack?: string[];

  /** Custom-defined expressions */
  definitions?: { [operator: string]: Expression };

  // TODO: Need to store and mark nodes to detect circular references
}

export default function evaluateExpression(
  expression: Expression,
  context: ExpressionContext = { currentResource: null }
): ExpressionResult {
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
    return _evaluateIf(expression as IfExpression, context);
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
    // Look in the context for custom function definitions
    // if(context.definitions && context.definitions[op]) {

    // }
    throw new InvalidOperator(op, stackTrace(context.stack));
  }

  return operatorMap[op](args, context);
}

function _evaluateIf(expression: IfExpression, context: ExpressionContext) {
  if ($boolean(expression.if, context)) {
    return evaluateExpression(expression.then, context);
  } else {
    return evaluateExpression(expression.else, context);
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
  pow: ([A, B], ctx) => Math.pow($number(A, ctx), $number(B, ctx))
};

/** Evaluate an expression and expect a number as a return value.
 *  Throws an error if it is any other type */
function $number(n: any, ctx: ExpressionContext) {
  const evaluated = evaluateExpression(n, ctx);
  if (typeof evaluated !== "number")
    throw new ExpressionTypeError(
      "number",
      typeof evaluated,
      stackTrace(ctx.stack)
    );

  return evaluated;
}

/** Evaluate an expression and expect a boolean as a return value.
 *  Throws an error if it is any other type */
function $boolean(n: any, ctx: ExpressionContext) {
  const evaluated = evaluateExpression(n, ctx);
  if (typeof evaluated !== "boolean")
    throw new ExpressionTypeError(
      "boolean",
      typeof evaluated,
      stackTrace(ctx.stack)
    );

  return evaluated;
}

export function stackRepresentation(e: Expression) {
  const keys = typeof e === "object" ? Object.keys(e) : [];
  if (!keys.length) return String(e);
  return keys.length ? keys.join("/") : String(e);
}

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
  constructor(op: string, stackTrace: string) {
    super(`${op} \n${stackTrace}`);
  }
}
export class ExpressionTypeError extends Error {
  name = "ExpressionTypeError";
  constructor(expected: string, received: string, stackTrace: string) {
    super();
    this.message = `expected "${expected}" but received "${received}".  \n${stackTrace}`;
  }
}
