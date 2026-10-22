# Stem Separation MOS Blind Test

对 Bandit / TME / Suno 三条分离结果做 **MOS 盲测** 的本地网页。

- 题目来自 `scripts/clips.json` 里指定的起止时间（当前是 516265250、730078171 的音乐和音效）  
- 条件显示为 A / B / C（每题随机映射）  
- 共用进度条，切换条件保持同一时刻  
- 含原曲参考轨  
- 结束可揭晓映射、导出 JSON / CSV  

## 使用

```bash
cd mos-blind-test
npm install
npm run prepare:clips   # 从 track-split-download 切对齐片段（已跑过可跳过）
npm run dev
```

浏览器打开终端提示的地址（默认 [http://localhost:5177](http://localhost:5177)）。

线上地址：[https://cheerjam1991.github.io/stem-separation-mos-test/](https://cheerjam1991.github.io/stem-separation-mos-test/)。推到 `main` 后由 GitHub Actions 发布。

## 音频路径

片段定义在 `scripts/clips.json`。源目录是 `/Users/xmly/projects/track-split-download` 下的 `ai-split`、`fx`、`suno`。

516265250 的 Bandit / Suno 相对 TME 提前约 160ms，切片段时已补偿。730078171 三组对齐，不再偏移。

## 快捷键

| 键 | 动作 |
| --- | --- |
| `R` | 播放/暂停参考 |
| `1` / `2` / `3` | 播放/暂停 A / B / C |
| `Space` | 暂停 |
| `←` / `→` | 上一题 / 下一题 |
