import evaluate from "./";
import { InMemoryDataLoader } from "../../dataLoader/";
import { Expression } from "../../types/expressions";

describe("Expression evaluator", () => {
  describe("Primitive types", () => {
    it("passes through trivial types", () => {
      expect(evaluate(1)).toEqual(1);
      expect(evaluate(0)).toEqual(0);
      expect(evaluate(true)).toEqual(true);
      expect(evaluate(false)).toEqual(false);
      expect(evaluate("zing")).toEqual("zing");
      expect(evaluate([1, 2, 3])).toEqual([1, 2, 3]);
      expect(evaluate([1])).toEqual([1]);

      const d = new Date();
      expect(evaluate(d)).toEqual(d);
      expect(evaluate([d, d, d])).toEqual([d, d, d]);
    });
  });

  describe("Syntax errors", () => {
    it("throws errors for invalid objects", () => {
      expect(() => evaluate({} as any)).toThrow();
      expect(() => evaluate({ foo: "", bar: "" } as any)).toThrow();

      expect(() => evaluate({ if: true } as any)).toThrow();

      expect(() => evaluate({ if: true, then: "" } as any)).toThrow();
      expect(() =>
        evaluate({ if: true, then: "", else: "", bogus: true } as any)
      ).toThrow();
    });
  });

  describe("Type errors", () => {
    it("throws error for non-numerical values", () => {
      expect(() => evaluate({ "+": [5, "a" as any] })).toThrowError();
      expect(() =>
        evaluate({
          "+": [5, { "*": [1, { "+": [true as any, 1] }] }]
        })
      ).toThrow();
      expect(() =>
        evaluate({ "+": [{ if: false, then: 4, else: false }, 1] })
      ).toThrow();
    });

    it("throws error for non-boolean values", () => {
      expect(() => evaluate({ if: 1, then: 2, else: 3 })).toThrow();
      expect(() => evaluate({ not: 1 as any })).toThrow();
      expect(() => evaluate({ or: [false, 1 as any] })).toThrow();
    });

    it("throws error for non-string values", () => {
      expect(() => evaluate({ eq: [1 as any, ""] })).toThrow();
    });
  });

  describe("Operators", () => {
    it("evaluates mathematical operators", () => {
      expect(evaluate({ "+": [1, 2] })).toEqual(3);
      expect(evaluate({ "-": [1, 2] })).toEqual(-1);
      expect(evaluate({ "*": [4, 2] })).toEqual(8);
      expect(evaluate({ "/": [4, 2] })).toEqual(2);
      expect(evaluate({ "%": [9, 4] })).toEqual(1);
      expect(evaluate({ pow: [2, 3] })).toEqual(8);
      expect(evaluate({ "=": [2, 3] })).toEqual(false);
      expect(evaluate({ "=": [2, 2] })).toEqual(true);
      expect(evaluate({ "<": [2, 2] })).toEqual(false);
      expect(evaluate({ "<": [2, 200] })).toEqual(true);
      expect(evaluate({ ">": [1, 2] })).toEqual(false);
      expect(evaluate({ ">": [0, -200] })).toEqual(true);
    });

    it("evaluates compound mathematical expressions", () => {
      expect(
        evaluate({
          "+": [{ "*": [2, 10] }, { pow: [2, 3] }]
        })
      ).toEqual(28);

      expect(
        evaluate({
          if: { "=": [6, 2] },
          then: 10,
          else: 20
        })
      ).toEqual(20);
    });

    it("evaluates string equality operator", () => {
      expect(evaluate({ eq: ["foo", "bar"] })).toBe(false);
      expect(evaluate({ eq: ["bling", "bling"] })).toBe(true);
    });

    it("evaluates boolean expressions", () => {
      expect(evaluate({ or: [false, false] })).toBe(false);
      expect(evaluate({ or: [false, true] })).toBe(true);
      expect(evaluate({ or: [true, false] })).toBe(true);
      expect(evaluate({ or: [true, true] })).toBe(true);

      expect(evaluate({ and: [false, false] })).toBe(false);
      expect(evaluate({ and: [false, true] })).toBe(false);
      expect(evaluate({ and: [true, false] })).toBe(false);
      expect(evaluate({ and: [true, true] })).toBe(true);

      expect(evaluate({ not: false })).toBe(true);
      expect(evaluate({ not: true })).toBe(false);

      expect(evaluate({ or: [{ not: true }, { and: [true, true] }] })).toBe(
        true
      );
    });

    it("short circuits on boolean 'or'", () => {
      // The second parameter to this `or` expression should throw an exception
      // if it gets evaluated, but if the `or` expression short-circuits it
      // will never get evaluated.
      expect(() => evaluate({ or: [true, 1 as any] })).not.toThrow();
    });
  });

  describe("Array operators", () => {
    it("Evaluates `contains` operator", () => {
      expect(
        evaluate({
          contains: { needle: "fin", haystack: ["fan", "fin", "foo"] }
        })
      ).toBe(true);
      expect(
        evaluate({
          contains: { needle: "fun", haystack: ["fan", "fin", "foo"] }
        })
      ).toBe(false);
    });

    it("Throws an exception when `contains` types are incorrect", () => {
      expect(() =>
        evaluate({ contains: { needle: 6, haystack: ["1", "2", "3"] } })
      ).toThrow();
      expect(() =>
        evaluate({ contains: { needle: 6, haystack: 7 } as any })
      ).toThrow();
    });

    it("can evaluate `contains` on an array retrieved from context", () => {
      expect(
        evaluate(
          {
            contains: {
              needle: "fin",
              haystack: { get: "haystack" }
            }
          },
          {
            self: { haystack: ["fan", "fin", "foo"] }
          }
        )
      ).toBe(true);

      expect(
        evaluate(
          {
            contains: {
              needle: { get: "needle" },
              haystack: ["fan", "fin", "foo"]
            }
          },
          {
            self: { needle: "fin" }
          }
        )
      ).toBe(true);
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
      expect(evaluate(trueExpression)).toEqual("Yes");
      expect(evaluate(falseExpression)).toEqual("No");
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

      expect(evaluate(nested)).toEqual("Lose");
      expect(evaluate(nested2)).toEqual("ON");
    });
  });

  describe("Property access", () => {
    it("extracts properties from current object in context", () => {
      const ctx = { self: { species: "horse" } };
      expect(evaluate({ get: { property: "species" } }, ctx)).toEqual("horse");
    });
    it("extracts property using shorthand syntax", () => {
      const ctx = { self: { species: "horse" } };
      expect(evaluate({ get: "species" }, ctx)).toEqual("horse");
    });

    // TODO: Is this the desired behavior or should we throw an error instead?
    it("returns undefined if value does not exist", () => {
      const ctx = { self: { species: "horse" } };
      expect(evaluate({ get: "color" }, ctx)).toEqual(undefined);
    });

    it("can use expression to define which property to get", () => {
      const ctx1 = { self: { species: "horse", speed: 100 } };
      const ctx2 = { self: { species: "hare", weight: 5 } };

      const exp: Expression = {
        get: {
          property: {
            if: {
              eq: ["horse", { get: "species" }]
            },
            then: "speed",
            else: "weight"
          },

          asType: "string"
        }
      };

      expect(evaluate(exp, ctx1)).toEqual(100);
      expect(evaluate(exp, ctx2)).toEqual(5);
    });
  });

  describe("Defined functions", () => {
    it("evaluates a trivial function ", () => {
      const ctx = {
        functions: {
          PI: 3.14159
        }
      };
      expect(evaluate({ PI: {} } as any, ctx)).toBe(3.14159);
    });

    it("evaluates a trivial function with no arguments", () => {
      const ctx = {
        functions: {
          three: { "+": [1, 2] }
        }
      };
      expect(evaluate({ three: {} } as any, ctx)).toBe(3);
    });

    it("evaluates a defined function with array of arguments", () => {
      const ctx = {
        functions: {
          add: { "+": [{ $: 0 }, { $: 1 }] }
        }
      };
      expect(evaluate({ add: [2, 3] } as any, ctx)).toBe(5);
    });

    it("evaluates a defined function with named arguments", () => {
      const ctx = {
        functions: {
          add: { "+": [{ $: "A" }, { $: "B" }] }
        }
      };
      expect(evaluate({ add: { A: 2, B: 3 } } as any, ctx)).toBe(5);
    });

    it("evaluates nested defined functions with non-overlapping named arguments", () => {
      const ctx = {
        functions: {
          add: { "+": [{ $: "A" }, { $: "B" }] },
          subtract: { "-": [{ $: "X" }, { $: "Y" }] }
        }
      };
      expect(
        evaluate(
          { add: { A: { subtract: { X: 10, Y: 8 } }, B: 3 } } as any,
          ctx
        )
      ).toBe(5);
    });
    it("evaluates nested defined functions with overlapping named arguments", () => {
      const ctx = {
        functions: {
          add: { "+": [{ $: "A" }, { $: "B" }] },
          subtract: { "-": [{ $: "A" }, { $: "B" }] }
        }
      };
      expect(
        evaluate(
          { add: { A: { subtract: { A: 10, B: 8 } }, B: 3 } } as any,
          ctx
        )
      ).toBe(5);
    });

    it("throws an error when trying to access missing argument", () => {
      const ctx = {
        functions: {
          add: { "+": [{ $: "A" }, { $: "B" }] }
        }
      };
      expect(() => evaluate({ add: { A: 2 } } as any, ctx)).toThrow();
    });

    it("throws an error when argument is of wrong type", () => {
      const ctx = {
        functions: {
          add: { "+": [{ $: "A" }, { $: "B" }] }
        }
      };
      expect(() => evaluate({ add: { A: 2, B: "4" } } as any, ctx)).toThrow();
    });
  });
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
