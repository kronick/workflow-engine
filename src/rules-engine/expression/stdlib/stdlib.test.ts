import evaluate from "../";

import { stdlibCtx } from "./";
import { ExpressionContext } from "..";

describe("Standard library expression functions", () => {
  it("evaluates inState", () => {
    const ctx: ExpressionContext = {
      self: { state: "ready" }
    };

    expect(evaluate({ inState: { states: ["ready"] } }, stdlibCtx(ctx))).toBe(
      true
    );

    expect(evaluate({ inState: { states: ["waiting"] } }, stdlibCtx(ctx))).toBe(
      false
    );

    expect(
      evaluate({ inState: { states: ["waiting", "ready"] } }, stdlibCtx(ctx))
    ).toBe(true);
  });
});
