(function () {
  const config = window.ImpolPinballConfig || (window.ImpolPinballConfig = {});
  const { SCORING_RULES } = config;
  const BOM_MODE = {
    sequence: ["hit:MES", "hit:ERP", "hit:COIL"],
    labels: ["MES", "ERP", "COIL"],
    duration: 10000,
    successBonus: SCORING_RULES.values.bomSuccess
  };
  const META_REWARDS = {
    missions: {
      label: "INDUSTRY 4.0 JACKPOT",
      bonus: SCORING_RULES.values.metaMissions,
      multiplier: 3,
      duration: 22000,
      ballSaveExtension: 9000,
      color: "#ffb967"
    },
    companies: {
      label: "IMPOL GROUP SYNERGY",
      bonus: SCORING_RULES.values.metaCompanies,
      multiplier: 4,
      duration: 18000,
      ballSaveExtension: 7000,
      color: "#7bdc6c"
    }
  };
  const BALL_SAVE_DURATION = 9000;
  Object.assign(config, {
    BOM_MODE,
    META_REWARDS,
    BALL_SAVE_DURATION
  });
})();
