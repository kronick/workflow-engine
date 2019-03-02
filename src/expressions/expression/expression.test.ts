import evaluateExpression from "./";
import { InMemoryDataLoader } from "../../dataLoader/";
import { Expression } from "../../types/expressions";

const nullContext = { currentResource: null };

describe("Expression evaluator", () => {
  describe("Primitive types", () => {
    it("passes through trivial types", () => {
      expect(evaluateExpression(1)).toEqual(1);
      expect(evaluateExpression(0)).toEqual(0);
      expect(evaluateExpression(true)).toEqual(true);
      expect(evaluateExpression(false)).toEqual(false);
      expect(evaluateExpression("zing")).toEqual("zing");
      expect(evaluateExpression([1, 2, 3])).toEqual([1, 2, 3]);
      expect(evaluateExpression([1])).toEqual([1]);

      const d = new Date();
      expect(evaluateExpression(d)).toEqual(d);
      expect(evaluateExpression([d, d, d])).toEqual([d, d, d]);
    });
  });

  describe("Syntax errors", () => {
    it("throws errors for invalid objects", () => {
      expect(() => evaluateExpression({} as any)).toThrow();
      expect(() => evaluateExpression({ foo: "", bar: "" } as any)).toThrow();

      expect(() => evaluateExpression({ if: true } as any)).toThrow();

      expect(() => evaluateExpression({ if: true, then: "" } as any)).toThrow();
      expect(() =>
        evaluateExpression({ if: true, then: "", else: "", bogus: true } as any)
      ).toThrow();
    });
  });

  describe("Type errors", () => {
    it("throws error for non-numerical values", () => {
      expect(() => evaluateExpression({ "+": [5, "a" as any] })).toThrowError();
      expect(() =>
        evaluateExpression({
          "+": [5, { "*": [1, { "+": [true as any, 1] }] }]
        })
      ).toThrow();
      expect(() =>
        evaluateExpression({ "+": [{ if: false, then: 4, else: false }, 1] })
      ).toThrow();
    });

    it("throws error for non-boolean values", () => {
      expect(() => evaluateExpression({ if: 1, then: 2, else: 3 })).toThrow();
      expect(() => evaluateExpression({ not: 1 as any })).toThrow();
      expect(() => evaluateExpression({ or: [false, 1 as any] })).toThrow();
    });
  });

  describe("Operators", () => {
    it("Evaluates mathematical operators", () => {
      expect(evaluateExpression({ "+": [1, 2] })).toEqual(3);
      expect(evaluateExpression({ "-": [1, 2] })).toEqual(-1);
      expect(evaluateExpression({ "*": [4, 2] })).toEqual(8);
      expect(evaluateExpression({ "/": [4, 2] })).toEqual(2);
      expect(evaluateExpression({ "%": [9, 4] })).toEqual(1);
      expect(evaluateExpression({ pow: [2, 3] })).toEqual(8);
      expect(evaluateExpression({ "=": [2, 3] })).toEqual(false);
      expect(evaluateExpression({ "=": [2, 2] })).toEqual(true);
      expect(evaluateExpression({ "<": [2, 2] })).toEqual(false);
      expect(evaluateExpression({ "<": [2, 200] })).toEqual(true);
      expect(evaluateExpression({ ">": [1, 2] })).toEqual(false);
      expect(evaluateExpression({ ">": [0, -200] })).toEqual(true);
    });

    it("Evaluates compound mathematical expressions", () => {
      expect(
        evaluateExpression({
          "+": [{ "*": [2, 10] }, { pow: [2, 3] }]
        })
      ).toEqual(28);

      expect(
        evaluateExpression({
          if: { "=": [6, 2] },
          then: 10,
          else: 20
        })
      ).toEqual(20);
    });

    it("evaluates boolean expressions", () => {
      expect(evaluateExpression({ or: [false, false] })).toBe(false);
      expect(evaluateExpression({ or: [false, true] })).toBe(true);
      expect(evaluateExpression({ or: [true, false] })).toBe(true);
      expect(evaluateExpression({ or: [true, true] })).toBe(true);

      expect(evaluateExpression({ and: [false, false] })).toBe(false);
      expect(evaluateExpression({ and: [false, true] })).toBe(false);
      expect(evaluateExpression({ and: [true, false] })).toBe(false);
      expect(evaluateExpression({ and: [true, true] })).toBe(true);

      expect(evaluateExpression({ not: false })).toBe(true);
      expect(evaluateExpression({ not: true })).toBe(false);

      expect(
        evaluateExpression({ or: [{ not: true }, { and: [true, true] }] })
      ).toBe(true);
    });

    it("short circuits on boolean 'or'", () => {
      // The second parameter to this `or` expression should throw an exception
      // if it gets evaluated, but if the `or` expression short-circuits it
      // will never get evaluated.
      expect(() => evaluateExpression({ or: [true, 1 as any] })).not.toThrow();
    });
  });

  describe("Special forms and recursion", () => {
    it("evaluates an if/then/else expression", () => {
      const trueExpression: Expression = { if: true, then: "Yes", else: "No" };
      const falseExpression: Expression = {
        if: false,
        then: "Yes",
        else: "No"
      };
      expect(evaluateExpression(trueExpression)).toEqual("Yes");
      expect(evaluateExpression(falseExpression)).toEqual("No");
    });

    it("evaluates nested if/then/else expressions", () => {
      const nested: Expression = {
        if: true,
        then: {
          if: false,
          then: "Win",
          else: "Lose"
        },
        else: "No"
      };

      const nested2: Expression = {
        if: false,
        then: {
          if: false,
          then: "Win",
          else: "Lose"
        },
        else: {
          if: true,
          then: "ON",
          else: "OFF"
        }
      };

      expect(evaluateExpression(nested)).toEqual("Lose");
      expect(evaluateExpression(nested2)).toEqual("ON");
    });
  });

  describe.skip("References", () => {
    it("Extracts properties from current object in context", () => {});
  });

  // describe("Stack trace", () => {
  //   it("generates useful stack representations", () => {
  //     expect(stackRepresentation({ and: [true, true] })).toBe("and(true,true)");
  //     expect(
  //       stackRepresentation({
  //         and: [{ if: true, then: true, else: false }, true],
  //       })
  //     ).toBe("and(#,true)");
  //   });
  // });
});
