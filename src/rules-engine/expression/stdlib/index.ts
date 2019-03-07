import { ExpressionContext } from "../";
import { Expression } from "../../../types";

/** Standard library functions for working with resources and their properties.
 *
 *  To simplify the host engine implementation, these functions are currently
 *  all defined in terms of other built-in expressions. They _could_ be
 *  re-written in the host language (i.e. Javascript / Python) and executed
 *  natively by the interpreter to improve performance.
 */

const stdlib: { [f: string]: Expression } = {
  inState: {
    contains: { haystack: { $: "states" }, needle: { get: "state" } }
  }
};

/** Augment a context's function definitions with these stdlib functions */
export const stdlibCtx = (ctx: ExpressionContext) => {
  return { ...ctx, functions: { ...ctx.functions, ...stdlib } };
};

export default stdlib;
