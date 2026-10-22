/** Shared transport: one audible source at a time, shared playhead. */

export type SlotId = "ref" | "A" | "B" | "C";

export class BlindTransport {
  private audios = new Map<SlotId, HTMLAudioElement>();
  private active: SlotId | null = null;
  private listeners = new Set<() => void>();
  private raf = 0;

  attach(slot: SlotId, el: HTMLAudioElement) {
    this.audios.set(slot, el);
    el.preload = "auto";
    el.addEventListener("ended", () => {
      if (this.active === slot) {
        this.active = null;
        this.emit();
      }
    });
  }

  detach(slot: SlotId) {
    this.audios.delete(slot);
    if (this.active === slot) this.active = null;
  }

  subscribe(fn: () => void) {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  private emit() {
    for (const fn of this.listeners) fn();
  }

  getActive() {
    return this.active;
  }

  getCurrentTime() {
    if (!this.active) return 0;
    return this.audios.get(this.active)?.currentTime ?? 0;
  }

  getDuration() {
    const any = this.audios.get("A") ?? this.audios.values().next().value;
    return any?.duration && Number.isFinite(any.duration) ? any.duration : 0;
  }

  async play(slot: SlotId) {
    const next = this.audios.get(slot);
    if (!next) return;

    const t = this.getCurrentTime();
    for (const [id, el] of this.audios) {
      if (id !== slot) {
        el.pause();
      }
    }

    // Keep playhead in sync when switching A/B/C/ref
    if (Math.abs(next.currentTime - t) > 0.04) {
      next.currentTime = t;
    }

    this.active = slot;
    this.emit();
    this.startTick();
    try {
      await next.play();
    } catch {
      this.active = null;
      this.emit();
    }
  }

  pause() {
    for (const el of this.audios.values()) el.pause();
    this.active = null;
    this.stopTick();
    this.emit();
  }

  toggle(slot: SlotId) {
    if (this.active === slot) {
      this.pause();
    } else {
      void this.play(slot);
    }
  }

  seek(ratio: number) {
    const dur = this.getDuration();
    if (!dur) return;
    const t = Math.min(Math.max(ratio, 0), 1) * dur;
    for (const el of this.audios.values()) {
      el.currentTime = t;
    }
    this.emit();
  }

  reset() {
    this.pause();
    for (const el of this.audios.values()) {
      el.currentTime = 0;
    }
    this.emit();
  }

  private startTick() {
    this.stopTick();
    const tick = () => {
      this.emit();
      if (this.active) this.raf = requestAnimationFrame(tick);
    };
    this.raf = requestAnimationFrame(tick);
  }

  private stopTick() {
    if (this.raf) cancelAnimationFrame(this.raf);
    this.raf = 0;
  }
}
