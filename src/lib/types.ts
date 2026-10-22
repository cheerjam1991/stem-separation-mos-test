export type SystemId = "bandit" | "tme" | "suno";
export type BlindLabel = "A" | "B" | "C";
export type Role = "speech" | "music" | "effects";

export type TrialManifest = {
  id: string;
  trackId: string;
  role: Role;
  roleLabel: string;
  slot: number;
  prompt: string;
  startSec: number;
  endSec: number;
  durationSec: number;
  startLabel: string;
  rangeLabel: string;
  files: Record<SystemId | "ref", string>;
};

export type Manifest = {
  alignmentNote: string;
  systems: SystemId[];
  trials: TrialManifest[];
};

export type TrialAssignment = {
  trialId: string;
  order: SystemId[];
  labelOf: Record<BlindLabel, SystemId>;
};

export type ConditionScore = {
  label: BlindLabel;
  system: SystemId;
  mos: number;
};

export type TrialResult = {
  trialId: string;
  trackId: string;
  role: Role;
  roleLabel: string;
  rangeLabel: string;
  startLabel: string;
  order: SystemId[];
  scores: ConditionScore[];
  note?: string;
  ratedAt: string;
};

export type SessionResult = {
  version: 1;
  listenerId: string;
  seed: string;
  startedAt: string;
  finishedAt: string;
  scale: { min: number; max: number; labels: Record<number, string> };
  trials: TrialResult[];
};
