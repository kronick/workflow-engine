import { promisify } from "util";
import { exec as exec_cb } from "child_process";

const exec = promisify(exec_cb);

describe("CLI end-to-end test", () => {
  it("echoes command line argument", async () => {
    const { stdout } = await exec("ts-node ./src/index.ts hello");
    expect(stdout).toContain("hello");
  });
});
