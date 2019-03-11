import evaluateEffects, { EmailEffectResult, UpdateEffectResult } from "./";

describe("Effects evaluator", () => {
  it("Outputs empty result for empty effects list", () => {
    expect(evaluateEffects([], {})).toEqual([]);
  });

  it("Outputs result from a single email effect", () => {
    const result = evaluateEffects(
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

  it("Outputs result with multiple effects", () => {
    const result = evaluateEffects(
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
      {}
    );

    expect(result.length).toBe(2);
    expect(result[0].type).toBe("email");
    expect(result[1].type).toBe("update");
    expect((result[0] as EmailEffectResult).to).toBe("example@example.com");
    expect((result[1] as UpdateEffectResult).properties["zing"]).toBe(10);
  });

  it("Outputs result with evaluated expressions", () => {
    const result = evaluateEffects(
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

  it("Conditionally outputs effects", () => {
    const result = evaluateEffects(
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
