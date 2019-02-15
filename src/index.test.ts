import { promisify } from "util";
import { exec as _exec } from "child_process";

const exec = promisify(_exec);

describe("CLI end-to-end test", () => {
  it("echoes command line argument", async () => {
    const { stdout } = await exec("ts-node ./src/index.ts hello");
    expect(stdout).toContain("hello");
  });
});
