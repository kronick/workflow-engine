import runExpressionBenchmarks from "./rules-engine/expression/benchmarks";

// The following code will only be executed when run from the command line
if (require.main === module) {
  (function main() {
    runExpressionBenchmarks();
  })();
}
