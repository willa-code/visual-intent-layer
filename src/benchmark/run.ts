import { resolveTarget, type ResolutionCandidate } from '../resolution/resolve.js';
import type { ResolutionOutcome } from '../lifecycle/store.js';
import type { Envelope } from '../envelope/validate.js';

export type BenchmarkCase = {
  name: string;
  target: Envelope['targets'][number];
  candidates: ResolutionCandidate[];
  expectedNodeId: string | undefined;
  acceptable: ResolutionOutcome[];
};

export type BenchmarkReport = {
  total: number;
  correct: number;
  confidentlyWrong: number;
  abstentions: number;
  byOutcome: Record<ResolutionOutcome, number>;
  latencyMs: { p50: number; p95: number; max: number };
  failures: Array<{ name: string; outcome: ResolutionOutcome; selected?: string }>;
  signals: {
    correctRateTarget: number;
    confidentlyWrongLimit: number;
    correctRate: number;
    confidentlyWrongRate: number;
    note: string;
  };
};

export function runBenchmark(cases: BenchmarkCase[]): BenchmarkReport {
  const latencies: number[] = [];
  const byOutcome: Record<ResolutionOutcome, number> = {
    exact: 0,
    recovered: 0,
    ambiguous: 0,
    stale: 0,
    deleted: 0
  };
  let correct = 0;
  let confidentlyWrong = 0;
  const failures: BenchmarkReport['failures'] = [];

  for (const benchmarkCase of cases) {
    const started = performance.now();
    const result = resolveTarget(benchmarkCase.target, benchmarkCase.candidates);
    latencies.push(performance.now() - started);
    byOutcome[result.outcome] += 1;

    const outcomeAcceptable = benchmarkCase.acceptable.includes(result.outcome);
    const rightTarget =
      benchmarkCase.expectedNodeId === undefined
        ? result.selected === undefined
        : result.selected?.nodeId === benchmarkCase.expectedNodeId;
    if (outcomeAcceptable && rightTarget) {
      correct += 1;
    } else {
      failures.push({ name: benchmarkCase.name, outcome: result.outcome, selected: result.selected?.nodeId });
    }
    if (
      (result.outcome === 'exact' || result.outcome === 'recovered') &&
      benchmarkCase.expectedNodeId !== undefined &&
      result.selected?.nodeId !== benchmarkCase.expectedNodeId
    ) {
      confidentlyWrong += 1;
    }
    if (
      (result.outcome === 'exact' || result.outcome === 'recovered') &&
      benchmarkCase.expectedNodeId === undefined
    ) {
      confidentlyWrong += 1;
    }
  }

  latencies.sort((a, b) => a - b);
  const correctRate = cases.length === 0 ? 1 : correct / cases.length;
  const confidentlyWrongRate = cases.length === 0 ? 0 : confidentlyWrong / cases.length;
  return {
    total: cases.length,
    correct,
    confidentlyWrong,
    abstentions: byOutcome['ambiguous'] + byOutcome['stale'] + byOutcome['deleted'],
    byOutcome,
    latencyMs: {
      p50: percentile(latencies, 0.5),
      p95: percentile(latencies, 0.95),
      max: latencies.length > 0 ? latencies[latencies.length - 1]! : 0
    },
    failures,
    signals: {
      correctRateTarget: 0.95,
      confidentlyWrongLimit: 0.01,
      correctRate,
      confidentlyWrongRate,
      note: 'Local regression signals during Personal Proof, not release gates.'
    }
  };
}

function percentile(sorted: number[], quantile: number): number {
  if (sorted.length === 0) {
    return 0;
  }
  const index = Math.min(sorted.length - 1, Math.floor(quantile * sorted.length));
  return sorted[index]!;
}
