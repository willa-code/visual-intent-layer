import { resolveTarget, type ResolutionCandidate } from '../resolution/resolve.js';
import { deriveResolutionLabel, type ResolutionLabel, type TargetMatch } from '../resolution/model.js';
import type { Envelope } from '../envelope/validate.js';

export type BenchmarkCase = {
  name: string;
  target: Envelope['annotations'][number]['targets'][number];
  candidates: ResolutionCandidate[];
  expectedNodeId: string | undefined;
  acceptable: TargetMatch[];
};

export type BenchmarkReport = {
  total: number;
  correct: number;
  confidentlyWrong: number;
  correctAmbiguity: number;
  correctAbstention: number;
  recovered: number;
  byMatch: Record<TargetMatch, number>;
  byLabel: Record<ResolutionLabel, number>;
  latencyMs: { p50: number; p95: number; max: number };
  failures: Array<{ name: string; match: TargetMatch; selected?: string }>;
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
  const byMatch: Record<TargetMatch, number> = { exact: 0, recovered: 0, unresolved: 0 };
  const byLabel: Record<ResolutionLabel, number> = { matched: 0, recovered: 0, ambiguous: 0, deleted: 0 };
  let correct = 0;
  let confidentlyWrong = 0;
  let correctAmbiguity = 0;
  let correctAbstention = 0;
  let recovered = 0;
  const failures: BenchmarkReport['failures'] = [];

  for (const benchmarkCase of cases) {
    const started = performance.now();
    const result = resolveTarget(benchmarkCase.target, benchmarkCase.candidates);
    latencies.push(performance.now() - started);
    byMatch[result.match] += 1;
    const label = deriveResolutionLabel(result);
    byLabel[label] += 1;
    if (result.match === 'recovered') {
      recovered += 1;
    }
    if (label === 'ambiguous' && benchmarkCase.expectedNodeId === undefined) {
      correctAmbiguity += 1;
    }
    if (label === 'deleted' && benchmarkCase.expectedNodeId === undefined) {
      correctAbstention += 1;
    }

    const outcomeAcceptable = benchmarkCase.acceptable.includes(result.match);
    const rightTarget =
      benchmarkCase.expectedNodeId === undefined
        ? result.selectedNodeId === undefined
        : result.selectedNodeId === benchmarkCase.expectedNodeId;
    if (outcomeAcceptable && rightTarget) {
      correct += 1;
    } else {
      failures.push({ name: benchmarkCase.name, match: result.match, ...(result.selectedNodeId ? { selected: result.selectedNodeId } : {}) });
    }
    const choseWrong =
      (result.match === 'exact' || result.match === 'recovered') &&
      (benchmarkCase.expectedNodeId === undefined || result.selectedNodeId !== benchmarkCase.expectedNodeId);
    if (choseWrong) {
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
    correctAmbiguity,
    correctAbstention,
    recovered,
    byMatch,
    byLabel,
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