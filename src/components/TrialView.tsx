import { useEffect, useMemo, useRef, useState } from "react";
import { BlindTransport, type SlotId } from "../lib/audio";
import { MOS_HINTS, MOS_LABELS, labels } from "../lib/blind";
import type {
  BlindLabel,
  TrialAssignment,
  TrialManifest,
} from "../lib/types";

type Props = {
  index: number;
  total: number;
  trial: TrialManifest;
  assignment: TrialAssignment;
  scores: Partial<Record<BlindLabel, number>>;
  note: string;
  onScore: (label: BlindLabel, mos: number) => void;
  onNote: (note: string) => void;
  onPrev: () => void;
  onNext: () => void;
  canNext: boolean;
};

function fmt(t: number) {
  if (!Number.isFinite(t)) return "0:00.0";
  const m = Math.floor(t / 60);
  const s = t - m * 60;
  return `${m}:${s.toFixed(1).padStart(4, "0")}`;
}

export function TrialView({
  index,
  total,
  trial,
  assignment,
  scores,
  note,
  onScore,
  onNote,
  onPrev,
  onNext,
  canNext,
}: Props) {
  const transport = useMemo(() => new BlindTransport(), []);
  const refAudio = useRef<HTMLAudioElement>(null);
  const aAudio = useRef<HTMLAudioElement>(null);
  const bAudio = useRef<HTMLAudioElement>(null);
  const cAudio = useRef<HTMLAudioElement>(null);
  const refs = { ref: refAudio, A: aAudio, B: bAudio, C: cAudio } as const;
  const [active, setActive] = useState<SlotId | null>(null);
  const [time, setTime] = useState(0);
  const [duration, setDuration] = useState(trial.durationSec);
  const [hoverMos, setHoverMos] = useState<number | null>(null);

  useEffect(() => {
    const slots: SlotId[] = ["ref", "A", "B", "C"];
    for (const slot of slots) {
      const el = refs[slot].current;
      if (el) transport.attach(slot, el);
    }
    const unsub = transport.subscribe(() => {
      setActive(transport.getActive());
      setTime(transport.getCurrentTime());
      const d = transport.getDuration();
      if (d) setDuration(d);
    });
    return () => {
      transport.pause();
      for (const slot of slots) transport.detach(slot);
      unsub();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [transport, trial.id]);

  useEffect(() => {
    transport.reset();
    setTime(0);
    setDuration(trial.durationSec);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trial.id]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement | null)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;

      if (e.code === "Space") {
        e.preventDefault();
        transport.pause();
        return;
      }
      if (e.key === "r" || e.key === "R") {
        e.preventDefault();
        transport.toggle("ref");
        return;
      }
      if (e.key === "1") {
        e.preventDefault();
        transport.toggle("A");
        return;
      }
      if (e.key === "2") {
        e.preventDefault();
        transport.toggle("B");
        return;
      }
      if (e.key === "3") {
        e.preventDefault();
        transport.toggle("C");
        return;
      }
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        onPrev();
        return;
      }
      if (e.key === "ArrowRight") {
        e.preventDefault();
        if (canNext) onNext();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [transport, onPrev, onNext, canNext]);

  const srcFor = (label: BlindLabel) => {
    const system = assignment.labelOf[label];
    return trial.files[system];
  };

  const allRated = labels().every((l) => scores[l]);

  return (
    <section className="panel panel-pad">
      <div className="progress">
        <div className="progress-row">
          <span>
            Trial {index + 1} / {total}
          </span>
          <span>
            {trial.trackId} · {trial.rangeLabel}
          </span>
        </div>
        <div className="bar">
          <span style={{ width: `${((index + 1) / total) * 100}%` }} />
        </div>
      </div>

      <div className="trial-head">
        <h2>
          {trial.trackId} · 评价「{trial.roleLabel}」{trial.rangeLabel}
        </h2>
        <span className="pill">盲测 · A/B/C 已随机映射</span>
      </div>
      <p className="prompt">{trial.prompt}</p>

      <div className="transport">
        <audio ref={refs.ref} src={trial.files.ref} preload="auto" />
        <audio ref={refs.A} src={srcFor("A")} preload="auto" />
        <audio ref={refs.B} src={srcFor("B")} preload="auto" />
        <audio ref={refs.C} src={srcFor("C")} preload="auto" />

        <div className="seek">
          <input
            type="range"
            min={0}
            max={1000}
            value={duration ? Math.round((time / duration) * 1000) : 0}
            onChange={(e) => transport.seek(Number(e.target.value) / 1000)}
          />
          <div className="time-row">
            <span>{fmt(time)}</span>
            <span>
              共用进度条 · 切换条件保持同一时刻 · {fmt(duration)}
            </span>
          </div>
        </div>

        <div className="slots">
          <button
            type="button"
            className={`slot ref ${active === "ref" ? "active" : ""}`}
            onClick={() => transport.toggle("ref")}
          >
            <span className="slot-name">参考原曲</span>
            <span className="slot-key">
              键 <span className="kbd">R</span>
            </span>
          </button>
          {labels().map((label, i) => (
            <button
              key={label}
              type="button"
              className={`slot ${active === label ? "active" : ""}`}
              onClick={() => transport.toggle(label)}
            >
              <span className="slot-name">条件 {label}</span>
              <span className="slot-key">
                键 <span className="kbd">{i + 1}</span>
                {scores[label] ? ` · 已评 ${scores[label]}` : " · 未评分"}
              </span>
            </button>
          ))}
        </div>
      </div>

      <div className="rate-grid">
        {labels().map((label) => {
          const mos = scores[label];
          return (
            <div
              key={label}
              className={`rate-card ${mos ? "done" : ""}`}
            >
              <div className="rate-top">
                <strong>条件 {label}</strong>
                <button
                  type="button"
                  className="btn btn-ghost"
                  style={{ padding: "8px 12px" }}
                  onClick={() => transport.toggle(label)}
                >
                  {active === label ? "暂停" : "播放"}
                </button>
              </div>
              <div className="mos">
                {[5, 4, 3, 2, 1].map((n) => (
                  <button
                    key={n}
                    type="button"
                    className={mos === n ? "selected" : ""}
                    onMouseEnter={() => setHoverMos(n)}
                    onMouseLeave={() => setHoverMos(null)}
                    onClick={() => onScore(label, n)}
                  >
                    <span>{n}</span>
                    <span>{MOS_LABELS[n]}</span>
                  </button>
                ))}
              </div>
              <div className="hint">
                {hoverMos
                  ? MOS_HINTS[hoverMos]
                  : mos
                    ? MOS_HINTS[mos]
                    : "选择 1–5 分"}
              </div>
            </div>
          );
        })}
      </div>

      <div className="field" style={{ marginTop: 16 }}>
        <label htmlFor="note">本题备注（可选）</label>
        <textarea
          id="note"
          className="note"
          placeholder="例如：B 的音乐被挖空；C 人声泄漏明显…"
          value={note}
          onChange={(e) => onNote(e.target.value)}
        />
      </div>

      <div className="footer-nav">
        <button type="button" className="btn btn-ghost" onClick={onPrev}>
          上一题
        </button>
        <div className="actions">
          {!allRated ? (
            <span className="hint">请给 A / B / C 都打完分再继续</span>
          ) : null}
          <button
            type="button"
            className="btn btn-primary"
            disabled={!canNext}
            onClick={onNext}
          >
            {index + 1 >= total ? "完成并查看结果" : "下一题"}
          </button>
        </div>
      </div>
    </section>
  );
}
