import { buildMatrix } from './matrix.js';
import { runBenchmark } from './run.js';

const report = runBenchmark(buildMatrix());
console.log(`Target-resolution benchmark: ${report.correct}/${report.total} correct, ${report.confidentlyWrong} confidently wrong`);
console.log(`outcomes: ${JSON.stringify(report.byOutcome)}`);
console.log(`latencyMs: p50=${report.latencyMs.p50.toFixed(2)} p95=${report.latencyMs.p95.toFixed(2)} max=${report.latencyMs.max.toFixed(2)}`);
console.log(`signals: correctRate=${report.signals.correctRate.toFixed(3)} (target ${report.signals.correctRateTarget}), confidentlyWrongRate=${report.signals.confidentlyWrongRate.toFixed(4)} (limit ${report.signals.confidentlyWrongLimit}) — ${report.signals.note}`);
for (const failure of report.failures) {
  console.log(`FAIL ${failure.name}: ${failure.outcome}${failure.selected ? ` selected ${failure.selected}` : ''}`);
}
