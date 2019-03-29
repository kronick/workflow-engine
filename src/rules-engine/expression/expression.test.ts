import evaluate from "./";
import { InMemoryDataLoader } from "../../dataLoader/";
import { Expression } from "../../types/expressions";

describe("Expression evaluator", () => {
  describe("Primitive types", () => {
    it("passes through trivial types", async () => {
      expect(await evaluate(1)).toEqual(1);
      expect(await evaluate(0)).toEqual(0);
      expect(await evaluate(true)).toEqual(true);
      expect(await evaluate(false)).toEqual(false);
      expect(await evaluate("zing")).toEqual("zing");
      expect(await evaluate([1, 2, 3])).toEqual([1, 2, 3]);
      expect(await evaluate([1])).toEqual([1]);

      const d = new Date();
      expect(await evaluate(d)).toEqual(d);
      expect(await evaluate([d, d, d])).toEqual([d, d, d]);
    });
  });

  describe("Syntax errors", () => {
    it("throws errors for invalid objects", async () => {
      await expectAllThrow([
        {},
        { foo: "", bar: "" },
        { if: true },
        { if: true, then: "" },
        { if: true, then: "", else: "", bogus: true }
      ] as any[]);
    });
  });

  describe("Type errors", () => {
    it("throws error for non-numerical values", async () => {
      await expectAllThrow([
        { "+": [5, "a"] },
        {
          "+": [5, { "*": [1, { "+": [true, 1] }] }]
        },
        { "+": [{ if: false, then: 4, else: false }, 1] }
      ] as any[]);
    });

    it("throws error for non-boolean values", async () => {
      await expectAllThrow([
        { if: 1, then: 2, else: 3 },
        { not: 1 },
        { or: [false, 1] }
      ] as any);
    });

    it("throws error for non-string values", async () => {
      await expectAllThrow([{ eq: [1, ""] }]);
    });
  });

  describe("Operators", () => {
    it("evaluates mathematical operators", async () => {
      expect(await evaluate({ "+": [1, 2] })).toEqual(3);
      expect(await evaluate({ "-": [1, 2] })).toEqual(-1);
      expect(await evaluate({ "*": [4, 2] })).toEqual(8);
      expect(await evaluate({ "/": [4, 2] })).toEqual(2);
      expect(await evaluate({ "%": [9, 4] })).toEqual(1);
      expect(await evaluate({ pow: [2, 3] })).toEqual(8);
      expect(await evaluate({ "=": [2, 3] })).toEqual(false);
      expect(await evaluate({ "=": [2, 2] })).toEqual(true);
      expect(await evaluate({ "<": [2, 2] })).toEqual(false);
      expect(await evaluate({ "<": [2, 200] })).toEqual(true);
      expect(await evaluate({ ">": [1, 2] })).toEqual(false);
      expect(await evaluate({ ">": [0, -200] })).toEqual(true);
    });

    it("evaluates compound mathematical expressions", async () => {
      expect(
        await evaluate({
          "+": [{ "*": [2, 10] }, { pow: [2, 3] }]
        })
      ).toEqual(28);

      expect(
        await evaluate({
          if: { "=": [6, 2] },
          then: 10,
          else: 20
        })
      ).toEqual(20);
    });

    it("evaluates string equality operator", async () => {
      expect(await evaluate({ eq: ["foo", "bar"] })).toBe(false);
      expect(await evaluate({ eq: ["bling", "bling"] })).toBe(true);
    });

    it("evaluates boolean expressions", async () => {
      expect(await evaluate({ or: [false, false] })).toBe(false);
      expect(await evaluate({ or: [false, true] })).toBe(true);
      expect(await evaluate({ or: [true, false] })).toBe(true);
      expect(await evaluate({ or: [true, true] })).toBe(true);

      expect(await evaluate({ and: [false, false] })).toBe(false);
      expect(await evaluate({ and: [false, true] })).toBe(false);
      expect(await evaluate({ and: [true, false] })).toBe(false);
      expect(await evaluate({ and: [true, true] })).toBe(true);

      expect(await evaluate({ not: false })).toBe(true);
      expect(await evaluate({ not: true })).toBe(false);

      expect(
        await evaluate({ or: [{ not: true }, { and: [true, true] }] })
      ).toBe(true);
    });

    it("short circuits on boolean 'or'", async () => {
      // The second parameter to this `or` expression should throw an exception
      // if it gets evaluated, but if the `or` expression short-circuits it
      // will never get evaluated.

      expect(await evaluate({ or: [true, 1 as any] })).toBe(true);
    });

    it("short circuits on boolean 'and'", async () => {
      // The second parameter to this `and` expression should throw an exception
      // if it gets evaluated, but if the `and` expression short-circuits it
      // will never get evaluated.

      expect(await evaluate({ and: [false, 1 as any] })).toBe(false);
    });
  });

  describe("String expressions", () => {
    it("calculates string length", async () => {
      expect(await evaluate({ stringLength: "abc" })).toBe(3);
      expect(await evaluate({ stringLength: "abcdef" })).toBe(6);
      expect(await evaluate({ stringLength: "" })).toBe(0);
    });

    it("calculates string length when string is an expression", async () => {
      expect(
        await evaluate(
          { stringLength: { get: "phrase" } },
          { self: { phrase: "Hello world" } }
        )
      ).toBe(11);
    });

    it("joins strings", async () => {
      expect(await evaluate({ joinStrings: ["a", "b", "c"] })).toEqual("abc");
      expect(
        await evaluate({ joinStrings: { strings: ["a", "b", "c"] } })
      ).toEqual("abc");
    });
    it("joins strings with separator", async () => {
      expect(
        await evaluate({
          joinStrings: {
            strings: ["The", "quick", "brown", "fox"],
            separator: " "
          }
        })
      ).toEqual("The quick brown fox");

      expect(
        await evaluate({
          joinStrings: {
            strings: ["a", "b", "c"],
            separator: { joinStrings: ["-"] }
          }
        })
      ).toEqual("a-b-c");
    });
    it("joins strings where values are an expression", async () => {
      expect(
        await evaluate({
          joinStrings: ["X", { joinStrings: ["a", "b", "c"] }, "Y"]
        })
      ).toBe("XabcY");

      expect(
        await evaluate(
          { joinStrings: { get: "strings" } },
          { self: { strings: ["x", "y", "z"] } }
        )
      ).toBe("xyz");
    });
  });

  describe("Array operators", () => {
    it("Evaluates `contains` operator", async () => {
      expect(
        await evaluate({
          contains: { needle: "fin", haystack: ["fan", "fin", "foo"] }
        })
      ).toBe(true);
      expect(
        await evaluate({
          contains: { needle: "fun", haystack: ["fan", "fin", "foo"] }
        })
      ).toBe(false);
    });

    it("Throws an exception when `contains` types are incorrect", async () => {
      await expectAllThrow([
        { contains: { needle: 6, haystack: ["1", "2", "3"] } },
        { contains: { needle: 6, haystack: 7 } }
      ]);
    });

    it("can await evaluate `contains` on an array retrieved from context", async () => {
      expect(
        await evaluate(
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
        await evaluate(
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
    it("evaluates an if/then/else expression", async () => {
      const trueExpression: Expression = { if: true, then: "Yes", else: "No" };
      const falseExpression: Expression = {
        if: false,
        then: "Yes",
        else: "No"
      };
      expect(await evaluate(trueExpression)).toEqual("Yes");
      expect(await evaluate(falseExpression)).toEqual("No");
    });

    it("evaluates nested if/then/else expressions", async () => {
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

      expect(await evaluate(nested)).toEqual("Lose");
      expect(await evaluate(nested2)).toEqual("ON");
    });
  });

  describe("Property access", () => {
    it("extracts properties from current object in context", async () => {
      const ctx = { self: { species: "horse" } };
      expect(await evaluate({ get: { property: "species" } }, ctx)).toEqual(
        "horse"
      );
    });
    it("extracts property using shorthand syntax", async () => {
      const ctx = { self: { species: "horse" } };
      expect(await evaluate({ get: "species" }, ctx)).toEqual("horse");
    });

    // TODO: Is this the desired behavior or should we throw an error instead?
    it("returns undefined if value does not exist", async () => {
      const ctx = { self: { species: "horse" } };
      expect(await evaluate({ get: "color" }, ctx)).toEqual(undefined);
    });

    it("can use expression to define which property to get", async () => {
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

      expect(await evaluate(exp, ctx1)).toEqual(100);
      expect(await evaluate(exp, ctx2)).toEqual(5);
    });

    it("evaluates `exists` expression", async () => {
      const ctx = { self: { name: "ooo", bang: undefined } };
      expect(await evaluate({ exists: { property: "name" } }, ctx)).toBe(true);
      expect(await evaluate({ exists: { property: "bang" } }, ctx)).toBe(false);
      expect(await evaluate({ exists: { property: "lalala" } }, ctx)).toBe(
        false
      );
    });
  });

  describe("Defined functions", () => {
    it("evaluates a trivial function ", async () => {
      const ctx = {
        functions: {
          PI: 3.14159
        }
      };
      expect(await evaluate({ PI: {} } as any, ctx)).toBe(3.14159);
    });

    it("evaluates a trivial function with no arguments", async () => {
      const ctx = {
        functions: {
          three: { "+": [1, 2] }
        }
      };
      expect(await evaluate({ three: {} } as any, ctx)).toBe(3);
    });

    it("evaluates a defined function with array of arguments", async () => {
      const ctx = {
        functions: {
          add: { "+": [{ $: 0 }, { $: 1 }] }
        }
      };
      expect(await evaluate({ add: [2, 3] } as any, ctx)).toBe(5);
    });

    it("evaluates a defined function with named arguments", async () => {
      const ctx = {
        functions: {
          add: { "+": [{ $: "A" }, { $: "B" }] }
        }
      };
      expect(await evaluate({ add: { A: 2, B: 3 } } as any, ctx)).toBe(5);
    });

    it("evaluates nested defined functions with non-overlapping named arguments", async () => {
      const ctx = {
        functions: {
          add: { "+": [{ $: "A" }, { $: "B" }] },
          subtract: { "-": [{ $: "X" }, { $: "Y" }] }
        }
      };
      expect(
        await evaluate(
          { add: { A: { subtract: { X: 10, Y: 8 } }, B: 3 } } as any,
          ctx
        )
      ).toBe(5);
    });
    it("evaluates nested defined functions with overlapping named arguments", async () => {
      const ctx = {
        functions: {
          add: { "+": [{ $: "A" }, { $: "B" }] },
          subtract: { "-": [{ $: "A" }, { $: "B" }] }
        }
      };
      expect(
        await evaluate(
          { add: { A: { subtract: { A: 10, B: 8 } }, B: 3 } } as any,
          ctx
        )
      ).toBe(5);
    });

    it("throws an error when trying to access missing argument", async () => {
      const ctx = {
        functions: {
          add: { "+": [{ $: "A" }, { $: "B" }] }
        }
      };
      await expectAllThrow([{ add: { A: 2 } }], [ctx]);
    });

    it("throws an error when argument is of wrong type", async () => {
      const ctx = {
        functions: {
          add: { "+": [{ $: "A" }, { $: "B" }] }
        }
      };
      await expectAllThrow([{ add: { A: 2, B: "4" } }], [ctx]);
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

// Test helper functions
///////////////////////////////////////////////////////////////////////////////
async function expectAllThrow(expressions: any[], contexts?: any[]) {
  await Promise.all(
    expressions.map(async (e, i) => {
      // Syntax for expecting an error from an async function is kind of confusing.
      // See https://jestjs.io/docs/en/asynchronous#async-await for more details
      await expect(
        evaluate(e, contexts && contexts[i] ? contexts[i] : undefined)
      ).rejects.toThrow();
    })
  );
}
