(function () {
  const config = window.ImpolPinballConfig || (window.ImpolPinballConfig = {});
  const HIGH_SCORE_BASE_KEY = "impol-pinball.high-score";
  const AUDIO_MUTED_KEY = "impol-pinball.audio-muted";
  const SCORING_RULES = {
    version: "14.3.4-score-economy-1",
    highScorePolicy: "live-current-ruleset",
    legacyHighScoreKey: `${HIGH_SCORE_BASE_KEY}.legacy-pre-14.3.4`,
    targetBands: {
      beginner: { min: 75000, max: 200000 },
      competent: { min: 200000, max: 500000 },
      strong: { min: 500000, max: 1000000 }
    },
    values: {
      bumpers: { mes: 600, erp: 750, co2: 600 },
      targets: {
        "measurement-left": 1200,
        "measurement-right": 1200,
        furnace: 2600,
        coil: 2600,
        alcad: 2100,
        "e-odprema": 2300,
        kosovnica: 3200
      },
      slingshot: 140,
      rollover: 160,
      inlane: 220,
      outlane: 100,
      rolloverSet: 2500,
      laneSet: 1600,
      upperOrbit: 6500,
      bomSuccess: 45000,
      lockHouseReward: 22000,
      jackpotNormal: 35000,
      jackpotSuper: 90000,
      comboByCount: {
        2: 1200,
        3: 3000,
        4: 5200,
        5: 8000
      },
      comboMediumSix: 11000,
      comboMax: 14000,
      missions: {
        measurement: 18000,
        mes: 25000,
        erp: 35000,
        green: 28000,
        coil: 30000,
        eodprema: 22000,
        alcad: 22000,
        furnace: 32000,
        kosovnica: 40000
      },
      metaMissions: 120000,
      metaCompanies: 90000
    }
  };
  SCORING_RULES.highScoreKey = `${HIGH_SCORE_BASE_KEY}.${SCORING_RULES.version}`;
  Object.assign(config, {
    HIGH_SCORE_BASE_KEY,
    AUDIO_MUTED_KEY,
    SCORING_RULES
  });
})();
