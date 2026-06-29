(function () {
  const config = window.ImpolPinballConfig || (window.ImpolPinballConfig = {});
  const { SCORING_RULES, UPPER_ORBIT } = config;
  const MISSION_CONFIG = [
    {
      id: "measurement",
      label: "MERILNI PROTOKOL",
      event: "hit:MEASUREMENT",
      required: 3,
      bonus: SCORING_RULES.values.missions.measurement,
      reward: "Quality bonus"
    },
    {
      id: "mes",
      label: "MES ONLINE",
      event: "hit:MES",
      required: 5,
      bonus: SCORING_RULES.values.missions.mes,
      reward: "Real-time bonus"
    },
    {
      id: "erp",
      label: "ERP GO-LIVE",
      event: UPPER_ORBIT.event,
      required: 2,
      bonus: SCORING_RULES.values.missions.erp,
      multiplierReward: 2,
      shotLabel: "ALU FLOW ORBIT",
      reward: "2x multiplier"
    },
    {
      id: "green",
      label: "GREEN ALUMINIUM",
      event: "hit:GREEN",
      required: 3,
      bonus: SCORING_RULES.values.missions.green,
      reward: "CO2 bonus"
    },
    {
      id: "coil",
      label: "COIL COLLECTOR",
      event: "hit:COIL",
      required: 3,
      bonus: SCORING_RULES.values.missions.coil,
      reward: "Coil bonus"
    },
    {
      id: "eodprema",
      label: "E-ODPREMA",
      event: "hit:EODPREMA",
      required: 2,
      bonus: SCORING_RULES.values.missions.eodprema,
      reward: "Dispatch bonus"
    },
    {
      id: "alcad",
      label: "ALCAD SORTIRANJE",
      event: "hit:ALCAD",
      required: 2,
      bonus: SCORING_RULES.values.missions.alcad,
      reward: "Recycle bonus"
    },
    {
      id: "furnace",
      label: "LIVARNA READY",
      event: "hit:FURNACE",
      required: 3,
      bonus: SCORING_RULES.values.missions.furnace,
      reward: "Furnace bonus"
    },
    {
      id: "kosovnica",
      label: "KOSOVNICA MIRNA",
      event: "hit:KOSOVNICA",
      required: 2,
      bonus: SCORING_RULES.values.missions.kosovnica,
      reward: "No revision bonus"
    }
  ];
  const MISSION_STAGES = [
    ["measurement"],
    ["mes"],
    ["erp"],
    ["green", "coil"],
    ["eodprema", "alcad"],
    ["furnace"],
    ["kosovnica"]
  ];
  const MISSION_TARGET_LABELS = {
    "hit:MEASUREMENT": "MERILNI / PROTOKOL",
    "hit:MES": "MES",
    "hit:GREEN": "CO2 / GREEN",
    "hit:COIL": "COIL COLLECTOR",
    "hit:EODPREMA": "E-ODPREMA",
    "hit:ALCAD": "ALCAD",
    "hit:FURNACE": "FURNACE",
    "hit:KOSOVNICA": "KOSOVNICA",
    [UPPER_ORBIT.event]: "ALU FLOW ORBIT"
  };
  Object.assign(config, {
    MISSION_CONFIG,
    MISSION_STAGES,
    MISSION_TARGET_LABELS
  });
})();
