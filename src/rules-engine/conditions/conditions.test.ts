import evaluateConditions from "./";

describe("Conditions evaluator", () => {
  it("evaluates trivial conditions correctly", async () => {
    expect((await evaluateConditions(["allow"])).decision).toEqual("allow");
    expect((await evaluateConditions(["deny"])).decision).toEqual("deny");
    expect(
      (await evaluateConditions([{ denyWithMessage: "Denied" }])).decision
    ).toEqual("deny");
  });

  it("Returns denial reason from trivial condition", async () => {
    expect(
      (await evaluateConditions([{ denyWithMessage: "Denied" }])).reason
    ).toEqual("Denied");
  });

  it("Returns denial reason from `denyIf` condition", async () => {
    expect(
      (await evaluateConditions([{ denyIf: true, denyMessage: "Denied" }]))
        .reason
    ).toEqual("Denied");

    expect(
      (await evaluateConditions([
        { allowIf: false, denyMessage: "hmm" },
        { denyIf: true, denyMessage: "Denied" }
      ])).reason
    ).toEqual("Denied");
  });

  it("Returns denial reason from final `allowIf` condition if it return `false`.", async () => {
    expect(
      (await evaluateConditions([
        {
          allowIf: false,
          denyMessage: "Denied"
        }
      ])).reason
    ).toEqual("Denied");

    expect(
      (await evaluateConditions([
        {
          allowIf: false,
          denyMessage: "Ruh row"
        },
        {
          allowIf: false,
          denyMessage: "Denied"
        }
      ])).reason
    ).toEqual("Denied");
  });

  it("returns `allow` when condition array is empty", async () => {
    expect((await evaluateConditions([])).decision).toBe("allow");
  });

  it("returns `allow` when all conditions are `false` and final condition is `denyIf`", async () => {
    expect((await evaluateConditions([{ denyIf: false }])).decision).toBe(
      "allow"
    );
    expect(
      (await evaluateConditions([{ allowIf: false }, { denyIf: false }]))
        .decision
    ).toBe("allow");
    expect(
      (await evaluateConditions([
        { allowIf: false },
        { allowIf: false },
        { denyIf: false }
      ])).decision
    ).toBe("allow");
  });

  it("returns `deny` when all conditons are `false` and final condition is `allowIf`", async () => {
    expect(
      (await evaluateConditions([{ denyIf: false }, { allowIf: false }]))
        .decision
    ).toBe("deny");
    expect(
      (await evaluateConditions([
        { denyIf: false },
        { denyIf: false },
        { allowIf: false }
      ])).decision
    ).toBe("deny");
    expect((await evaluateConditions([{ allowIf: false }])).decision).toBe(
      "deny"
    );
  });

  it("throws error if a condition returns a non-boolean", async () => {
    await expect(evaluateConditions([{ allowIf: 1 } as any])).rejects.toThrow();
    await expect(
      evaluateConditions([{ allowIf: "asdf" } as any])
    ).rejects.toThrow();
  });

  it("throw an error if any elements are not condition definitions", async () => {
    await expect(evaluateConditions(["bad" as any])).rejects.toThrow();
    await expect(
      evaluateConditions([{ allowIf: true }, { a: "b" } as any])
    ).rejects.toThrow();
    await expect(
      evaluateConditions(["allow", { a: "b" } as any])
    ).rejects.toThrow();
    await expect(
      evaluateConditions([{ denyWithMessage: "bad" }, { a: "b" } as any])
    ).rejects.toThrow();
  });
});
