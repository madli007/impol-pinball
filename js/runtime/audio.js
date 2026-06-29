(function () {
  const runtime = window.ImpolPinballRuntime || (window.ImpolPinballRuntime = {});
  const storage = runtime.storage || {};
  const loadAudioMutedPreference = storage.loadAudioMutedPreference || (() => false);
  const saveAudioMutedPreference = storage.saveAudioMutedPreference || function () {};
function createAudioManager() {
  const state = {
    context: null,
    master: null,
    isMuted: loadAudioMutedPreference(),
    isUnlocked: false,
    isAvailable: Boolean(window.AudioContext || window.webkitAudioContext),
    lastPlayed: {},
    activeGains: new Set()
  };

  function ensureContext() {
    if (!state.isAvailable) {
      return null;
    }

    if (!state.context) {
      try {
        const AudioContextConstructor = window.AudioContext || window.webkitAudioContext;
        state.context = new AudioContextConstructor();
        state.master = state.context.createGain();
        state.master.gain.value = state.isMuted ? 0 : 0.5;
        state.master.connect(state.context.destination);
      } catch (_error) {
        state.isAvailable = false;
        return null;
      }
    }

    return state.context;
  }

  function setMuted(isMuted) {
    state.isMuted = isMuted;
    saveAudioMutedPreference(state.isMuted);

    if (state.master) {
      const now = state.context.currentTime;
      state.master.gain.cancelScheduledValues(now);
      state.master.gain.setTargetAtTime(state.isMuted ? 0 : 0.5, now, state.isMuted ? 0.004 : 0.015);

      if (state.isMuted) {
        state.activeGains.forEach((gain) => {
          gain.gain.cancelScheduledValues(now);
          gain.gain.setTargetAtTime(0.0001, now, 0.004);
        });
      }
    }
  }

  function unlock() {
    const context = ensureContext();

    if (!context) {
      return false;
    }

    if (context.state === "suspended") {
      context.resume().catch(() => {
        state.isAvailable = false;
      });
    }

    state.isUnlocked = true;
    return true;
  }

  function canPlay(effectName, throttleMs = 28) {
    if (state.isMuted || !state.isAvailable || !state.isUnlocked) {
      return false;
    }

    const context = ensureContext();

    if (!context || !state.master) {
      return false;
    }

    const now = performance.now();
    if (now - (state.lastPlayed[effectName] || 0) < throttleMs) {
      return false;
    }

    state.lastPlayed[effectName] = now;
    return true;
  }

  function trackGain(gain, context, stopAt) {
    state.activeGains.add(gain);
    window.setTimeout(() => {
      state.activeGains.delete(gain);
    }, Math.max(60, (stopAt - context.currentTime) * 1000 + 80));
  }

  function playTone({ frequency, endFrequency, duration, type = "sine", volume = 0.08, startOffset = 0 }) {
    const context = ensureContext();

    if (!context || !state.master) {
      return;
    }

    const startAt = context.currentTime + startOffset;
    const endAt = startAt + duration;
    const oscillator = context.createOscillator();
    const gain = context.createGain();

    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, startAt);
    oscillator.frequency.exponentialRampToValueAtTime(Math.max(20, endFrequency || frequency), endAt);
    gain.gain.setValueAtTime(0.0001, startAt);
    gain.gain.exponentialRampToValueAtTime(volume, startAt + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, endAt);
    oscillator.connect(gain);
    gain.connect(state.master);
    trackGain(gain, context, endAt);
    oscillator.start(startAt);
    oscillator.stop(endAt + 0.02);
  }

  function playNoise({ duration, volume = 0.05, filterFrequency = 1200, startOffset = 0, type = "bandpass", q = 2.8 }) {
    const context = ensureContext();

    if (!context || !state.master) {
      return;
    }

    const sampleCount = Math.max(1, Math.floor(context.sampleRate * duration));
    const buffer = context.createBuffer(1, sampleCount, context.sampleRate);
    const data = buffer.getChannelData(0);

    for (let index = 0; index < sampleCount; index += 1) {
      data[index] = Math.random() * 2 - 1;
    }

    const source = context.createBufferSource();
    const filter = context.createBiquadFilter();
    const gain = context.createGain();
    const startAt = context.currentTime + startOffset;
    const endAt = startAt + duration;

    filter.type = type;
    filter.frequency.value = filterFrequency;
    filter.Q.value = q;
    gain.gain.setValueAtTime(volume, startAt);
    gain.gain.exponentialRampToValueAtTime(0.0001, endAt);
    source.buffer = buffer;
    source.connect(filter);
    filter.connect(gain);
    gain.connect(state.master);
    trackGain(gain, context, endAt);
    source.start(startAt);
    source.stop(endAt + 0.02);
  }

  function playLaunch(options = {}) {
    const power = Math.max(0.58, Math.min(1, options.power || 0.72));
    const springVolume = 0.024 + power * 0.022;
    const railVolume = 0.018 + power * 0.018;

    playNoise({ duration: 0.045, volume: railVolume, filterFrequency: 1250, type: "highpass", q: 0.8 });
    playTone({ frequency: 105 + power * 45, endFrequency: 360 + power * 160, duration: 0.13, type: "sawtooth", volume: springVolume, startOffset: 0.015 });
    playTone({ frequency: 720 + power * 160, endFrequency: 460 + power * 80, duration: 0.07, type: "triangle", volume: 0.018 + power * 0.01, startOffset: 0.105 });
    playNoise({ duration: 0.12, volume: 0.018 + power * 0.014, filterFrequency: 760, type: "bandpass", q: 3.4, startOffset: 0.04 });
  }

  function playBumper(options = {}) {
    const variant = options.variant || "default";
    const voices = {
      mes: {
        primary: [720, 1210],
        secondary: [1540, 1040],
        type: "triangle",
        noise: 2300,
        volume: 0.05
      },
      erp: {
        primary: [560, 940],
        secondary: [1120, 780],
        type: "square",
        noise: 1700,
        volume: 0.043
      },
      co2: {
        primary: [840, 1320],
        secondary: [1760, 1260],
        type: "sine",
        noise: 2800,
        volume: 0.044
      },
      default: {
        primary: [700, 1120],
        secondary: [1420, 960],
        type: "triangle",
        noise: 2100,
        volume: 0.046
      }
    };
    const voice = voices[variant] || voices.default;

    playTone({ frequency: voice.primary[0], endFrequency: voice.primary[1], duration: 0.085, type: voice.type, volume: voice.volume });
    playTone({ frequency: voice.secondary[0], endFrequency: voice.secondary[1], duration: 0.065, type: "sine", volume: 0.022, startOffset: 0.018 });
    playNoise({ duration: 0.035, volume: 0.012, filterFrequency: voice.noise, type: "bandpass", q: 3.8, startOffset: 0.006 });
  }

  function playGameOver() {
    playNoise({ duration: 0.09, volume: 0.034, filterFrequency: 260, type: "lowpass", q: 0.9 });
    playTone({ frequency: 210, endFrequency: 68, duration: 0.48, type: "sawtooth", volume: 0.058, startOffset: 0.02 });
    playTone({ frequency: 124, endFrequency: 48, duration: 0.56, type: "triangle", volume: 0.044, startOffset: 0.12 });
    playTone({ frequency: 420, endFrequency: 180, duration: 0.18, type: "square", volume: 0.018, startOffset: 0.27 });
    playNoise({ duration: 0.22, volume: 0.018, filterFrequency: 410, type: "bandpass", q: 1.6, startOffset: 0.1 });
  }

  function playMultiballStart() {
    playTone({ frequency: 330, endFrequency: 660, duration: 0.11, type: "sawtooth", volume: 0.04 });
    playTone({ frequency: 495, endFrequency: 990, duration: 0.12, type: "triangle", volume: 0.034, startOffset: 0.08 });
    playTone({ frequency: 660, endFrequency: 1320, duration: 0.15, type: "sine", volume: 0.034, startOffset: 0.17 });
    playNoise({ duration: 0.12, volume: 0.018, filterFrequency: 2600, type: "bandpass", q: 3.2, startOffset: 0.08 });
  }

  function playMultiballWarning() {
    playTone({ frequency: 98, endFrequency: 196, duration: 0.72, type: "sawtooth", volume: 0.035 });
    playTone({ frequency: 147, endFrequency: 294, duration: 0.68, type: "triangle", volume: 0.03, startOffset: 0.16 });
    playTone({ frequency: 220, endFrequency: 440, duration: 0.56, type: "sine", volume: 0.026, startOffset: 0.42 });
    playNoise({ duration: 0.36, volume: 0.014, filterFrequency: 520, type: "bandpass", q: 1.8, startOffset: 0.12 });
  }

  function play(effectName, options = {}) {
    const throttles = {
      flipper: 55,
      bumper: 65,
      target: 55,
      launch: 120,
      drain: 350,
      reset: 350,
      combo: 180,
      "mission-progress": 220,
      "mission-complete": 650,
      multiplier: 650,
      "multiball-warning": 1000,
      "multiball-start": 900,
      jackpot: 360,
      "super-jackpot": 750,
      "orbit-entry": 260,
      "lock-house-closed": 180,
      "lock-house-opening": 360,
      "lock-house-locked": 420,
      "lock-house-reward": 650,
      "lock-house-kickout": 300,
      "game-over": 900
    };

    if (!canPlay(effectName, throttles[effectName])) {
      return;
    }

    if (effectName === "flipper") {
      playTone({ frequency: 190, endFrequency: 92, duration: 0.055, type: "square", volume: 0.035 });
      playNoise({ duration: 0.035, volume: 0.018, filterFrequency: 900 });
    } else if (effectName === "bumper") {
      playBumper(options);
    } else if (effectName === "target") {
      playTone({ frequency: 520, endFrequency: 420, duration: 0.075, type: "triangle", volume: 0.04 });
      playNoise({ duration: 0.045, volume: 0.014, filterFrequency: 1600 });
    } else if (effectName === "launch") {
      playLaunch(options);
    } else if (effectName === "drain") {
      playTone({ frequency: 220, endFrequency: 70, duration: 0.34, type: "sawtooth", volume: 0.055 });
      playNoise({ duration: 0.12, volume: 0.025, filterFrequency: 420, startOffset: 0.06 });
    } else if (effectName === "reset") {
      playTone({ frequency: 360, endFrequency: 540, duration: 0.09, type: "sine", volume: 0.035 });
      playTone({ frequency: 540, endFrequency: 720, duration: 0.09, type: "sine", volume: 0.026, startOffset: 0.08 });
    } else if (effectName === "combo") {
      playTone({ frequency: 620, endFrequency: 930, duration: 0.07, type: "triangle", volume: 0.042 });
      playTone({ frequency: 930, endFrequency: 1240, duration: 0.07, type: "triangle", volume: 0.034, startOffset: 0.055 });
    } else if (effectName === "mission-progress") {
      playTone({ frequency: 460, endFrequency: 690, duration: 0.08, type: "sine", volume: 0.034 });
      playTone({ frequency: 690, endFrequency: 760, duration: 0.06, type: "sine", volume: 0.026, startOffset: 0.06 });
    } else if (effectName === "mission-complete") {
      playTone({ frequency: 420, endFrequency: 630, duration: 0.1, type: "triangle", volume: 0.045 });
      playTone({ frequency: 630, endFrequency: 840, duration: 0.1, type: "triangle", volume: 0.043, startOffset: 0.09 });
      playTone({ frequency: 840, endFrequency: 1120, duration: 0.13, type: "sine", volume: 0.038, startOffset: 0.18 });
    } else if (effectName === "multiplier") {
      playTone({ frequency: 520, endFrequency: 1040, duration: 0.16, type: "sawtooth", volume: 0.038 });
      playTone({ frequency: 1040, endFrequency: 1560, duration: 0.12, type: "triangle", volume: 0.032, startOffset: 0.12 });
    } else if (effectName === "multiball-warning") {
      playMultiballWarning();
    } else if (effectName === "multiball-start") {
      playMultiballStart();
    } else if (effectName === "jackpot") {
      playTone({ frequency: 620, endFrequency: 1240, duration: 0.12, type: "triangle", volume: 0.046 });
      playTone({ frequency: 930, endFrequency: 1560, duration: 0.13, type: "sine", volume: 0.036, startOffset: 0.08 });
      playNoise({ duration: 0.06, volume: 0.015, filterFrequency: 2600, type: "bandpass", q: 3.2, startOffset: 0.03 });
    } else if (effectName === "super-jackpot") {
      playTone({ frequency: 520, endFrequency: 1040, duration: 0.1, type: "sawtooth", volume: 0.043 });
      playTone({ frequency: 780, endFrequency: 1560, duration: 0.15, type: "triangle", volume: 0.04, startOffset: 0.08 });
      playTone({ frequency: 1040, endFrequency: 2080, duration: 0.18, type: "sine", volume: 0.034, startOffset: 0.18 });
      playNoise({ duration: 0.12, volume: 0.018, filterFrequency: 3200, type: "bandpass", q: 3.6, startOffset: 0.06 });
    } else if (effectName === "orbit-entry") {
      playTone({ frequency: 380, endFrequency: 760, duration: 0.12, type: "sine", volume: 0.034 });
      playNoise({ duration: 0.11, volume: 0.014, filterFrequency: 1900, type: "bandpass", q: 2.6, startOffset: 0.025 });
    } else if (effectName === "lock-house-closed") {
      playNoise({ duration: 0.05, volume: 0.02, filterFrequency: 520, type: "lowpass", q: 1.1 });
      playTone({ frequency: 220, endFrequency: 150, duration: 0.08, type: "square", volume: 0.026, startOffset: 0.01 });
    } else if (effectName === "lock-house-opening") {
      playTone({ frequency: 340, endFrequency: 680, duration: 0.11, type: "triangle", volume: 0.036 });
      playTone({ frequency: 510, endFrequency: 920, duration: 0.12, type: "sine", volume: 0.028, startOffset: 0.07 });
      playNoise({ duration: 0.08, volume: 0.013, filterFrequency: 1800, type: "bandpass", q: 2.8, startOffset: 0.04 });
    } else if (effectName === "lock-house-locked") {
      playNoise({ duration: 0.075, volume: 0.022, filterFrequency: 880, type: "bandpass", q: 2.2 });
      playTone({ frequency: 520, endFrequency: 260, duration: 0.12, type: "sawtooth", volume: 0.032, startOffset: 0.02 });
    } else if (effectName === "lock-house-reward") {
      playTone({ frequency: 480, endFrequency: 720, duration: 0.09, type: "triangle", volume: 0.04 });
      playTone({ frequency: 720, endFrequency: 1080, duration: 0.11, type: "sine", volume: 0.036, startOffset: 0.08 });
      playTone({ frequency: 960, endFrequency: 1440, duration: 0.14, type: "triangle", volume: 0.03, startOffset: 0.17 });
    } else if (effectName === "lock-house-kickout") {
      playNoise({ duration: 0.06, volume: 0.027, filterFrequency: 1250, type: "highpass", q: 0.9 });
      playTone({ frequency: 160, endFrequency: 520, duration: 0.13, type: "sawtooth", volume: 0.034, startOffset: 0.015 });
    } else if (effectName === "game-over") {
      playGameOver();
    }
  }

  return {
    get isMuted() {
      return state.isMuted;
    },
    get isUnlocked() {
      return state.isUnlocked;
    },
    get isAvailable() {
      return state.isAvailable;
    },
    setMuted,
    unlock,
    play
  };
}

  function applyAudioUiState(ui, audio) {
    if (!ui.audioToggle) {
      return;
    }

    const enabled = audio.isAvailable && !audio.isMuted;
    ui.audioToggle.textContent = enabled ? "Sound On" : "Sound Off";
    ui.audioToggle.setAttribute("aria-pressed", String(enabled));
    ui.audioToggle.classList.toggle("is-enabled", enabled);
  }

  function createAudioControls({ ui, audio, syncInspectable }) {
    function updateAudioUi() {
      applyAudioUiState(ui, audio);
    }

    function unlockAudio() {
      audio.unlock();
      updateAudioUi();
      syncInspectable();
    }

    function toggleAudioMute() {
      audio.unlock();
      audio.setMuted(!audio.isMuted);
      updateAudioUi();
      syncInspectable();
    }

    return {
      unlockAudio,
      toggleAudioMute,
      updateAudioUi
    };
  }

  runtime.audio = {
    createAudioManager,
    createAudioControls,
    applyAudioUiState
  };
})();