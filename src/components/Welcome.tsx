type Props = {
  listenerId: string;
  shuffleTrials: boolean;
  trialCount: number;
  onListenerId: (v: string) => void;
  onShuffleTrials: (v: boolean) => void;
  onStart: () => void;
  ready: boolean;
  error?: string;
};

export function Welcome({
  listenerId,
  shuffleTrials,
  trialCount,
  onListenerId,
  onShuffleTrials,
  onStart,
  ready,
  error,
}: Props) {
  return (
    <section className="panel panel-pad stack">
      <div className="brand">
        <div className="brand-kicker">Listening Lab · 516265250 · 730078171</div>
        <h1>Stem Separation MOS Blind Test</h1>
      </div>

      <p className="lead">
        按指定时间段比较音乐和音效分离。每题长度跟原标注一致，条件标记为
        A / B / C，系统身份在提交前不显示。
      </p>

      <ul className="checklist">
        <li>建议耳机，音量固定，先听参考再比 A/B/C</li>
        <li>只评当前目标轨（人声或音乐或音效），忽略其他声部好坏</li>
        <li>MOS：5 优秀 · 4 良好 · 3 一般 · 2 较差 · 1 很差</li>
        <li>快捷键：R 参考 · 1/2/3 播 A/B/C · Space 暂停 · ←/→ 跳题</li>
      </ul>

      <div className="field">
        <label htmlFor="listener">听者 ID</label>
        <input
          id="listener"
          type="text"
          placeholder="例如：xmly / 同事姓名"
          value={listenerId}
          onChange={(e) => onListenerId(e.target.value)}
          autoFocus
        />
      </div>

      <label className="check">
        <input
          type="checkbox"
          checked={shuffleTrials}
          onChange={(e) => onShuffleTrials(e.target.checked)}
        />
        打乱题目顺序（角色仍会混排，降低锚定）
      </label>

      {error ? <div className="banner">{error}</div> : null}

      <div className="actions">
        <button
          className="btn btn-primary"
          disabled={!ready || !listenerId.trim()}
          onClick={onStart}
        >
          开始盲测（{trialCount || "…"} 题）
        </button>
        {!ready ? (
          <span className="hint">正在加载片段清单…</span>
        ) : (
          <span className="hint">完成后可导出 JSON / CSV，并揭晓 A/B/C 映射</span>
        )}
      </div>
    </section>
  );
}
