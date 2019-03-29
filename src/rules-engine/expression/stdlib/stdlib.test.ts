import evaluate from "../";

import { stdlibCtx } from "./";
import { ExpressionContext } from "..";

describe("Standard library expression functions", () => {
  it("evaluates inState", async () => {
    const ctx: ExpressionContext = {
      self: { state: "ready" }
    };

    expect(
      await evaluate({ inState: { states: ["ready"] } }, stdlibCtx(ctx))
    ).toBe(true);

    expect(
      await evaluate({ inState: { states: ["waiting"] } }, stdlibCtx(ctx))
    ).toBe(false);

    expect(
      await evaluate(
        { inState: { states: ["waiting", "ready"] } },
        stdlibCtx(ctx)
      )
    ).toBe(true);
  });
});
