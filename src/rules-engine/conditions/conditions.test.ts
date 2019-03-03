import evaluateConditions from "./";

describe("Conditions evaluator", () => {
  it("evaluates trivial conditions correctly", () => {
    expect(evaluateConditions(["allow"]).decision).toEqual("allow");
    expect(evaluateConditions(["deny"]).decision).toEqual("deny");
    expect(
      evaluateConditions([{ denyWithMessage: "Denied" }]).decision
    ).toEqual("deny");
  });

  it("Returns denial reason from trivial condition", () => {
    expect(evaluateConditions([{ denyWithMessage: "Denied" }]).reason).toEqual(
      "Denied"
    );
  });

  it("Returns denial reason from `denyIf` condition", () => {
    expect(
      evaluateConditions([{ denyIf: true, denyMessage: "Denied" }]).reason
    ).toEqual("Denied");

    expect(
      evaluateConditions([
        { allowIf: false, denyMessage: "hmm" },
        { denyIf: true, denyMessage: "Denied" }
      ]).reason
    ).toEqual("Denied");
  });

  it("Returns denial reason from final `allowIf` condition if it return `false`.", () => {
    expect(
      evaluateConditions([
        {
          allowIf: false,
          denyMessage: "Denied"
        }
      ]).reason
    ).toEqual("Denied");

    expect(
      evaluateConditions([
        {
          allowIf: false,
          denyMessage: "Ruh row"
        },
        {
          allowIf: false,
          denyMessage: "Denied"
        }
      ]).reason
    ).toEqual("Denied");
  });

  it("returns `allow` when condition array is empty", () => {
    expect(evaluateConditions([]).decision).toBe("allow");
  });

  it("returns `allow` when all conditions are `false` and final condition is `denyIf`", () => {
    expect(evaluateConditions([{ denyIf: false }]).decision).toBe("allow");
    expect(
      evaluateConditions([{ allowIf: false }, { denyIf: false }]).decision
    ).toBe("allow");
    expect(
      evaluateConditions([
        { allowIf: false },
        { allowIf: false },
        { denyIf: false }
      ]).decision
    ).toBe("allow");
  });

  it("returns `deny` when all conditons are `false` and final condition is `allowIf`", () => {
    expect(
      evaluateConditions([{ denyIf: false }, { allowIf: false }]).decision
    ).toBe("deny");
    expect(
      evaluateConditions([
        { denyIf: false },
        { denyIf: false },
        { allowIf: false }
      ]).decision
    ).toBe("deny");
    expect(evaluateConditions([{ allowIf: false }]).decision).toBe("deny");
  });

  it("throws error if a condition returns a non-boolean", () => {
    expect(() => evaluateConditions([{ allowIf: 1 } as any])).toThrow();
    expect(() => evaluateConditions([{ allowIf: "asdf" } as any])).toThrow();
  });

  it("throw an error if any elements are not condition definitions", () => {
    expect(() => evaluateConditions(["bad" as any])).toThrow();
    expect(() =>
      evaluateConditions([{ allowIf: true }, { a: "b" } as any])
    ).toThrow();
    expect(() => evaluateConditions(["allow", { a: "b" } as any])).toThrow();
    expect(() =>
      evaluateConditions([{ denyWithMessage: "bad" }, { a: "b" } as any])
    ).toThrow();
  });
});
