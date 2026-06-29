(function () {
  const runtime = window.ImpolPinballRuntime || (window.ImpolPinballRuntime = {});
  const {
    HIGH_SCORE_BASE_KEY,
    AUDIO_MUTED_KEY,
    SCORING_RULES
  } = window.ImpolPinballConfig;

  function separateLegacyHighScore() {
    const legacyScore = window.localStorage.getItem(HIGH_SCORE_BASE_KEY);

    if (legacyScore !== null && window.localStorage.getItem(SCORING_RULES.legacyHighScoreKey) === null) {
      window.localStorage.setItem(SCORING_RULES.legacyHighScoreKey, legacyScore);
    }
  }

  function loadHighScore() {
    try {
      separateLegacyHighScore();
      const stored = window.localStorage.getItem(SCORING_RULES.highScoreKey);
      const parsed = Number.parseInt(stored || "0", 10);
      return Number.isFinite(parsed) ? parsed : 0;
    } catch (_error) {
      return 0;
    }
  }

  function saveHighScore(highScore) {
    try {
      window.localStorage.setItem(SCORING_RULES.highScoreKey, String(highScore));
    } catch (_error) {
      // Keep the game playable if browser storage is unavailable.
    }
  }

  function loadLegacyHighScore() {
    try {
      separateLegacyHighScore();
      const stored = window.localStorage.getItem(SCORING_RULES.legacyHighScoreKey);
      const parsed = Number.parseInt(stored || "0", 10);
      return Number.isFinite(parsed) ? parsed : 0;
    } catch (_error) {
      return 0;
    }
  }

  function loadAudioMutedPreference() {
    try {
      return window.localStorage.getItem(AUDIO_MUTED_KEY) === "true";
    } catch (_error) {
      return false;
    }
  }

  function saveAudioMutedPreference(isMuted) {
    try {
      window.localStorage.setItem(AUDIO_MUTED_KEY, String(isMuted));
    } catch (_error) {
      // Audio remains usable even if browser storage is unavailable.
    }
  }

  runtime.storage = {
    loadHighScore,
    saveHighScore,
    separateLegacyHighScore,
    loadLegacyHighScore,
    loadAudioMutedPreference,
    saveAudioMutedPreference
  };
})();