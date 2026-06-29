/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

class SoundManager {
  private ctx: AudioContext | null = null;
  private volume: number = 0.5;

  private initCtx() {
    if (!this.ctx) {
      const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtxClass) {
        this.ctx = new AudioCtxClass();
      }
    }
    if (this.ctx && this.ctx.state === "suspended") {
      this.ctx.resume();
    }
  }

  setVolume(vol: number) {
    this.volume = Math.max(0, Math.min(1, vol));
  }

  playHover() {
    this.initCtx();
    if (!this.ctx || this.volume <= 0) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = "sine";
    osc.frequency.setValueAtTime(440, t);
    osc.frequency.exponentialRampToValueAtTime(880, t + 0.08);

    gain.gain.setValueAtTime(this.volume * 0.04, t);
    gain.gain.linearRampToValueAtTime(0.01, t + 0.08);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(t);
    osc.stop(t + 0.08);
  }

  playClick() {
    this.initCtx();
    if (!this.ctx || this.volume <= 0) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = "triangle";
    osc.frequency.setValueAtTime(300, t);
    osc.frequency.exponentialRampToValueAtTime(150, t + 0.1);

    gain.gain.setValueAtTime(this.volume * 0.15, t);
    gain.gain.linearRampToValueAtTime(0.01, t + 0.1);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(t);
    osc.stop(t + 0.1);
  }

  playSelect() {
    this.initCtx();
    if (!this.ctx || this.volume <= 0) return;

    const t = this.ctx.currentTime;
    const osc1 = this.ctx.createOscillator();
    const osc2 = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc1.type = "square";
    osc2.type = "square";

    osc1.frequency.setValueAtTime(523.25, t); // C5
    osc1.frequency.setValueAtTime(659.25, t + 0.08); // E5

    osc2.frequency.setValueAtTime(1046.5, t); // C6
    osc2.frequency.setValueAtTime(1318.51, t + 0.08); // E6

    gain.gain.setValueAtTime(this.volume * 0.08, t);
    gain.gain.linearRampToValueAtTime(0.01, t + 0.3);

    osc1.connect(gain);
    osc2.connect(gain);
    gain.connect(this.ctx.destination);

    osc1.start(t);
    osc2.start(t);
    osc1.stop(t + 0.3);
    osc2.stop(t + 0.3);
  }

  playJump() {
    this.initCtx();
    if (!this.ctx || this.volume <= 0) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = "triangle";
    osc.frequency.setValueAtTime(150, t);
    osc.frequency.exponentialRampToValueAtTime(600, t + 0.25);

    gain.gain.setValueAtTime(this.volume * 0.15, t);
    gain.gain.linearRampToValueAtTime(0.01, t + 0.25);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(t);
    osc.stop(t + 0.25);
  }

  playAttack1() {
    this.initCtx();
    if (!this.ctx || this.volume <= 0) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = "sawtooth";
    osc.frequency.setValueAtTime(800, t);
    osc.frequency.exponentialRampToValueAtTime(200, t + 0.15);

    gain.gain.setValueAtTime(this.volume * 0.12, t);
    gain.gain.exponentialRampToValueAtTime(0.01, t + 0.15);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(t);
    osc.stop(t + 0.15);
  }

  playAttack2() {
    this.initCtx();
    if (!this.ctx || this.volume <= 0) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = "square";
    osc.frequency.setValueAtTime(200, t);
    osc.frequency.linearRampToValueAtTime(1200, t + 0.2);

    gain.gain.setValueAtTime(this.volume * 0.1, t);
    gain.gain.linearRampToValueAtTime(0.01, t + 0.2);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(t);
    osc.stop(t + 0.2);
  }

  playHit() {
    this.initCtx();
    if (!this.ctx || this.volume <= 0) return;

    const t = this.ctx.currentTime;
    // Low rumble with noise
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = "sawtooth";
    osc.frequency.setValueAtTime(150, t);
    osc.frequency.linearRampToValueAtTime(40, t + 0.15);

    gain.gain.setValueAtTime(this.volume * 0.25, t);
    gain.gain.linearRampToValueAtTime(0.01, t + 0.18);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(t);
    osc.stop(t + 0.18);
  }

  playHeal() {
    this.initCtx();
    if (!this.ctx || this.volume <= 0) return;

    const t = this.ctx.currentTime;
    const osc1 = this.ctx.createOscillator();
    const osc2 = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc1.type = "sine";
    osc2.type = "sine";

    osc1.frequency.setValueAtTime(523.25, t); // C5
    osc1.frequency.setValueAtTime(659.25, t + 0.1); // E5
    osc1.frequency.setValueAtTime(783.99, t + 0.2); // G5
    osc1.frequency.setValueAtTime(1046.5, t + 0.3); // C6

    osc2.frequency.setValueAtTime(1046.5, t);
    osc2.frequency.setValueAtTime(1318.51, t + 0.1);
    osc2.frequency.setValueAtTime(1567.98, t + 0.2);
    osc2.frequency.setValueAtTime(2093.0, t + 0.3);

    gain.gain.setValueAtTime(this.volume * 0.1, t);
    gain.gain.linearRampToValueAtTime(0.01, t + 0.45);

    osc1.connect(gain);
    osc2.connect(gain);
    gain.connect(this.ctx.destination);

    osc1.start(t);
    osc2.start(t);
    osc1.stop(t + 0.45);
    osc2.stop(t + 0.45);
  }

  playHurt() {
    this.initCtx();
    if (!this.ctx || this.volume <= 0) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = "sawtooth";
    osc.frequency.setValueAtTime(180, t);
    osc.frequency.linearRampToValueAtTime(80, t + 0.25);

    gain.gain.setValueAtTime(this.volume * 0.3, t);
    gain.gain.exponentialRampToValueAtTime(0.01, t + 0.25);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(t);
    osc.stop(t + 0.25);
  }

  playGameOver() {
    this.initCtx();
    if (!this.ctx || this.volume <= 0) return;

    const t = this.ctx.currentTime;
    const osc1 = this.ctx.createOscillator();
    const osc2 = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc1.type = "sawtooth";
    osc2.type = "triangle";

    osc1.frequency.setValueAtTime(220, t); // A3
    osc1.frequency.linearRampToValueAtTime(110, t + 0.8);

    osc2.frequency.setValueAtTime(207.65, t); // Ab3 minor feel
    osc2.frequency.linearRampToValueAtTime(55, t + 0.8);

    gain.gain.setValueAtTime(this.volume * 0.4, t);
    gain.gain.linearRampToValueAtTime(0.01, t + 0.9);

    osc1.connect(gain);
    osc2.connect(gain);
    gain.connect(this.ctx.destination);

    osc1.start(t);
    osc2.start(t);
    osc1.stop(t + 0.9);
    osc2.stop(t + 0.9);
  }
}

export const sound = new SoundManager();
