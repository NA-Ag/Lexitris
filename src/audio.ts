export class TetrisAudio {
  private ctx: AudioContext | null = null;
  private oscillator: OscillatorNode | null = null;
  private gainNode: GainNode | null = null;
  private isPlaying = false;
  private noteIndex = 0;
  private nextNoteTime = 0;
  private timerID: number | null = null;

  // Tempo and timing
  private bpm = 150;
  private lookahead = 25.0; // ms
  private scheduleAheadTime = 0.1; // seconds

  // Frequencies
  private freqs: Record<string, number> = {
    'E5': 659.25,
    'B4': 493.88,
    'C5': 523.25,
    'D5': 587.33,
    'A4': 440.00,
    'A5': 880.00,
    'G5': 783.99,
    'F5': 698.46,
    'G#4': 415.30,
    'G#5': 830.61
  };

  // Note duration in beats
  // Korobeiniki
  private melody = [
    { note: 'E5', duration: 1 }, { note: 'B4', duration: 0.5 }, { note: 'C5', duration: 0.5 }, { note: 'D5', duration: 1 }, { note: 'C5', duration: 0.5 }, { note: 'B4', duration: 0.5 },
    { note: 'A4', duration: 1 }, { note: 'A4', duration: 0.5 }, { note: 'C5', duration: 0.5 }, { note: 'E5', duration: 1 }, { note: 'D5', duration: 0.5 }, { note: 'C5', duration: 0.5 },
    { note: 'B4', duration: 1.5 }, { note: 'C5', duration: 0.5 }, { note: 'D5', duration: 1 }, { note: 'E5', duration: 1 },
    { note: 'C5', duration: 1 }, { note: 'A4', duration: 1 }, { note: 'A4', duration: 1.5 }, { note: 'rest', duration: 0.5 },
    // Part B
    { note: 'D5', duration: 1 }, { note: 'F5', duration: 0.5 }, { note: 'A5', duration: 1 }, { note: 'G5', duration: 0.5 }, { note: 'F5', duration: 0.5 },
    { note: 'E5', duration: 1.5 }, { note: 'C5', duration: 0.5 }, { note: 'E5', duration: 1 }, { note: 'D5', duration: 0.5 }, { note: 'C5', duration: 0.5 },
    { note: 'B4', duration: 1 }, { note: 'B4', duration: 0.5 }, { note: 'C5', duration: 0.5 }, { note: 'D5', duration: 1 }, { note: 'E5', duration: 1 },
    { note: 'C5', duration: 1 }, { note: 'A4', duration: 1 }, { note: 'A4', duration: 1.5 }, { note: 'rest', duration: 0.5 },
    // Bridge (Part C)
    { note: 'E5', duration: 2 }, { note: 'C5', duration: 2 },
    { note: 'D5', duration: 2 }, { note: 'B4', duration: 2 },
    { note: 'C5', duration: 2 }, { note: 'A4', duration: 2 },
    { note: 'G#4', duration: 2 }, { note: 'B4', duration: 2 },
    { note: 'E5', duration: 2 }, { note: 'C5', duration: 2 },
    { note: 'D5', duration: 2 }, { note: 'B4', duration: 2 },
    { note: 'C5', duration: 1 }, { note: 'E5', duration: 1 }, { note: 'A5', duration: 2 },
    { note: 'G#5', duration: 4 }
  ];

  start() {
    if (this.isPlaying) return;
    this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    this.isPlaying = true;
    this.noteIndex = 0;
    this.nextNoteTime = this.ctx.currentTime + 0.05;
    this.scheduler();
  }

  stop() {
    this.isPlaying = false;
    if (this.timerID) {
      clearTimeout(this.timerID);
      this.timerID = null;
    }
  }

  private nextNote() {
    const secondsPerBeat = 60.0 / this.bpm;
    this.nextNoteTime += secondsPerBeat * this.melody[this.noteIndex].duration;
    this.noteIndex++;
    if (this.noteIndex === this.melody.length) {
      this.noteIndex = 0;
    }
  }

  private playNote(noteInfo: {note: string, duration: number}, time: number) {
    if (noteInfo.note === 'rest' || !this.ctx) return;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    
    // Gameboy pulse wave approx (softened using triangle)
    osc.type = 'triangle';
    osc.frequency.value = this.freqs[noteInfo.note];

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    // Envelope to avoid popping and sound a bit staccato
    const secondsPerBeat = 60.0 / this.bpm;
    const duration = secondsPerBeat * noteInfo.duration;
    
    gain.gain.setValueAtTime(0, time);
    gain.gain.linearRampToValueAtTime(0.03, time + 0.02); 
    gain.gain.setValueAtTime(0.03, time + duration - 0.05);
    gain.gain.linearRampToValueAtTime(0, time + duration - 0.01);

    osc.start(time);
    osc.stop(time + duration);
  }

  private scheduler() {
    if (!this.isPlaying || !this.ctx) return;
    while (this.nextNoteTime < this.ctx.currentTime + this.scheduleAheadTime) {
      this.playNote(this.melody[this.noteIndex], this.nextNoteTime);
      this.nextNote();
    }
    this.timerID = window.setTimeout(() => this.scheduler(), this.lookahead);
  }
}

export const audio = new TetrisAudio();
