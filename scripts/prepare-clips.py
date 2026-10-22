#!/usr/bin/env python3
"""Cut prescribed MOS clips. Timeline is TME / origin."""

import json
import subprocess
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SPEC = json.loads((ROOT / "scripts" / "clips.json").read_text(encoding="utf-8"))
OUT = ROOT / "public" / "clips"
SOURCE = Path(SPEC["sourceRoot"])

ROLE_ZH = {"speech": "人声", "music": "音乐", "effects": "音效"}
ROLE_PROMPT = {
    "speech": "请只评价人声轨质量：清晰度、自然度、是否掺入音乐/音效。",
    "music": "请只评价音乐轨质量：伴奏完整度、是否掺入人声、有无空洞/伪影。",
    "effects": "请只评价音效轨质量：瞬态是否保留、归属是否正确、是否掺入人声/音乐。",
}
ROLE_CODE = {"speech": "s", "music": "m", "effects": "e"}


def parse_ts(text: str) -> float:
    parts = text.strip().split(":")
    if len(parts) == 2:
        m, s = parts
        return int(m) * 60 + float(s)
    if len(parts) == 3:
        h, m, s = parts
        return int(h) * 3600 + int(m) * 60 + float(s)
    raise ValueError(f"bad timestamp: {text}")


def fmt(sec: float) -> str:
    m = int(sec // 60)
    s = sec - 60 * m
    return f"{m}:{s:05.2f}"


def src(track: str, system: str, role: str) -> Path:
    base = SOURCE
    if system == "bandit":
        folder = base / "ai-split" / track
        name = {"speech": "speech.m4a", "music": "music.m4a", "effects": "effects.m4a"}[role]
    elif system == "tme":
        folder = base / "fx" / track
        name = {"speech": "人声.flac", "music": "音乐.flac", "effects": "音效.flac"}[role]
    elif system == "suno":
        folder = base / "suno" / track
        name = {"speech": "speech.mp3", "music": "music.mp3", "effects": "effects.mp3"}[role]
    elif system == "ref":
        folder = base / "suno" / track
        name = "origin.m4a"
    else:
        raise ValueError(system)
    path = folder / name
    if not path.exists():
        raise FileNotFoundError(path)
    return path


def extract(src_path: Path, start: float, dur: float, dest: Path) -> None:
    subprocess.check_call(
        [
            "ffmpeg",
            "-y",
            "-hide_banner",
            "-loglevel",
            "error",
            "-ss",
            f"{start:.3f}",
            "-t",
            f"{dur:.3f}",
            "-i",
            str(src_path),
            "-ac",
            "2",
            "-ar",
            "44100",
            "-c:a",
            "pcm_s16le",
            str(dest),
        ]
    )


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    for old in OUT.glob("*.wav"):
        old.unlink()

    trials = []
    for clip in SPEC["clips"]:
        track = clip["track"]
        role = clip["role"]
        slot = int(clip["slot"])
        start = parse_ts(clip["start"])
        end = parse_ts(clip["end"])
        dur = end - start
        if dur <= 0:
            raise SystemExit(f"non-positive duration: {clip}")

        offset = SPEC["tracks"][track]["offsetMs"] / 1000
        label = f"{track}-{ROLE_CODE[role]}{slot}"
        print(f"{label} {ROLE_ZH[role]} {fmt(start)}–{fmt(end)} ({dur:.1f}s)")

        for system in ("bandit", "tme", "suno", "ref"):
            seek = max(0.0, start - offset) if system in ("bandit", "suno") else start
            dest = OUT / f"{label}_{system}.wav"
            print(f"  {system:7} @ {seek:.3f}s")
            extract(src(track, system, role), seek, dur, dest)

        trials.append(
            {
                "id": label,
                "trackId": track,
                "role": role,
                "roleLabel": ROLE_ZH[role],
                "slot": slot,
                "prompt": ROLE_PROMPT[role],
                "startSec": start,
                "endSec": end,
                "durationSec": round(dur, 3),
                "startLabel": fmt(start),
                "rangeLabel": f"{clip['start']}–{clip['end']}",
                "files": {
                    "bandit": f"/clips/{label}_bandit.wav",
                    "tme": f"/clips/{label}_tme.wav",
                    "suno": f"/clips/{label}_suno.wav",
                    "ref": f"/clips/{label}_ref.wav",
                },
            }
        )

    manifest = {
        "alignmentNote": "516265250: Bandit/Suno seek = TME - 160ms; 730078171: no shift",
        "systems": ["bandit", "tme", "suno"],
        "tracks": SPEC["tracks"],
        "trials": trials,
    }
    dest = OUT / "manifest.json"
    dest.write_text(json.dumps(manifest, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"Wrote {dest} ({len(trials)} trials)")


if __name__ == "__main__":
    main()
