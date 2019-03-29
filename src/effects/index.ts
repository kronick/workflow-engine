import { ExpressionContext, $string } from "../rules-engine/expression/index";
import {
  EffectListDefinition,
  ConditionalEffectDefinition,
  EmailEffectDefinition,
  UpdateEffectDefinition,
  SetEffectDefinition
} from "../types/";
import evaluate from "../rules-engine/expression/";

import { asyncForEach } from "../utilities";

/** This function takes a list of effect definitions and evaluates their
 *  expressions in the given context. It does not actually perform the
 *  effects (such as sending e-mails) but it does output them in a format
 *  where they can be executed by a subsequent process.
 *
 *  The reason for separating evaluation from execution is that it gives us
 *  greater control over when and how they are executed. We could, for
 *  example, commit all data updates to a database transactionally or batch
 *  multiple e-mails into a single message. We can also use the output
 *  to create a single logical history log event for an action with many
 *  granular effects.
 */
export default async function evaluateEffects(
  definition: EffectListDefinition,
  ctx: ExpressionContext
): Promise<EffectResult[]> {
  if (!Array.isArray(definition)) {
    throw new SyntaxError("Effects list must be an array.");
  }

  let out: EffectResult[] = [];

  await asyncForEach(definition, async e => {
    // Special case for conditional effect
    if (e.hasOwnProperty("effectIf") && e.hasOwnProperty("effects")) {
      if (
        (await evaluate((e as ConditionalEffectDefinition).effectIf, ctx)) ===
        true
      ) {
        out = [
          ...out,
          ...(await evaluateEffects(
            (e as ConditionalEffectDefinition).effects,
            ctx
          ))
        ];
      }
      return;
    }

    const keys = Object.keys(e);
    if (keys.length > 1) {
      throw new SyntaxError("Effect definition must have only one key.");
    }
    const definitionType = keys[0];
    switch (definitionType) {
      case "sendEmail":
        const emailArgs = (e as EmailEffectDefinition).sendEmail;

        const params: { [key: string]: unknown } = {};
        for (const p in emailArgs.params) {
          params[p] = await evaluate(emailArgs.params[p], ctx);
        }

        out.push({
          type: "email",
          to: await $string(emailArgs.to, ctx),
          template: await $string(emailArgs.template, ctx),
          params,
          includeInHistory: !!emailArgs.includeInHistory
        });
        break;

      case "update":
        const updateArgs = (e as UpdateEffectDefinition).update;
        // TODO
        break;
      case "set":
        const setArgs = (e as SetEffectDefinition).set;
        if (!ctx.self) {
          throw new Error(
            "Can't set without a `self` object in the expression context."
          );
        }

        out.push({
          type: "update",
          properties: {
            [await $string(setArgs.property, ctx)]: await evaluate(
              setArgs.value,
              ctx
            )
          },
          on: { uid: ctx.self.uid, type: ctx.self.type },
          includeInHistory: !!setArgs.includeInHistory
        });
        break;
    }
  });

  return out;
}

export type EffectResult = EmailEffectResult | UpdateEffectResult;

export interface EmailEffectResult {
  type: "email";
  to: string;
  template: string;
  params: { [key: string]: unknown };
  includeInHistory: boolean;
}

export interface UpdateEffectResult {
  type: "update";
  properties: { [property: string]: unknown };
  /** Destination resource that will have its properties updated. */
  on: { uid: string; type: string };
  includeInHistory: boolean;
}
