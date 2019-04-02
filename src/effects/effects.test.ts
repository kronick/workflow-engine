import evaluateEffects, { EmailEffectResult, UpdateEffectResult } from "./";

describe("Effects evaluator", () => {
  it("Outputs empty result for empty effects list", async () => {
    expect(await evaluateEffects([], {})).toEqual([]);
  });

  it("Outputs result from a single email effect", async () => {
    const result = await evaluateEffects(
      [
        {
          sendEmail: {
            to: "example@example.com",
            template: "newMessage",
            params: { some: "thing" }
          }
        }
      ],
      {}
    );

    expect(result.length).toBe(1);
    expect(result[0].type).toBe("email");
    expect((result[0] as EmailEffectResult).to).toBe("example@example.com");
  });

  it("Does not mutate input when evaluating `set` effect", async () => {
    const obj = { zing: 0 };
    const result = await evaluateEffects(
      [
        {
          set: {
            property: "zing",
            value: 10
          }
        }
      ],
      { self: obj }
    );

    expect(obj.zing).toBe(0);
    expect(result.length).toBe(1);
  });

  it("Outputs result with multiple effects", async () => {
    const result = await evaluateEffects(
      [
        {
          sendEmail: {
            to: "example@example.com",
            template: "newMessage",
            params: { some: "thing" }
          }
        },
        {
          set: {
            property: "zing",
            value: 10
          }
        }
      ],
      { self: { zing: 0 } }
    );

    expect(result.length).toBe(2);
    expect(result[0].type).toBe("email");
    expect(result[1].type).toBe("update");
    expect((result[0] as EmailEffectResult).to).toBe("example@example.com");
    expect((result[1] as UpdateEffectResult).properties["zing"]).toBe(10);
  });

  it("Outputs result with evaluated expressions", async () => {
    const result = await evaluateEffects(
      [
        {
          sendEmail: {
            to: {
              joinStrings: {
                strings: ["example", "example.com"],
                separator: "@"
              }
            },
            template: "newMessage",
            params: { some: "thing" }
          }
        }
      ],
      {}
    );

    expect((result[0] as EmailEffectResult).to).toBe("example@example.com");
  });

  it("Conditionally outputs effects", async () => {
    const result = await evaluateEffects(
      [
        {
          // This conditional effect's expression will evaluate to false
          // so its effects won't be output
          effectIf: { "<": [4, 1] },
          effects: [
            {
              sendEmail: {
                to: "example@example.com",
                template: "newMessage",
                params: { some: "thing" }
              }
            }
          ]
        },
        {
          // This conditional effect's expression will evaluate to true
          // so its effects will be output
          effectIf: { "<": [1, 4] },
          effects: [
            {
              sendEmail: {
                to: "example2@example.com",
                template: "newMessage",
                params: { some: "thing" }
              }
            }
          ]
        }
      ],
      {}
    );

    expect(result.length).toBe(1);
    expect(result[0].type).toBe("email");
    expect((result[0] as EmailEffectResult).to).toBe("example2@example.com");
  });
});
