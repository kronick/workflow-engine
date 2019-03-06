// The following code will only be executed when run from the command line
if (require.main === module) {
  (function main() {
    const firstArg = process.argv[2];
    if (!firstArg) {
      console.error("Error: Must specify an input argument!");
      return;
    } else {
      console.log(firstArg);
    }
  })();
}

export * from "./engine";
import PGBusinessEngine from "./engine";
import { FakeInMemoryDataLoader, InMemoryDataLoader } from "./dataLoader/index";
export { PGBusinessEngine, FakeInMemoryDataLoader, InMemoryDataLoader };
