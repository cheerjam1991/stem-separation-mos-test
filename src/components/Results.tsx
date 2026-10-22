import { MOS_LABELS } from "../lib/blind";
import type { SessionResult, SystemId } from "../lib/types";

const SYSTEM_NAME: Record<SystemId, string> = {
  bandit: "Bandit (ai-split)",
  tme: "TME (fx)",
  suno: "Suno",
};

type Props = {
  result: SessionResult;
  revealed: boolean;
  onReveal: () => void;
  onRestart: () => void;
};

function download(filename: string, content: string, type: string) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function toCsv(result: SessionResult) {
  const header = [
    "listenerId",
    "seed",
    "trialId",
    "trackId",
    "role",
    "range",
    "start",
    "label",
    "system",
    "mos",
    "note",
    "ratedAt",
  ];
  const rows = [header.join(",")];
  for (const t of result.trials) {
    for (const s of t.scores) {
      rows.push(
        [
          result.listenerId,
          result.seed,
          t.trialId,
          t.trackId,
          t.role,
          t.rangeLabel,
          t.startLabel,
          s.label,
          s.system,
          String(s.mos),
          JSON.stringify(t.note ?? ""),
          t.ratedAt,
        ].join(","),
      );
    }
  }
  return rows.join("\n");
}

function means(result: SessionResult) {
  const acc: Record<SystemId, number[]> = {
    bandit: [],
    tme: [],
    suno: [],
  };
  const byRole: Record<string, Record<SystemId, number[]>> = {};

  for (const t of result.trials) {
    if (!byRole[t.role]) {
      byRole[t.role] = { bandit: [], tme: [], suno: [] };
    }
    for (const s of t.scores) {
      acc[s.system].push(s.mos);
      byRole[t.role][s.system].push(s.mos);
    }
  }

  const avg = (xs: number[]) =>
    xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0;

  return {
    overall: (Object.keys(acc) as SystemId[]).map((sys) => ({
      sys,
      mean: avg(acc[sys]),
      n: acc[sys].length,
    })),
    byRole: Object.entries(byRole).map(([role, map]) => ({
      role,
      systems: (Object.keys(map) as SystemId[]).map((sys) => ({
        sys,
        mean: avg(map[sys]),
      })),
    })),
  };
}

export function Results({ result, revealed, onReveal, onRestart }: Props) {
  const stats = means(result);
  const stamp = result.finishedAt.slice(0, 19).replace(/[:T]/g, "-");

  return (
    <section className="panel panel-pad stack results">
      <div>
        <div className="brand-kicker">Session complete</div>
        <h2>评分完成 · {result.listenerId}</h2>
        <p className="lead">
          seed <span className="kbd">{result.seed}</span> · 共{" "}
          {result.trials.length} 题 · 量表{" "}
          {Object.entries(MOS_LABELS)
            .sort((a, b) => Number(b[0]) - Number(a[0]))
            .map(([n, l]) => `${n}=${l}`)
            .join(" / ")}
        </p>
      </div>

      {!revealed ? (
        <div className="banner">
          结果文件里始终包含真实系统名；页面上默认隐藏，避免你边看边改分。需要时再揭晓。
        </div>
      ) : null}

      {revealed ? (
        <>
          <div className="summary">
            {stats.overall.map((row) => (
              <div key={row.sys} className="summary-card">
                <div className="label">{SYSTEM_NAME[row.sys]}</div>
                <div className="value">{row.mean.toFixed(2)}</div>
                <div className="hint">n = {row.n}</div>
              </div>
            ))}
          </div>

          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                <th>题号</th>
                <th>剧集</th>
                <th>角色</th>
                <th>时段</th>
                  <th>A</th>
                  <th>B</th>
                  <th>C</th>
                  <th>备注</th>
                </tr>
              </thead>
              <tbody>
                {result.trials.map((t) => {
                  const byLabel = Object.fromEntries(
                    t.scores.map((s) => [s.label, s]),
                  );
                  return (
                    <tr key={t.trialId}>
                      <td>{t.trialId}</td>
                      <td>{t.trackId}</td>
                      <td>{t.roleLabel}</td>
                      <td>{t.rangeLabel}</td>
                      {(["A", "B", "C"] as const).map((lab) => (
                        <td key={lab}>
                          {byLabel[lab]?.mos} ·{" "}
                          {SYSTEM_NAME[byLabel[lab]?.system]}
                        </td>
                      ))}
                      <td>{t.note || "—"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>题号</th>
                <th>剧集</th>
                <th>角色</th>
                <th>A</th>
                <th>B</th>
                <th>C</th>
              </tr>
            </thead>
            <tbody>
              {result.trials.map((t) => {
                const byLabel = Object.fromEntries(
                  t.scores.map((s) => [s.label, s.mos]),
                );
                return (
                  <tr key={t.trialId}>
                    <td>{t.trialId}</td>
                    <td>{t.trackId}</td>
                    <td>{t.roleLabel}</td>
                    <td>{byLabel.A}</td>
                    <td>{byLabel.B}</td>
                    <td>{byLabel.C}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <div className="actions">
        {!revealed ? (
          <button type="button" className="btn btn-primary" onClick={onReveal}>
            揭晓系统映射与均分
          </button>
        ) : null}
        <button
          type="button"
          className="btn btn-ghost"
          onClick={() =>
            download(
              `mos-${result.listenerId}-${stamp}.json`,
              JSON.stringify(result, null, 2),
              "application/json",
            )
          }
        >
          导出 JSON
        </button>
        <button
          type="button"
          className="btn btn-ghost"
          onClick={() =>
            download(
              `mos-${result.listenerId}-${stamp}.csv`,
              toCsv(result),
              "text/csv;charset=utf-8",
            )
          }
        >
          导出 CSV
        </button>
        <button type="button" className="btn btn-ghost" onClick={onRestart}>
          再测一轮
        </button>
      </div>
    </section>
  );
}
