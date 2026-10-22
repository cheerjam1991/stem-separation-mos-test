import type {
  BlindLabel,
  Manifest,
  SystemId,
  TrialAssignment,
  TrialManifest,
} from "./types";

const LABELS: BlindLabel[] = ["A", "B", "C"];

/** Mulberry32 — deterministic shuffle from a string seed. */
export function hashSeed(seed: string): number {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function mulberry32(seed: number) {
  let t = seed >>> 0;
  return () => {
    t += 0x6d2b79f5;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

export function shuffleInPlace<T>(arr: T[], rand: () => number): T[] {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export function makeSessionSeed(): string {
  const bytes = new Uint8Array(6);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

export function buildAssignments(
  trials: TrialManifest[],
  seed: string,
): TrialAssignment[] {
  const rand = mulberry32(hashSeed(seed));
  const systems: SystemId[] = ["bandit", "tme", "suno"];

  return trials.map((trial) => {
    const order = shuffleInPlace([...systems], rand);
    const labelOf = {
      A: order[0],
      B: order[1],
      C: order[2],
    } as Record<BlindLabel, SystemId>;
    return { trialId: trial.id, order, labelOf };
  });
}

export function orderTrials(
  manifest: Manifest,
  seed: string,
  shuffleTrials: boolean,
): TrialManifest[] {
  const trials = [...manifest.trials];
  if (!shuffleTrials) return trials;
  const rand = mulberry32(hashSeed(`${seed}:trial-order`));
  return shuffleInPlace(trials, rand);
}

export function labels(): BlindLabel[] {
  return [...LABELS];
}

export const MOS_LABELS: Record<number, string> = {
  5: "优秀",
  4: "良好",
  3: "一般",
  2: "较差",
  1: "很差",
};

export const MOS_HINTS: Record<number, string> = {
  5: "几乎无伪影，目标声完整自然",
  4: "轻微瑕疵，不影响听感",
  3: "可接受，但有明显泄漏或缺失",
  2: "干扰较多，目标声受损",
  1: "几乎不可用",
};
