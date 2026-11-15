import { Injectable, inject } from '@angular/core';
import { SettingsService } from './settings.service';

export type SoundKind = 'hit' | 'wrong' | 'win' | 'end';

interface Note {
  /** Frequency in Hz. */
  hz: number;
  /** Start, in seconds from now. */
  at: number;
  /** Duration, in seconds. */
  length: number;
  wave: OscillatorType;
  volume: number;
}

// Short sounds made by code (Web Audio API): no audio files to download.
const SOUNDS: Record<SoundKind, Note[]> = {
  hit: [
    { hz: 660, at: 0, length: 0.09, wave: 'triangle', volume: 0.18 },
    { hz: 880, at: 0.08, length: 0.14, wave: 'triangle', volume: 0.18 },
  ],
  wrong: [
    { hz: 180, at: 0, length: 0.12, wave: 'sawtooth', volume: 0.12 },
    { hz: 140, at: 0.1, length: 0.18, wave: 'sawtooth', volume: 0.12 },
  ],
  win: [523, 659, 784, 1047].map((hz, i) => ({
    hz,
    at: i * 0.11,
    length: i === 3 ? 0.4 : 0.14,
    wave: 'triangle' as const,
    volume: 0.18,
  })),
  end: [
    { hz: 440, at: 0, length: 0.16, wave: 'triangle', volume: 0.16 },
    { hz: 330, at: 0.15, length: 0.16, wave: 'triangle', volume: 0.16 },
    { hz: 262, at: 0.3, length: 0.32, wave: 'triangle', volume: 0.16 },
  ],
};

/** Plays the game sounds, only when the setting is on (off by default). */
@Injectable({ providedIn: 'root' })
export class SoundService {
  private readonly settings = inject(SettingsService);
  private context?: AudioContext;

  play(kind: SoundKind): void {
    if (this.settings.value().sounds) this.playNow(kind);
  }

  /** Plays regardless of the setting: used to let the player hear it when turning it on. */
  preview(): void {
    this.playNow('hit');
  }

  private playNow(kind: SoundKind): void {
    try {
      // Created on first use: browsers only allow audio after a click or key press.
      this.context ??= new AudioContext();
      const context = this.context;
      if (context.state === 'suspended') void context.resume();
      for (const note of SOUNDS[kind]) {
        const start = context.currentTime + note.at;
        const oscillator = context.createOscillator();
        const gain = context.createGain();
        oscillator.type = note.wave;
        oscillator.frequency.value = note.hz;
        gain.gain.setValueAtTime(0.0001, start);
        gain.gain.exponentialRampToValueAtTime(note.volume, start + 0.015);
        gain.gain.exponentialRampToValueAtTime(0.0001, start + note.length);
        oscillator.connect(gain).connect(context.destination);
        oscillator.start(start);
        oscillator.stop(start + note.length + 0.02);
      }
    } catch {
      // No audio support: the game works the same without sound.
    }
  }
}
