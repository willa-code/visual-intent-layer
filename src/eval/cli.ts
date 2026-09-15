import { runInvocationEval } from './invocation.js';

const report = runInvocationEval();
console.log(`Invocation eval: ${report.passed}/${report.total} scenarios route as documented`);
for (const failure of report.failures) {
  console.log(`FAIL ${failure.id}: expected ${failure.expected}, got ${failure.actual}`);
}
console.log('Note: this eval checks the documented routing policy, not live agent judgment. Real invocation behavior is observed in dogfood.');
