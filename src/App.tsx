import { useEffect, useMemo, useState } from "react";
import { Results } from "./components/Results";
import { TrialView } from "./components/TrialView";
import { Welcome } from "./components/Welcome";
import {
  MOS_LABELS,
  buildAssignments,
  makeSessionSeed,
  orderTrials,
} from "./lib/blind";
import type {
  BlindLabel,
  Manifest,
  SessionResult,
  TrialAssignment,
  TrialManifest,
  TrialResult,
} from "./lib/types";

type Phase = "welcome" | "test" | "done";

type DraftScores = Record<
  string,
  { scores: Partial<Record<BlindLabel, number>>; note: string }
>;

export default function App() {
  const [manifest, setManifest] = useState<Manifest | null>(null);
  const [error, setError] = useState<string>();
  const [phase, setPhase] = useState<Phase>("welcome");
  const [listenerId, setListenerId] = useState("");
  const [shuffleTrials, setShuffleTrials] = useState(true);
  const [seed, setSeed] = useState("");
  const [startedAt, setStartedAt] = useState("");
  const [trials, setTrials] = useState<TrialManifest[]>([]);
  const [assignments, setAssignments] = useState<TrialAssignment[]>([]);
  const [index, setIndex] = useState(0);
  const [draft, setDraft] = useState<DraftScores>({});
  const [session, setSession] = useState<SessionResult | null>(null);
  const [revealed, setRevealed] = useState(false);

  useEffect(() => {
    fetch("/clips/manifest.json")
      .then((r) => {
        if (!r.ok) throw new Error("找不到 clips/manifest.json，请先跑 npm run prepare:clips");
        return r.json();
      })
      .then((data: Manifest) => setManifest(data))
      .catch((e: Error) => setError(e.message));
  }, []);

  const assignmentMap = useMemo(() => {
    const map = new Map<string, TrialAssignment>();
    for (const a of assignments) map.set(a.trialId, a);
    return map;
  }, [assignments]);

  const current = trials[index];
  const currentAssign = current
    ? assignmentMap.get(current.id)
    : undefined;
  const currentDraft = current
    ? draft[current.id] ?? { scores: {}, note: "" }
    : { scores: {}, note: "" };

  const canNext =
    !!current &&
    (["A", "B", "C"] as BlindLabel[]).every((l) => currentDraft.scores[l]);

  function start() {
    if (!manifest) return;
    const s = makeSessionSeed();
    const ordered = orderTrials(manifest, s, shuffleTrials);
    const assigns = buildAssignments(ordered, s);
    setSeed(s);
    setStartedAt(new Date().toISOString());
    setTrials(ordered);
    setAssignments(assigns);
    setDraft({});
    setIndex(0);
    setSession(null);
    setRevealed(false);
    setPhase("test");
  }

  function finish(allDraft: DraftScores) {
    const finishedAt = new Date().toISOString();
    const trialResults: TrialResult[] = trials.map((t) => {
      const a = assignmentMap.get(t.id)!;
      const d = allDraft[t.id] ?? { scores: {}, note: "" };
      return {
        trialId: t.id,
        trackId: t.trackId,
        role: t.role,
        roleLabel: t.roleLabel,
        rangeLabel: t.rangeLabel,
        startLabel: t.startLabel,
        order: a.order,
        scores: (["A", "B", "C"] as BlindLabel[]).map((label) => ({
          label,
          system: a.labelOf[label],
          mos: d.scores[label]!,
        })),
        note: d.note || undefined,
        ratedAt: finishedAt,
      };
    });

    setSession({
      version: 1,
      listenerId: listenerId.trim(),
      seed,
      startedAt,
      finishedAt,
      scale: { min: 1, max: 5, labels: MOS_LABELS },
      trials: trialResults,
    });
    setPhase("done");
  }

  function goNext() {
    if (!canNext) return;
    if (index >= trials.length - 1) {
      finish(draft);
      return;
    }
    setIndex((i) => i + 1);
  }

  return (
    <div className="app">
      <header className="topbar">
        <div className="brand">
          <div className="brand-kicker">MOS Blind Test</div>
          <h1 style={{ fontSize: "1.25rem", margin: 0 }}>分离效果听评</h1>
        </div>
        <div className="meta">
          {phase === "test" ? (
            <>
              {listenerId.trim()}
              <br />
              seed {seed}
            </>
          ) : (
            <>
              Bandit · TME · Suno
              <br />
              对齐片段 · 盲标 A/B/C
            </>
          )}
        </div>
      </header>

      {phase === "welcome" ? (
        <Welcome
          listenerId={listenerId}
          shuffleTrials={shuffleTrials}
          onListenerId={setListenerId}
          onShuffleTrials={setShuffleTrials}
          onStart={start}
          trialCount={manifest?.trials.length ?? 0}
          ready={!!manifest}
          error={error}
        />
      ) : null}

      {phase === "test" && current && currentAssign ? (
        <TrialView
          index={index}
          total={trials.length}
          trial={current}
          assignment={currentAssign}
          scores={currentDraft.scores}
          note={currentDraft.note}
          onScore={(label, mos) =>
            setDraft((prev) => ({
              ...prev,
              [current.id]: {
                scores: { ...(prev[current.id]?.scores ?? {}), [label]: mos },
                note: prev[current.id]?.note ?? "",
              },
            }))
          }
          onNote={(note) =>
            setDraft((prev) => ({
              ...prev,
              [current.id]: {
                scores: prev[current.id]?.scores ?? {},
                note,
              },
            }))
          }
          onPrev={() => setIndex((i) => Math.max(0, i - 1))}
          onNext={goNext}
          canNext={canNext}
        />
      ) : null}

      {phase === "done" && session ? (
        <Results
          result={session}
          revealed={revealed}
          onReveal={() => setRevealed(true)}
          onRestart={() => {
            setPhase("welcome");
            setSession(null);
            setRevealed(false);
          }}
        />
      ) : null}
    </div>
  );
}
