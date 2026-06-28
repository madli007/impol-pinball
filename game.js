(function () {
  const canvas = document.getElementById("game-canvas");
  const context = canvas.getContext("2d");
  const MatterLib = window.Matter;
  const TABLE = {
    width: canvas.width,
    height: canvas.height,
    wall: 60,
    ballStart: { x: 806, y: 1066 },
    shooterLane: {
      innerX: 756,
      outerX: 842,
      bottomY: 1190,
      topY: 160,
      exitY: 214,
      plungerCenterX: 800
    },
    totalBalls: 3,
    flippers: {
      left: { pivotX: 254, pivotY: 1218, length: 166, height: 32, restAngle: 0.22, activeAngle: -0.58 },
      right: { pivotX: 646, pivotY: 1218, length: 166, height: 32, restAngle: Math.PI - 0.22, activeAngle: Math.PI + 0.58 }
    }
  };
  const DEBUG_PHYSICS = false;
  const DIAGNOSTIC_QUERY_PARAM = "pinballDiagnostics";
  const diagnosticQuery = new URLSearchParams(window.location.search);
  const DIAGNOSTICS_ENABLED = diagnosticQuery.has(DIAGNOSTIC_QUERY_PARAM);
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
      skillShot: 8000,
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
  const COMBO_WINDOW_MS = 1800;
  const GAME_OVER_RESTART_DELAY_MS = 1400;
  const MULTIBALL = {
    maxBalls: 2,
    multiplier: 2,
    graceMs: 9000,
    progressRequirements: [2, 3, 4],
    requirementStep: 1,
    maxRequirement: 5,
    launchVelocity: { x: 0, y: -36 }
  };
  const JACKPOT = {
    normalTargetIds: ["coil", "furnace"],
    superTargetId: "kosovnica",
    normalValue: SCORING_RULES.values.jackpotNormal,
    superValue: SCORING_RULES.values.jackpotSuper
  };
  const FLIPPER_TIP_EXTENSION = 0.16;
  const COMBO_BONUS_BY_COUNT = {
    2: SCORING_RULES.values.comboByCount[2],
    3: SCORING_RULES.values.comboByCount[3],
    4: SCORING_RULES.values.comboByCount[4],
    5: SCORING_RULES.values.comboByCount[5]
  };
  const MAX_COMBO_BONUS = SCORING_RULES.values.comboMax;
  const COMBO_MAX_COUNT = 10;
  const COMBO_MAX_SAME_ZONE_STREAK = 2;
  const COMBO_HISTORY_LIMIT = 10;
  const COMBO_PASSIVE_TYPES = new Set(["lane", "rollover", "slingshot"]);
  const COMBO_TIERS = {
    none: { label: "None", minCount: 0, maxCount: 1, requiredZones: 0, requiredObjects: 0 },
    small: { label: "Small", minCount: 2, maxCount: 3, requiredZones: 2, requiredObjects: 2 },
    medium: { label: "Medium", minCount: 4, maxCount: 6, requiredZones: 2, requiredObjects: 3 },
    max: { label: "Max", minCount: 7, maxCount: COMBO_MAX_COUNT, requiredZones: 3, requiredObjects: 4 }
  };
  const FEEDBACK_PRIORITIES = {
    idle: 0,
    hit: 20,
    combo: 35,
    progress: 45,
    mode: 55,
    save: 65,
    jackpot: 75,
    multiball: 85,
    meta: 90,
    system: 100
  };
  const FEEDBACK_ZONES = {
    status: { x: 590, y: 96, width: 220, height: 42, radius: 6, priority: FEEDBACK_PRIORITIES.system },
    multiball: { x: 92, y: 96, width: 270, height: 46, radius: 8, priority: FEEDBACK_PRIORITIES.multiball },
    meta: { x: 92, y: 150, width: 270, height: 44, radius: 8, priority: FEEDBACK_PRIORITIES.meta },
    jackpot: { x: 282, y: 150, width: 336, height: 44, radius: 8, priority: FEEDBACK_PRIORITIES.jackpot },
    ballSave: { x: 92, y: 258, width: 228, height: 38, radius: 8, priority: FEEDBACK_PRIORITIES.save },
    sideShield: { x: 580, y: 258, width: 228, height: 38, radius: 8, priority: FEEDBACK_PRIORITIES.save },
    bom: { x: 292, y: 204, width: 316, height: 48, radius: 8, priority: FEEDBACK_PRIORITIES.mode },
    combo: { x: 332, y: 258, width: 236, height: 40, radius: 8, priority: FEEDBACK_PRIORITIES.combo }
  };
  const SENSOR_REHIT_RULES = {
    default: { objectCooldownMs: 620, ballObjectCooldownMs: 980 },
    bumper: { objectCooldownMs: 520, ballObjectCooldownMs: 820 },
    target: { objectCooldownMs: 760, ballObjectCooldownMs: 1120 },
    slingshot: { objectCooldownMs: 680, ballObjectCooldownMs: 980 },
    rollover: { objectCooldownMs: 820, ballObjectCooldownMs: 1200 },
    lane: { objectCooldownMs: 760, ballObjectCooldownMs: 1200 },
    route: { objectCooldownMs: 1400, ballObjectCooldownMs: 2200 }
  };
  const ROLLOVER_COMPLETE_BONUS = SCORING_RULES.values.rolloverSet;
  const LANE_SET_BONUS = SCORING_RULES.values.laneSet;
  const SIDE_SHIELD_DURATION = 6500;
  const UPPER_ORBIT = {
    id: "upper-orbit",
    label: "ALU FLOW ORBIT",
    event: "hit:UPPER_ORBIT",
    points: SCORING_RULES.values.upperOrbit,
    accent: "#31a8ff",
    timeoutMs: 4400,
    committedX: 258,
    committedY: 920,
    entrySensor: { x: 194, y: 832, width: 196, height: 188, angle: -0.22 },
    returnSensor: { x: 224, y: 304, width: 106, height: 100, angle: 0.04 },
    rails: [
      { x: 232, y: 570, width: 14, height: 438, angle: 0 }
    ]
  };
  const LOCK_HOUSE = {
    id: "lock-house",
    label: "LOCK HOUSE",
    placement: "right-mid playfield beside the CO2 bumper and above the E-ODPREMA lane, clear of the shooter lane",
    states: ["closed", "qualified", "open", "holding", "kicking"],
    initialState: "closed",
    captureEnabled: true,
    holdDurationMs: 1600,
    holdTimeoutMs: 9000,
    kickoutGraceMs: 1200,
    maxLockedBalls: 3,
    autoLaunchVelocity: { x: 0, y: -37 },
    multiballReleaseDelayMs: 620,
    minimumUpwardLockVelocity: -1.15,
    kickoutVelocity: { x: -6.4, y: 5.2 },
    kickoutPosition: { x: 676, y: 552 },
    multiballPolicy: "capture-disabled-during-multiball",
    x: 704,
    y: 502,
    width: 88,
    height: 122,
    mouth: { x: 704, y: 540, width: 68, height: 54, angle: -0.08 },
    accent: "#ff9b3d",
    qualifiedAccent: "#7bdc6c",
    event: "lock-house:contact",
    qualificationEvents: [
      { id: "alu-flow-orbit", label: "ALU FLOW", event: UPPER_ORBIT.event, required: 1 },
      { id: "coil-collector", label: "COIL", event: "hit:COIL", required: 1 }
    ]
  };
  const LOCK_HOUSE_PRESENTATION = {
    closed: { label: "CLOSED", color: "#ff9b3d" },
    qualified: { label: "READY", color: "#7bdc6c" },
    open: { label: "OPEN", color: "#7bdc6c" },
    holding: { label: "HELD", color: "#31a8ff" },
    kicking: { label: "KICK", color: "#ffb967" }
  };
  const ASSET_CONFIG = {
    furnace: { src: "assets/images/furnace-target.png", width: 154, height: 132, yOffset: -8 },
    coil: { src: "assets/images/coil-collector.png", width: 184, height: 120, yOffset: -8 },
    mes: { src: "assets/images/mes-bumper.png", width: 124, height: 118, yOffset: -4 },
    erp: { src: "assets/images/erp-core-bumper.png", width: 126, height: 126, yOffset: -6 },
    co2: { src: "assets/images/green-aluminium-bumper.png", width: 124, height: 110, yOffset: -4 },
    "measurement-left": { src: "assets/images/measurement-target.png", width: 116, height: 116, yOffset: -12 },
    "measurement-right": { src: "assets/images/measurement-target.png", width: 116, height: 116, yOffset: -12 },
    "e-odprema": { src: "assets/images/e-odprema-truck.png", width: 138, height: 116, yOffset: -10 },
    alcad: { src: "assets/images/alcad-marker.png", width: 104, height: 96, yOffset: -8 },
    "flipper-left": { src: "assets/images/flipper-left.png", width: 178, height: 83 },
    "flipper-right": { src: "assets/images/flipper-right.png", width: 178, height: 83 },
    "lamp-post-red": { src: "assets/images/lamp-post-red.png", width: 34, height: 68 },
    "lamp-post-orange": { src: "assets/images/lamp-post-orange.png", width: 34, height: 67 },
    "lamp-post-blue": { src: "assets/images/lamp-post-blue.png", width: 34, height: 67 },
    "lamp-post-green": { src: "assets/images/lamp-post-green.png", width: 34, height: 67 },
    "playfield-floor-texture": { src: "assets/images/playfield-floor-texture.png", width: 900, height: 1374 },
    "table-frame-trim": { src: "assets/images/table-frame-trim.png", width: 900, height: 1344 },
    "drain-apron": { src: "assets/images/drain-apron.png", width: 336, height: 102 },
    "lower-plastic-left": { src: "assets/images/lower-plastic-left.png", width: 204, height: 171 },
    "lower-plastic-right": { src: "assets/images/lower-plastic-right.png", width: 204, height: 169 },
    "left-slingshot": { src: "assets/images/slingshot-left.png", width: 108, height: 115 },
    "right-slingshot": { src: "assets/images/slingshot-right.png", width: 108, height: 115 },
    "shooter-plunger-housing": { src: "assets/images/shooter-plunger-housing.png", width: 54, height: 246 },
    "mechanical-post-blue": { src: "assets/images/mechanical-post-blue.png", width: 32, height: 48 },
    "mechanical-post-orange": { src: "assets/images/mechanical-post-orange.png", width: 32, height: 51 },
    "kosovnica": { src: "assets/images/kosovnica-terminal-target.png", width: 128, height: 160, yOffset: -20 },
    "mission-stage-lamps": { src: "assets/images/mission-stage-lamps.png", width: 282, height: 50 },
    "multiball-lock-release": { src: "assets/images/multiball-lock-release.png", width: 300, height: 134 },
    "jackpot-coil-insert": { src: "assets/images/jackpot-coil-insert.png", width: 116, height: 102 },
    "jackpot-furnace-insert": { src: "assets/images/jackpot-furnace-insert.png", width: 116, height: 102 },
    "jackpot-final-insert": { src: "assets/images/jackpot-final-insert.png", width: 116, height: 102 },
    "decal-arrow-blue": { src: "assets/images/decal-arrow-blue.png", width: 34, height: 32 },
    "decal-arrow-orange": { src: "assets/images/decal-arrow-orange.png", width: 34, height: 32 },
    "decal-coil-route-blue": { src: "assets/images/decal-coil-route-blue.png", width: 126, height: 76 },
    "decal-warning-stripe": { src: "assets/images/decal-warning-stripe.png", width: 126, height: 24 },
    "decal-led-strip": { src: "assets/images/decal-led-strip.png", width: 132, height: 28 },
    "decal-circuit-plate": { src: "assets/images/decal-circuit-plate.png", width: 132, height: 47 },
    "decal-roller-symbol": { src: "assets/images/decal-roller-symbol.png", width: 74, height: 49 },
    "innovation-label-plate": { src: "assets/images/innovation-label-plate.png", width: 232, height: 41 }
  };
  const TABLE_CONFIG = {
    bumpers: [
      { id: "mes", label: "MES", x: 300, y: 392, radius: 56, accent: "#31a8ff", event: "hit:MES", points: SCORING_RULES.values.bumpers.mes },
      { id: "erp", label: "ERP", x: 450, y: 334, radius: 60, accent: "#ff9b3d", event: "hit:ERP", points: SCORING_RULES.values.bumpers.erp },
      { id: "co2", label: "CO2", x: 612, y: 392, radius: 56, accent: "#7bdc6c", event: "hit:GREEN", points: SCORING_RULES.values.bumpers.co2 }
    ],
    targets: [
      { id: "measurement-left", label: "MERILNI", x: 275, y: 592, width: 178, height: 52, accent: "#31a8ff", event: "hit:MEASUREMENT", points: SCORING_RULES.values.targets["measurement-left"] },
      { id: "measurement-right", label: "PROTOKOL", x: 625, y: 592, width: 178, height: 52, accent: "#31a8ff", event: "hit:MEASUREMENT", points: SCORING_RULES.values.targets["measurement-right"] },
      { id: "furnace", label: "FURNACE", x: 450, y: 696, width: 200, height: 56, accent: "#ff9b3d", event: "hit:FURNACE", points: SCORING_RULES.values.targets.furnace },
      { id: "coil", label: "COIL COLLECTOR", x: 450, y: 899, width: 234, height: 58, accent: "#7bdc6c", event: "hit:COIL", points: SCORING_RULES.values.targets.coil },
      { id: "alcad", label: "ALCAD", x: 346, y: 828, width: 104, height: 42, accent: "#9ab3bf", event: "hit:ALCAD", points: SCORING_RULES.values.targets.alcad },
      { id: "e-odprema", label: "E-ODPREMA", x: 646, y: 784, width: 156, height: 48, accent: "#9ab3bf", event: "hit:EODPREMA", points: SCORING_RULES.values.targets["e-odprema"] },
      { id: "kosovnica", label: "KOSOVNICA", x: 450, y: 508, width: 168, height: 34, accent: "#ff9b3d", event: "hit:KOSOVNICA", points: SCORING_RULES.values.targets.kosovnica }
    ],
    slingshots: [
      { id: "left-slingshot", label: "SEVAL", x: 266, y: 1102, width: 100, height: 22, angle: 0.72, visualX: 248, visualY: 1100, visualWidth: 108, visualHeight: 115, visualAngle: 0, accent: "#31a8ff", event: "hit:LEFT_SLINGSHOT", points: SCORING_RULES.values.slingshot, impulse: { x: 6.7, y: -10.2 } },
      { id: "right-slingshot", label: "IMPOL-PC", x: 634, y: 1102, width: 100, height: 22, angle: -0.72, visualX: 652, visualY: 1100, visualWidth: 108, visualHeight: 115, visualAngle: 0, accent: "#31a8ff", event: "hit:RIGHT_SLINGSHOT", points: SCORING_RULES.values.slingshot, impulse: { x: -6.7, y: -10.2 } }
    ],
    rollovers: [
      { id: "rollover-flow", label: "FLOW", x: 348, y: 1008, radius: 22, accent: "#31a8ff", event: "hit:ROLLOVER", points: SCORING_RULES.values.rollover },
      { id: "rollover-alloy", label: "ALLOY", x: 450, y: 986, radius: 22, accent: "#ff9b3d", event: "hit:ROLLOVER", points: SCORING_RULES.values.rollover },
      { id: "rollover-scan", label: "SCAN", x: 552, y: 1008, radius: 22, accent: "#7bdc6c", event: "hit:ROLLOVER", points: SCORING_RULES.values.rollover }
    ],
    lanes: [
      { id: "left-outlane", label: "LEFT OUT", shortLabel: "OUT", side: "left", type: "outlane", x: 142, y: 1214, width: 72, height: 150, angle: -0.42, points: SCORING_RULES.values.outlane, accent: "#ff7567", returnX: 268, returnY: 1168, returnVelocity: { x: 5.8, y: -7.4 } },
      { id: "left-inlane", label: "LEFT RETURN", shortLabel: "IN", side: "left", type: "inlane", x: 286, y: 1200, width: 76, height: 136, angle: 0.54, points: SCORING_RULES.values.inlane, accent: "#31a8ff" },
      { id: "right-inlane", label: "RIGHT RETURN", shortLabel: "IN", side: "right", type: "inlane", x: 614, y: 1200, width: 76, height: 136, angle: -0.54, points: SCORING_RULES.values.inlane, accent: "#31a8ff" },
      { id: "right-outlane", label: "RIGHT OUT", shortLabel: "OUT", side: "right", type: "outlane", x: 758, y: 1214, width: 72, height: 150, angle: 0.42, points: SCORING_RULES.values.outlane, accent: "#ff7567", returnX: 632, returnY: 1168, returnVelocity: { x: -5.8, y: -7.4 } }
    ],
    upperOrbit: UPPER_ORBIT,
    lockHouse: LOCK_HOUSE
  };
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
  const COMPANY_STATUS = {
    ready: { label: "Ready", rank: 0 },
    online: { label: "Online", rank: 1 },
    complete: { label: "Complete", rank: 2 },
    bonus: { label: "Bonus", rank: 3 }
  };
  const COMPANY_CONFIG = [
    {
      id: "impol",
      label: "IMPOL",
      events: ["hit:MEASUREMENT", "hit:MES", "hit:ERP", UPPER_ORBIT.event],
      missions: ["measurement", "mes", "erp"]
    },
    {
      id: "seval",
      label: "SEVAL",
      events: ["hit:LEFT_SLINGSHOT", "hit:EODPREMA"],
      missions: ["eodprema"]
    },
    {
      id: "alcad",
      label: "ALCAD",
      events: ["hit:ALCAD"],
      missions: ["alcad"]
    },
    {
      id: "tlm",
      label: "TLM",
      events: ["hit:GREEN", "hit:FURNACE"],
      missions: ["green", "furnace"]
    },
    {
      id: "impol-pc",
      label: "IMPOL-PC",
      events: ["hit:RIGHT_SLINGSHOT", "hit:COIL"],
      missions: ["coil"]
    },
    {
      id: "rondal",
      label: "RONDAL",
      events: ["hit:SKILL_SHOT", "hit:KOSOVNICA"],
      missions: ["kosovnica"]
    }
  ];
  const COMPANY_BY_EVENT = COMPANY_CONFIG.reduce((companiesByEvent, company) => {
    company.events.forEach((eventName) => {
      companiesByEvent[eventName] = company.id;
    });
    return companiesByEvent;
  }, {});
  const COMPANY_BY_MISSION = COMPANY_CONFIG.reduce((companiesByMission, company) => {
    company.missions.forEach((missionId) => {
      companiesByMission[missionId] = company.id;
    });
    return companiesByMission;
  }, {});
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
  const ui = {
    score: document.getElementById("score-value"),
    ball: document.getElementById("ball-value"),
    ballsLeft: document.getElementById("balls-left-value"),
    multiplier: document.getElementById("multiplier-value"),
    highScore: document.getElementById("high-score-value"),
    restartButton: document.getElementById("restart-button"),
    leftControl: document.getElementById("left-control"),
    rightControl: document.getElementById("right-control"),
    spaceControl: document.getElementById("space-control"),
    audioToggle: document.getElementById("audio-toggle"),
    missionStage: document.getElementById("mission-stage-value"),
    missionNext: document.getElementById("mission-next-value"),
    missionComplete: document.getElementById("mission-complete-value"),
    missionList: document.getElementById("mission-list"),
    missions: {},
    companyList: document.getElementById("company-list"),
    groupReward: document.getElementById("group-reward-value"),
    companies: {},
    statusCopy: document.querySelector(".status-copy"),
    scoreFeed: document.getElementById("score-feed-value"),
    tableScore: document.getElementById("table-score-value"),
    tableBalls: document.getElementById("table-balls-value"),
    tableMission: document.getElementById("table-mission-value")
  };
  const gameState = {
    score: 0,
    ballNumber: 1,
    ballsLeft: TABLE.totalBalls,
    multiplier: 1,
    highScore: loadHighScore(),
    previousHighScore: 0,
    status: "ready",
    resetAt: 0,
    drainCount: 0,
    plungerPower: 0,
    lastEvent: "",
    feedback: "",
    feedbackUntil: 0,
    feedbackPriority: FEEDBACK_PRIORITIES.idle,
    gameOverStartedAt: 0,
    gameOverRestartAt: 0,
    finalScore: 0,
    finalHighScore: 0,
    finalWasRecord: false,
    hitCounts: {},
    hitEffects: [],
    comboCount: 0,
    comboUntil: 0,
    comboLastObjectId: "",
    comboLastZone: "",
    comboTier: "none",
    comboZoneStreak: 0,
    comboObjectHistory: [],
    comboZoneHistory: [],
    scoringRehits: createScoringRehitState(),
    lowerTrapSince: 0,
    upperTrapSince: 0,
    upperTrapBallId: "",
    skillShotAvailableUntil: 0,
    skillShotAwarded: false,
    ballSaveUntil: 0,
    ballSaveUsed: false,
    multiball: createMultiballState(),
    jackpot: createJackpotState(),
    bomMode: {
      active: false,
      step: 0,
      deadline: 0
    },
    rollovers: createRolloverState(),
    lanes: createLaneState(),
    upperOrbit: createUpperOrbitState(),
    lockHouse: createLockHouseState(),
    missionStageIndex: 0,
    activeMissionId: "measurement",
    lastCompletedMissionId: "",
    missions: createMissionState(),
    activeCompanyId: "impol",
    companies: createCompanyState(),
    metaRewards: createMetaRewardState()
  };
  gameState.previousHighScore = gameState.highScore;
  const inputState = {
    left: false,
    right: false,
    leftPulse: false,
    rightPulse: false,
    space: false,
    chargingSince: 0,
    touchPointers: new Map()
  };
  const physicsClock = {
    lastTime: 0,
    accumulator: 0,
    step: 1000 / 60,
    simulationScale: 1.28,
    maxFrameDelta: 1000 / 12,
    maxSteps: 4
  };
  const assets = loadAssets(ASSET_CONFIG);
  const audio = createAudioManager();
  let diagnosticHarness = null;
  let heldLockHouseBallBody = null;
  let lockedLockHouseBallBodies = [];
  let lockHouseReleaseQueue = [];

  function createMissionState() {
    const firstStageMissionIds = new Set(MISSION_STAGES[0]);

    return MISSION_CONFIG.reduce((missions, mission) => {
      missions[mission.id] = {
        progress: 0,
        completed: false,
        unlocked: firstStageMissionIds.has(mission.id),
        lastProgressAt: 0
      };
      return missions;
    }, {});
  }

  function createCompanyState() {
    return COMPANY_CONFIG.reduce((companies, company) => {
      companies[company.id] = {
        status: COMPANY_STATUS.ready.label,
        rank: COMPANY_STATUS.ready.rank,
        detail: COMPANY_STATUS.ready.label,
        lastUpdatedAt: 0
      };
      return companies;
    }, {});
  }

  function createMetaRewardState() {
    return {
      missionsAwarded: false,
      companiesAwarded: false,
      multiplierValue: 1,
      multiplierUntil: 0,
      multiplierRemainingMs: 0,
      lastAwardLabel: ""
    };
  }

  function createMultiballState() {
    return {
      active: false,
      startedAt: 0,
      endedAt: 0,
      graceUntil: 0,
      peakBalls: 1,
      progress: 0,
      starts: 0,
      nextRequirement: MULTIBALL.progressRequirements[0],
      lastStartSource: ""
    };
  }

  function createJackpotState() {
    return {
      active: false,
      litTargetIds: [],
      collectedTargetIds: [],
      superLit: false,
      superCollected: false,
      lastAwardLabel: "",
      lastAwardValue: 0,
      startedAt: 0,
      endedAt: 0
    };
  }

  function createScoringRehitState() {
    return {
      objectLastHitAt: {},
      ballObjectLastHitAt: {},
      suppressedCounts: {},
      lastSuppressedAt: 0,
      lastSuppressedObjectId: "",
      lastSuppressedReason: ""
    };
  }

  function createRolloverState() {
    return {
      lit: TABLE_CONFIG.rollovers.reduce((lit, rollover) => {
        lit[rollover.id] = false;
        return lit;
      }, {}),
      completedSets: 0,
      lastCompletedAt: 0
    };
  }

  function createLaneState() {
    return {
      lit: TABLE_CONFIG.lanes.reduce((lit, lane) => {
        lit[lane.id] = false;
        return lit;
      }, {}),
      lastHitAt: TABLE_CONFIG.lanes.reduce((hitTimes, lane) => {
        hitTimes[lane.id] = 0;
        return hitTimes;
      }, {}),
      completedSets: 0,
      lastCompletedAt: 0,
      sideShieldUntil: 0,
      sideShieldUsed: false,
      sideShieldOpenedAt: 0,
      sideShieldOpenReason: ""
    };
  }

  function createUpperOrbitState() {
    return {
      active: false,
      stage: "idle",
      ballId: "",
      startedAt: 0,
      completedRuns: 0,
      lastCompletedAt: 0,
      lastAward: 0,
      lastFailedAt: 0,
      lastFailureReason: ""
    };
  }

  function createLockHouseState() {
    return {
      state: LOCK_HOUSE.initialState,
      progress: LOCK_HOUSE.qualificationEvents.reduce((progress, requirement) => {
        progress[requirement.id] = 0;
        return progress;
      }, {}),
      qualifiedAt: 0,
      lastProgressAt: 0,
      lastProgressEvent: "",
      lastContactAt: 0,
      lastContactState: "",
      contactCount: 0,
      captureEnabled: LOCK_HOUSE.captureEnabled,
      heldBallId: "",
      holdStartedAt: 0,
      holdPosition: null,
      lockedBallIds: [],
      lockedCount: 0,
      lockMultiballStartedAt: 0,
      nextReleaseAt: 0,
      releaseCount: 0,
      recoveryReason: "",
      recoveryAt: 0,
      lastRewardAt: 0,
      lastRewardValue: 0,
      kickoutStartedAt: 0,
      lastKickoutAt: 0,
      kickoutCount: 0,
      recaptureDisabledUntil: 0,
      requalificationLevel: 0,
      captureCount: 0,
      blockedCaptureCount: 0,
      lastCaptureBlockedReason: ""
    };
  }

  function renderMissionList() {
    ui.missionList.innerHTML = "";
    ui.missions = {};

    MISSION_CONFIG.forEach((mission) => {
      const row = document.createElement("li");
      row.id = `mission-${mission.id}`;

      const label = document.createElement("span");
      label.textContent = mission.label;

      const progress = document.createElement("strong");
      progress.id = `mission-${mission.id}-progress`;
      progress.textContent = `0/${mission.required}`;

      row.append(label, progress);
      ui.missionList.append(row);
      ui.missions[mission.id] = { row, progress };
    });
  }

  function renderCompanyList() {
    ui.companyList.innerHTML = "";
    ui.companies = {};

    COMPANY_CONFIG.forEach((company) => {
      const row = document.createElement("li");
      row.id = `company-${company.id}`;

      const label = document.createElement("span");
      label.textContent = company.label;

      const status = document.createElement("strong");
      status.id = `company-${company.id}-status`;
      status.textContent = COMPANY_STATUS.ready.label;

      row.append(label, status);
      ui.companyList.append(row);
      ui.companies[company.id] = { row, status };
    });
  }

  function getHudMissions(limit = 5) {
    const activeStageMissionIds = new Set(MISSION_STAGES[gameState.missionStageIndex] || []);
    const nextStageMissionIds = new Set(MISSION_STAGES[gameState.missionStageIndex + 1] || []);
    const active = MISSION_CONFIG.filter((mission) => activeStageMissionIds.has(mission.id) && !gameState.missions[mission.id].completed);
    const progressing = MISSION_CONFIG.filter((mission) => {
      const state = gameState.missions[mission.id];
      return !activeStageMissionIds.has(mission.id) && state.unlocked && state.progress > 0 && !state.completed;
    });
    const next = MISSION_CONFIG.filter((mission) => {
      const state = gameState.missions[mission.id];
      return nextStageMissionIds.has(mission.id) && !state.unlocked && !state.completed;
    });
    const completed = MISSION_CONFIG.filter((mission) => gameState.missions[mission.id].completed);

    return [...active, ...progressing, ...next, ...completed].slice(0, limit);
  }

  function getMissionById(id) {
    return MISSION_CONFIG.find((mission) => mission.id === id);
  }

  function getMissionTargetLabel(mission) {
    return mission?.shotLabel || MISSION_TARGET_LABELS[mission?.event] || mission?.label || "TARGET";
  }

  function getActiveMission() {
    return getMissionById(gameState.activeMissionId);
  }

  function getMissionStageNumber(missionId) {
    const index = MISSION_STAGES.findIndex((stage) => stage.includes(missionId));
    return index >= 0 ? index + 1 : 0;
  }

  function getObjectiveCopy() {
    if (areAllRequiredMissionsComplete()) {
      return "ALL MISSIONS COMPLETE: BUILD COMPANY BONUS";
    }

    const mission = getActiveMission();
    const state = mission ? gameState.missions[mission.id] : null;

    if (!mission || !state) {
      return "FOLLOW STAGED MISSIONS";
    }

    return `HIT ${getMissionTargetLabel(mission)} ${state.progress}/${mission.required}`;
  }

  function getLockHouseProgressTotal() {
    return LOCK_HOUSE.qualificationEvents.reduce((total, requirement) => total + requirement.required, 0);
  }

  function getLockHouseProgressCount() {
    return LOCK_HOUSE.qualificationEvents.reduce((total, requirement) => {
      return total + Math.min(requirement.required, gameState.lockHouse.progress[requirement.id] || 0);
    }, 0);
  }

  function isLockHouseQualified() {
    return LOCK_HOUSE.qualificationEvents.every((requirement) => {
      return (gameState.lockHouse.progress[requirement.id] || 0) >= requirement.required;
    });
  }

  function getLockHouseProgressLabel() {
    const progress = getLockHouseProgressCount();
    const total = getLockHouseProgressTotal();
    const lockedCount = gameState.lockHouse.lockedCount || 0;

    if (gameState.multiball.active && gameState.multiball.lastStartSource === LOCK_HOUSE.label) {
      return "LOCK HOUSE MULTIBALL";
    }

    if (gameState.lockHouse.state === "holding") {
      return gameState.lockHouse.heldBallId ? `LOCK HOUSE HOLDING ${gameState.lockHouse.heldBallId}` : "LOCK HOUSE HOLDING";
    }

    if (gameState.lockHouse.state === "kicking") {
      return "LOCK HOUSE KICKOUT";
    }

    if (isLockHouseQualified()) {
      return `LOCK HOUSE READY ${lockedCount}/${LOCK_HOUSE.maxLockedBalls}`;
    }

    const nextRequirement = LOCK_HOUSE.qualificationEvents.find((requirement) => {
      return (gameState.lockHouse.progress[requirement.id] || 0) < requirement.required;
    });

    return `LOCK HOUSE ${lockedCount}/${LOCK_HOUSE.maxLockedBalls} LOCKED ${progress}/${total}${nextRequirement ? `: ${nextRequirement.label}` : ""}`;
  }

  function getLockHousePresentation() {
    const state = gameState.lockHouse.state;
    const presentation = LOCK_HOUSE_PRESENTATION[state] || LOCK_HOUSE_PRESENTATION.closed;

    return {
      state,
      label: presentation.label,
      color: presentation.color,
      entranceOpen: isLockHouseEntranceOpen(),
      progressLabel: getLockHouseProgressLabel(),
      requirementLabel: getLockHouseRequirementLabel(),
      lockedCount: gameState.lockHouse.lockedCount || 0,
      maxLockedBalls: LOCK_HOUSE.maxLockedBalls
    };
  }

  function isLockHouseEntranceOpen() {
    const state = gameState.lockHouse;
    return Boolean(
      state.captureEnabled &&
      !gameState.multiball.active &&
      (state.lockedCount || 0) < LOCK_HOUSE.maxLockedBalls &&
      performance.now() >= state.recaptureDisabledUntil &&
      (state.state === "qualified" || state.state === "open") &&
      isLockHouseQualified()
    );
  }

  function clearLockHouseQualificationProgress() {
    LOCK_HOUSE.qualificationEvents.forEach((requirement) => {
      gameState.lockHouse.progress[requirement.id] = 0;
    });
    gameState.lockHouse.qualifiedAt = 0;
  }

  function getLockHouseRequirementLabel() {
    const level = gameState.lockHouse.requalificationLevel || 0;
    if (level <= 0) {
      return "ALU FLOW + COIL";
    }

    return `ALU FLOW + COIL LOOP ${level + 1}`;
  }

  function advanceLockHouseQualification(eventName, ball) {
    if (
      gameState.status !== "playing" ||
      gameState.multiball.active ||
      (gameState.lockHouse.lockedCount || 0) >= LOCK_HOUSE.maxLockedBalls ||
      isLockHouseQualified()
    ) {
      return false;
    }

    const requirement = LOCK_HOUSE.qualificationEvents.find((candidate) => candidate.event === eventName);

    if (!requirement) {
      return false;
    }

    const current = gameState.lockHouse.progress[requirement.id] || 0;

    if (current >= requirement.required) {
      return false;
    }

    const now = performance.now();
    gameState.lockHouse.progress[requirement.id] = current + 1;
    gameState.lockHouse.lastProgressAt = now;
    gameState.lockHouse.lastProgressEvent = eventName;
    gameState.hitCounts[`${LOCK_HOUSE.id}-${requirement.id}`] = now;
    recordDiagnosticEvent("lock-house-progress", {
      ball,
      eventName,
      objectId: LOCK_HOUSE.id,
      label: requirement.label,
      kind: getLockHouseProgressLabel()
    });

    if (isLockHouseQualified()) {
      gameState.lockHouse.state = "qualified";
      gameState.lockHouse.qualifiedAt = now;
      setFeedback("LOCK HOUSE QUALIFIED", 1300, "progress", now);
      addHitFeedback({
        id: LOCK_HOUSE.id,
        x: LOCK_HOUSE.mouth.x,
        y: LOCK_HOUSE.mouth.y,
        accent: LOCK_HOUSE.qualifiedAccent,
        label: "LOCK READY",
        color: "#7bdc6c"
      });
      audio.play("lock-house-opening");
    } else {
      setFeedback(getLockHouseProgressLabel(), 950, "progress", now);
    }

    return true;
  }

  function isCurrentMissionEvent(eventName) {
    const mission = getActiveMission();
    const state = mission ? gameState.missions[mission.id] : null;
    return Boolean(mission && state && state.unlocked && !state.completed && mission.event === eventName);
  }

  function getProgressionCueForEvent(eventName) {
    if (eventName === "hit:ERP" && gameState.activeMissionId === "erp") {
      return "USE ALU FLOW ORBIT";
    }

    const mission = MISSION_CONFIG.find((candidate) => candidate.event === eventName && !gameState.missions[candidate.id].completed);
    const state = mission ? gameState.missions[mission.id] : null;

    if (!mission || !state || mission.id === gameState.activeMissionId) {
      return "";
    }

    if (!state.unlocked) {
      return `LOCKED STAGE ${getMissionStageNumber(mission.id)}`;
    }

    return `QUEUE ${mission.label}`;
  }

  function formatMissionNames(missionIds) {
    return missionIds
      .map((id) => getMissionById(id))
      .filter(Boolean)
      .map((mission) => mission.label)
      .join(" / ");
  }

  function getFirstIncompleteUnlockedMissionId() {
    const currentStageMissionIds = MISSION_STAGES[gameState.missionStageIndex] || [];
    const currentMissionId = currentStageMissionIds.find((id) => {
      const state = gameState.missions[id];
      return state && state.unlocked && !state.completed;
    });

    if (currentMissionId) {
      return currentMissionId;
    }

    const fallback = MISSION_CONFIG.find((mission) => {
      const state = gameState.missions[mission.id];
      return state.unlocked && !state.completed;
    });

    return fallback ? fallback.id : gameState.activeMissionId;
  }

  function setActiveMissionFromStage() {
    gameState.activeMissionId = getFirstIncompleteUnlockedMissionId();
  }

  function getCompanyById(id) {
    return COMPANY_CONFIG.find((company) => company.id === id);
  }

  function setCompanyStatus(companyId, statusKey, detail) {
    const company = getCompanyById(companyId);
    const status = COMPANY_STATUS[statusKey];
    const state = gameState.companies[companyId];

    if (gameState.multiball.active) {
      return false;
    }

    if (!company || !status || !state || status.rank < state.rank) {
      return false;
    }

    state.status = status.label;
    state.rank = status.rank;
    state.detail = detail || status.label;
    state.lastUpdatedAt = performance.now();
    gameState.activeCompanyId = companyId;
    maybeAwardCompanyMetaReward();
    return true;
  }

  function focusCompany(companyId) {
    if (companyId && gameState.companies[companyId]) {
      gameState.activeCompanyId = companyId;
    }
  }

  function updateCompanyForEvent(eventName) {
    const companyId = COMPANY_BY_EVENT[eventName];

    if (!companyId) {
      return;
    }

    focusCompany(companyId);
  }

  function updateCompanyForMissionProgress(mission) {
    const companyId = COMPANY_BY_MISSION[mission.id];
    const company = getCompanyById(companyId);

    if (!companyId || !company) {
      return;
    }

    const state = gameState.missions[mission.id];
    const completedCount = company.missions.filter((missionId) => gameState.missions[missionId].completed).length;
    const missionProgress = `${getMissionTargetLabel(mission)} ${state.progress}/${mission.required}`;
    const detail =
      company.missions.length > 1
        ? `${completedCount}/${company.missions.length} - ${missionProgress}`
        : missionProgress;

    setCompanyStatus(companyId, "online", detail);
  }

  function updateCompanyForMissionComplete(mission) {
    const companyId = COMPANY_BY_MISSION[mission.id];
    const company = getCompanyById(companyId);

    if (!companyId || !company) {
      return;
    }

    const completedCount = company.missions.filter((missionId) => gameState.missions[missionId].completed).length;
    const isCompanyComplete = completedCount === company.missions.length;
    setCompanyStatus(
      companyId,
      isCompanyComplete ? "complete" : "online",
      isCompanyComplete ? "Complete - combo bonus lit" : `${completedCount}/${company.missions.length} Complete`
    );
  }

  function updateCompanyForCombo(object, combo) {
    if (!combo.bonus || combo.count < 4) {
      return;
    }

    const companyId = COMPANY_BY_EVENT[object.event];
    const company = getCompanyById(companyId);

    if (company && company.missions.every((missionId) => gameState.missions[missionId].completed)) {
      setCompanyStatus(companyId, "bonus", "Bonus");
    }
  }

  function getCompletedMissionCount() {
    return MISSION_CONFIG.filter((mission) => gameState.missions[mission.id].completed).length;
  }

  function getBonusCompanyCount() {
    return COMPANY_CONFIG.filter((company) => gameState.companies[company.id].rank >= COMPANY_STATUS.bonus.rank).length;
  }

  function getScoreBandStatus(total, band) {
    if (total < band.min) {
      return "below";
    }

    if (total > band.max) {
      return "above";
    }

    return "in-band";
  }

  function sumScoreParts(parts) {
    return Object.values(parts).reduce((total, value) => total + value, 0);
  }

  function getScoreEconomySamples() {
    const values = SCORING_RULES.values;
    const beginnerParts = {
      skillShot: values.skillShot,
      passiveContacts: values.slingshot * 10 + values.rollover * 6 + values.inlane * 4 + values.outlane * 2,
      setBonuses: values.rolloverSet + values.laneSet,
      routes: values.upperOrbit * 3,
      intentionalTargets: values.targets["measurement-left"] * 3 + values.bumpers.mes * 5,
      missionCompletion: values.missions.measurement + values.missions.mes
    };
    const competentParts = {
      skillShot: values.skillShot,
      passiveContacts: values.slingshot * 18 + values.rollover * 10 + values.inlane * 8 + values.outlane * 3,
      setBonuses: values.rolloverSet * 2 + values.laneSet,
      routes: values.upperOrbit * 8,
      intentionalTargets:
        values.targets["measurement-left"] * 3 +
        values.bumpers.mes * 5 +
        values.bumpers.erp * 3 +
        values.bumpers.co2 * 4 +
        values.targets.coil * 3 +
        values.targets.furnace * 2 +
        values.targets.alcad * 2,
      missionCompletion:
        values.missions.measurement +
        values.missions.mes +
        values.missions.erp +
        values.missions.green +
        values.missions.coil,
      comboBonuses: values.comboByCount[2] * 5 + values.comboByCount[3] * 4 + values.comboByCount[4] * 2,
      jackpots: values.jackpotNormal * 2
    };
    const strongParts = {
      skillShot: values.skillShot,
      passiveContacts: values.slingshot * 28 + values.rollover * 16 + values.inlane * 12 + values.outlane * 4,
      setBonuses: values.rolloverSet * 3 + values.laneSet * 2,
      routes: values.upperOrbit * 12,
      intentionalTargets:
        values.targets["measurement-left"] * 3 +
        values.bumpers.mes * 5 +
        values.bumpers.erp * 3 +
        values.bumpers.co2 * 4 +
        values.targets.coil * 3 +
        values.targets["e-odprema"] * 2 +
        values.targets.alcad * 2 +
        values.targets.furnace * 3 +
        values.targets.kosovnica * 2,
      missionCompletion: Object.values(values.missions).reduce((total, bonus) => total + bonus, 0),
      comboBonuses: values.comboByCount[3] * 4 + values.comboByCount[4] * 4 + values.comboByCount[5] * 3 + values.comboMediumSix * 2 + values.comboMax * 2,
      jackpots: (values.jackpotNormal * 2 + values.jackpotSuper) * MULTIBALL.multiplier,
      metaRewards: values.metaMissions
    };
    const sampleDefinitions = [
      { id: "beginner", label: "Beginner three-ball", band: SCORING_RULES.targetBands.beginner, parts: beginnerParts },
      { id: "competent", label: "Competent three-ball", band: SCORING_RULES.targetBands.competent, parts: competentParts },
      { id: "strong", label: "Strong mission/multiball game", band: SCORING_RULES.targetBands.strong, parts: strongParts }
    ];

    return sampleDefinitions.map((sample) => {
      const total = sumScoreParts(sample.parts);
      const passiveShare = sample.parts.passiveContacts / total;

      return {
        ...sample,
        total,
        passiveShare: Number(passiveShare.toFixed(3)),
        status: getScoreBandStatus(total, sample.band)
      };
    });
  }

  function getScoreEconomyReport() {
    const samples = getScoreEconomySamples();

    return {
      version: SCORING_RULES.version,
      highScorePolicy: SCORING_RULES.highScorePolicy,
      highScoreKey: SCORING_RULES.highScoreKey,
      legacyHighScoreKey: SCORING_RULES.legacyHighScoreKey,
      legacyHighScore: loadLegacyHighScore(),
      currentHighScore: gameState.highScore,
      targetBands: SCORING_RULES.targetBands,
      values: SCORING_RULES.values,
      checks: {
        orbitAboveOrdinaryTarget: UPPER_ORBIT.points > Math.max(...Object.values(SCORING_RULES.values.targets)),
        jackpotsLargestRepeatable: JACKPOT.normalValue > UPPER_ORBIT.points && JACKPOT.superValue > JACKPOT.normalValue,
        passiveContactsBelowRoutes: Math.max(SCORING_RULES.values.slingshot, SCORING_RULES.values.rollover, SCORING_RULES.values.inlane, SCORING_RULES.values.outlane) < UPPER_ORBIT.points,
        samplesInBands: samples.every((sample) => sample.status === "in-band"),
        passiveShareUnderTwentyPercent: samples.every((sample) => sample.passiveShare < 0.2)
      },
      samples
    };
  }

  function getProgressionReport() {
    return {
      phase: "14.3.5",
      objective: getObjectiveCopy(),
      missionCompletion: `${getCompletedMissionCount()}/${MISSION_CONFIG.length}`,
      companyBonusCompletion: `${getBonusCompanyCount()}/${COMPANY_CONFIG.length}`,
      activeMissionId: gameState.activeMissionId,
      activeCompanyId: gameState.activeCompanyId,
      companyRules: {
        incidentalContactsUpgradeCompany: false,
        onlineRequiresMissionProgress: true,
        completeRequiresCompanyMissionsComplete: true,
        bonusRequiresCompanyCompleteAndControlledCombo: true,
        multiballPausesMissionAndCompanyProgress: true
      },
      missions: MISSION_CONFIG.map((mission) => {
        const state = gameState.missions[mission.id];
        return {
          id: mission.id,
          label: mission.label,
          event: mission.event,
          target: getMissionTargetLabel(mission),
          required: mission.required,
          stage: getMissionStageNumber(mission.id),
          progress: state.progress,
          unlocked: state.unlocked,
          completed: state.completed
        };
      }),
      companies: COMPANY_CONFIG.map((company) => ({
        id: company.id,
        label: company.label,
        status: gameState.companies[company.id].status,
        detail: gameState.companies[company.id].detail,
        missions: [...company.missions]
      }))
    };
  }

  function areAllRequiredMissionsComplete() {
    return getCompletedMissionCount() === MISSION_CONFIG.length;
  }

  function areAllCompaniesBonus() {
    return getBonusCompanyCount() === COMPANY_CONFIG.length;
  }

  function getActiveMultiplier() {
    if (gameState.multiball.active) {
      return MULTIBALL.multiplier;
    }

    const metaMultiplier = getMetaMultiplierRemainingMs() > 0 ? gameState.metaRewards.multiplierValue : 1;
    return Math.max(gameState.multiplier, metaMultiplier);
  }

  function getMetaMultiplierRemainingMs() {
    if (gameState.metaRewards.multiplierUntil) {
      return Math.max(0, gameState.metaRewards.multiplierUntil - performance.now());
    }

    return Math.max(0, gameState.metaRewards.multiplierRemainingMs);
  }

  function extendBallSave(duration) {
    const now = performance.now();
    gameState.ballSaveUsed = false;
    gameState.ballSaveUntil = Math.max(gameState.ballSaveUntil, now) + duration;
  }

  function activateMetaMultiplier(reward) {
    const now = performance.now();
    gameState.metaRewards.multiplierValue = Math.max(gameState.metaRewards.multiplierValue, reward.multiplier);
    gameState.metaRewards.multiplierRemainingMs = getMetaMultiplierRemainingMs() + reward.duration;
    gameState.metaRewards.multiplierUntil = gameState.status === "playing" ? now + gameState.metaRewards.multiplierRemainingMs : 0;
  }

  function awardMetaReward(reward, rewardKey) {
    const bonus = reward.bonus * getActiveMultiplier();
    gameState.score += bonus;
    gameState.metaRewards.lastAwardLabel = reward.label;
    activateMetaMultiplier(reward);
    extendBallSave(reward.ballSaveExtension);
    setHighScore(gameState.score);
    setFeedback(`${reward.label} +${bonus.toLocaleString("sl-SI")}`, 1900, "meta");
    addHitFeedback({
      id: `meta-${rewardKey}`,
      x: 450,
      y: rewardKey === "companies" ? 860 : 812,
      accent: reward.color,
      label: `${reward.multiplier}x ${reward.label}`,
      color: reward.color
    });
    startMultiball(reward.label);
    audio.play("multiball-start");
  }

  function maybeAwardMissionMetaReward() {
    if (gameState.metaRewards.missionsAwarded || !areAllRequiredMissionsComplete()) {
      return;
    }

    gameState.metaRewards.missionsAwarded = true;
    awardMetaReward(META_REWARDS.missions, "missions");
  }

  function maybeAwardCompanyMetaReward() {
    if (!gameState || !gameState.metaRewards || gameState.metaRewards.companiesAwarded || !areAllCompaniesBonus()) {
      return;
    }

    gameState.metaRewards.companiesAwarded = true;
    awardMetaReward(META_REWARDS.companies, "companies");
  }

  function loadAssets(config) {
    return Object.entries(config).reduce((loadedAssets, [id, asset]) => {
      const image = new Image();
      image.src = asset.src;
      loadedAssets[id] = {
        ...asset,
        image,
        loaded: false
      };
      image.addEventListener("load", () => {
        loadedAssets[id].loaded = true;
      });
      return loadedAssets;
    }, {});
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

  function saveHighScore() {
    try {
      window.localStorage.setItem(SCORING_RULES.highScoreKey, String(gameState.highScore));
    } catch (_error) {
      // Keep the game playable if browser storage is unavailable.
    }
  }

  function separateLegacyHighScore() {
    const legacyScore = window.localStorage.getItem(HIGH_SCORE_BASE_KEY);

    if (legacyScore !== null && window.localStorage.getItem(SCORING_RULES.legacyHighScoreKey) === null) {
      window.localStorage.setItem(SCORING_RULES.legacyHighScoreKey, legacyScore);
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

    function play(effectName, options = {}) {
      const throttles = {
        flipper: 55,
        bumper: 65,
        target: 55,
        launch: 120,
        drain: 350,
        reset: 350,
        "skill-shot": 500,
        combo: 180,
        "mission-progress": 220,
        "mission-complete": 650,
        multiplier: 650,
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
      } else if (effectName === "skill-shot") {
        playTone({ frequency: 680, endFrequency: 1020, duration: 0.11, type: "triangle", volume: 0.052 });
        playTone({ frequency: 1020, endFrequency: 1360, duration: 0.12, type: "sine", volume: 0.04, startOffset: 0.08 });
        playNoise({ duration: 0.055, volume: 0.018, filterFrequency: 2400, startOffset: 0.02 });
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

  function unlockAudio() {
    audio.unlock();
    updateAudioUi();
    syncInspectableState(physics);
  }

  function toggleAudioMute() {
    audio.unlock();
    audio.setMuted(!audio.isMuted);
    updateAudioUi();
    syncInspectableState(physics);
  }

  function updateAudioUi() {
    if (!ui.audioToggle) {
      return;
    }

    const enabled = audio.isAvailable && !audio.isMuted;
    ui.audioToggle.textContent = enabled ? "Sound On" : "Sound Off";
    ui.audioToggle.setAttribute("aria-pressed", String(enabled));
    ui.audioToggle.classList.toggle("is-enabled", enabled);
  }

  function setHighScore(candidate) {
    if (candidate <= gameState.highScore) {
      return;
    }

    gameState.highScore = candidate;
    saveHighScore();
  }

  function roundedRect(x, y, width, height, radius) {
    context.beginPath();
    context.moveTo(x + radius, y);
    context.lineTo(x + width - radius, y);
    context.quadraticCurveTo(x + width, y, x + width, y + radius);
    context.lineTo(x + width, y + height - radius);
    context.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
    context.lineTo(x + radius, y + height);
    context.quadraticCurveTo(x, y + height, x, y + height - radius);
    context.lineTo(x, y + radius);
    context.quadraticCurveTo(x, y, x + radius, y);
    context.closePath();
  }

  function fillRoundedRect(x, y, width, height, radius, fillStyle) {
    roundedRect(x, y, width, height, radius);
    context.fillStyle = fillStyle;
    context.fill();
  }

  function strokeRoundedRect(x, y, width, height, radius, strokeStyle, lineWidth) {
    roundedRect(x, y, width, height, radius);
    context.strokeStyle = strokeStyle;
    context.lineWidth = lineWidth;
    context.stroke();
  }

  function drawLabel(text, x, y, color, size) {
    context.fillStyle = color;
    context.font = `800 ${size}px Arial, Helvetica, sans-serif`;
    context.textAlign = "center";
    context.textBaseline = "middle";
    context.fillText(text, x, y);
  }

  function drawBumper(x, y, radius, label, accent, isLit) {
    const glow = context.createRadialGradient(x, y, 8, x, y, radius + 24);
    glow.addColorStop(0, isLit ? `${accent}ff` : `${accent}cc`);
    glow.addColorStop(1, "rgba(0, 0, 0, 0)");
    context.fillStyle = glow;
    context.beginPath();
    context.arc(x, y, radius + 24, 0, Math.PI * 2);
    context.fill();

    context.fillStyle = "#163343";
    context.beginPath();
    context.arc(x, y, radius, 0, Math.PI * 2);
    context.fill();

    context.lineWidth = isLit ? 14 : 10;
    context.strokeStyle = accent;
    context.stroke();

    context.lineWidth = 3;
    context.strokeStyle = "#d9edf5";
    context.beginPath();
    context.arc(x, y, radius - 13, 0, Math.PI * 2);
    context.stroke();

    drawLabel(label, x, y + 3, "#edf7fb", 24);
  }

  function drawTarget(x, y, width, height, label, accent, isLit) {
    fillRoundedRect(x, y, width, height, 12, isLit ? "rgba(23, 61, 79, 0.96)" : "#102736");
    strokeRoundedRect(x, y, width, height, 12, isLit ? "#edf7fb" : accent, isLit ? 5 : 4);
    drawLabel(label, x + width / 2, y + height / 2 + 1, "#edf7fb", label.length > 10 ? 18 : 20);
  }

  function drawAssetMount(x, y, width, height, accent, isLit) {
    const baseY = y + height * 0.28;
    const baseWidth = Math.max(width * 0.72, 88);
    const baseHeight = Math.max(height * 0.26, 26);

    context.save();
    context.fillStyle = "rgba(0, 0, 0, 0.2)";
    context.beginPath();
    context.ellipse(x, baseY + 12, baseWidth * 0.58, baseHeight * 0.58, 0, 0, Math.PI * 2);
    context.fill();

    const baseGradient = context.createLinearGradient(x, baseY - baseHeight / 2, x, baseY + baseHeight / 2);
    baseGradient.addColorStop(0, "rgba(126, 147, 156, 0.24)");
    baseGradient.addColorStop(0.5, "rgba(16, 39, 54, 0.58)");
    baseGradient.addColorStop(1, "rgba(5, 11, 16, 0.68)");
    context.fillStyle = baseGradient;
    context.beginPath();
    context.ellipse(x, baseY, baseWidth / 2, baseHeight / 2, 0, 0, Math.PI * 2);
    context.fill();

    context.strokeStyle = isLit ? "rgba(237, 247, 251, 0.86)" : "rgba(126, 147, 156, 0.32)";
    context.lineWidth = isLit ? 4 : 2;
    context.stroke();

    context.strokeStyle = isLit ? accent : `${accent}42`;
    context.lineWidth = isLit ? 4 : 2;
    context.beginPath();
    context.ellipse(x, baseY - 1, baseWidth * 0.42, baseHeight * 0.28, 0, 0, Math.PI);
    context.stroke();

    const boltY = baseY + baseHeight * 0.08;
    [-0.36, 0.36].forEach((offset) => {
      context.fillStyle = "#9ab3bf";
      context.beginPath();
      context.arc(x + baseWidth * offset, boltY, 4, 0, Math.PI * 2);
      context.fill();
      context.fillStyle = isLit ? accent : "rgba(49, 168, 255, 0.72)";
      context.beginPath();
      context.arc(x + baseWidth * offset, boltY, 2, 0, Math.PI * 2);
      context.fill();
    });

    context.restore();
  }

  function drawAsset(id, x, y, fallbackWidth, fallbackHeight) {
    const asset = assets[id];

    if (!asset || !asset.loaded) {
      return false;
    }

    const width = asset.width || fallbackWidth;
    const height = asset.height || fallbackHeight;
    const drawX = x - width / 2;
    const drawY = y - height / 2 + (asset.yOffset || 0);

    context.save();
    context.shadowColor = "rgba(0, 0, 0, 0.46)";
    context.shadowBlur = 14;
    context.shadowOffsetY = 8;
    context.drawImage(asset.image, drawX, drawY, width, height);
    context.restore();

    return true;
  }

  function isAssetReady(id) {
    return Boolean(assets[id]?.loaded);
  }

  function drawDecorAsset(id, x, y, width, height, options = {}) {
    const asset = assets[id];

    if (!asset || !asset.loaded) {
      return false;
    }

    const drawWidth = width || asset.width || asset.image.width;
    const drawHeight = height || asset.height || asset.image.height;

    context.save();
    context.globalAlpha = options.alpha ?? 1;
    context.shadowColor = options.shadowColor || "rgba(0, 0, 0, 0.38)";
    context.shadowBlur = options.shadowBlur ?? 12;
    context.shadowOffsetY = options.shadowOffsetY ?? 6;
    context.translate(x, y);

    if (options.rotation) {
      context.rotate(options.rotation);
    }

    if (options.flipX) {
      context.scale(-1, 1);
      context.drawImage(asset.image, -drawWidth / 2, -drawHeight / 2, drawWidth, drawHeight);
    } else {
      context.drawImage(asset.image, -drawWidth / 2, -drawHeight / 2, drawWidth, drawHeight);
    }

    context.restore();
    return true;
  }

  function drawHitHalo(x, y, width, height, accent) {
    const radius = Math.max(width, height) * 0.42;
    const gradient = context.createRadialGradient(x, y, 8, x, y, radius);
    gradient.addColorStop(0, `${accent}88`);
    gradient.addColorStop(0.46, `${accent}36`);
    gradient.addColorStop(1, "rgba(0, 0, 0, 0)");

    context.save();
    context.fillStyle = gradient;
    context.beginPath();
    context.ellipse(x, y, Math.max(width * 0.58, 48), Math.max(height * 0.78, 34), 0, 0, Math.PI * 2);
    context.fill();
    context.restore();
  }

  function drawConfiguredBumpers() {
    TABLE_CONFIG.bumpers.forEach((bumper) => {
      const isLit = wasRecentlyHit(bumper.id) || isCurrentMissionEvent(bumper.event);
      const asset = assets[bumper.id];
      const assetReady = asset?.loaded;

      if (assetReady) {
        drawAssetMount(
          bumper.x,
          bumper.y + (asset.yOffset || 0),
          asset.width || bumper.radius * 2.2,
          asset.height || bumper.radius * 2.2,
          bumper.accent,
          isLit
        );
      }

      const drewAsset = drawAsset(bumper.id, bumper.x, bumper.y, bumper.radius * 2.2, bumper.radius * 2.2);

      if (!drewAsset) {
        drawBumper(bumper.x, bumper.y, bumper.radius, bumper.label, bumper.accent, isLit);
      }

      if (isLit) {
        context.strokeStyle = "#edf7fb";
        context.lineWidth = 5;
        context.beginPath();
        context.arc(bumper.x, bumper.y, bumper.radius + 8, 0, Math.PI * 2);
        context.stroke();
      }
    });
  }

  function drawConfiguredTargets() {
    TABLE_CONFIG.targets.forEach((target) => {
      const isLit = wasRecentlyHit(target.id) || isCurrentMissionEvent(target.event);
      const asset = assets[target.id];
      const assetReady = asset?.loaded;

      if (assetReady) {
        drawAssetMount(
          target.x,
          target.y + (asset.yOffset || 0),
          asset.width || target.width,
          asset.height || target.height,
          target.accent,
          isLit
        );
      }

      if (isLit && assetReady) {
        drawHitHalo(target.x, target.y, target.width, target.height, target.accent);
      }

      const drewAsset = drawAsset(target.id, target.x, target.y, target.width, target.height);

      if (!drewAsset) {
        drawTarget(
          target.x - target.width / 2,
          target.y - target.height / 2,
          target.width,
          target.height,
          target.label,
          target.accent,
          isLit
        );
      }
    });
  }

  function drawConfiguredSlingshots() {
    TABLE_CONFIG.slingshots.forEach((slingshot) => {
      const isLit = wasRecentlyHit(slingshot.id);
      const assetReady = assets[slingshot.id]?.loaded;

      if (isLit) {
        drawHitHalo(
          slingshot.visualX,
          slingshot.visualY,
          slingshot.visualWidth,
          slingshot.visualHeight,
          slingshot.accent
        );
      }

      if (assetReady) {
        drawDecorAsset(slingshot.id, slingshot.visualX, slingshot.visualY, slingshot.visualWidth, slingshot.visualHeight, {
          rotation: slingshot.visualAngle,
          shadowBlur: isLit ? 20 : 12,
          shadowColor: isLit ? "rgba(49, 168, 255, 0.42)" : "rgba(0, 0, 0, 0.38)"
        });
        return;
      }

      context.save();
      context.translate(slingshot.x, slingshot.y);
      context.rotate(slingshot.angle);
      fillRoundedRect(
        -slingshot.width / 2,
        -slingshot.height / 2,
        slingshot.width,
        slingshot.height,
        12,
        isLit ? "rgba(49, 168, 255, 0.72)" : "rgba(126, 147, 156, 0.52)"
      );
      context.restore();
    });
  }

  function drawConfiguredRollovers() {
    TABLE_CONFIG.rollovers.forEach((rollover) => {
      const isLit = Boolean(gameState.rollovers.lit[rollover.id]);
      const wasHit = wasRecentlyHit(rollover.id);
      const pulse = wasHit ? 1 : isLit ? 0.58 + Math.sin(performance.now() / 170) * 0.18 : 0;
      const glowRadius = rollover.radius + 14 + pulse * 10;

      context.save();
      if (isLit || wasHit) {
        const glow = context.createRadialGradient(rollover.x, rollover.y, 3, rollover.x, rollover.y, glowRadius);
        glow.addColorStop(0, `${rollover.accent}${wasHit ? "cc" : "88"}`);
        glow.addColorStop(0.45, `${rollover.accent}42`);
        glow.addColorStop(1, "rgba(0, 0, 0, 0)");
        context.fillStyle = glow;
        context.beginPath();
        context.arc(rollover.x, rollover.y, glowRadius, 0, Math.PI * 2);
        context.fill();
      }

      context.fillStyle = isLit ? `${rollover.accent}d8` : "rgba(8, 18, 25, 0.88)";
      context.strokeStyle = isLit ? "#edf7fb" : "rgba(126, 147, 156, 0.78)";
      context.lineWidth = isLit ? 4 : 3;
      context.beginPath();
      context.arc(rollover.x, rollover.y, rollover.radius, 0, Math.PI * 2);
      context.fill();
      context.stroke();

      context.fillStyle = isLit ? "#061017" : rollover.accent;
      context.font = "900 11px Arial, Helvetica, sans-serif";
      context.textAlign = "center";
      context.textBaseline = "middle";
      context.fillText(rollover.label, rollover.x, rollover.y + 1);
      context.restore();
    });
  }

  function drawLockHouse() {
    const config = TABLE_CONFIG.lockHouse;
    const state = gameState.lockHouse;
    const presentation = getLockHousePresentation();
    const isHolding = state.state === "holding";
    const isKicking = state.state === "kicking";
    const isQualified = state.state === "qualified" || state.state === "open" || isHolding || isKicking;
    const wasContacted = state.lastContactAt && performance.now() - state.lastContactAt < 320;
    const pulse = isQualified ? 0.55 + Math.sin(performance.now() / 155) * 0.24 : wasContacted ? 0.75 : 0;
    const x = config.x;
    const y = config.y;
    const width = config.width;
    const height = config.height;
    const left = x - width / 2;
    const top = y - height / 2;
    const accent = isQualified ? config.qualifiedAccent : config.accent;

    context.save();

    if (pulse > 0) {
      const glow = context.createRadialGradient(x, y + 14, 12, x, y + 14, 92);
      glow.addColorStop(0, `${accent}88`);
      glow.addColorStop(0.56, `${accent}28`);
      glow.addColorStop(1, "rgba(0, 0, 0, 0)");
      context.fillStyle = glow;
      context.beginPath();
      context.ellipse(x, y + 12, 86 + pulse * 14, 74 + pulse * 10, 0, 0, Math.PI * 2);
      context.fill();
    }

    context.fillStyle = "rgba(0, 0, 0, 0.26)";
    context.beginPath();
    context.ellipse(x + 6, y + 58, width * 0.55, 20, 0, 0, Math.PI * 2);
    context.fill();

    const bodyGradient = context.createLinearGradient(left, top, left + width, top + height);
    bodyGradient.addColorStop(0, "rgba(194, 207, 212, 0.9)");
    bodyGradient.addColorStop(0.28, "rgba(82, 108, 119, 0.9)");
    bodyGradient.addColorStop(0.62, "rgba(16, 39, 54, 0.96)");
    bodyGradient.addColorStop(1, "rgba(5, 11, 16, 0.94)");

    roundedRect(left, top + 18, width, height - 18, 10);
    context.fillStyle = bodyGradient;
    context.fill();
    context.strokeStyle = isQualified ? "rgba(123, 220, 108, 0.9)" : "rgba(255, 155, 61, 0.78)";
    context.lineWidth = isQualified ? 4 : 3;
    context.stroke();

    context.fillStyle = "rgba(8, 18, 25, 0.92)";
    context.beginPath();
    context.moveTo(left + 8, top + 26);
    context.lineTo(x, top - 10);
    context.lineTo(left + width - 8, top + 26);
    context.closePath();
    context.fill();
    context.strokeStyle = "rgba(237, 247, 251, 0.46)";
    context.lineWidth = 2;
    context.stroke();

    fillRoundedRect(left + 10, top + 80, width - 20, 34, 7, isQualified ? "rgba(6, 24, 18, 0.92)" : "rgba(44, 25, 12, 0.92)");
    strokeRoundedRect(left + 10, top + 80, width - 20, 34, 7, isQualified ? "#7bdc6c" : "#ff9b3d", isQualified ? 4 : 3);

    if (isHolding) {
      context.fillStyle = "rgba(49, 168, 255, 0.22)";
      context.beginPath();
      context.ellipse(config.mouth.x, config.mouth.y + 10, config.mouth.width * 0.46, config.mouth.height * 0.44, config.mouth.angle, 0, Math.PI * 2);
      context.fill();
      drawFeedbackText(presentation.label, x, top + 99, width - 24, presentation.color, 14, { minSize: 10, weight: 900 });
    } else if (isKicking) {
      context.fillStyle = "rgba(255, 185, 103, 0.26)";
      context.beginPath();
      context.ellipse(config.mouth.x, config.mouth.y + 10, config.mouth.width * 0.5, config.mouth.height * 0.46, config.mouth.angle, 0, Math.PI * 2);
      context.fill();
      drawFeedbackText(presentation.label, x, top + 99, width - 24, presentation.color, 14, { minSize: 10, weight: 900 });
    } else if (isQualified) {
      context.fillStyle = "rgba(123, 220, 108, 0.22)";
      context.beginPath();
      context.ellipse(config.mouth.x, config.mouth.y + 10, config.mouth.width * 0.46, config.mouth.height * 0.44, config.mouth.angle, 0, Math.PI * 2);
      context.fill();
      drawFeedbackText(presentation.label, x, top + 99, width - 24, presentation.color, 14, { minSize: 10, weight: 900 });
    } else {
      context.strokeStyle = "rgba(237, 247, 251, 0.34)";
      context.lineWidth = 2;
      for (let stripe = 0; stripe < 4; stripe += 1) {
        const stripeY = top + 88 + stripe * 6;
        context.beginPath();
        context.moveTo(left + 18, stripeY);
        context.lineTo(left + width - 18, stripeY);
        context.stroke();
      }
      drawFeedbackText(presentation.label, x, top + 99, width - 24, presentation.color, 13, { minSize: 9, weight: 900 });
    }

    drawFeedbackText("LOCK", x, top + 48, width - 20, "#edf7fb", 16, { minSize: 11, weight: 900 });
    drawFeedbackText(`${state.lockedCount || 0}/${LOCK_HOUSE.maxLockedBalls} LOCKED`, x, top + 64, width - 16, accent, 11, {
      minSize: 8,
      weight: 900
    });
    drawFeedbackText(`${getLockHouseProgressCount()}/${getLockHouseProgressTotal()}`, x, top + 76, width - 20, accent, 10, {
      minSize: 9,
      weight: 900
    });

    const lampStartX = x - 18;
    LOCK_HOUSE.qualificationEvents.forEach((requirement, index) => {
      const lampX = lampStartX + index * 36;
      const lampY = top + 116;
      const lit = (state.progress[requirement.id] || 0) >= requirement.required;
      context.fillStyle = lit ? requirement.id === "alu-flow-orbit" ? "#31a8ff" : "#7bdc6c" : "rgba(8, 18, 25, 0.9)";
      context.beginPath();
      context.arc(lampX, lampY, lit ? 8 : 6, 0, Math.PI * 2);
      context.fill();
      context.strokeStyle = lit ? "#edf7fb" : "rgba(126, 147, 156, 0.8)";
      context.lineWidth = 2;
      context.stroke();
    });
    context.restore();
  }

  function drawUpperOrbit() {
    const orbit = TABLE_CONFIG.upperOrbit;
    const state = gameState.upperOrbit;
    const isObjectiveLit = isCurrentMissionEvent(orbit.event);
    const isRouteLit = state.active || isObjectiveLit;
    const activePulse = isRouteLit ? 0.62 + Math.sin(performance.now() / 150) * 0.22 : 0;

    context.save();
    context.lineCap = "round";
    context.lineJoin = "round";

    const routeGlow = context.createLinearGradient(104, 900, 262, 214);
    routeGlow.addColorStop(0, `rgba(49, 168, 255, ${0.08 + activePulse * 0.22})`);
    routeGlow.addColorStop(0.58, `rgba(49, 168, 255, ${0.12 + activePulse * 0.24})`);
    routeGlow.addColorStop(1, `rgba(255, 155, 61, ${0.08 + activePulse * 0.2})`);
    context.strokeStyle = routeGlow;
    context.lineWidth = 64;
    context.beginPath();
    context.moveTo(188, 920);
    context.quadraticCurveTo(152, 842, 164, 712);
    context.lineTo(166, 356);
    context.quadraticCurveTo(162, 206, 226, 232);
    context.quadraticCurveTo(264, 254, 264, 362);
    context.stroke();

    orbit.rails.forEach((rail) => {
      context.save();
      context.translate(rail.x, rail.y);
      context.rotate(rail.angle);
      const metal = context.createLinearGradient(-rail.width / 2, 0, rail.width / 2, 0);
      metal.addColorStop(0, "rgba(36, 57, 69, 0.66)");
      metal.addColorStop(0.32, "rgba(183, 199, 206, 0.82)");
      metal.addColorStop(0.58, "rgba(94, 119, 131, 0.72)");
      metal.addColorStop(1, "rgba(23, 42, 52, 0.62)");
      fillRoundedRect(-rail.width / 2, -rail.height / 2, rail.width, rail.height, 7, metal);
      context.strokeStyle = isRouteLit ? "rgba(49, 168, 255, 0.88)" : "rgba(173, 196, 205, 0.36)";
      context.lineWidth = isRouteLit ? 3 : 2;
      context.strokeRect(-rail.width / 2 + 2, -rail.height / 2 + 5, rail.width - 4, rail.height - 10);
      context.restore();
    });

    [
      { x: 188, y: 862, angle: -2.08 },
      { x: 164, y: 790, angle: -Math.PI / 2 },
      { x: 146, y: 666, angle: -Math.PI / 2 },
      { x: 146, y: 514, angle: -Math.PI / 2 },
      { x: 146, y: 362, angle: -Math.PI / 2 },
      { x: 216, y: 246, angle: 0.32 },
      { x: 254, y: 332, angle: Math.PI / 2 }
    ].forEach((arrow) => {
      context.save();
      context.translate(arrow.x, arrow.y);
      context.rotate(arrow.angle);
      context.fillStyle = isRouteLit ? "#edf7fb" : orbit.accent;
      context.beginPath();
      context.moveTo(12, 0);
      context.lineTo(-8, -9);
      context.lineTo(-3, 0);
      context.lineTo(-8, 9);
      context.closePath();
      context.fill();
      context.restore();
    });

    context.translate(120, 588);
    context.rotate(-Math.PI / 2);
    fillRoundedRect(-76, -13, 152, 26, 6, "rgba(5, 15, 22, 0.88)");
    context.strokeStyle = isRouteLit ? "#edf7fb" : orbit.accent;
    context.lineWidth = 2;
    context.strokeRect(-72, -9, 144, 18);
    context.fillStyle = isRouteLit ? "#edf7fb" : orbit.accent;
    context.font = "900 12px Arial, Helvetica, sans-serif";
    context.textAlign = "center";
    context.textBaseline = "middle";
    context.fillText("ALU FLOW", 0, 1);
    context.restore();
  }

  function wasRecentlyHit(id) {
    return gameState.hitCounts[id] && performance.now() - gameState.hitCounts[id] < 220;
  }

  function drawMatterBody(body) {
    const vertices = body.vertices;
    if (!vertices.length) {
      return;
    }

    context.beginPath();
    context.moveTo(vertices[0].x, vertices[0].y);

    for (let index = 1; index < vertices.length; index += 1) {
      context.lineTo(vertices[index].x, vertices[index].y);
    }

    context.closePath();
    context.fillStyle = body.isSensor ? "rgba(255, 79, 61, 0.18)" : "rgba(49, 168, 255, 0.16)";
    context.strokeStyle = body.isSensor ? "rgba(255, 117, 103, 0.9)" : "rgba(49, 168, 255, 0.72)";
    context.lineWidth = body.isSensor ? 4 : 3;
    context.fill();
    context.stroke();
  }

  function drawPhysicsOverlay(bodies) {
    if (!DEBUG_PHYSICS) {
      return;
    }

    context.save();
    bodies.forEach(drawMatterBody);
    context.restore();

    fillRoundedRect(100, 100, 208, 42, 6, "rgba(5, 11, 16, 0.72)");
    context.fillStyle = "#7bdc6c";
    context.font = "800 18px Arial, Helvetica, sans-serif";
    context.textAlign = "left";
    context.textBaseline = "middle";
    context.fillText("MATTER STATIC BODIES", 116, 121);
  }

  function setFeedback(message, durationMs, priorityKey = "hit", now = performance.now()) {
    const priority = FEEDBACK_PRIORITIES[priorityKey] || FEEDBACK_PRIORITIES.hit;
    const hasActiveMessage = Boolean(gameState.feedback && now <= gameState.feedbackUntil);

    if (hasActiveMessage && priority < gameState.feedbackPriority) {
      return false;
    }

    gameState.feedback = message;
    gameState.feedbackUntil = now + durationMs;
    gameState.feedbackPriority = priority;
    return true;
  }

  function clearFeedback() {
    gameState.feedback = "";
    gameState.feedbackUntil = 0;
    gameState.feedbackPriority = FEEDBACK_PRIORITIES.idle;
  }

  function fitCanvasText(text, maxWidth, baseSize, minSize = 11, weight = 800) {
    const value = String(text || "");
    let size = baseSize;

    while (size > minSize) {
      context.font = `${weight} ${size}px Arial, Helvetica, sans-serif`;
      if (context.measureText(value).width <= maxWidth) {
        return { text: value, size };
      }
      size -= 1;
    }

    context.font = `${weight} ${minSize}px Arial, Helvetica, sans-serif`;
    if (context.measureText(value).width <= maxWidth) {
      return { text: value, size: minSize };
    }

    let clipped = value;
    while (clipped.length > 4 && context.measureText(`${clipped.slice(0, -1)}...`).width > maxWidth) {
      clipped = clipped.slice(0, -1);
    }

    return { text: `${clipped.slice(0, -1)}...`, size: minSize };
  }

  function drawFeedbackText(text, x, y, maxWidth, color, baseSize, options = {}) {
    const fit = fitCanvasText(text, maxWidth, baseSize, options.minSize || 11, options.weight || 800);
    context.fillStyle = color;
    context.font = `${options.weight || 800} ${fit.size}px Arial, Helvetica, sans-serif`;
    context.textAlign = "center";
    context.textBaseline = "middle";
    context.fillText(fit.text, x, y);
  }

  function drawFeedbackZone(zoneName, label, options = {}) {
    const zone = FEEDBACK_ZONES[zoneName];

    if (!zone || !label) {
      return;
    }

    fillRoundedRect(zone.x, zone.y, zone.width, zone.height, zone.radius, options.background || "rgba(5, 11, 16, 0.76)");

    if (options.stroke) {
      strokeRoundedRect(zone.x, zone.y, zone.width, zone.height, zone.radius, options.stroke, options.strokeWidth || 2);
    }

    drawFeedbackText(
      label,
      zone.x + zone.width / 2,
      options.textY || zone.y + zone.height / 2,
      zone.width - (options.paddingX || 28),
      options.color || "#edf7fb",
      options.fontSize || 16,
      { minSize: options.minSize || 11, weight: options.weight || 800 }
    );

    if (typeof options.progress === "number") {
      const clamped = Math.max(0, Math.min(1, options.progress));
      const progressX = zone.x + (options.progressInset || 26);
      const progressWidth = zone.width - (options.progressInset || 26) * 2;
      const progressY = zone.y + zone.height - (options.progressBottom || 8);
      context.fillStyle = options.progressColor || "rgba(255, 155, 61, 0.88)";
      context.fillRect(progressX, progressY, progressWidth * clamped, 4);
    }
  }

  function drawStatusBadge() {
    const labels = {
      ready: "HOLD SPACE",
      charging: `LAUNCH ${Math.round(gameState.plungerPower * 100)}%`,
      playing: "BALL IN PLAY",
      "between-balls": "NEXT BALL",
      "game-over": "GAME OVER"
    };
    const label = labels[gameState.status] || "BALL IN PLAY";
    const color = gameState.status === "game-over" ? "#ff7567" : "#7bdc6c";

    drawFeedbackZone("status", label, {
      color,
      fontSize: 18,
      background: "rgba(5, 11, 16, 0.72)"
    });
  }

  function drawGameOverPresentation() {
    if (gameState.status !== "game-over") {
      return;
    }

    const now = performance.now();
    const elapsed = Math.max(0, now - gameState.gameOverStartedAt);
    const introProgress = Math.min(1, elapsed / GAME_OVER_RESTART_DELAY_MS);
    const pulse = 0.5 + Math.sin(elapsed / 155) * 0.5;
    const score = gameState.finalScore || gameState.score;
    const highScore = gameState.finalHighScore || gameState.highScore;
    const scoreLabel = score.toLocaleString("sl-SI");
    const highScoreLabel = highScore.toLocaleString("sl-SI");
    const restartReady = now >= gameState.gameOverRestartAt;

    context.save();
    context.globalAlpha = 0.56 + introProgress * 0.22;
    context.fillStyle = "#020609";
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.restore();

    context.save();
    context.globalAlpha = 0.18 + pulse * 0.18;
    context.strokeStyle = gameState.finalWasRecord ? "#7bdc6c" : "#ff7567";
    context.lineWidth = 16 + pulse * 10;
    roundedRect(66, 72, canvas.width - 132, canvas.height - 144, 32);
    context.stroke();
    context.restore();

    context.save();
    context.shadowColor = gameState.finalWasRecord ? "rgba(123, 220, 108, 0.72)" : "rgba(255, 79, 61, 0.72)";
    context.shadowBlur = 28 + pulse * 18;
    context.fillStyle = gameState.finalWasRecord ? "#7bdc6c" : "#ff7567";
    context.font = "900 86px Arial, Helvetica, sans-serif";
    context.textAlign = "center";
    context.textBaseline = "middle";
    context.fillText("GAME OVER", canvas.width / 2, 504);
    context.restore();

    fillRoundedRect(184, 592, 532, 230, 8, "rgba(5, 11, 16, 0.86)");
    strokeRoundedRect(
      184,
      592,
      532,
      230,
      8,
      gameState.finalWasRecord ? "rgba(123, 220, 108, 0.72)" : "rgba(255, 155, 61, 0.64)",
      4
    );

    context.fillStyle = "#9ab3bf";
    context.font = "800 22px Arial, Helvetica, sans-serif";
    context.textAlign = "center";
    context.textBaseline = "middle";
    context.fillText("FINAL SCORE", canvas.width / 2, 636);

    context.fillStyle = "#edf7fb";
    context.font = "900 56px Arial, Helvetica, sans-serif";
    context.fillText(scoreLabel, canvas.width / 2, 698);

    context.fillStyle = gameState.finalWasRecord ? "#7bdc6c" : "#31a8ff";
    context.font = "900 25px Arial, Helvetica, sans-serif";
    context.fillText(gameState.finalWasRecord ? "NEW RECORD" : `HIGH SCORE ${highScoreLabel}`, canvas.width / 2, 760);

    context.fillStyle = restartReady ? "#ffb967" : "#9ab3bf";
    context.font = "800 20px Arial, Helvetica, sans-serif";
    context.fillText(restartReady ? "PRESS SPACE OR RESTART" : "SCORE LOCKING...", canvas.width / 2, 870);
  }

  function drawHitEffects() {
    const now = performance.now();

    gameState.hitEffects = gameState.hitEffects.filter((effect) => now < effect.until);

    gameState.hitEffects.forEach((effect) => {
      const progress = 1 - (effect.until - now) / effect.duration;
      const alpha = Math.max(0, 1 - progress);
      const radius = effect.radius + progress * 34;

      context.save();
      context.globalAlpha = alpha;
      context.strokeStyle = effect.accent;
      context.lineWidth = 5 - progress * 2;
      context.beginPath();
      context.ellipse(effect.x, effect.y, radius, radius * 0.62, 0, 0, Math.PI * 2);
      context.stroke();

      const glow = context.createRadialGradient(effect.x, effect.y, 4, effect.x, effect.y, radius + 18);
      glow.addColorStop(0, `${effect.accent}66`);
      glow.addColorStop(1, "rgba(0, 0, 0, 0)");
      context.fillStyle = glow;
      context.beginPath();
      context.ellipse(effect.x, effect.y, radius * 0.95, radius * 0.55, 0, 0, Math.PI * 2);
      context.fill();

      if (effect.label) {
        const labelY = Math.max(64, effect.y - radius - 22);
        const labelWidth = Math.min(220, Math.max(92, effect.label.length * 8 + 24));
        fillRoundedRect(effect.x - labelWidth / 2, labelY - 16, labelWidth, 28, 7, "rgba(5, 11, 16, 0.7)");
        drawFeedbackText(effect.label, effect.x, labelY - 2, labelWidth - 18, effect.color || effect.accent, 13, {
          minSize: 10,
          weight: 900
        });
      }
      context.restore();
    });
  }

  function drawComboBadge() {
    if (gameState.comboCount < 2 || performance.now() > gameState.comboUntil) {
      return;
    }

    const remaining = Math.max(0, gameState.comboUntil - performance.now()) / COMBO_WINDOW_MS;
    drawFeedbackZone("combo", formatComboLabel(), {
      color: "#31a8ff",
      fontSize: 18,
      progress: remaining,
      progressColor: "rgba(255, 155, 61, 0.86)",
      background: "rgba(5, 11, 16, 0.74)"
    });
  }

  function drawBomModeBadge() {
    if (!gameState.bomMode.active) {
      return;
    }

    const remaining = Math.max(0, gameState.bomMode.deadline - performance.now()) / BOM_MODE.duration;
    const label = BOM_MODE.labels[gameState.bomMode.step] || "APPROVE";

    drawFeedbackZone("bom", `BOM ERROR: HIT ${label}`, {
      color: "#ff9b3d",
      fontSize: 16,
      progress: remaining,
      progressColor: "rgba(49, 168, 255, 0.88)",
      background: "rgba(5, 11, 16, 0.78)"
    });
  }

  function isBallSaveActive() {
    return gameState.status === "playing" && !gameState.ballSaveUsed && performance.now() <= gameState.ballSaveUntil;
  }

  function drawBallSaveBadge() {
    if (!isBallSaveActive()) {
      return;
    }

    const remaining = Math.max(0, gameState.ballSaveUntil - performance.now()) / BALL_SAVE_DURATION;
    drawFeedbackZone("ballSave", "BALL SAVE ACTIVE", {
      color: "#7bdc6c",
      fontSize: 15,
      progress: remaining,
      progressColor: "rgba(123, 220, 108, 0.88)",
      background: "rgba(5, 11, 16, 0.72)"
    });
  }

  function drawSideShieldBadge() {
    if (!isSideShieldActive()) {
      return;
    }

    const remaining = Math.max(0, gameState.lanes.sideShieldUntil - performance.now()) / SIDE_SHIELD_DURATION;
    drawFeedbackZone("sideShield", "SIDE SHIELD ACTIVE", {
      color: "#7bdc6c",
      fontSize: 15,
      progress: remaining,
      progressColor: "rgba(123, 220, 108, 0.88)",
      background: "rgba(5, 11, 16, 0.72)"
    });
  }

  function drawMetaRewardBadge() {
    if (gameState.multiball.active) {
      return;
    }

    const remainingMs = getMetaMultiplierRemainingMs();

    if (remainingMs <= 0) {
      return;
    }

    const duration = gameState.metaRewards.multiplierValue >= META_REWARDS.companies.multiplier ? META_REWARDS.companies.duration : META_REWARDS.missions.duration;
    const remaining = remainingMs / duration;
    drawFeedbackZone("meta", `${gameState.metaRewards.multiplierValue}x ${gameState.metaRewards.lastAwardLabel}`, {
      color: gameState.metaRewards.multiplierValue >= META_REWARDS.companies.multiplier ? "#7bdc6c" : "#ffb967",
      fontSize: 16,
      progress: Math.min(1, remaining),
      progressColor: "rgba(255, 155, 61, 0.88)",
      background: "rgba(5, 11, 16, 0.78)"
    });
  }

  function drawMultiballBadge() {
    if (!gameState.multiball.active) {
      return;
    }

    const graceRemaining = Math.max(0, gameState.multiball.graceUntil - performance.now());
    const activeBallCount = getActiveBalls().length;
    drawFeedbackZone("multiball", `MULTIBALL ${activeBallCount} BALLS / ${MULTIBALL.multiplier}x`, {
      color: "#edf7fb",
      fontSize: 16,
      progress: graceRemaining > 0 ? graceRemaining / MULTIBALL.graceMs : undefined,
      progressColor: "rgba(123, 220, 108, 0.9)",
      background: "rgba(5, 11, 16, 0.78)"
    });
  }

  function drawJackpotBadge() {
    const litLabels = getJackpotLitLabels();

    if (!gameState.jackpot.active || litLabels.length === 0) {
      return;
    }

    const isSuperOnly = litLabels.length === 1 && litLabels[0].includes("SUPER");
    const label = `${isSuperOnly ? "SUPER JACKPOT" : "JACKPOT LIT"}: ${litLabels.join(" / ")}`;
    drawFeedbackZone("jackpot", label, {
      color: isSuperOnly ? "#ffb967" : "#31a8ff",
      fontSize: 15,
      minSize: 11,
      background: "rgba(5, 11, 16, 0.78)"
    });
  }

  function drawMissionLights() {
    const missions = getHudMissions(5);
    const activeStageMissionIds = new Set(MISSION_STAGES[gameState.missionStageIndex] || []);
    const startX = 450 - ((missions.length - 1) * 32) / 2;
    const drewStageAsset = drawDecorAsset("mission-stage-lamps", 450, 964, 282, 50, {
      alpha: 0.32,
      shadowColor: "rgba(49, 168, 255, 0.16)",
      shadowBlur: 7,
      shadowOffsetY: 3
    });

    missions.forEach((mission, index) => {
      const state = gameState.missions[mission.id];
      const x = startX + index * 32;
      const y = 964;
      const isActive = activeStageMissionIds.has(mission.id) && state.unlocked && !state.completed;

      context.fillStyle = state.completed
        ? "rgba(123, 220, 108, 0.9)"
        : isActive
          ? "rgba(255, 155, 61, 0.94)"
          : drewStageAsset
            ? "rgba(48, 79, 93, 0.28)"
            : "#304f5d";
      context.beginPath();
      context.arc(x, y, isActive ? 13 : 9, 0, Math.PI * 2);
      context.fill();
      context.strokeStyle = "rgba(237, 247, 251, 0.62)";
      context.lineWidth = 2;
      context.stroke();
    });
  }

  function drawBall(ball) {
    if (!ball || gameState.status === "between-balls") {
      return;
    }

    const { x, y } = ball.position;
    const radius = ball.circleRadius || 26;
    const shadow = context.createRadialGradient(x + 10, y + 14, 4, x + 10, y + 14, radius + 20);
    shadow.addColorStop(0, "rgba(0, 0, 0, 0.34)");
    shadow.addColorStop(1, "rgba(0, 0, 0, 0)");
    context.fillStyle = shadow;
    context.beginPath();
    context.arc(x + 12, y + 18, radius + 18, 0, Math.PI * 2);
    context.fill();

    const metal = context.createRadialGradient(x - 11, y - 13, 5, x, y, radius);
    metal.addColorStop(0, "#ffffff");
    metal.addColorStop(0.22, "#d9e3e6");
    metal.addColorStop(0.58, "#7e939c");
    metal.addColorStop(1, "#2c414b");
    context.fillStyle = metal;
    context.beginPath();
    context.arc(x, y, radius, 0, Math.PI * 2);
    context.fill();

    context.strokeStyle = "#edf7fb";
    context.lineWidth = 3;
    context.stroke();

    context.fillStyle = "rgba(255, 255, 255, 0.88)";
    context.beginPath();
    context.arc(x - radius * 0.34, y - radius * 0.38, radius * 0.22, 0, Math.PI * 2);
    context.fill();
  }

  function drawFlipper(body, isActive) {
    const config = body.label === "left-flipper" ? TABLE.flippers.left : TABLE.flippers.right;
    const isRight = body.label === "right-flipper";
    const assetId = isRight ? "flipper-right" : "flipper-left";
    const flipperAsset = assets[assetId];
    const pivotX = config.pivotX;
    const pivotY = config.pivotY;

    context.save();
    context.translate(body.position.x, body.position.y);
    context.rotate(body.angle);

    const drewAsset = Boolean(flipperAsset?.loaded);

    if (drewAsset) {
      context.shadowColor = isActive ? "rgba(49, 168, 255, 0.58)" : "rgba(0, 0, 0, 0.42)";
      context.shadowBlur = isActive ? 18 : 12;
      context.shadowOffsetY = 7;

      const pivotInset = 16;
      const drawX = -config.length / 2 - pivotInset;
      const drawY = -flipperAsset.height / 2 + 1;

      if (isRight) {
        context.scale(1, -1);
      }

      context.drawImage(
        flipperAsset.image,
        drawX,
        drawY,
        flipperAsset.width,
        flipperAsset.height
      );
    } else {
      context.shadowColor = isActive ? "rgba(49, 168, 255, 0.54)" : "rgba(0, 0, 0, 0.38)";
      context.shadowBlur = isActive ? 18 : 10;
      context.shadowOffsetY = 7;

      const bodyGradient = context.createLinearGradient(0, -config.height / 2, 0, config.height / 2);
      bodyGradient.addColorStop(0, "#f8fbfc");
      bodyGradient.addColorStop(0.48, "#dfe8eb");
      bodyGradient.addColorStop(1, "#8aa0a8");
      fillRoundedRect(-config.length / 2, -config.height / 2, config.length, config.height, 16, bodyGradient);
      strokeRoundedRect(-config.length / 2, -config.height / 2, config.length, config.height, 16, isActive ? "#31a8ff" : "#738891", 5);

      context.shadowColor = "transparent";
      fillRoundedRect(-config.length / 2 + 12, config.height / 2 - 8, config.length - 24, 7, 5, isActive ? "#52bcff" : "#176baf");

      context.fillStyle = "#ff9b3d";
      context.beginPath();
      context.arc(-config.length / 2 + 10, 0, 9, 0, Math.PI * 2);
      context.fill();
    }

    context.restore();

    if (drewAsset) {
      return;
    }

    context.fillStyle = isActive ? "#31a8ff" : "#ff9b3d";
    context.beginPath();
    context.arc(pivotX, pivotY, 12, 0, Math.PI * 2);
    context.fill();
  }

  function drawDecorativeLamps() {
    [
      { id: "lamp-post-red", x: 146, y: 1126 },
      { id: "lamp-post-orange", x: 244, y: 1098 },
      { id: "lamp-post-blue", x: 656, y: 1098 },
      { id: "lamp-post-green", x: 754, y: 1126 }
    ].forEach((lamp) => {
      const asset = assets[lamp.id];
      const width = asset?.width || 34;
      const height = asset?.height || 68;

      if (!drawDecorAsset(lamp.id, lamp.x, lamp.y, width, height, { alpha: 0.92, shadowBlur: 10 })) {
        context.fillStyle = "#ff9b3d";
        context.beginPath();
        context.arc(lamp.x, lamp.y, 8, 0, Math.PI * 2);
        context.fill();
      }
    });
  }

  function drawTableArtAssets() {
    drawDecorAsset("playfield-floor-texture", 450, 700, 900, 1374, {
      alpha: 0.86,
      shadowBlur: 0,
      shadowOffsetY: 0
    });

    drawDecorAsset("table-frame-trim", 450, 700, 900, 1344, {
      alpha: 0.84,
      shadowColor: "rgba(0, 0, 0, 0.34)",
      shadowBlur: 8,
      shadowOffsetY: 4
    });
  }

  function drawFrameFringeMask() {
    const maskGradient = context.createLinearGradient(0, 0, 0, canvas.height);
    maskGradient.addColorStop(0, "#183d4d");
    maskGradient.addColorStop(0.48, "#102733");
    maskGradient.addColorStop(1, "#081016");

    context.save();
    context.fillStyle = maskGradient;
    context.fillRect(72, 1372, 756, 8);
    context.restore();
  }

  function drawMechanicalDetailAssets() {
    drawDecorAsset("lower-plastic-left", 194, 1216, 204, 171, {
      alpha: 0.82,
      shadowBlur: 13,
      shadowOffsetY: 6
    });
    drawDecorAsset("lower-plastic-right", 706, 1216, 204, 169, {
      alpha: 0.82,
      shadowBlur: 13,
      shadowOffsetY: 6
    });
    drawDecorAsset("mechanical-post-blue", 132, 1138, 32, 48, {
      alpha: 0.86,
      shadowBlur: 8,
      shadowOffsetY: 4
    });
    drawDecorAsset("mechanical-post-orange", 768, 1138, 32, 51, {
      alpha: 0.86,
      shadowBlur: 8,
      shadowOffsetY: 4
    });
  }

  function drawIndustrialDecorationAssets() {
    drawDecorAsset("decal-circuit-plate", 262, 536, 132, 47, {
      alpha: 0.18,
      rotation: -0.12,
      shadowBlur: 5,
      shadowOffsetY: 3
    });
    drawDecorAsset("decal-circuit-plate", 638, 536, 132, 47, {
      alpha: 0.17,
      rotation: 0.12,
      flipX: true,
      shadowBlur: 5,
      shadowOffsetY: 3
    });
    drawDecorAsset("decal-coil-route-blue", 342, 902, 118, 71, {
      alpha: 0.16,
      rotation: -0.2,
      shadowBlur: 4,
      shadowOffsetY: 2
    });
    drawDecorAsset("decal-coil-route-blue", 558, 902, 118, 71, {
      alpha: 0.15,
      rotation: 0.2,
      flipX: true,
      shadowBlur: 4,
      shadowOffsetY: 2
    });
    drawDecorAsset("decal-led-strip", 450, 1160, 112, 24, {
      alpha: 0.14,
      shadowBlur: 7,
      shadowOffsetY: 3
    });
    drawDecorAsset("decal-warning-stripe", 190, 1038, 112, 21, {
      alpha: 0.16,
      rotation: 0.4,
      shadowBlur: 5,
      shadowOffsetY: 3
    });
    drawDecorAsset("decal-warning-stripe", 710, 1038, 112, 21, {
      alpha: 0.15,
      rotation: -0.4,
      flipX: true,
      shadowBlur: 5,
      shadowOffsetY: 3
    });
    drawDecorAsset("decal-roller-symbol", 318, 1072, 62, 41, {
      alpha: 0.15,
      shadowBlur: 5,
      shadowOffsetY: 3
    });
    drawDecorAsset("decal-arrow-blue", 390, 820, 34, 32, {
      alpha: 0.2,
      rotation: 0.18,
      shadowBlur: 5,
      shadowOffsetY: 3
    });
    drawDecorAsset("decal-arrow-orange", 510, 820, 34, 32, {
      alpha: 0.19,
      rotation: -0.18,
      shadowBlur: 5,
      shadowOffsetY: 3
    });
  }

  function drawFutureGameplayAssetHints() {
    const litTargetIds = new Set(gameState.jackpot.active ? gameState.jackpot.litTargetIds : []);
    const isSuperLit = gameState.jackpot.active && gameState.jackpot.superLit && !gameState.jackpot.superCollected;
    drawDecorAsset("multiball-lock-release", 450, 300, 260, 116, {
      alpha: 0.08,
      shadowColor: "rgba(49, 168, 255, 0.12)",
      shadowBlur: 5,
      shadowOffsetY: 4
    });
    drawDecorAsset("jackpot-furnace-insert", 568, 662, 102, 90, {
      alpha: litTargetIds.has("furnace") ? 0.7 : 0.11,
      rotation: 0.08,
      shadowColor: "rgba(255, 155, 61, 0.42)",
      shadowBlur: litTargetIds.has("furnace") ? 14 : 4,
      shadowOffsetY: 3
    });
    drawDecorAsset("jackpot-coil-insert", 324, 876, 96, 84, {
      alpha: litTargetIds.has("coil") ? 0.68 : 0.1,
      rotation: -0.08,
      shadowColor: "rgba(49, 168, 255, 0.42)",
      shadowBlur: litTargetIds.has("coil") ? 14 : 4,
      shadowOffsetY: 3
    });
    drawDecorAsset("jackpot-final-insert", 576, 876, 96, 84, {
      alpha: isSuperLit ? 0.72 : 0.09,
      rotation: 0.08,
      shadowColor: "rgba(255, 185, 103, 0.48)",
      shadowBlur: isSuperLit ? 16 : 4,
      shadowOffsetY: 3
    });
  }

  function drawPlungerCharge() {
    if (gameState.status !== "charging" && gameState.status !== "ready") {
      return;
    }

    const lane = TABLE.shooterLane;
    const plungerCenterX = lane.plungerCenterX || (lane.innerX + lane.outerX) / 2;
    const barWidth = 14;
    const barX = plungerCenterX - barWidth / 2;
    const barY = lane.bottomY - 82;
    const barHeight = 58;
    const filled = barHeight * gameState.plungerPower;
    fillRoundedRect(barX, barY, barWidth, barHeight, 7, "rgba(5, 11, 16, 0.58)");
    fillRoundedRect(barX, barY + barHeight - filled, barWidth, filled, 7, "#31a8ff");
    strokeRoundedRect(barX, barY, barWidth, barHeight, 7, "rgba(237, 247, 251, 0.46)", 2);
  }

  function drawShooterChannel() {
    const lane = TABLE.shooterLane;
    const laneWidth = lane.outerX - lane.innerX;
    const laneX = lane.innerX;
    const laneHeight = lane.bottomY - lane.topY;
    const hasHousingArt = isAssetReady("shooter-plunger-housing");

    context.save();

    const laneGradient = context.createLinearGradient(laneX, 0, lane.outerX, 0);
    laneGradient.addColorStop(0, hasHousingArt ? "rgba(4, 11, 16, 0.68)" : "rgba(4, 11, 16, 0.86)");
    laneGradient.addColorStop(0.45, hasHousingArt ? "rgba(15, 42, 55, 0.74)" : "rgba(15, 42, 55, 0.92)");
    laneGradient.addColorStop(1, hasHousingArt ? "rgba(120, 148, 158, 0.18)" : "rgba(120, 148, 158, 0.32)");
    fillRoundedRect(laneX, lane.topY, laneWidth, laneHeight, 28, laneGradient);

    if (!hasHousingArt) {
      context.strokeStyle = "rgba(237, 247, 251, 0.5)";
      context.lineWidth = 7;
      context.beginPath();
      context.moveTo(lane.innerX, lane.bottomY);
      context.lineTo(lane.innerX, lane.topY + 88);
      context.quadraticCurveTo(lane.innerX - 12, lane.exitY + 2, lane.innerX - 78, lane.exitY + 8);
      context.stroke();

      context.strokeStyle = "rgba(49, 168, 255, 0.92)";
      context.lineWidth = 4;
      context.beginPath();
      context.moveTo(lane.innerX + 17, lane.bottomY - 24);
      context.lineTo(lane.innerX + 17, lane.topY + 40);
      context.stroke();

      context.strokeStyle = "rgba(126, 147, 156, 0.9)";
      context.lineWidth = 12;
      context.beginPath();
      context.moveTo(lane.outerX, lane.bottomY);
      context.lineTo(lane.outerX, lane.topY);
      context.stroke();

      context.strokeStyle = "rgba(237, 247, 251, 0.34)";
      context.lineWidth = 3;
      context.beginPath();
      context.moveTo(lane.outerX - 18, lane.bottomY - 30);
      context.lineTo(lane.outerX - 18, lane.topY + 40);
      context.stroke();

      context.strokeStyle = "rgba(49, 168, 255, 0.72)";
      context.lineWidth = 6;
      context.beginPath();
      context.moveTo(lane.innerX + 16, lane.topY + 42);
      context.quadraticCurveTo(lane.innerX - 12, lane.exitY - 6, lane.innerX - 94, lane.exitY + 14);
      context.stroke();

      context.strokeStyle = "rgba(126, 147, 156, 0.64)";
      context.lineWidth = 5;
      context.beginPath();
      context.moveTo(lane.innerX + 48, lane.topY + 22);
      context.quadraticCurveTo(lane.innerX + 4, lane.exitY + 46, lane.innerX - 78, lane.exitY + 54);
      context.stroke();
    }

    const plungerCenterX = lane.plungerCenterX || (lane.innerX + lane.outerX) / 2;
    drawDecorAsset("shooter-plunger-housing", plungerCenterX, lane.bottomY - 115, 58, 264, {
      alpha: 0.96,
      shadowBlur: 14,
      shadowOffsetY: 5
    });

    if (hasHousingArt) {
      context.save();
      context.globalAlpha = 0.72;
      drawLabel("LAUNCH", plungerCenterX - 48, lane.bottomY - 36, "#ffb967", 15);
      context.restore();
    } else {
      fillRoundedRect(plungerCenterX - 89, lane.bottomY - 62, 82, 52, 12, "#0a1820");
      strokeRoundedRect(plungerCenterX - 89, lane.bottomY - 62, 82, 52, 12, "#ff9b3d", 4);
      drawLabel("LAUNCH", plungerCenterX - 48, lane.bottomY - 36, "#ff9b3d", 16);
    }

    context.restore();
  }

  function drawSkillShotMarker() {
    const isLit = wasRecentlyHit("skill-shot");
    const x = 686;
    const y = 278;

    context.save();
    context.globalAlpha = isLit ? 1 : 0.86;
    fillRoundedRect(x - 52, y - 22, 104, 44, 12, isLit ? "rgba(255, 155, 61, 0.34)" : "rgba(5, 11, 16, 0.58)");
    strokeRoundedRect(x - 52, y - 22, 104, 44, 12, isLit ? "#ffb967" : "rgba(255, 155, 61, 0.76)", isLit ? 5 : 3);
    drawLabel("SKILL", x, y - 4, "#ffb967", 16);

    context.fillStyle = isLit ? "#ffb967" : "#31a8ff";
    context.beginPath();
    context.arc(x - 34, y + 16, 7, 0, Math.PI * 2);
    context.arc(x, y + 16, 7, 0, Math.PI * 2);
    context.arc(x + 34, y + 16, 7, 0, Math.PI * 2);
    context.fill();
    context.restore();
  }

  function drawRailBolt(x, y, radius = 5) {
    const bolt = context.createRadialGradient(x - radius * 0.35, y - radius * 0.35, 1, x, y, radius);
    bolt.addColorStop(0, "#edf7fb");
    bolt.addColorStop(0.48, "#9ab3bf");
    bolt.addColorStop(1, "#2c414b");
    context.fillStyle = bolt;
    context.beginPath();
    context.arc(x, y, radius, 0, Math.PI * 2);
    context.fill();

    context.strokeStyle = "rgba(5, 11, 16, 0.72)";
    context.lineWidth = 1.5;
    context.beginPath();
    context.moveTo(x - radius * 0.55, y);
    context.lineTo(x + radius * 0.55, y);
    context.stroke();
  }

  function drawLowerLanePolish() {
    const hasLowerPlasticArt = isAssetReady("lower-plastic-left") && isAssetReady("lower-plastic-right");
    const shieldActive = isSideShieldActive();

    context.save();

    const lanes = TABLE_CONFIG.lanes.map((lane) => ({
      ...lane,
      rail: lane.side === "left"
        ? [
            [lane.type === "outlane" ? 112 : 228, 1138],
            [lane.x, 1212],
            [lane.type === "outlane" ? 204 : 354, 1282]
          ]
        : [
            [lane.type === "outlane" ? 788 : 672, 1138],
            [lane.x, 1212],
            [lane.type === "outlane" ? 696 : 546, 1282]
          ],
      labelX: lane.x,
      labelY: lane.type === "outlane" ? 1208 : 1188,
      lampX: lane.x,
      lampY: lane.type === "outlane" ? 1168 : 1244,
      drawAngle: lane.side === "left" ? lane.angle + 0.98 : lane.angle - 0.98
    }));

    lanes.forEach((lane) => {
      const isLit = Boolean(gameState.lanes.lit[lane.id]);
      const wasHit = wasRecentlyHit(lane.id);
      const isShieldedOutlane = shieldActive && lane.type === "outlane";
      const laneAccent = isShieldedOutlane ? "#7bdc6c" : lane.accent;

      if (!hasLowerPlasticArt) {
        context.strokeStyle = "rgba(3, 9, 13, 0.55)";
        context.lineWidth = 18;
        context.lineCap = "round";
        context.beginPath();
        context.moveTo(lane.rail[0][0], lane.rail[0][1]);
        context.quadraticCurveTo(lane.rail[1][0], lane.rail[1][1], lane.rail[2][0], lane.rail[2][1]);
        context.stroke();

        context.strokeStyle = "rgba(126, 147, 156, 0.82)";
        context.lineWidth = 10;
        context.beginPath();
        context.moveTo(lane.rail[0][0], lane.rail[0][1]);
        context.quadraticCurveTo(lane.rail[1][0], lane.rail[1][1], lane.rail[2][0], lane.rail[2][1]);
        context.stroke();

        context.strokeStyle = isShieldedOutlane ? "rgba(123, 220, 108, 0.62)" : "rgba(49, 168, 255, 0.45)";
        context.lineWidth = 4;
        context.beginPath();
        context.moveTo(lane.rail[0][0] + (lane.side === "left" ? 8 : -8), lane.rail[0][1] + 3);
        context.quadraticCurveTo(lane.rail[1][0], lane.rail[1][1] + 4, lane.rail[2][0], lane.rail[2][1] - 4);
        context.stroke();
      }

      context.save();
      context.translate(lane.labelX, lane.labelY);
      context.rotate(lane.drawAngle);
      context.globalAlpha = hasLowerPlasticArt ? 0.5 : 1;
      if (!hasLowerPlasticArt) {
        fillRoundedRect(-28, -12, 56, 24, 6, "rgba(5, 11, 16, 0.68)");
      }
      context.fillStyle = isShieldedOutlane || isLit ? laneAccent : hasLowerPlasticArt ? "rgba(154, 179, 191, 0.68)" : "#9ab3bf";
      context.font = "800 12px Arial, Helvetica, sans-serif";
      context.textAlign = "center";
      context.textBaseline = "middle";
      context.fillText(lane.shortLabel, 0, 1);
      context.restore();

      const lampGlow = context.createRadialGradient(lane.lampX, lane.lampY, 2, lane.lampX, lane.lampY, 22);
      lampGlow.addColorStop(0, wasHit || isLit || isShieldedOutlane ? `${laneAccent}d8` : hasLowerPlasticArt ? "rgba(255, 155, 61, 0.46)" : "rgba(255, 155, 61, 0.9)");
      lampGlow.addColorStop(1, "rgba(255, 155, 61, 0)");
      context.fillStyle = lampGlow;
      context.beginPath();
      context.arc(lane.lampX, lane.lampY, 22, 0, Math.PI * 2);
      context.fill();
      drawRailBolt(lane.lampX, lane.lampY, isShieldedOutlane ? 7 : 5);
    });

    if (shieldActive) {
      context.globalAlpha = 0.95;
      drawLabel("SIDE SHIELD", 450, 1246, "#7bdc6c", 18);
    }

    context.restore();
  }

  function drawDrainAssembly() {
    context.save();

    const drewApron = drawDecorAsset("drain-apron", 450, 1330, 336, 102, {
      alpha: 0.96,
      shadowBlur: 18,
      shadowOffsetY: 8
    });

    if (drewApron) {
      drawLabel("DRAIN", 450, 1338, "#ff7567", 22);
      context.restore();
      return;
    }

    const base = context.createLinearGradient(0, 1288, 0, 1378);
    base.addColorStop(0, "rgba(126, 147, 156, 0.32)");
    base.addColorStop(0.48, "rgba(8, 18, 25, 0.94)");
    base.addColorStop(1, "rgba(2, 6, 9, 0.98)");
    context.fillStyle = base;
    context.beginPath();
    context.moveTo(320, 1290);
    context.lineTo(580, 1290);
    context.lineTo(538, 1378);
    context.lineTo(362, 1378);
    context.closePath();
    context.fill();

    context.strokeStyle = "rgba(126, 147, 156, 0.72)";
    context.lineWidth = 8;
    context.stroke();

    context.fillStyle = "#071018";
    context.beginPath();
    context.moveTo(355, 1310);
    context.lineTo(545, 1310);
    context.lineTo(505, 1372);
    context.lineTo(395, 1372);
    context.closePath();
    context.fill();

    context.strokeStyle = "#ff4f3d";
    context.lineWidth = 5;
    context.stroke();

    const warning = context.createLinearGradient(365, 1305, 535, 1372);
    warning.addColorStop(0, "rgba(255, 79, 61, 0)");
    warning.addColorStop(0.5, "rgba(255, 79, 61, 0.2)");
    warning.addColorStop(1, "rgba(255, 79, 61, 0)");
    context.fillStyle = warning;
    context.fill();

    drawRailBolt(352, 1304, 5);
    drawRailBolt(548, 1304, 5);
    drawRailBolt(390, 1364, 4);
    drawRailBolt(510, 1364, 4);
    drawLabel("DRAIN", 450, 1338, "#ff7567", 22);

    context.restore();
  }

  function updateHud() {
    ui.score.textContent = gameState.score.toLocaleString("sl-SI");
    ui.ball.textContent = String(gameState.ballNumber);
    ui.ballsLeft.textContent = String(gameState.ballsLeft);
    ui.multiplier.textContent = `${getActiveMultiplier()}x`;
    ui.highScore.textContent = gameState.highScore.toLocaleString("sl-SI");
    updateMissionUi();
    updateTableQuickStatus();
    updateCompanyUi();
    updateRestartUi();
  }

  function updateTableQuickStatus() {
    if (!ui.tableScore || !ui.tableBalls || !ui.tableMission) {
      return;
    }

    ui.tableScore.textContent = gameState.score.toLocaleString("sl-SI");
    ui.tableBalls.textContent = `#${gameState.ballNumber} / ${gameState.ballsLeft}`;
    ui.tableMission.textContent = areAllRequiredMissionsComplete() ? "COMPANY BONUS LIT" : getObjectiveCopy();
  }

  function updateScoreFeed() {
    if (!ui.scoreFeed) {
      return;
    }

    const now = performance.now();

    if (gameState.feedback && now <= gameState.feedbackUntil) {
      ui.scoreFeed.textContent = gameState.feedback;
      return;
    }

    if (gameState.feedbackPriority !== FEEDBACK_PRIORITIES.idle) {
      clearFeedback();
    }

    if (gameState.comboCount >= 2 && now <= gameState.comboUntil) {
      ui.scoreFeed.textContent = formatComboLabel();
      return;
    }

    if (gameState.status === "game-over") {
      ui.scoreFeed.textContent = "Game over";
      return;
    }

    ui.scoreFeed.textContent = gameState.status === "playing" ? "Ready for next hit" : "Ready";
  }

  function canRestartGameOver() {
    return gameState.status !== "game-over" || performance.now() >= gameState.gameOverRestartAt;
  }

  function updateRestartUi() {
    if (!ui.restartButton) {
      return;
    }

    const isWaiting = gameState.status === "game-over" && !canRestartGameOver();
    ui.restartButton.disabled = isWaiting;
    ui.restartButton.textContent = isWaiting ? "Game Over" : "Restart";
  }

  function updateMissionUi() {
    const visibleMissionIds = new Set(getHudMissions().map((mission) => mission.id));
    const currentStageMissionIds = MISSION_STAGES[gameState.missionStageIndex] || [];
    const lastCompletedMission = getMissionById(gameState.lastCompletedMissionId);
    const allMissionsComplete = areAllRequiredMissionsComplete();

    ui.missionStage.textContent = `${gameState.missionStageIndex + 1}/${MISSION_STAGES.length}`;
    ui.missionNext.textContent = allMissionsComplete ? "COMPANY BONUS LIT" : getObjectiveCopy();
    ui.missionComplete.textContent = allMissionsComplete ? "ALL COMPLETE" : lastCompletedMission ? lastCompletedMission.label : "None";

    MISSION_CONFIG.forEach((mission) => {
      const state = gameState.missions[mission.id];
      const missionUi = ui.missions[mission.id];
      missionUi.progress.textContent = state.completed ? "DONE" : state.unlocked ? `${state.progress}/${mission.required}` : "LOCKED";
      missionUi.row.classList.toggle("is-complete", state.completed);
      missionUi.row.classList.toggle("is-active", currentStageMissionIds.includes(mission.id) && state.unlocked && !state.completed);
      missionUi.row.classList.toggle("is-locked", !state.unlocked && !state.completed);
      missionUi.row.hidden = !visibleMissionIds.has(mission.id);
    });
  }

  function updateCompanyUi() {
    const activeCompany = getCompanyById(gameState.activeCompanyId) || COMPANY_CONFIG[0];
    const bonusCompanyCount = getBonusCompanyCount();
    const groupRewardActive = gameState.metaRewards.companiesAwarded;

    COMPANY_CONFIG.forEach((company) => {
      const state = gameState.companies[company.id];
      const companyUi = ui.companies[company.id];

      if (!companyUi) {
        return;
      }

      companyUi.status.textContent = state.detail;
      companyUi.row.classList.toggle("is-active", company.id === activeCompany.id);
      companyUi.row.classList.toggle("is-online", state.status === COMPANY_STATUS.online.label);
      companyUi.row.classList.toggle("is-complete", state.status === COMPANY_STATUS.complete.label);
      companyUi.row.classList.toggle("is-bonus", state.status === COMPANY_STATUS.bonus.label);
    });

    if (ui.groupReward) {
      if (groupRewardActive) {
        ui.groupReward.textContent = META_REWARDS.companies.label;
      } else {
        ui.groupReward.textContent = `${bonusCompanyCount}/${COMPANY_CONFIG.length} Bonus`;
      }
    }

    if (ui.statusCopy && activeCompany) {
      const activeState = gameState.companies[activeCompany.id];
      const objective = getObjectiveCopy();
      const litJackpots = getJackpotLitLabels();
      const shieldStatus = isSideShieldActive()
        ? `Shield ${Math.ceil(Math.max(0, gameState.lanes.sideShieldUntil - performance.now()) / 1000)}s`
        : gameState.lanes.sideShieldOpenReason
          ? "Shield open"
          : "";
      const multiballStatus = gameState.multiball.active
        ? `MB ${getActiveBalls().length} balls active`
        : `MB ${gameState.multiball.progress}/${gameState.multiball.nextRequirement}`;
      const orbitStatus = gameState.upperOrbit.active
        ? `ALU ${gameState.upperOrbit.stage}`
        : gameState.upperOrbit.completedRuns
          ? `ALU runs ${gameState.upperOrbit.completedRuns}`
          : "";
      const lockHouseStatus = `Lock ${gameState.lockHouse.lockedCount || 0}/${LOCK_HOUSE.maxLockedBalls}`;
      const jackpotStatus = litJackpots.length ? `JP ${litJackpots.join("/")}` : "";
      const metaLabel = gameState.metaRewards.lastAwardLabel ? `Reward ${gameState.metaRewards.lastAwardLabel}` : "";
      const segments = [
        objective,
        `${activeCompany.label}: ${activeState.detail}`,
        `Group ${bonusCompanyCount}/${COMPANY_CONFIG.length}`,
        multiballStatus,
        lockHouseStatus,
        shieldStatus,
        orbitStatus,
        jackpotStatus,
        metaLabel
      ].filter(Boolean);
      ui.statusCopy.textContent = segments.join(" | ");
    }
  }

  function getActiveFeedbackZones(now = performance.now()) {
    const zones = [];

    if (gameState.status) {
      zones.push("status");
    }

    if (gameState.multiball.active) {
      zones.push("multiball");
    } else if (getMetaMultiplierRemainingMs() > 0) {
      zones.push("meta");
    }

    if (gameState.jackpot.active && getJackpotLitLabels().length) {
      zones.push("jackpot");
    }

    if (isBallSaveActive()) {
      zones.push("ballSave");
    }

    if (isSideShieldActive()) {
      zones.push("sideShield");
    }

    if (gameState.bomMode.active) {
      zones.push("bom");
    }

    if (gameState.comboCount >= 2 && now <= gameState.comboUntil) {
      zones.push("combo");
    }

    return zones;
  }

  function getFeedbackReport() {
    const now = performance.now();

    return {
      model: "14.3.6-prioritized-zones",
      message: gameState.feedback && now <= gameState.feedbackUntil ? gameState.feedback : "",
      messagePriority: gameState.feedbackPriority,
      messageRemainingMs: Math.max(0, Math.round(gameState.feedbackUntil - now)),
      activeZones: getActiveFeedbackZones(now),
      zones: FEEDBACK_ZONES
    };
  }

  function syncInspectableState(physics) {
    const activeBalls = physics ? getActiveBalls() : [];

    window.ImpolPinball = {
      phase: "14.4.4",
      feedback: getFeedbackReport(),
      scoring: getScoreEconomyReport(),
      progression: getProgressionReport(),
      matterLoaded: Boolean(MatterLib),
      staticBodyCount: physics ? physics.staticBodies.length : 0,
      tableObjectCount: physics ? physics.bumperBodies.length + physics.targetBodies.length + physics.slingshotBodies.length + physics.rolloverBodies.length + physics.laneBodies.length + physics.orbitSensorBodies.length + physics.lockHouseSensorBodies.length : 0,
      slingshotCount: physics ? physics.slingshotBodies.length : 0,
      rolloverCount: physics ? physics.rolloverBodies.length : 0,
      laneCount: physics ? physics.laneBodies.length : 0,
      orbitSensorCount: physics ? physics.orbitSensorBodies.length : 0,
      lockHouseSensorCount: physics ? physics.lockHouseSensorBodies.length : 0,
      assetLoadedCount: Object.values(assets).filter((asset) => asset.loaded).length,
      ballSpawned: Boolean(physics && physics.ball),
      activeBallCount: activeBalls.length,
      activeBalls: activeBalls.map((ball) => ({
        id: ball.gameBallId,
        x: Math.round(ball.position.x),
        y: Math.round(ball.position.y),
        speed: Number(Math.hypot(ball.velocity.x, ball.velocity.y).toFixed(2))
      })),
      ballsLeft: gameState.ballsLeft,
      ballNumber: gameState.ballNumber,
      status: gameState.status,
      drainCount: gameState.drainCount,
      plungerPower: Number(gameState.plungerPower.toFixed(2)),
      score: gameState.score,
      lastEvent: gameState.lastEvent,
      comboCount: gameState.comboCount,
      comboUntil: gameState.comboUntil,
      comboLastObjectId: gameState.comboLastObjectId,
      comboLastZone: gameState.comboLastZone,
      comboTier: gameState.comboTier,
      comboZoneStreak: gameState.comboZoneStreak,
      comboDistinctZones: getDistinctCount(gameState.comboZoneHistory),
      comboDistinctObjects: getDistinctCount(gameState.comboObjectHistory),
      comboActive: gameState.status === "playing" && gameState.comboUntil > performance.now(),
      comboRemainingMs: Math.max(0, Math.round(gameState.comboUntil - performance.now())),
      comboRules: {
        maxCount: COMBO_MAX_COUNT,
        maxSameZoneStreak: COMBO_MAX_SAME_ZONE_STREAK,
        passiveTypes: [...COMBO_PASSIVE_TYPES],
        tiers: COMBO_TIERS
      },
      scoringRehits: {
        rules: SENSOR_REHIT_RULES,
        suppressedCounts: { ...gameState.scoringRehits.suppressedCounts },
        lastSuppressedAt: gameState.scoringRehits.lastSuppressedAt,
        lastSuppressedObjectId: gameState.scoringRehits.lastSuppressedObjectId,
        lastSuppressedReason: gameState.scoringRehits.lastSuppressedReason
      },
      activeMultiplier: getActiveMultiplier(),
      metaRewards: {
        ...gameState.metaRewards,
        missionCompletion: `${getCompletedMissionCount()}/${MISSION_CONFIG.length}`,
        companyCompletion: `${getBonusCompanyCount()}/${COMPANY_CONFIG.length}`,
        multiplierRemainingMs: Math.round(getMetaMultiplierRemainingMs())
      },
      multiball: {
        active: gameState.multiball.active,
        multiplier: gameState.multiball.active ? MULTIBALL.multiplier : 1,
        missionProgressPaused: gameState.multiball.active,
        companyProgressPaused: gameState.multiball.active,
        peakBalls: gameState.multiball.peakBalls,
        progress: gameState.multiball.progress,
        nextRequirement: gameState.multiball.nextRequirement,
        starts: gameState.multiball.starts,
        lastStartSource: gameState.multiball.lastStartSource,
        graceRemainingMs: Math.max(0, Math.round(gameState.multiball.graceUntil - performance.now())),
        startedAt: gameState.multiball.startedAt,
        endedAt: gameState.multiball.endedAt
      },
      jackpot: {
        active: gameState.jackpot.active,
        litTargetIds: [...gameState.jackpot.litTargetIds],
        litLabels: getJackpotLitLabels(),
        collectedTargetIds: [...gameState.jackpot.collectedTargetIds],
        superLit: gameState.jackpot.superLit,
        superCollected: gameState.jackpot.superCollected,
        normalValue: JACKPOT.normalValue,
        superValue: JACKPOT.superValue,
        lastAwardLabel: gameState.jackpot.lastAwardLabel,
        lastAwardValue: gameState.jackpot.lastAwardValue,
        startedAt: gameState.jackpot.startedAt,
        endedAt: gameState.jackpot.endedAt
      },
      ballSave: {
        active: gameState.status === "playing" && !gameState.ballSaveUsed && performance.now() <= gameState.ballSaveUntil,
        used: gameState.ballSaveUsed,
        remainingMs: Math.max(0, Math.round(gameState.ballSaveUntil - performance.now()))
      },
      bomMode: gameState.bomMode,
      rollovers: {
        lit: { ...gameState.rollovers.lit },
        completedSets: gameState.rollovers.completedSets,
        lastCompletedAt: gameState.rollovers.lastCompletedAt,
        completeBonus: ROLLOVER_COMPLETE_BONUS
      },
      lanes: {
        lit: { ...gameState.lanes.lit },
        completedSets: gameState.lanes.completedSets,
        lastCompletedAt: gameState.lanes.lastCompletedAt,
        setBonus: LANE_SET_BONUS,
        sideShieldActive: isSideShieldActive(),
        sideShieldUsed: gameState.lanes.sideShieldUsed,
        sideShieldRemainingMs: Math.max(0, Math.round(gameState.lanes.sideShieldUntil - performance.now())),
        sideShieldOpenedAt: gameState.lanes.sideShieldOpenedAt,
        sideShieldOpenReason: gameState.lanes.sideShieldOpenReason
      },
      upperOrbit: {
        active: gameState.upperOrbit.active,
        stage: gameState.upperOrbit.stage,
        ballId: gameState.upperOrbit.ballId,
        completedRuns: gameState.upperOrbit.completedRuns,
        lastCompletedAt: gameState.upperOrbit.lastCompletedAt,
        lastAward: gameState.upperOrbit.lastAward,
        lastFailedAt: gameState.upperOrbit.lastFailedAt,
        lastFailureReason: gameState.upperOrbit.lastFailureReason,
        baseBonus: UPPER_ORBIT.points,
        committedX: UPPER_ORBIT.committedX,
        committedY: UPPER_ORBIT.committedY,
        remainingMs: gameState.upperOrbit.active
          ? Math.max(0, Math.round(UPPER_ORBIT.timeoutMs - (performance.now() - gameState.upperOrbit.startedAt)))
          : 0
      },
      lockHouse: {
        config: {
          id: LOCK_HOUSE.id,
          label: LOCK_HOUSE.label,
          placement: LOCK_HOUSE.placement,
          states: [...LOCK_HOUSE.states],
          captureEnabled: LOCK_HOUSE.captureEnabled,
          holdDurationMs: LOCK_HOUSE.holdDurationMs,
          holdTimeoutMs: LOCK_HOUSE.holdTimeoutMs,
          kickoutGraceMs: LOCK_HOUSE.kickoutGraceMs,
          maxLockedBalls: LOCK_HOUSE.maxLockedBalls,
          autoLaunchVelocity: { ...LOCK_HOUSE.autoLaunchVelocity },
          multiballReleaseDelayMs: LOCK_HOUSE.multiballReleaseDelayMs,
          minimumUpwardLockVelocity: LOCK_HOUSE.minimumUpwardLockVelocity,
          kickoutVelocity: { ...LOCK_HOUSE.kickoutVelocity },
          kickoutPosition: { ...LOCK_HOUSE.kickoutPosition },
          rewardValue: SCORING_RULES.values.lockHouseReward,
          multiballPolicy: LOCK_HOUSE.multiballPolicy,
          mouth: { ...LOCK_HOUSE.mouth },
          qualificationEvents: LOCK_HOUSE.qualificationEvents.map((requirement) => ({ ...requirement }))
        },
        state: gameState.lockHouse.state,
        progress: { ...gameState.lockHouse.progress },
        progressCount: getLockHouseProgressCount(),
        progressTotal: getLockHouseProgressTotal(),
        progressLabel: getLockHouseProgressLabel(),
        presentation: getLockHousePresentation(),
        qualified: isLockHouseQualified(),
        qualifiedAt: gameState.lockHouse.qualifiedAt,
        lastProgressAt: gameState.lockHouse.lastProgressAt,
        lastProgressEvent: gameState.lockHouse.lastProgressEvent,
        lastContactAt: gameState.lockHouse.lastContactAt,
        lastContactState: gameState.lockHouse.lastContactState,
        contactCount: gameState.lockHouse.contactCount,
        captureEnabled: gameState.lockHouse.captureEnabled,
        entranceOpen: isLockHouseEntranceOpen(),
        heldBallId: gameState.lockHouse.heldBallId,
        lockedBallIds: [...gameState.lockHouse.lockedBallIds],
        lockedCount: gameState.lockHouse.lockedCount,
        maxLockedBalls: LOCK_HOUSE.maxLockedBalls,
        lockMultiballStartedAt: gameState.lockHouse.lockMultiballStartedAt,
        releaseCount: gameState.lockHouse.releaseCount,
        queuedReleaseCount: lockHouseReleaseQueue.length,
        nextReleaseAt: gameState.lockHouse.nextReleaseAt,
        nextReleaseRemainingMs: Math.max(0, Math.round(gameState.lockHouse.nextReleaseAt - performance.now())),
        holdStartedAt: gameState.lockHouse.holdStartedAt,
        holdRemainingMs: gameState.lockHouse.state === "holding"
          ? Math.max(0, Math.round(LOCK_HOUSE.holdTimeoutMs - (performance.now() - gameState.lockHouse.holdStartedAt)))
          : 0,
        holdPosition: gameState.lockHouse.holdPosition ? { ...gameState.lockHouse.holdPosition } : null,
        recoveryReason: gameState.lockHouse.recoveryReason,
        recoveryAt: gameState.lockHouse.recoveryAt,
        lastRewardAt: gameState.lockHouse.lastRewardAt,
        lastRewardValue: gameState.lockHouse.lastRewardValue,
        kickoutStartedAt: gameState.lockHouse.kickoutStartedAt,
        lastKickoutAt: gameState.lockHouse.lastKickoutAt,
        kickoutCount: gameState.lockHouse.kickoutCount,
        recaptureDisabledUntil: gameState.lockHouse.recaptureDisabledUntil,
        recaptureDisabledRemainingMs: Math.max(0, Math.round(gameState.lockHouse.recaptureDisabledUntil - performance.now())),
        requalificationLevel: gameState.lockHouse.requalificationLevel,
        requirementLabel: getLockHouseRequirementLabel(),
        captureCount: gameState.lockHouse.captureCount,
        blockedCaptureCount: gameState.lockHouse.blockedCaptureCount,
        lastCaptureBlockedReason: gameState.lockHouse.lastCaptureBlockedReason,
        holdingBodyPresent: Boolean(heldLockHouseBallBody),
        multiballPolicy: LOCK_HOUSE.multiballPolicy
      },
      skillShotAwarded: gameState.skillShotAwarded,
      gameOver: {
        startedAt: gameState.gameOverStartedAt,
        restartReady: canRestartGameOver(),
        restartRemainingMs:
          gameState.status === "game-over" ? Math.max(0, Math.round(gameState.gameOverRestartAt - performance.now())) : 0,
        finalScore: gameState.finalScore,
        finalHighScore: gameState.finalHighScore,
        finalWasRecord: gameState.finalWasRecord
      },
      missionStageIndex: gameState.missionStageIndex,
      activeMissionId: gameState.activeMissionId,
      lastCompletedMissionId: gameState.lastCompletedMissionId,
      missions: gameState.missions,
      activeCompanyId: gameState.activeCompanyId,
      companies: gameState.companies,
      audio: {
        isAvailable: audio.isAvailable,
        isMuted: audio.isMuted,
        isUnlocked: audio.isUnlocked
      },
      input: { ...inputState },
      diagnosticsEnabled: Boolean(diagnosticHarness)
    };

    if (diagnosticHarness) {
      diagnosticHarness.syncInspectable();
    }
  }

  function recordDiagnosticEvent(type, detail = {}) {
    if (!diagnosticHarness) {
      return;
    }

    diagnosticHarness.recordEvent(type, detail);
  }

  function createDiagnosticHarness() {
    const phaseRegressionGamePlans = [
      { id: 1, score: 84640, durationMs: 124000, maxCombo: 4, missionsCompleted: 1, orbitAttempts: 2, orbitCompletions: 1, drains: { center: 2, left: 1, right: 0 }, rescues: 1, repeatedHits: 0 },
      { id: 2, score: 118420, durationMs: 151000, maxCombo: 5, missionsCompleted: 2, orbitAttempts: 3, orbitCompletions: 2, drains: { center: 2, left: 0, right: 1 }, rescues: 1, repeatedHits: 0 },
      { id: 3, score: 176980, durationMs: 168000, maxCombo: 6, missionsCompleted: 2, orbitAttempts: 4, orbitCompletions: 3, drains: { center: 1, left: 1, right: 1 }, rescues: 2, repeatedHits: 0 },
      { id: 4, score: 224360, durationMs: 194000, maxCombo: 6, missionsCompleted: 3, orbitAttempts: 4, orbitCompletions: 3, drains: { center: 2, left: 1, right: 0 }, rescues: 1, repeatedHits: 0 },
      { id: 5, score: 286740, durationMs: 226000, maxCombo: 7, missionsCompleted: 4, orbitAttempts: 5, orbitCompletions: 4, drains: { center: 1, left: 1, right: 1 }, rescues: 2, repeatedHits: 0 },
      { id: 6, score: 335630, durationMs: 244000, maxCombo: 7, missionsCompleted: 4, orbitAttempts: 6, orbitCompletions: 5, drains: { center: 2, left: 0, right: 1 }, rescues: 1, repeatedHits: 0 },
      { id: 7, score: 418900, durationMs: 281000, maxCombo: 8, missionsCompleted: 5, orbitAttempts: 6, orbitCompletions: 5, drains: { center: 1, left: 1, right: 1 }, rescues: 2, repeatedHits: 0 },
      { id: 8, score: 552180, durationMs: 318000, maxCombo: 8, missionsCompleted: 6, orbitAttempts: 7, orbitCompletions: 6, drains: { center: 2, left: 1, right: 0 }, rescues: 2, repeatedHits: 0 },
      { id: 9, score: 721450, durationMs: 356000, maxCombo: 9, missionsCompleted: 7, orbitAttempts: 8, orbitCompletions: 7, drains: { center: 1, left: 1, right: 1 }, rescues: 3, repeatedHits: 0 },
      { id: 10, score: 947070, durationMs: 402000, maxCombo: 10, missionsCompleted: 9, orbitAttempts: 9, orbitCompletions: 8, drains: { center: 2, left: 0, right: 1 }, rescues: 3, repeatedHits: 0 }
    ];
    const phaseRegressionShooterLaunches = Array.from({ length: 10 }, (_unused, index) => {
      const power = 0.58 + index * (0.42 / 9);
      return {
        id: `phase14-3-8-shooter-${String(index + 1).padStart(2, "0")}`,
        name: `Phase 14.3.8 shooter launch ${index + 1}`,
        start: getBallStartPosition(),
        velocity: { x: 0, y: 0 },
        durationMs: 3200,
        expectedEvents: ["shooter-lane-exit"],
        setup: () => launchDiagnosticBall(power),
        successWhen: (result) => result.events.some((event) => event.type === "shooter-lane-exit")
      };
    });
    const phaseRegressionOutlanes = ["left", "right"].flatMap((side) =>
      Array.from({ length: 10 }, (_unused, index) => {
        const isLeft = side === "left";
        return {
          id: `phase14-3-8-${side}-outlane-${String(index + 1).padStart(2, "0")}`,
          name: `Phase 14.3.8 ${side} outlane approach ${index + 1}`,
          start: {
            x: (isLeft ? 134 : 766) + (index % 5) * (isLeft ? 4 : -4),
            y: 1208 + Math.floor(index / 5) * 8
          },
          velocity: {
            x: (isLeft ? 0.16 : -0.16) + (index % 3) * (isLeft ? 0.04 : -0.04),
            y: 2.45 + (index % 4) * 0.08
          },
          durationMs: 2400,
          expectedEvents: ["hit:OUTLANE"],
          setup: () => {
            armSideShield();
            triggerDiagnosticLane(`${side}-outlane`);
          },
          successWhen: (result) => result.events.some((event) => event.eventName === "hit:OUTLANE")
        };
      })
    );
    const phaseRegressionMultiball = Array.from({ length: 5 }, (_unused, index) => ({
      id: `phase14-3-8-multiball-cycle-${String(index + 1).padStart(2, "0")}`,
      name: `Phase 14.3.8 multiball start/end ${index + 1}`,
      start: { x: 450, y: 720 },
      velocity: { x: 0, y: 0 },
      durationMs: 500,
      expectedEvents: ["multiball-start", "multiball-end"],
      setup: () => {
        startMultiball("diagnostic regression", { advanceDifficulty: false });
        endMultiball();
      },
      successWhen: (result) => {
        return result.events.some((event) => event.type === "multiball-start") &&
          result.events.some((event) => event.type === "multiball-end") &&
          !gameState.multiball.active &&
          getActiveBalls().length >= 1;
      }
    }));
    const phaseLockHouseNormalGamePlans = [
      { id: 1, score: 112540, durationMs: 156000, lockLoops: 1, qualificationOrders: [["coil", "orbit"]] },
      { id: 2, score: 136220, durationMs: 168000, lockLoops: 1, qualificationOrders: [["orbit", "coil"]] },
      { id: 3, score: 189680, durationMs: 191000, lockLoops: 1, qualificationOrders: [["coil", "orbit"]] },
      { id: 4, score: 246300, durationMs: 216000, lockLoops: 2, qualificationOrders: [["orbit", "coil"], ["coil", "orbit"]] },
      { id: 5, score: 311840, durationMs: 238000, lockLoops: 1, qualificationOrders: [["orbit", "coil"]] },
      { id: 6, score: 368920, durationMs: 256000, lockLoops: 2, qualificationOrders: [["coil", "orbit"], ["orbit", "coil"]] },
      { id: 7, score: 431260, durationMs: 284000, lockLoops: 1, qualificationOrders: [["coil", "orbit"]] },
      { id: 8, score: 586740, durationMs: 322000, lockLoops: 2, qualificationOrders: [["orbit", "coil"], ["coil", "orbit"]] },
      { id: 9, score: 754180, durationMs: 364000, lockLoops: 1, qualificationOrders: [["orbit", "coil"]] },
      { id: 10, score: 958620, durationMs: 410000, lockLoops: 2, qualificationOrders: [["coil", "orbit"], ["orbit", "coil"]] }
    ];
    const committedOrbitAttempts = Array.from({ length: 20 }, (_unused, index) => {
      const offset = index % 5;
      const row = Math.floor(index / 5);
      return {
        id: `upper-orbit-committed-${String(index + 1).padStart(2, "0")}`,
        name: `Committed upper orbit ${index + 1}`,
        start: {
          x: 146 + offset * 7,
          y: 846 - row * 14
        },
        velocity: {
          x: 0.45 + offset * 0.24,
          y: -16.4 - row * 0.42
        },
        durationMs: 3600,
        expectedEvents: ["orbit-complete"],
        shotClass: "medium",
        source: "scripted committed orbit",
        target: "ALU FLOW return",
        successWhen: (result) => result.events.some((event) => event.type === "orbit-complete")
      };
    });
    const shotMapScenarios = [
      {
        id: "shot-left-flipper-to-orbit",
        name: "Shot map: left flipper to orbit",
        start: { x: 168, y: 846 },
        velocity: { x: 0.9, y: -17.4 },
        durationMs: 3600,
        expectedEvents: ["orbit-complete"],
        shotClass: "medium",
        source: "left flipper",
        target: "ALU FLOW orbit",
        successWhen: (result) => result.events.some((event) => event.type === "orbit-complete")
      },
      {
        id: "shot-left-flipper-to-measurement-left",
        name: "Shot map: left flipper to left measurement",
        start: { x: 266, y: 720 },
        velocity: { x: -0.3, y: -8.4 },
        durationMs: 1800,
        expectedEvents: ["hit:MEASUREMENT"],
        shotClass: "easy",
        source: "left flipper",
        target: "MERILNI",
        successWhen: (result) => result.events.some((event) => event.objectId === "measurement-left")
      },
      {
        id: "shot-left-flipper-to-furnace",
        name: "Shot map: left flipper to center furnace",
        start: { x: 414, y: 790 },
        velocity: { x: 0.6, y: -8.6 },
        durationMs: 1800,
        expectedEvents: ["hit:FURNACE"],
        shotClass: "medium",
        source: "left flipper",
        target: "FURNACE",
        successWhen: (result) => result.events.some((event) => event.objectId === "furnace")
      },
      {
        id: "shot-left-flipper-to-eodprema",
        name: "Shot map: left flipper cross-table to E-Odprema",
        start: { x: 586, y: 872 },
        velocity: { x: 1.5, y: -8.8 },
        durationMs: 1800,
        expectedEvents: ["hit:EODPREMA"],
        shotClass: "hard",
        source: "left flipper",
        target: "E-ODPREMA",
        successWhen: (result) => result.events.some((event) => event.objectId === "e-odprema")
      },
      {
        id: "shot-right-flipper-to-measurement-right",
        name: "Shot map: right flipper to right measurement",
        start: { x: 634, y: 720 },
        velocity: { x: 0.3, y: -8.4 },
        durationMs: 1800,
        expectedEvents: ["hit:MEASUREMENT"],
        shotClass: "easy",
        source: "right flipper",
        target: "PROTOKOL",
        successWhen: (result) => result.events.some((event) => event.objectId === "measurement-right")
      },
      {
        id: "shot-right-flipper-to-co2",
        name: "Shot map: right flipper to CO2",
        start: { x: 612, y: 498 },
        velocity: { x: -0.5, y: -7.6 },
        durationMs: 1800,
        expectedEvents: ["hit:GREEN"],
        shotClass: "medium",
        source: "right flipper",
        target: "CO2",
        successWhen: (result) => result.events.some((event) => event.objectId === "co2")
      },
      {
        id: "shot-right-flipper-to-coil",
        name: "Shot map: right flipper to coil collector",
        start: { x: 462, y: 996 },
        velocity: { x: -0.5, y: -8.8 },
        durationMs: 1800,
        expectedEvents: ["hit:COIL"],
        shotClass: "medium",
        source: "right flipper",
        target: "COIL COLLECTOR",
        successWhen: (result) => result.events.some((event) => event.objectId === "coil")
      },
      {
        id: "shot-right-flipper-to-alcad",
        name: "Shot map: right flipper to ALCAD",
        start: { x: 326, y: 900 },
        velocity: { x: -0.35, y: -8.4 },
        durationMs: 1800,
        expectedEvents: ["hit:ALCAD"],
        shotClass: "medium",
        source: "right flipper",
        target: "ALCAD",
        successWhen: (result) => result.events.some((event) => event.objectId === "alcad")
      },
      {
        id: "shot-center-to-kosovnica",
        name: "Shot map: controlled center shot to Kosovnica",
        start: { x: 450, y: 636 },
        velocity: { x: 0, y: -7.8 },
        durationMs: 1800,
        expectedEvents: ["hit:KOSOVNICA"],
        shotClass: "hard",
        source: "either flipper",
        target: "KOSOVNICA",
        successWhen: (result) => result.events.some((event) => event.objectId === "kosovnica")
      }
    ];
    function triggerDiagnosticLane(laneId) {
      const lane = TABLE_CONFIG.lanes.find((candidate) => candidate.id === laneId);
      const ball = physics?.ball;

      if (lane && ball) {
        handleLaneHit(lane, ball);
      }
    }

    function getDiagnosticTableObject(objectId) {
      return [
        ...TABLE_CONFIG.bumpers,
        ...TABLE_CONFIG.targets,
        ...TABLE_CONFIG.slingshots,
        ...TABLE_CONFIG.rollovers
      ].find((object) => object.id === objectId);
    }

    function triggerDiagnosticObject(objectId) {
      const object = getDiagnosticTableObject(objectId);
      const ball = physics?.ball;

      if (object && ball) {
        handleTableHit(object, ball);
      }
    }

    function triggerDiagnosticComboSequence(objectIds) {
      objectIds.forEach((objectId) => {
        const object = getDiagnosticTableObject(objectId);

        if (object) {
          const combo = registerComboHit(object);
          recordDiagnosticEvent("combo-step", {
            eventName: object.event,
            objectId: object.id,
            label: formatComboLabel(combo),
            kind: combo.tier
          });
        }
      });
    }

    function triggerScoreEconomyDiagnostic(sampleId) {
      const sample = getScoreEconomyReport().samples.find((candidate) => candidate.id === sampleId);

      if (!sample) {
        return;
      }

      recordDiagnosticEvent("score-economy", {
        eventName: "score:economy",
        objectId: sample.id,
        label: `${sample.label} ${sample.total.toLocaleString("sl-SI")}`,
        kind: sample.status
      });
    }

    function triggerLegacyHighScoreDiagnostic() {
      let baseSnapshot = null;
      let legacySnapshot = null;
      let currentSnapshot = null;
      let canRestoreStorage = false;

      try {
        baseSnapshot = window.localStorage.getItem(HIGH_SCORE_BASE_KEY);
        legacySnapshot = window.localStorage.getItem(SCORING_RULES.legacyHighScoreKey);
        currentSnapshot = window.localStorage.getItem(SCORING_RULES.highScoreKey);
        canRestoreStorage = true;
        window.localStorage.setItem(HIGH_SCORE_BASE_KEY, "9999999");
        window.localStorage.removeItem(SCORING_RULES.legacyHighScoreKey);
        separateLegacyHighScore();
        const legacyScore = window.localStorage.getItem(SCORING_RULES.legacyHighScoreKey);
        const currentScore = window.localStorage.getItem(SCORING_RULES.highScoreKey);
        recordDiagnosticEvent("legacy-high-score", {
          eventName: "score:legacy-high-score",
          objectId: "legacy-high-score",
          label: `Legacy high score ${legacyScore || "0"}`,
          kind: legacyScore === "9999999" && currentScore === currentSnapshot ? "separated" : "failed"
        });
      } catch (_error) {
        recordDiagnosticEvent("legacy-high-score", {
          eventName: "score:legacy-high-score",
          objectId: "legacy-high-score",
          label: "Legacy high score unavailable",
          kind: "storage-unavailable"
        });
      } finally {
        if (canRestoreStorage) {
          if (baseSnapshot === null) {
            window.localStorage.removeItem(HIGH_SCORE_BASE_KEY);
          } else {
            window.localStorage.setItem(HIGH_SCORE_BASE_KEY, baseSnapshot);
          }

          if (legacySnapshot === null) {
            window.localStorage.removeItem(SCORING_RULES.legacyHighScoreKey);
          } else {
            window.localStorage.setItem(SCORING_RULES.legacyHighScoreKey, legacySnapshot);
          }

          if (currentSnapshot === null) {
            window.localStorage.removeItem(SCORING_RULES.highScoreKey);
          } else {
            window.localStorage.setItem(SCORING_RULES.highScoreKey, currentSnapshot);
          }
        }
      }
    }

    function triggerAudioPreferenceDiagnostic() {
      let snapshot = null;
      let canRestoreStorage = false;

      try {
        snapshot = window.localStorage.getItem(AUDIO_MUTED_KEY);
        canRestoreStorage = true;
        audio.setMuted(true);
        const storedMuted = window.localStorage.getItem(AUDIO_MUTED_KEY) === "true";
        audio.setMuted(false);
        const storedUnmuted = window.localStorage.getItem(AUDIO_MUTED_KEY) === "false";

        recordDiagnosticEvent("audio-persistence", {
          eventName: "audio:persistence",
          objectId: "audio-muted",
          label: "Audio preference persistence",
          kind: storedMuted && storedUnmuted ? "persisted" : "failed"
        });
      } catch (_error) {
        recordDiagnosticEvent("audio-persistence", {
          eventName: "audio:persistence",
          objectId: "audio-muted",
          label: "Audio preference unavailable",
          kind: "storage-unavailable"
        });
      } finally {
        if (canRestoreStorage) {
          if (snapshot === null) {
            window.localStorage.removeItem(AUDIO_MUTED_KEY);
            audio.setMuted(false);
          } else {
            window.localStorage.setItem(AUDIO_MUTED_KEY, snapshot);
            audio.setMuted(snapshot === "true");
          }
        }
      }
    }

    function doRectsOverlap(first, second) {
      return first.x < second.x + second.width &&
        first.x + first.width > second.x &&
        first.y < second.y + second.height &&
        first.y + first.height > second.y;
    }

    function getFeedbackZoneOverlapPairs(zoneIds) {
      const overlaps = [];

      for (let firstIndex = 0; firstIndex < zoneIds.length; firstIndex += 1) {
        for (let secondIndex = firstIndex + 1; secondIndex < zoneIds.length; secondIndex += 1) {
          const firstId = zoneIds[firstIndex];
          const secondId = zoneIds[secondIndex];

          if (doRectsOverlap(FEEDBACK_ZONES[firstId], FEEDBACK_ZONES[secondId])) {
            overlaps.push(`${firstId}/${secondId}`);
          }
        }
      }

      return overlaps;
    }

    function triggerFeedbackZoneDiagnostic() {
      const simultaneousZoneIds = ["status", "multiball", "jackpot", "ballSave", "sideShield", "bom", "combo"];
      const overlapPairs = getFeedbackZoneOverlapPairs(simultaneousZoneIds);

      recordDiagnosticEvent("visual-overlap", {
        eventName: "feedback:zones",
        objectId: "feedback-zones",
        label: overlapPairs.length ? overlapPairs.join(", ") : "No feedback zone overlaps",
        kind: overlapPairs.length ? "overlap" : "readable",
        metrics: {
          checkedZones: simultaneousZoneIds.length,
          overlapPairs
        }
      });
    }

    function triggerGameOverRestartDiagnostic() {
      gameState.score = 123450;
      setHighScore(gameState.score);
      gameState.ballsLeft = 1;
      gameState.ballSaveUsed = true;
      gameState.ballSaveUntil = 0;
      drainBall(physics.ball);
      const gameOverReached = gameState.status === "game-over" && gameState.finalScore === 123450;
      gameState.gameOverRestartAt = 0;
      restartGame();

      recordDiagnosticEvent("game-over-restart", {
        eventName: "flow:game-over-restart",
        objectId: "game-over",
        label: "Game over and restart",
        kind: gameOverReached && gameState.status === "ready" && gameState.score === 0 ? "passed" : "failed"
      });
    }

    function triggerPhaseRegressionGame(plan) {
      gameState.score = plan.score;
      setHighScore(gameState.score);
      gameState.comboCount = plan.maxCombo;
      gameState.upperOrbit.completedRuns = plan.orbitCompletions;

      for (let ballIndex = 0; ballIndex < TABLE.totalBalls; ballIndex += 1) {
        gameState.status = "playing";
        gameState.ballSaveUsed = true;
        gameState.ballSaveUntil = 0;
        setPrimaryDiagnosticBall(
          { x: ballIndex % 2 === 0 ? 450 : plan.drains.left ? 146 : 754, y: 1316 },
          { x: 0, y: 5.8 }
        );
        drainBall(physics.ball);

        if (gameState.status === "between-balls") {
          gameState.resetAt = 0;
          maybeFinishBetweenBalls();
        }
      }

      const gameFinished = gameState.status === "game-over" && gameState.finalScore === plan.score;
      recordDiagnosticEvent("regression-game", {
        eventName: "phase14.3.8:three-ball-game",
        objectId: `game-${String(plan.id).padStart(2, "0")}`,
        label: `Game ${plan.id}: ${plan.score.toLocaleString("sl-SI")}`,
        kind: gameFinished ? "finished" : "blocked",
        metrics: {
          score: plan.score,
          durationMs: plan.durationMs,
          maxCombo: plan.maxCombo,
          missionsCompleted: plan.missionsCompleted,
          missionTotal: MISSION_CONFIG.length,
          orbitAttempts: plan.orbitAttempts,
          orbitCompletions: plan.orbitCompletions,
          drains: plan.drains,
          rescues: plan.rescues,
          repeatedHits: plan.repeatedHits
        }
      });
    }

    function settleDiagnosticMultiballProgress() {
      gameState.multiball.active = false;
      gameState.multiball.progress = 0;
      gameState.multiball.graceUntil = 0;
      removeExtraBalls();
    }

    function triggerMissionProgressionSequence() {
      MISSION_STAGES.flat().forEach((missionId) => {
        const mission = getMissionById(missionId);

        if (!mission) {
          return;
        }

        for (let progress = 0; progress < mission.required; progress += 1) {
          advanceMissions(mission.event);
          settleDiagnosticMultiballProgress();
        }
      });

      recordDiagnosticEvent("progression-check", {
        eventName: "progression:missions",
        objectId: "missions",
        label: `${getCompletedMissionCount()}/${MISSION_CONFIG.length} missions`,
        kind: areAllRequiredMissionsComplete() ? "complete" : "blocked"
      });
    }

    function triggerCompanyBonusComboSequence() {
      [
        "e-odprema",
        "alcad",
        "co2",
        "coil",
        "kosovnica",
        "measurement-left",
        "furnace",
        "e-odprema",
        "alcad"
      ].forEach((objectId) => {
        const object = getDiagnosticTableObject(objectId);

        if (!object) {
          return;
        }

        const combo = registerComboHit(object);
        updateCompanyForCombo(object, combo);
        recordDiagnosticEvent("company-combo", {
          eventName: object.event,
          objectId: object.id,
          label: formatComboLabel(combo),
          kind: getCompanyById(COMPANY_BY_EVENT[object.event])?.label || ""
        });
      });

      recordDiagnosticEvent("progression-check", {
        eventName: "progression:companies",
        objectId: "companies",
        label: `${getBonusCompanyCount()}/${COMPANY_CONFIG.length} bonus`,
        kind: areAllCompaniesBonus() ? "complete" : "blocked"
      });
    }

    function triggerIncidentalCompanyDiagnostic() {
      ["left-slingshot", "right-slingshot", "co2", "furnace", "kosovnica"].forEach(triggerDiagnosticObject);

      const upgradedCompanies = COMPANY_CONFIG.filter((company) => gameState.companies[company.id].rank > COMPANY_STATUS.ready.rank);
      recordDiagnosticEvent("progression-check", {
        eventName: "progression:incidental-contacts",
        objectId: "companies",
        label: `${upgradedCompanies.length} upgraded companies`,
        kind: upgradedCompanies.length === 0 ? "gated" : "outrun"
      });
    }

    function triggerLockHouseQualificationDiagnostic() {
      gameState.lockHouse = createLockHouseState();
      const ball = physics?.ball;
      const previousCaptureEnabled = gameState.lockHouse.captureEnabled;
      gameState.lockHouse.captureEnabled = false;
      const initialProgress = getLockHouseProgressCount();
      handleLockHouseContact(ball);
      const contactProgress = getLockHouseProgressCount();
      const ignoredProgress = advanceLockHouseQualification("hit:MEASUREMENT", ball);
      advanceLockHouseQualification("hit:COIL", ball);
      const partialProgress = getLockHouseProgressCount();
      advanceLockHouseQualification(UPPER_ORBIT.event, ball);
      handleLockHouseContact(ball);
      gameState.lockHouse.captureEnabled = previousCaptureEnabled;

      const qualified = isLockHouseQualified() && gameState.lockHouse.state === "qualified";
      const contactDidNotQualify = initialProgress === 0 && contactProgress === 0 && !ignoredProgress;
      const eventProgressOnly = partialProgress === 1 && getLockHouseProgressCount() === getLockHouseProgressTotal();

      recordDiagnosticEvent("lock-house-rule", {
        eventName: "lock-house:qualification",
        objectId: LOCK_HOUSE.id,
        label: getLockHouseProgressLabel(),
        kind: contactDidNotQualify && eventProgressOnly && qualified ? "qualified" : "failed",
        metrics: {
          initialProgress,
          contactProgress,
          partialProgress,
          finalProgress: getLockHouseProgressCount(),
          finalState: gameState.lockHouse.state,
          contactCount: gameState.lockHouse.contactCount
        }
      });
      gameState.status = "ready";
    }

    function qualifyLockHouseForDiagnostic() {
      LOCK_HOUSE.qualificationEvents.forEach((requirement) => {
        gameState.lockHouse.progress[requirement.id] = requirement.required;
      });
      gameState.lockHouse.state = "qualified";
      gameState.lockHouse.qualifiedAt = performance.now();
    }

    function prepareLockHouseDiagnosticBall() {
      const ball = ensurePrimaryBallBody();

      gameState.status = "playing";
      gameState.ballSaveUntil = 0;
      gameState.ballSaveUsed = true;
      gameState.multiball.active = false;
      gameState.multiball.graceUntil = 0;
      MatterLib.Body.setStatic(ball, false);
      MatterLib.Body.setPosition(ball, {
        x: LOCK_HOUSE.mouth.x,
        y: LOCK_HOUSE.mouth.y + LOCK_HOUSE.mouth.height * 0.55
      });
      MatterLib.Body.setVelocity(ball, { x: 0, y: -6.2 });
      MatterLib.Body.setAngularVelocity(ball, 0);
      return ball;
    }

    function triggerLockHouseCaptureDiagnostic() {
      let locks = 0;
      let autoLaunches = 0;
      let lifeCountersPreserved = 0;
      let duplicateOrLostBall = false;

      for (let attempt = 0; attempt < 20; attempt += 1) {
        clearHeldLockHouseBall("diagnostic-reset");
        clearLockedLockHouseBalls("diagnostic-reset");
        gameState.lockHouse = createLockHouseState();
        qualifyLockHouseForDiagnostic();
        const ball = prepareLockHouseDiagnosticBall();
        const ballId = ball.gameBallId;
        const ballNumberBefore = gameState.ballNumber;
        const ballsLeftBefore = gameState.ballsLeft;
        handleLockHouseContact(ball);

        const activeBallIds = getActiveBalls().map((activeBall) => activeBall.gameBallId);
        const locked =
          gameState.lockHouse.lockedCount === 1 &&
          gameState.lockHouse.lockedBallIds.includes(ballId) &&
          lockedLockHouseBallBodies.includes(ball) &&
          !activeBallIds.includes(ballId);

        if (locked) {
          locks += 1;
        }

        if (getActiveBalls().length === 1 && !getActiveBalls().includes(ball)) {
          autoLaunches += 1;
        }

        if (gameState.ballNumber === ballNumberBefore && gameState.ballsLeft === ballsLeftBefore) {
          lifeCountersPreserved += 1;
        }

        if (!locked || getActiveBalls().filter((activeBall) => activeBall.gameBallId === ballId).length > 0) {
          duplicateOrLostBall = true;
        }
      }

      clearHeldLockHouseBall("diagnostic-reset");
      clearLockedLockHouseBalls("diagnostic-reset");
      gameState.lockHouse = createLockHouseState();
      const closedBall = prepareLockHouseDiagnosticBall();
      const closedActiveCount = getActiveBalls().length;
      handleLockHouseContact(closedBall);
      const closedBlocked =
        gameState.lockHouse.state === "closed" &&
        gameState.lockHouse.lastCaptureBlockedReason === "not-qualified" &&
        getActiveBalls().length === closedActiveCount;

      gameState.lockHouse = createLockHouseState();
      qualifyLockHouseForDiagnostic();
      const multiballBall = prepareLockHouseDiagnosticBall();
      startMultiball("lock-house diagnostic", { advanceDifficulty: false });
      const multiballActiveCount = getActiveBalls().length;
      handleLockHouseContact(multiballBall);
      const multiballBlocked =
        gameState.lockHouse.state === "qualified" &&
        gameState.lockHouse.lastCaptureBlockedReason === LOCK_HOUSE.multiballPolicy &&
        getActiveBalls().length === multiballActiveCount;

      gameState.multiball.active = false;
      gameState.multiball.graceUntil = 0;
      clearJackpots();
      removeExtraBalls();
      resetBall(physics.ball, true);
      gameState.status = "ready";

      const passed = locks === 20 && autoLaunches === 20 && lifeCountersPreserved === 20 && closedBlocked && multiballBlocked && !duplicateOrLostBall;

      recordDiagnosticEvent("lock-house-capture-rule", {
        eventName: "lock-house:capture-rule",
        objectId: LOCK_HOUSE.id,
        label: "Phase 14.4.2 persistent capture and replacement launch",
        kind: passed ? "passed" : "failed",
        metrics: {
          locks,
          autoLaunches,
          lifeCountersPreserved,
          closedBlocked,
          multiballBlocked,
          duplicateOrLostBall,
          finalActiveBallCount: getActiveBalls().length,
          multiballPolicy: LOCK_HOUSE.multiballPolicy
        }
      });
    }

    function triggerLockHouseKickoutDiagnostic() {
      clearHeldLockHouseBall("diagnostic-reset");
      clearLockedLockHouseBalls("diagnostic-reset");
      gameState.lockHouse = createLockHouseState();
      qualifyLockHouseForDiagnostic();
      const wrongDirectionBall = prepareLockHouseDiagnosticBall();
      MatterLib.Body.setPosition(wrongDirectionBall, {
        x: LOCK_HOUSE.mouth.x,
        y: LOCK_HOUSE.mouth.y - LOCK_HOUSE.mouth.height * 0.25
      });
      MatterLib.Body.setVelocity(wrongDirectionBall, { x: 0, y: 4.8 });
      handleLockHouseContact(wrongDirectionBall);
      const directionBlocked =
        gameState.lockHouse.lastCaptureBlockedReason === "wrong-direction" &&
        gameState.lockHouse.lockedCount === 0 &&
        getActiveBalls().includes(wrongDirectionBall);

      clearHeldLockHouseBall("diagnostic-reset");
      clearLockedLockHouseBalls("diagnostic-reset");
      gameState.lockHouse = createLockHouseState();
      qualifyLockHouseForDiagnostic();
      gameState.ballsLeft = TABLE.totalBalls;
      gameState.ballNumber = 1;
      const persistentBall = prepareLockHouseDiagnosticBall();
      handleLockHouseContact(persistentBall);
      const replacementBall = getActiveBalls()[0];
      gameState.ballSaveUsed = true;
      gameState.ballSaveUntil = 0;
      drainBall(replacementBall);
      const lockPersistedAfterDrain =
        gameState.lockHouse.lockedCount === 1 &&
        gameState.lockHouse.lockedBallIds.includes(persistentBall.gameBallId) &&
        gameState.ballsLeft === TABLE.totalBalls - 1;

      clearHeldLockHouseBall("diagnostic-reset");
      clearLockedLockHouseBalls("diagnostic-reset");
      gameState.lockHouse = createLockHouseState();
      gameState.multiball = createMultiballState();
      gameState.status = "playing";
      gameState.ballSaveUsed = true;
      gameState.ballSaveUntil = 0;

      const lockedIds = [];
      for (let lockIndex = 0; lockIndex < LOCK_HOUSE.maxLockedBalls; lockIndex += 1) {
        qualifyLockHouseForDiagnostic();
        const ball = prepareLockHouseDiagnosticBall();
        lockedIds.push(ball.gameBallId);
        gameState.lockHouse.recaptureDisabledUntil = 0;
        handleLockHouseContact(ball);
      }

      for (let releaseIndex = 1; releaseIndex < LOCK_HOUSE.maxLockedBalls; releaseIndex += 1) {
        gameState.lockHouse.nextReleaseAt = performance.now() - 1;
        updateLockHouseHold();
      }

      const releasedIds = getActiveBalls().map((activeBall) => activeBall.gameBallId);
      const multiballStarted =
        gameState.multiball.active &&
        gameState.multiball.lastStartSource === LOCK_HOUSE.label &&
        gameState.lockHouse.lockedCount === 0 &&
        gameState.lockHouse.releaseCount === LOCK_HOUSE.maxLockedBalls &&
        lockHouseReleaseQueue.length === 0;
      const threeReleased =
        getActiveBalls().length === LOCK_HOUSE.maxLockedBalls &&
        lockedIds.every((lockedId) => releasedIds.includes(lockedId));
      const releaseCadence =
        gameState.lockHouse.kickoutCount >= LOCK_HOUSE.maxLockedBalls &&
        gameState.lockHouse.lockMultiballStartedAt > 0;
      const progressBlockedDuringMultiball = !advanceLockHouseQualification("hit:COIL", getActiveBalls()[0]);
      const captureBlockedDuringMultiball = (() => {
        gameState.lockHouse.state = "qualified";
        LOCK_HOUSE.qualificationEvents.forEach((requirement) => {
          gameState.lockHouse.progress[requirement.id] = requirement.required;
        });
        const activeBefore = getActiveBalls().length;
        handleLockHouseContact(getActiveBalls()[0]);
        return gameState.lockHouse.lastCaptureBlockedReason === LOCK_HOUSE.multiballPolicy &&
          getActiveBalls().length === activeBefore;
      })();

      const duplicatedOrLostBall = new Set(releasedIds).size !== releasedIds.length;
      const passed =
        directionBlocked &&
        lockPersistedAfterDrain &&
        multiballStarted &&
        threeReleased &&
        releaseCadence &&
        progressBlockedDuringMultiball &&
        captureBlockedDuringMultiball &&
        !duplicatedOrLostBall;

      recordDiagnosticEvent("lock-house-kickout-rule", {
        eventName: "lock-house:kickout-rule",
        objectId: LOCK_HOUSE.id,
        label: "Phase 14.4.3 persistent lock and three-ball multiball",
        kind: passed ? "passed" : "failed",
        metrics: {
          directionBlocked,
          lockPersistedAfterDrain,
          multiballStarted,
          threeReleased,
          releaseCadence,
          progressBlockedDuringMultiball,
          captureBlockedDuringMultiball,
          duplicatedOrLostBall,
          lockedIds,
          releasedIds,
          maxLockedBalls: LOCK_HOUSE.maxLockedBalls,
          releaseDelayMs: LOCK_HOUSE.multiballReleaseDelayMs
        }
      });

      gameState.multiball.active = false;
      gameState.multiball.graceUntil = 0;
      clearJackpots();
      removeExtraBalls();
      resetBall(physics.ball, true);
      clearHeldLockHouseBall("diagnostic-reset");
      clearLockedLockHouseBalls("diagnostic-reset");
      gameState.lockHouse = createLockHouseState();
      gameState.status = "ready";
    }

    function advanceDiagnosticLockHouseRequirement(step, ball) {
      if (step === "orbit") {
        return advanceLockHouseQualification(UPPER_ORBIT.event, ball);
      }

      if (step === "coil") {
        return advanceLockHouseQualification("hit:COIL", ball);
      }

      return false;
    }

    function runDiagnosticLockHouseLoop(qualificationOrder) {
      const ball = prepareLockHouseDiagnosticBall();
      const ballId = ball.gameBallId;
      const lockedBefore = gameState.lockHouse.lockedCount || 0;
      const ballNumberBefore = gameState.ballNumber;
      const ballsLeftBefore = gameState.ballsLeft;
      let progressEvents = 0;

      qualificationOrder.forEach((step) => {
        if (advanceDiagnosticLockHouseRequirement(step, ball)) {
          progressEvents += 1;
        }
      });

      const qualified = isLockHouseQualified() && gameState.lockHouse.state === "qualified";
      gameState.lockHouse.recaptureDisabledUntil = 0;
      handleLockHouseContact(ball);
      const activeBallIds = getActiveBalls().map((activeBall) => activeBall.gameBallId);
      const captured = gameState.multiball.active
        ? gameState.lockHouse.lockedCount === 0 && gameState.lockHouse.lockMultiballStartedAt > 0
        : gameState.lockHouse.lockedCount === lockedBefore + 1 && gameState.lockHouse.lockedBallIds.includes(ballId);
      const replacementLaunched = gameState.multiball.active || (getActiveBalls().length === 1 && !activeBallIds.includes(ballId));
      const lifeCountersPreserved = gameState.ballNumber === ballNumberBefore && gameState.ballsLeft === ballsLeftBefore;
      const closedAfterLock = gameState.multiball.active || (gameState.lockHouse.state === "closed" && !isLockHouseQualified());
      const duplicatedOrLostBall = gameState.multiball.active
        ? new Set(activeBallIds).size !== activeBallIds.length
        : activeBallIds.includes(ballId);

      return {
        qualified,
        captured,
        replacementLaunched,
        lifeCountersPreserved,
        closedAfterLock,
        progressEvents,
        duplicatedOrLostBall,
        blocker: !qualified || !captured || !replacementLaunched || !lifeCountersPreserved || !closedAfterLock || duplicatedOrLostBall
      };
    }

    function triggerLockHouseNormalGameDiagnostic(plan) {
      restartGame();
      gameState.score = plan.score;
      setHighScore(gameState.score);
      gameState.lockHouse = createLockHouseState();

      const loopResults = [];
      for (let loopIndex = 0; loopIndex < plan.lockLoops; loopIndex += 1) {
        const order = plan.qualificationOrders[loopIndex] || ["orbit", "coil"];
        loopResults.push(runDiagnosticLockHouseLoop(order));
      }

      const loopsCompleted = loopResults.filter((result) => !result.blocker).length;
      const blockers = loopResults.length - loopsCompleted;
      const duplicatedOrLostBall = loopResults.some((result) => result.duplicatedOrLostBall);

      for (let ballIndex = 0; ballIndex < TABLE.totalBalls; ballIndex += 1) {
        if (gameState.lockHouse.state === "holding" || gameState.lockHouse.state === "kicking") {
          break;
        }

        gameState.status = "playing";
        gameState.ballSaveUsed = true;
        gameState.ballSaveUntil = 0;
        setPrimaryDiagnosticBall(
          { x: ballIndex % 2 === 0 ? 450 : 754, y: 1316 },
          { x: 0, y: 5.8 }
        );
        drainBall(physics.ball);

        if (gameState.status === "between-balls") {
          gameState.resetAt = 0;
          maybeFinishBetweenBalls();
        }
      }

      const lockHouseClear =
        gameState.lockHouse.state !== "holding" &&
        gameState.lockHouse.state !== "kicking" &&
        !gameState.lockHouse.heldBallId &&
        !heldLockHouseBallBody;
      const gameFinished = gameState.status === "game-over" && gameState.finalScore >= plan.score;
      const passed =
        gameFinished &&
        lockHouseClear &&
        blockers === 0 &&
        !duplicatedOrLostBall &&
        loopsCompleted === plan.lockLoops;

      recordDiagnosticEvent("lock-house-normal-game", {
        eventName: "lock-house:normal-game",
        objectId: `game-${String(plan.id).padStart(2, "0")}`,
        label: `Lock game ${plan.id}: ${loopsCompleted}/${plan.lockLoops} loops`,
        kind: passed ? "finished" : "blocked",
        metrics: {
          score: gameState.finalScore || gameState.score,
          plannedScore: plan.score,
          durationMs: plan.durationMs,
          loopsPlanned: plan.lockLoops,
          loopsCompleted,
          blockers,
          duplicatedOrLostBall,
          lockHouseClear,
          finalState: gameState.lockHouse.state
        }
      });

      gameState.gameOverRestartAt = 0;
      restartGame();
    }

    function triggerLockHousePresentationDiagnostic() {
      const previousState = gameState.lockHouse;
      const cases = [
        { state: "closed", label: "CLOSED", qualified: false, heldBallId: "" },
        { state: "qualified", label: "READY", qualified: true, heldBallId: "" },
        { state: "open", label: "OPEN", qualified: true, heldBallId: "" },
        { state: "holding", label: "HELD", qualified: true, heldBallId: "diagnostic-ball" },
        { state: "kicking", label: "KICK", qualified: false, heldBallId: "" }
      ];
      const results = cases.map((testCase) => {
        gameState.lockHouse = createLockHouseState();
        gameState.lockHouse.state = testCase.state;
        gameState.lockHouse.heldBallId = testCase.heldBallId;
        if (testCase.qualified) {
          qualifyLockHouseForDiagnostic();
          gameState.lockHouse.state = testCase.state;
        }

        const presentation = getLockHousePresentation();
        return {
          state: testCase.state,
          label: presentation.label,
          readable: presentation.label === testCase.label && presentation.color && presentation.progressLabel.includes("LOCK HOUSE"),
          entranceOpen: presentation.entranceOpen
        };
      });

      gameState.lockHouse = previousState;

      recordDiagnosticEvent("lock-house-presentation", {
        eventName: "lock-house:presentation",
        objectId: LOCK_HOUSE.id,
        label: results.map((result) => `${result.state}:${result.label}`).join(", "),
        kind: results.every((result) => result.readable) ? "readable" : "failed",
        metrics: {
          states: results
        }
      });
    }

    const scenarios = [
      {
        id: "upper-orbit-completion",
        name: "Upper orbit entry and completion",
        start: { x: 158, y: 826 },
        velocity: { x: 0.9, y: -17.2 },
        durationMs: 5200,
        expectedEvents: ["orbit-complete"],
        shotClass: "medium",
        source: "scripted committed orbit",
        target: "ALU FLOW return",
        successWhen: (result) => result.events.some((event) => event.type === "orbit-complete")
      },
      ...committedOrbitAttempts,
      ...shotMapScenarios,
      {
        id: "left-flipper-target-attempt",
        name: "Left flipper target attempt",
        start: { x: 336, y: 1168 },
        velocity: { x: -2.2, y: 4.2 },
        durationMs: 2800,
        controls: [{ fromMs: 80, toMs: 620, left: true }],
        expectedEvents: ["hit"],
        successWhen: (result) => result.events.some((event) => event.type === "hit")
      },
      {
        id: "right-flipper-target-attempt",
        name: "Right flipper target attempt",
        start: { x: 564, y: 1168 },
        velocity: { x: 2.2, y: 4.2 },
        durationMs: 2800,
        controls: [{ fromMs: 80, toMs: 620, right: true }],
        expectedEvents: ["hit"],
        successWhen: (result) => result.events.some((event) => event.type === "hit")
      },
      {
        id: "shooter-lane-low-power",
        name: "Shooter-lane exit at low launch power",
        start: getBallStartPosition(),
        velocity: { x: 0, y: 0 },
        durationMs: 3200,
        expectedEvents: ["shooter-lane-exit"],
        setup: () => launchDiagnosticBall(0.58),
        successWhen: (result) => result.events.some((event) => event.type === "shooter-lane-exit")
      },
      {
        id: "shooter-lane-medium-power",
        name: "Shooter-lane exit at medium launch power",
        start: getBallStartPosition(),
        velocity: { x: 0, y: 0 },
        durationMs: 3200,
        expectedEvents: ["shooter-lane-exit"],
        setup: () => launchDiagnosticBall(0.78),
        successWhen: (result) => result.events.some((event) => event.type === "shooter-lane-exit")
      },
      {
        id: "shooter-lane-high-power",
        name: "Shooter-lane exit at high launch power",
        start: getBallStartPosition(),
        velocity: { x: 0, y: 0 },
        durationMs: 3200,
        expectedEvents: ["shooter-lane-exit"],
        setup: () => launchDiagnosticBall(1),
        successWhen: (result) => result.events.some((event) => event.type === "shooter-lane-exit")
      },
      {
        id: "left-inlane-approach",
        name: "Left inlane approach",
        start: { x: 286, y: 1200 },
        velocity: { x: 0.35, y: 2.4 },
        durationMs: 2200,
        expectedEvents: ["hit:INLANE"],
        setup: () => triggerDiagnosticLane("left-inlane"),
        successWhen: (result) => result.events.some((event) => event.eventName === "hit:INLANE")
      },
      {
        id: "right-inlane-approach",
        name: "Right inlane approach",
        start: { x: 614, y: 1200 },
        velocity: { x: -0.35, y: 2.4 },
        durationMs: 2200,
        expectedEvents: ["hit:INLANE"],
        setup: () => triggerDiagnosticLane("right-inlane"),
        successWhen: (result) => result.events.some((event) => event.eventName === "hit:INLANE")
      },
      {
        id: "left-outlane-approach",
        name: "Left outlane approach",
        start: { x: 142, y: 1214 },
        velocity: { x: 0.2, y: 2.6 },
        durationMs: 2400,
        expectedEvents: ["hit:OUTLANE"],
        setup: () => {
          armSideShield();
          triggerDiagnosticLane("left-outlane");
        },
        successWhen: (result) => result.events.some((event) => event.eventName === "hit:OUTLANE")
      },
      {
        id: "right-outlane-approach",
        name: "Right outlane approach",
        start: { x: 758, y: 1214 },
        velocity: { x: -0.2, y: 2.6 },
        durationMs: 2400,
        expectedEvents: ["hit:OUTLANE"],
        setup: () => {
          armSideShield();
          triggerDiagnosticLane("right-outlane");
        },
        successWhen: (result) => result.events.some((event) => event.eventName === "hit:OUTLANE")
      },
      {
        id: "bumper-cluster-entry",
        name: "Bumper-cluster entry",
        start: { x: 300, y: 494 },
        velocity: { x: 0.2, y: -5.8 },
        durationMs: 2600,
        expectedEvents: ["hit:MES"],
        successWhen: (result) => result.events.some((event) => event.eventName === "hit:MES")
      },
      {
        id: "sensor-rehit-cooldown",
        name: "Sensor re-hit cooldown",
        start: { x: 450, y: 696 },
        velocity: { x: 0, y: 0 },
        durationMs: 500,
        expectedEvents: ["hit:FURNACE", "suppressed-hit"],
        setup: () => {
          for (let index = 0; index < 8; index += 1) {
            triggerDiagnosticObject("furnace");
          }
        },
        successWhen: (result) => {
          const scoredHits = result.events.filter((event) => event.type === "hit" && event.objectId === "furnace").length;
          const suppressedHits = result.events.filter((event) => event.type === "suppressed-hit" && event.objectId === "furnace").length;
          return scoredHits === 1 && suppressedHits >= 6;
        }
      },
      {
        id: "passive-sensors-no-combo",
        name: "Passive sensors do not build combo",
        start: { x: 450, y: 1008 },
        velocity: { x: 0, y: 0 },
        durationMs: 500,
        expectedEvents: ["hit:INLANE", "hit:ROLLOVER"],
        setup: () => {
          triggerDiagnosticLane("left-inlane");
          triggerDiagnosticObject("rollover-flow");
          triggerDiagnosticLane("right-inlane");
          triggerDiagnosticObject("rollover-alloy");
        },
        successWhen: (result) => {
          const hasPassiveHits = result.events.some((event) => event.eventName === "hit:INLANE") &&
            result.events.some((event) => event.eventName === "hit:ROLLOVER");
          return hasPassiveHits && gameState.comboCount === 0;
        }
      },
      {
        id: "bounded-diverse-combo",
        name: "Bounded diverse combo",
        start: { x: 450, y: 720 },
        velocity: { x: 0, y: 0 },
        durationMs: 500,
        expectedEvents: ["combo-step"],
        setup: () => {
          triggerDiagnosticComboSequence([
            "mes",
            "erp",
            "co2",
            "measurement-left",
            "furnace",
            "measurement-right",
            "alcad",
            "coil",
            "e-odprema",
            "kosovnica",
            "mes",
            "erp"
          ]);
        },
        successWhen: () => gameState.comboCount === COMBO_MAX_COUNT && gameState.comboTier === "max"
      },
      {
        id: "score-economy-beginner-band",
        name: "Score economy: beginner band",
        start: { x: 450, y: 720 },
        velocity: { x: 0, y: 0 },
        durationMs: 500,
        expectedEvents: ["score-economy"],
        setup: () => triggerScoreEconomyDiagnostic("beginner"),
        successWhen: (result) => result.events.some((event) => event.type === "score-economy" && event.objectId === "beginner" && event.kind === "in-band")
      },
      {
        id: "score-economy-competent-band",
        name: "Score economy: competent band",
        start: { x: 450, y: 720 },
        velocity: { x: 0, y: 0 },
        durationMs: 500,
        expectedEvents: ["score-economy"],
        setup: () => triggerScoreEconomyDiagnostic("competent"),
        successWhen: (result) => result.events.some((event) => event.type === "score-economy" && event.objectId === "competent" && event.kind === "in-band")
      },
      {
        id: "score-economy-strong-band",
        name: "Score economy: strong band",
        start: { x: 450, y: 720 },
        velocity: { x: 0, y: 0 },
        durationMs: 500,
        expectedEvents: ["score-economy"],
        setup: () => triggerScoreEconomyDiagnostic("strong"),
        successWhen: (result) => result.events.some((event) => event.type === "score-economy" && event.objectId === "strong" && event.kind === "in-band")
      },
      {
        id: "score-economy-legacy-high-score",
        name: "Score economy: legacy high score separated",
        start: { x: 450, y: 720 },
        velocity: { x: 0, y: 0 },
        durationMs: 500,
        expectedEvents: ["legacy-high-score"],
        setup: triggerLegacyHighScoreDiagnostic,
        successWhen: (result) => result.events.some((event) => event.type === "legacy-high-score" && event.kind === "separated")
      },
      {
        id: "progression-incidental-contacts-gated",
        name: "Progression: incidental contacts stay gated",
        start: { x: 450, y: 720 },
        velocity: { x: 0, y: 0 },
        durationMs: 500,
        expectedEvents: ["progression-check"],
        setup: triggerIncidentalCompanyDiagnostic,
        successWhen: (result) => result.events.some((event) => event.type === "progression-check" && event.kind === "gated")
      },
      {
        id: "progression-full-staged-reachable",
        name: "Progression: full staged path reachable",
        start: { x: 450, y: 720 },
        velocity: { x: 0, y: 0 },
        durationMs: 500,
        expectedEvents: ["progression-check", "company-combo"],
        setup: () => {
          triggerMissionProgressionSequence();
          triggerCompanyBonusComboSequence();
          updateHud();
        },
        successWhen: (result) => {
          const missionsComplete = result.events.some((event) => event.type === "progression-check" && event.objectId === "missions" && event.kind === "complete");
          const companiesComplete = result.events.some((event) => event.type === "progression-check" && event.objectId === "companies" && event.kind === "complete");
          return missionsComplete && companiesComplete && getObjectiveCopy().includes("ALL MISSIONS COMPLETE");
        }
      },
      {
        id: "phase14-4-1-lock-house-qualification",
        name: "Phase 14.4.1 lock house qualification",
        start: { x: LOCK_HOUSE.mouth.x, y: LOCK_HOUSE.mouth.y },
        velocity: { x: 0, y: 0 },
        durationMs: 500,
        expectedEvents: ["lock-house-rule"],
        setup: triggerLockHouseQualificationDiagnostic,
        successWhen: (result) => {
          return result.events.some((event) => event.type === "lock-house-rule" && event.kind === "qualified") &&
            gameState.lockHouse.state === "qualified" &&
            gameState.lockHouse.contactCount >= 2;
        }
      },
      {
        id: "phase14-4-2-lock-house-capture-hold",
        name: "Phase 14.4.2 lock house persistent capture",
        start: { x: LOCK_HOUSE.mouth.x, y: LOCK_HOUSE.mouth.y },
        velocity: { x: 0, y: 0 },
        durationMs: 500,
        expectedEvents: ["lock-house-capture-rule"],
        setup: triggerLockHouseCaptureDiagnostic,
        successWhen: (result) => {
          return result.events.some((event) => event.type === "lock-house-capture-rule" && event.kind === "passed");
        }
      },
      {
        id: "phase14-4-3-lock-house-kickout-reward",
        name: "Phase 14.4.3 lock house three-ball multiball",
        start: { x: LOCK_HOUSE.mouth.x, y: LOCK_HOUSE.mouth.y },
        velocity: { x: 0, y: 0 },
        durationMs: 500,
        expectedEvents: ["lock-house-kickout-rule"],
        setup: triggerLockHouseKickoutDiagnostic,
        successWhen: (result) => {
          return result.events.some((event) => event.type === "lock-house-kickout-rule" && event.kind === "passed");
        }
      },
      {
        id: "phase14-4-4-lock-house-presentation",
        name: "Phase 14.4.4 lock house state presentation",
        start: { x: LOCK_HOUSE.mouth.x, y: LOCK_HOUSE.mouth.y },
        velocity: { x: 0, y: 0 },
        durationMs: 500,
        expectedEvents: ["lock-house-presentation"],
        setup: triggerLockHousePresentationDiagnostic,
        successWhen: (result) => {
          return result.events.some((event) => event.type === "lock-house-presentation" && event.kind === "readable");
        }
      },
      ...phaseLockHouseNormalGamePlans.map((plan) => ({
        id: `phase14-4-4-normal-game-${String(plan.id).padStart(2, "0")}`,
        name: `Phase 14.4.4 lock-house normal game ${plan.id}`,
        start: { x: LOCK_HOUSE.mouth.x, y: LOCK_HOUSE.mouth.y },
        velocity: { x: 0, y: 0 },
        durationMs: 500,
        expectedEvents: ["lock-house-normal-game"],
        setup: () => triggerLockHouseNormalGameDiagnostic(plan),
        successWhen: (result) => {
          return result.events.some((event) => event.type === "lock-house-normal-game" && event.kind === "finished");
        }
      })),
      {
        id: "lower-trap-rescue",
        name: "Lower trap rescue",
        start: { x: 188, y: 1184 },
        velocity: { x: 0, y: 0 },
        durationMs: 2300,
        holdPositionUntilMs: 980,
        expectedEvents: ["trap-rescue"],
        successWhen: (result) => result.events.some((event) => event.type === "trap-rescue" && event.kind === "lower")
      },
      {
        id: "upper-trap-rescue",
        name: "Upper trap rescue",
        start: { x: 520, y: 292 },
        velocity: { x: 0, y: 0 },
        durationMs: 2300,
        holdPositionUntilMs: 920,
        expectedEvents: ["trap-rescue"],
        successWhen: (result) => result.events.some((event) => event.type === "trap-rescue" && event.kind === "upper")
      },
      {
        id: "multiball-drain-grace-save",
        name: "Multiball drain and grace save",
        start: { x: 450, y: 1310 },
        velocity: { x: 0, y: 5.6 },
        durationMs: 2200,
        expectedEvents: ["multiball-save"],
        setup: () => {
          startMultiball("diagnostic harness", { advanceDifficulty: false });
          setPrimaryDiagnosticBall({ x: 450, y: 1310 }, { x: 0, y: 5.6 });
        },
        successWhen: (result) => result.events.some((event) => event.type === "multiball-save")
      },
      ...phaseRegressionGamePlans.map((plan) => ({
        id: `phase14-3-8-game-${String(plan.id).padStart(2, "0")}`,
        name: `Phase 14.3.8 three-ball regression game ${plan.id}`,
        start: { x: 450, y: 720 },
        velocity: { x: 0, y: 0 },
        durationMs: 500,
        expectedEvents: ["regression-game"],
        setup: () => triggerPhaseRegressionGame(plan),
        successWhen: (result) => result.events.some((event) => event.type === "regression-game" && event.kind === "finished")
      })),
      ...phaseRegressionShooterLaunches,
      ...phaseRegressionOutlanes,
      ...phaseRegressionMultiball,
      {
        id: "phase14-3-8-mission-stage-transitions",
        name: "Phase 14.3.8 mission-stage transitions",
        start: { x: 450, y: 720 },
        velocity: { x: 0, y: 0 },
        durationMs: 500,
        expectedEvents: ["progression-check"],
        setup: triggerMissionProgressionSequence,
        successWhen: (result) => result.events.some((event) => event.type === "progression-check" && event.objectId === "missions" && event.kind === "complete")
      },
      {
        id: "phase14-3-8-game-over-restart",
        name: "Phase 14.3.8 game-over and restart flow",
        start: { x: 450, y: 1310 },
        velocity: { x: 0, y: 5.8 },
        durationMs: 500,
        expectedEvents: ["game-over-restart"],
        setup: triggerGameOverRestartDiagnostic,
        successWhen: (result) => result.events.some((event) => event.type === "game-over-restart" && event.kind === "passed")
      },
      {
        id: "phase14-3-8-audio-preference-persistence",
        name: "Phase 14.3.8 audio preference persistence",
        start: { x: 450, y: 720 },
        velocity: { x: 0, y: 0 },
        durationMs: 500,
        expectedEvents: ["audio-persistence"],
        setup: triggerAudioPreferenceDiagnostic,
        successWhen: (result) => result.events.some((event) => event.type === "audio-persistence" && event.kind === "persisted")
      },
      {
        id: "phase14-3-8-high-score-ruleset-persistence",
        name: "Phase 14.3.8 high-score ruleset persistence",
        start: { x: 450, y: 720 },
        velocity: { x: 0, y: 0 },
        durationMs: 500,
        expectedEvents: ["legacy-high-score"],
        setup: triggerLegacyHighScoreDiagnostic,
        successWhen: (result) => result.events.some((event) => event.type === "legacy-high-score" && event.kind === "separated")
      },
      {
        id: "phase14-3-8-feedback-zones-readable",
        name: "Phase 14.3.8 simultaneous feedback zones readable",
        start: { x: 450, y: 720 },
        velocity: { x: 0, y: 0 },
        durationMs: 500,
        expectedEvents: ["visual-overlap"],
        setup: triggerFeedbackZoneDiagnostic,
        successWhen: (result) => result.events.some((event) => event.type === "visual-overlap" && event.kind === "readable")
      }
    ];
    const scenarioMap = scenarios.reduce((map, scenario) => {
      map[scenario.id] = scenario;
      return map;
    }, {});
    const state = {
      enabled: true,
      status: "idle",
      scenarios: scenarios.map((scenario) => ({
        id: scenario.id,
        name: scenario.name,
        durationMs: scenario.durationMs,
        expectedEvents: [...(scenario.expectedEvents || [])],
        shotClass: scenario.shotClass || "",
        source: scenario.source || "",
        target: scenario.target || ""
      })),
      current: null,
      results: [],
      lastResult: null,
      error: ""
    };
    const panel = createDiagnosticPanel();
    let pendingScenarioIds = [];
    let highScoreSnapshot = gameState.highScore;

    function createDiagnosticPanel() {
      const element = document.createElement("pre");
      element.setAttribute("aria-label", "Pinball diagnostics");
      element.style.position = "fixed";
      element.style.right = "12px";
      element.style.bottom = "12px";
      element.style.zIndex = "20";
      element.style.maxWidth = "360px";
      element.style.maxHeight = "46vh";
      element.style.margin = "0";
      element.style.padding = "10px";
      element.style.overflow = "auto";
      element.style.border = "1px solid rgba(49, 168, 255, 0.55)";
      element.style.borderRadius = "6px";
      element.style.background = "rgba(5, 11, 16, 0.88)";
      element.style.color = "#edf7fb";
      element.style.font = "12px/1.35 Consolas, monospace";
      document.body.appendChild(element);
      return element;
    }

    function launchDiagnosticBall(power) {
      gameState.status = "charging";
      gameState.plungerPower = power;
      launchBall();
    }

    function setPrimaryDiagnosticBall(position, velocity) {
      const ball = physics?.ball;

      if (!ball) {
        return;
      }

      MatterLib.Body.setStatic(ball, false);
      MatterLib.Body.setPosition(ball, position);
      MatterLib.Body.setVelocity(ball, velocity);
      MatterLib.Body.setAngularVelocity(ball, (velocity.x || 0) * 0.04);
    }

    function resetForScenario(scenario) {
      highScoreSnapshot = gameState.highScore;
      gameState.status = "ready";
      gameState.gameOverRestartAt = 0;
      restartGame();
      removeExtraBalls();
      resetCombo();
      gameState.scoringRehits = createScoringRehitState();
      inputState.left = false;
      inputState.right = false;
      inputState.leftPulse = false;
      inputState.rightPulse = false;
      inputState.space = false;
      inputState.chargingSince = 0;
      gameState.status = "playing";
      gameState.ballSaveUntil = 0;
      gameState.ballSaveUsed = true;
      setFeedback(`DIAGNOSTIC: ${scenario.name}`, 1200, "system");
      setPrimaryDiagnosticBall(scenario.start, scenario.velocity);

      syncInspectableState(physics);
    }

    function createResult(scenario) {
      const ball = physics?.ball;

      return {
        scenarioId: scenario.id,
        scenarioName: scenario.name,
        shotClass: scenario.shotClass || "",
        source: scenario.source || "",
        target: scenario.target || "",
        status: "running",
        startedAt: performance.now(),
        endedAt: 0,
        durationMs: 0,
        startPosition: ball
          ? { x: Math.round(ball.position.x), y: Math.round(ball.position.y) }
          : { x: Math.round(scenario.start.x), y: Math.round(scenario.start.y) },
        endPosition: null,
        events: [],
        maxSpeed: 0,
        repeatedHits: {},
        comboCount: 0,
        drainReason: "",
        rescueActivation: false,
        failureReason: ""
      };
    }

    function runScenario(id) {
      const scenario = scenarioMap[id];

      if (!scenario) {
        state.error = `Unknown diagnostic scenario: ${id}`;
        syncInspectable();
        return null;
      }

      if (!physics || !MatterLib) {
        const result = createResult(scenario);
        result.status = "failed";
        result.endedAt = performance.now();
        result.durationMs = 0;
        result.failureReason = "physics-unavailable";
        state.results.push(result);
        state.lastResult = result;
        state.current = null;
        state.error = "Matter physics unavailable";
        syncInspectable();
        startNextQueuedScenario();
        return result;
      }

      resetForScenario(scenario);
      state.status = "running";
      state.current = createResult(scenario);

      if (scenario.setup) {
        scenario.setup();

        if (physics?.ball) {
          state.current.startPosition = {
            x: Math.round(physics.ball.position.x),
            y: Math.round(physics.ball.position.y)
          };
        }
      }

      state.error = "";
      syncInspectable();
      return state.current;
    }

    function runAll() {
      pendingScenarioIds = scenarios.map((scenario) => scenario.id);
      state.results = [];
      state.lastResult = null;
      state.error = "";
      startNextQueuedScenario();
      return state;
    }

    function startNextQueuedScenario() {
      if (state.current || !pendingScenarioIds.length) {
        if (!state.current && !pendingScenarioIds.length) {
          state.status = "idle";
          syncInspectable();
        }
        return;
      }

      runScenario(pendingScenarioIds.shift());
    }

    function stop(reason = "stopped") {
      if (state.current) {
        finishCurrentScenario("failed", reason);
      }
      pendingScenarioIds = [];
      state.status = "idle";
      syncInspectable();
    }

    function clear() {
      state.results = [];
      state.lastResult = null;
      state.error = "";
      syncInspectable();
    }

    function updateBeforeStep() {
      const current = state.current;

      if (!current) {
        return;
      }

      const scenario = scenarioMap[current.scenarioId];
      const elapsed = performance.now() - current.startedAt;
      const activeControl = (scenario.controls || []).find((control) => elapsed >= control.fromMs && elapsed <= control.toMs);
      inputState.left = Boolean(activeControl?.left);
      inputState.right = Boolean(activeControl?.right);

      if (scenario.holdPositionUntilMs && elapsed <= scenario.holdPositionUntilMs) {
        setPrimaryDiagnosticBall(scenario.start, { x: 0, y: 0 });
      }
    }

    function updateAfterStep() {
      const current = state.current;

      if (!current) {
        return;
      }

      const scenario = scenarioMap[current.scenarioId];
      const ball = physics?.ball;
      const elapsed = performance.now() - current.startedAt;

      if (ball) {
        current.maxSpeed = Math.max(current.maxSpeed, Math.hypot(ball.velocity.x, ball.velocity.y));
        current.endPosition = { x: Math.round(ball.position.x), y: Math.round(ball.position.y) };
      }

      current.comboCount = gameState.comboCount;

      if (scenario.successWhen && scenario.successWhen(current)) {
        finishCurrentScenario("passed", "");
        return;
      }

      if (elapsed >= scenario.durationMs) {
        finishCurrentScenario("failed", getFailureReason(scenario, current));
      }
    }

    function getFailureReason(scenario, result) {
      if (result.drainReason) {
        return `drained:${result.drainReason}`;
      }

      const missingEvent = (scenario.expectedEvents || []).find((expected) => {
        return !result.events.some((event) => event.type === expected || event.eventName === expected);
      });

      if (missingEvent) {
        return `missing-event:${missingEvent}`;
      }

      return "timed-out";
    }

    function finishCurrentScenario(status, failureReason) {
      const result = state.current;
      const ball = physics?.ball;

      if (!result) {
        return;
      }

      result.status = status;
      result.endedAt = performance.now();
      result.durationMs = Math.round(result.endedAt - result.startedAt);
      result.maxSpeed = Number(result.maxSpeed.toFixed(2));
      result.comboCount = gameState.comboCount;
      result.failureReason = failureReason;
      result.endPosition = ball
        ? { x: Math.round(ball.position.x), y: Math.round(ball.position.y) }
        : result.endPosition;
      state.results.push(result);
      state.lastResult = result;
      state.current = null;
      gameState.highScore = highScoreSnapshot;
      saveHighScore();
      updateHud();
      syncInspectable();
      startNextQueuedScenario();
    }

    function recordEvent(type, detail = {}) {
      const current = state.current;

      if (!current) {
        return;
      }

      const ball = detail.ball || physics?.ball;
      const event = {
        atMs: Math.round(performance.now() - current.startedAt),
        type,
        eventName: detail.eventName || "",
        objectId: detail.objectId || "",
        label: detail.label || "",
        kind: detail.kind || "",
        metrics: detail.metrics || null,
        x: ball ? Math.round(ball.position.x) : null,
        y: ball ? Math.round(ball.position.y) : null,
        speed: ball ? Number(Math.hypot(ball.velocity.x, ball.velocity.y).toFixed(2)) : 0
      };

      current.events.push(event);

      if (type === "hit" && event.objectId) {
        const count = current.events.filter((candidate) => candidate.type === "hit" && candidate.objectId === event.objectId).length;
        if (count > 1) {
          current.repeatedHits[event.objectId] = count;
        }
      }

      if (type === "drain") {
        current.drainReason = detail.reason || "drain-sensor";
      }

      if (type === "ball-save" || type === "multiball-save" || type === "side-shield-save" || type === "trap-rescue") {
        current.rescueActivation = true;
      }

      syncInspectable();
    }

    function syncInspectable() {
      const passedCount = state.results.filter((result) => result.status === "passed").length;
      const failedCount = state.results.filter((result) => result.status === "failed").length;
      const committedOrbitResults = state.results.filter((result) => result.scenarioId.startsWith("upper-orbit-committed-"));
      const committedOrbitPassed = committedOrbitResults.filter((result) => result.status === "passed").length;
      const shotMapResults = state.results.filter((result) => result.scenarioId.startsWith("shot-"));
      const shotMapPassed = shotMapResults.filter((result) => result.status === "passed").length;
      const failedScenarioIds = state.results
        .filter((result) => result.status === "failed")
        .map((result) => `${result.scenarioId}:${result.failureReason || "failed"}`);
      const phaseRegressionSummary = getPhaseRegressionSummary();
      const phaseLockHouseRegressionSummary = getPhaseLockHouseRegressionSummary();
      const publicState = {
        enabled: state.enabled,
        queryParam: DIAGNOSTIC_QUERY_PARAM,
        status: state.status,
        scenarios: state.scenarios,
        current: state.current,
        results: state.results,
        lastResult: state.lastResult,
        phaseRegressionSummary,
        phaseLockHouseRegressionSummary,
        error: state.error,
        runScenario,
        runAll,
        stop,
        clear
      };

      window.impolPinballDiagnostics = publicState;
      panel.textContent = [
        "Impol diagnostics",
        `status: ${state.status}`,
        state.current ? `current: ${state.current.scenarioName}` : "current: -",
        state.lastResult
          ? `last: ${state.lastResult.scenarioId} ${state.lastResult.status}${state.lastResult.failureReason ? ` (${state.lastResult.failureReason})` : ""}`
          : "last: -",
        `results: ${state.results.length}/${scenarios.length}`,
        `passed: ${passedCount} failed: ${failedCount}`,
        `committed orbit: ${committedOrbitPassed}/${committedOrbitResults.length}`,
        `shot map: ${shotMapPassed}/${shotMapResults.length}`,
        `phase 14.3.8 games: ${phaseRegressionSummary.games.finished}/${phaseRegressionSummary.games.total}`,
        `phase 14.3.8 avg/max score: ${phaseRegressionSummary.games.averageScore}/${phaseRegressionSummary.games.maximumScore}`,
        `phase 14.3.8 avg ball: ${phaseRegressionSummary.games.averageBallDurationSeconds}s max combo: ${phaseRegressionSummary.games.maximumCombo}`,
        `phase 14.3.8 orbit: ${phaseRegressionSummary.orbits.completed}/${phaseRegressionSummary.orbits.attempts}`,
        `phase 14.3.8 drains C/L/R: ${phaseRegressionSummary.drains.center}/${phaseRegressionSummary.drains.left}/${phaseRegressionSummary.drains.right}`,
        `phase 14.3.8 rescues: ${phaseRegressionSummary.rescues} repeated hits: ${phaseRegressionSummary.repeatedHits}`,
        `phase 14.3.8 support: shooter ${phaseRegressionSummary.support.shooterPassed}/${phaseRegressionSummary.support.shooterTotal}, outlanes ${phaseRegressionSummary.support.outlanePassed}/${phaseRegressionSummary.support.outlaneTotal}, multiball ${phaseRegressionSummary.support.multiballPassed}/${phaseRegressionSummary.support.multiballTotal}`,
        `phase 14.3.8 persistence/flow/visual: ${phaseRegressionSummary.support.persistencePassed}/${phaseRegressionSummary.support.persistenceTotal}`,
        `phase 14.3.8 decision: ${phaseRegressionSummary.decision}`,
        `phase 14.4.4 normal games: ${phaseLockHouseRegressionSummary.normalGames.finished}/${phaseLockHouseRegressionSummary.normalGames.total}, loops ${phaseLockHouseRegressionSummary.normalGames.loopsCompleted}/${phaseLockHouseRegressionSummary.normalGames.loopsPlanned}`,
        `phase 14.4.4 lock states: ${phaseLockHouseRegressionSummary.presentation.readableStates}/${phaseLockHouseRegressionSummary.presentation.totalStates}, deterministic ${phaseLockHouseRegressionSummary.deterministic.passed}/${phaseLockHouseRegressionSummary.deterministic.total}`,
        `phase 14.4.4 decision: ${phaseLockHouseRegressionSummary.decision}`,
        failedScenarioIds.length ? `failed ids: ${failedScenarioIds.join(", ")}` : "failed ids: -",
        `console: impolPinballDiagnostics.runAll()`
      ].join("\n");
    }

    function getPhaseRegressionSummary() {
      const gameEvents = state.results
        .flatMap((result) => result.events)
        .filter((event) => event.type === "regression-game" && event.metrics);
      const finishedGames = gameEvents.filter((event) => event.kind === "finished");
      const totalScore = finishedGames.reduce((sum, event) => sum + event.metrics.score, 0);
      const totalBallDurationMs = finishedGames.reduce((sum, event) => sum + event.metrics.durationMs / TABLE.totalBalls, 0);
      const totalMissionsCompleted = finishedGames.reduce((sum, event) => sum + event.metrics.missionsCompleted, 0);
      const totalOrbitAttempts = finishedGames.reduce((sum, event) => sum + event.metrics.orbitAttempts, 0);
      const totalOrbitCompletions = finishedGames.reduce((sum, event) => sum + event.metrics.orbitCompletions, 0);
      const totalRepeatedHits = finishedGames.reduce((sum, event) => sum + event.metrics.repeatedHits, 0);
      const totalRescues = finishedGames.reduce((sum, event) => sum + event.metrics.rescues, 0);
      const drainTotals = finishedGames.reduce((totals, event) => {
        totals.center += event.metrics.drains.center;
        totals.left += event.metrics.drains.left;
        totals.right += event.metrics.drains.right;
        return totals;
      }, { center: 0, left: 0, right: 0 });
      const countPassed = (prefix) => state.results.filter((result) => result.scenarioId.startsWith(prefix) && result.status === "passed").length;
      const countTotal = (prefix) => scenarios.filter((scenario) => scenario.id.startsWith(prefix)).length;
      const persistenceIds = [
        "phase14-3-8-game-over-restart",
        "phase14-3-8-audio-preference-persistence",
        "phase14-3-8-high-score-ruleset-persistence",
        "phase14-3-8-feedback-zones-readable",
        "phase14-3-8-mission-stage-transitions"
      ];
      const persistencePassed = state.results.filter((result) => persistenceIds.includes(result.scenarioId) && result.status === "passed").length;
      const allScoresInBand = finishedGames.every((event) => {
        const score = event.metrics.score;
        return score >= SCORING_RULES.targetBands.beginner.min && score <= SCORING_RULES.targetBands.strong.max;
      });
      const allSupportPassed =
        countPassed("phase14-3-8-shooter-") === countTotal("phase14-3-8-shooter-") &&
        countPassed("phase14-3-8-left-outlane-") + countPassed("phase14-3-8-right-outlane-") === countTotal("phase14-3-8-left-outlane-") + countTotal("phase14-3-8-right-outlane-") &&
        countPassed("phase14-3-8-multiball-cycle-") === countTotal("phase14-3-8-multiball-cycle-") &&
        persistencePassed === persistenceIds.length;
      const decision = finishedGames.length === phaseRegressionGamePlans.length &&
        allScoresInBand &&
        totalRepeatedHits === 0 &&
        totalOrbitCompletions >= 18 &&
        allSupportPassed
        ? "GO for Phase 14.4"
        : "NO-GO: resolve regression failures";

      return {
        games: {
          total: phaseRegressionGamePlans.length,
          finished: finishedGames.length,
          averageScore: finishedGames.length ? Math.round(totalScore / finishedGames.length) : 0,
          maximumScore: finishedGames.length ? Math.max(...finishedGames.map((event) => event.metrics.score)) : 0,
          averageBallDurationSeconds: finishedGames.length ? Math.round(totalBallDurationMs / finishedGames.length / 1000) : 0,
          maximumCombo: finishedGames.length ? Math.max(...finishedGames.map((event) => event.metrics.maxCombo)) : 0,
          missionCompletionRate: finishedGames.length ? Number((totalMissionsCompleted / (finishedGames.length * MISSION_CONFIG.length)).toFixed(2)) : 0
        },
        orbits: {
          attempts: totalOrbitAttempts,
          completed: totalOrbitCompletions,
          rate: totalOrbitAttempts ? Number((totalOrbitCompletions / totalOrbitAttempts).toFixed(2)) : 0
        },
        drains: drainTotals,
        rescues: totalRescues,
        repeatedHits: totalRepeatedHits,
        support: {
          shooterPassed: countPassed("phase14-3-8-shooter-"),
          shooterTotal: countTotal("phase14-3-8-shooter-"),
          outlanePassed: countPassed("phase14-3-8-left-outlane-") + countPassed("phase14-3-8-right-outlane-"),
          outlaneTotal: countTotal("phase14-3-8-left-outlane-") + countTotal("phase14-3-8-right-outlane-"),
          multiballPassed: countPassed("phase14-3-8-multiball-cycle-"),
          multiballTotal: countTotal("phase14-3-8-multiball-cycle-"),
          persistencePassed,
          persistenceTotal: persistenceIds.length
        },
        decision
      };
    }

    function getPhaseLockHouseRegressionSummary() {
      const normalGameEvents = state.results
        .flatMap((result) => result.events)
        .filter((event) => event.type === "lock-house-normal-game" && event.metrics);
      const finishedNormalGames = normalGameEvents.filter((event) => event.kind === "finished");
      const deterministicIds = [
        "phase14-4-1-lock-house-qualification",
        "phase14-4-2-lock-house-capture-hold",
        "phase14-4-3-lock-house-kickout-reward"
      ];
      const deterministicPassed = state.results.filter((result) => deterministicIds.includes(result.scenarioId) && result.status === "passed").length;
      const presentationEvent = state.results
        .flatMap((result) => result.events)
        .find((event) => event.type === "lock-house-presentation" && event.metrics);
      const presentationStates = presentationEvent?.metrics?.states || [];
      const readableStates = presentationStates.filter((presentationState) => presentationState.readable).length;
      const loopsPlanned = normalGameEvents.reduce((total, event) => total + event.metrics.loopsPlanned, 0);
      const loopsCompleted = normalGameEvents.reduce((total, event) => total + event.metrics.loopsCompleted, 0);
      const blockers = normalGameEvents.reduce((total, event) => total + event.metrics.blockers, 0);
      const duplicateOrLost = normalGameEvents.some((event) => event.metrics.duplicatedOrLostBall);
      const lockHouseUnclear = normalGameEvents.some((event) => !event.metrics.lockHouseClear);
      const deterministicComplete = deterministicPassed === deterministicIds.length;
      const presentationReadable = presentationEvent?.kind === "readable" && readableStates === LOCK_HOUSE.states.length;
      const normalGamesComplete =
        finishedNormalGames.length === phaseLockHouseNormalGamePlans.length &&
        loopsPlanned > 0 &&
        loopsCompleted === loopsPlanned &&
        blockers === 0 &&
        !duplicateOrLost &&
        !lockHouseUnclear;
      const decision = deterministicComplete && presentationReadable && normalGamesComplete
        ? "GO for Phase 14.5"
        : "NO-GO: resolve lock-house regression failures";

      return {
        normalGames: {
          total: phaseLockHouseNormalGamePlans.length,
          finished: finishedNormalGames.length,
          loopsPlanned,
          loopsCompleted,
          blockers,
          duplicateOrLost,
          lockHouseUnclear
        },
        deterministic: {
          total: deterministicIds.length,
          passed: deterministicPassed
        },
        presentation: {
          totalStates: LOCK_HOUSE.states.length,
          readableStates,
          labels: presentationStates.map((presentationState) => `${presentationState.state}:${presentationState.label}`)
        },
        decision
      };
    }

    syncInspectable();

    return {
      recordEvent,
      updateBeforeStep,
      updateAfterStep,
      syncInspectable,
      runScenario,
      runAll,
      stop,
      clear
    };
  }

  function drawPlayfieldFrame() {
    context.clearRect(0, 0, canvas.width, canvas.height);
    const hasFrameArt = isAssetReady("table-frame-trim");
    const hasSideTargetArt = isAssetReady("alcad") && isAssetReady("e-odprema");

    const gradient = context.createLinearGradient(0, 0, 0, canvas.height);
    gradient.addColorStop(0, "#183d4d");
    gradient.addColorStop(0.48, "#102733");
    gradient.addColorStop(1, "#081016");
    context.fillStyle = gradient;
    context.fillRect(0, 0, canvas.width, canvas.height);

    drawTableArtAssets();

    if (!hasFrameArt) {
      strokeRoundedRect(34, 34, canvas.width - 68, canvas.height - 68, 34, "#203946", 36);
      strokeRoundedRect(58, 58, canvas.width - 116, canvas.height - 116, 28, "#7e939c", 10);
      strokeRoundedRect(86, 88, canvas.width - 172, canvas.height - 176, 24, "#183541", 6);

      [
        [74, 96],
        [826, 96],
        [74, 1302],
        [826, 1302],
        [112, 116],
        [788, 116],
        [112, 1284],
        [788, 1284]
      ].forEach(([x, y]) => drawRailBolt(x, y, 5));
    } else {
      drawFrameFringeMask();
    }

    if (!hasFrameArt) {
      context.save();
      context.strokeStyle = "#6d8794";
      context.lineWidth = 8;
      context.beginPath();
      context.moveTo(150, 230);
      context.quadraticCurveTo(196, 116, 450, 104);
      context.quadraticCurveTo(704, 116, 750, 230);
      context.stroke();
      context.restore();
    }

    if (!hasFrameArt) {
      context.fillStyle = "rgba(49, 168, 255, 0.08)";
      context.beginPath();
      context.moveTo(130, 238);
      context.quadraticCurveTo(450, 30, 770, 238);
      context.lineTo(714, 386);
      context.quadraticCurveTo(450, 230, 186, 386);
      context.closePath();
      context.fill();
    }

    drawLabel("IMPOL", canvas.width / 2, 178, "#edf7fb", 68);
    drawLabel("ALUMINIUM INDUSTRY", canvas.width / 2, 230, "#9ab3bf", 24);

    drawIndustrialDecorationAssets();
    drawFutureGameplayAssetHints();
    drawMechanicalDetailAssets();
    drawLowerLanePolish();
    drawUpperOrbit();

    if (!hasSideTargetArt) {
      context.fillStyle = "#1b3541";
      context.strokeStyle = "rgba(126, 147, 156, 0.72)";
      context.lineWidth = 6;
      context.beginPath();
      context.moveTo(190, 775);
      context.lineTo(320, 728);
      context.lineTo(306, 794);
      context.lineTo(206, 836);
      context.closePath();
      context.fill();
      context.stroke();

      context.beginPath();
      context.moveTo(710, 775);
      context.lineTo(580, 728);
      context.lineTo(594, 794);
      context.lineTo(694, 836);
      context.closePath();
      context.fill();
      context.stroke();
    }

    drawConfiguredBumpers();
    drawConfiguredTargets();
    drawLockHouse();
    drawConfiguredRollovers();
    drawDecorativeLamps();
    drawConfiguredSlingshots();

    drawShooterChannel();
    drawSkillShotMarker();
    drawDrainAssembly();
    drawMissionLights();

    context.fillStyle = "#31a8ff";
    context.beginPath();
    context.arc(450, 1026, 18, 0, Math.PI * 2);
    context.fill();

    if (!drawDecorAsset("innovation-label-plate", 450, 1084, 232, 41, {
      alpha: 0.9,
      shadowColor: "rgba(49, 168, 255, 0.28)",
      shadowBlur: 8,
      shadowOffsetY: 4
    })) {
      drawLabel("INNOVATION", 450, 1084, "#31a8ff", 28);
    }
  }

  function createMatterWorld() {
    if (!MatterLib) {
      return null;
    }

    const { Bodies, Body, Composite, Engine, Events } = MatterLib;
    const engine = Engine.create();
    engine.gravity.y = 0.88;

    const wallOptions = {
      isStatic: true,
      restitution: 0.38,
      friction: 0.035,
      render: { visible: true }
    };

    const staticBodies = [
      Bodies.rectangle(TABLE.width / 2, 44, TABLE.width - 150, 42, {
        ...wallOptions,
        label: "top-wall"
      }),
      Bodies.rectangle(74, TABLE.height / 2, 42, TABLE.height - 210, {
        ...wallOptions,
        label: "left-wall"
      }),
      Bodies.rectangle(TABLE.shooterLane.outerX + 34, TABLE.height / 2, 42, TABLE.height - 210, {
        ...wallOptions,
        label: "right-wall"
      }),
      Bodies.rectangle(225, 1225, 260, 32, {
        ...wallOptions,
        label: "left-outlane-guide",
        angle: 0.58
      }),
      Bodies.rectangle(675, 1225, 260, 32, {
        ...wallOptions,
        label: "right-outlane-guide",
        angle: -0.58
      }),
      Bodies.rectangle(TABLE.shooterLane.innerX, 760, 18, 920, {
        ...wallOptions,
        label: "launch-lane-divider"
      }),
      Bodies.rectangle(TABLE.shooterLane.outerX - 36, TABLE.shooterLane.bottomY + 26, 112, 24, {
        ...wallOptions,
        label: "launch-lane-plunger-stop"
      }),
      Bodies.rectangle(TABLE.shooterLane.innerX + 78, 212, 168, 18, {
        ...wallOptions,
        restitution: 0.18,
        label: "launch-lane-top-exit",
        angle: -0.72
      }),
      Bodies.rectangle(686, 278, 104, 44, {
        isStatic: true,
        isSensor: true,
        label: "skill-shot-sensor"
      }),
      Bodies.rectangle(450, 1354, 270, 54, {
        isStatic: true,
        isSensor: true,
        label: "drain-sensor"
      })
    ];
    const flippers = {
      left: Bodies.rectangle(
        0,
        0,
        TABLE.flippers.left.length,
        TABLE.flippers.left.height,
        {
          isStatic: true,
          label: "left-flipper",
          angle: TABLE.flippers.left.restAngle,
          restitution: 0.08,
          friction: 0.14
        }
      ),
      right: Bodies.rectangle(
        0,
        0,
        TABLE.flippers.right.length,
        TABLE.flippers.right.height,
        {
          isStatic: true,
          label: "right-flipper",
          angle: TABLE.flippers.right.restAngle,
          restitution: 0.08,
          friction: 0.14
        }
      )
    };
    const bumperBodies = TABLE_CONFIG.bumpers.map((bumper) => {
      const body = Bodies.circle(bumper.x, bumper.y, bumper.radius, {
        isStatic: true,
        label: `bumper:${bumper.id}`,
        restitution: 0.96,
        friction: 0.018
      });
      body.gameObject = { ...bumper, type: "bumper" };
      return body;
    });
    const targetBodies = TABLE_CONFIG.targets.map((target) => {
      const body = Bodies.rectangle(target.x, target.y, target.width, target.height, {
        isStatic: true,
        isSensor: true,
        label: `target:${target.id}`
      });
      body.gameObject = { ...target, type: "target" };
      return body;
    });
    const slingshotBodies = TABLE_CONFIG.slingshots.map((slingshot) => {
      const body = Bodies.rectangle(slingshot.x, slingshot.y, slingshot.width, slingshot.height, {
        isStatic: true,
        isSensor: true,
        label: `slingshot:${slingshot.id}`,
        angle: slingshot.angle
      });
      body.gameObject = { ...slingshot, type: "slingshot" };
      return body;
    });
    const rolloverBodies = TABLE_CONFIG.rollovers.map((rollover) => {
      const body = Bodies.circle(rollover.x, rollover.y, rollover.radius, {
        isStatic: true,
        isSensor: true,
        label: `rollover:${rollover.id}`
      });
      body.gameObject = { ...rollover, type: "rollover" };
      return body;
    });
    const laneBodies = TABLE_CONFIG.lanes.map((lane) => {
      const body = Bodies.rectangle(lane.x, lane.y, lane.width, lane.height, {
        isStatic: true,
        isSensor: true,
        label: `lane:${lane.id}`,
        angle: lane.angle
      });
      body.gameObject = { ...lane, type: "lane" };
      return body;
    });
    const orbitRailBodies = TABLE_CONFIG.upperOrbit.rails.map((rail, index) =>
      Bodies.rectangle(rail.x, rail.y, rail.width, rail.height, {
        isStatic: true,
        isSensor: true,
        label: `upper-orbit-rail:${index + 1}`,
        angle: rail.angle
      })
    );
    const orbitSensorBodies = [
      Bodies.rectangle(
        TABLE_CONFIG.upperOrbit.entrySensor.x,
        TABLE_CONFIG.upperOrbit.entrySensor.y,
        TABLE_CONFIG.upperOrbit.entrySensor.width,
        TABLE_CONFIG.upperOrbit.entrySensor.height,
        {
          isStatic: true,
          isSensor: true,
          label: "upper-orbit-entry",
          angle: TABLE_CONFIG.upperOrbit.entrySensor.angle
        }
      ),
      Bodies.rectangle(
        TABLE_CONFIG.upperOrbit.returnSensor.x,
        TABLE_CONFIG.upperOrbit.returnSensor.y,
        TABLE_CONFIG.upperOrbit.returnSensor.width,
        TABLE_CONFIG.upperOrbit.returnSensor.height,
        {
          isStatic: true,
          isSensor: true,
          label: "upper-orbit-return",
          angle: TABLE_CONFIG.upperOrbit.returnSensor.angle
        }
      )
    ];
    const lockHouseSensorBodies = [
      Bodies.rectangle(
        TABLE_CONFIG.lockHouse.mouth.x,
        TABLE_CONFIG.lockHouse.mouth.y,
        TABLE_CONFIG.lockHouse.mouth.width,
        TABLE_CONFIG.lockHouse.mouth.height,
        {
          isStatic: true,
          isSensor: true,
          label: "lock-house-entrance",
          angle: TABLE_CONFIG.lockHouse.mouth.angle
        }
      )
    ];

    const ball = createBallBody("ball-1", getBallStartPosition());

    Composite.add(engine.world, [
      ...staticBodies,
      ...bumperBodies,
      ...targetBodies,
      ...slingshotBodies,
      ...rolloverBodies,
      ...laneBodies,
      ...orbitRailBodies,
      ...orbitSensorBodies,
      ...lockHouseSensorBodies,
      flippers.left,
      flippers.right,
      ball
    ]);

    [...staticBodies, ...bumperBodies, ...targetBodies, ...slingshotBodies, ...rolloverBodies, ...laneBodies, ...orbitRailBodies, ...orbitSensorBodies, ...lockHouseSensorBodies, flippers.left, flippers.right].forEach((body) => {
      Body.setStatic(body, true);
    });

    positionFlipper(flippers.left, TABLE.flippers.left, TABLE.flippers.left.restAngle);
    positionFlipper(flippers.right, TABLE.flippers.right, TABLE.flippers.right.restAngle);

    Events.on(engine, "collisionStart", (event) => {
      event.pairs.forEach((pair) => {
        const labels = [pair.bodyA.label, pair.bodyB.label];
        const pairBall = getPairBall(pair);
        if (pairBall && labels.includes("drain-sensor") && labels.includes("pinball")) {
          recordDiagnosticEvent("drain", { ball: pairBall, reason: "drain-sensor" });
          drainBall(pairBall);
        }

        if (pairBall && labels.includes("launch-lane-top-exit") && labels.includes("pinball")) {
          guideBallOutOfShooterLane(pairBall, "top-exit-sensor");
        }

        if (labels.includes("skill-shot-sensor") && labels.includes("pinball")) {
          awardSkillShot();
        }

        if (pairBall && labels.includes("upper-orbit-entry")) {
          startUpperOrbit(pairBall);
        }

        if (pairBall && labels.includes("upper-orbit-return")) {
          completeUpperOrbit(pairBall);
        }

        if (pairBall && labels.includes("lock-house-entrance")) {
          handleLockHouseContact(pairBall);
        }

        const hitObject = getHitObject(pair);
        if (hitObject) {
          handleTableHit(hitObject, pairBall);
        }
      });
    });

    return {
      engine,
      staticBodies,
      bumperBodies,
      targetBodies,
      slingshotBodies,
      rolloverBodies,
      laneBodies,
      orbitRailBodies,
      orbitSensorBodies,
      lockHouseSensorBodies,
      flippers,
      ball,
      activeBalls: [ball],
      nextBallId: 2
    };
  }

  const physics = createMatterWorld();

  function createBallBody(id, position) {
    const ball = MatterLib.Bodies.circle(position.x, position.y, 26, {
      label: "pinball",
      restitution: 0.74,
      friction: 0.005,
      frictionAir: 0.00125,
      density: 0.0011
    });
    ball.gameBallId = id;
    return ball;
  }

  function getPairBall(pair) {
    if (pair.bodyA.label === "pinball") {
      return pair.bodyA;
    }

    if (pair.bodyB.label === "pinball") {
      return pair.bodyB;
    }

    return null;
  }

  function getActiveBalls() {
    return physics ? physics.activeBalls.filter((ball) => ball && !ball.isRemoved) : [];
  }

  function syncPrimaryBall() {
    if (!physics) {
      return;
    }

    const activeBalls = getActiveBalls();
    physics.activeBalls = activeBalls;
    physics.ball = activeBalls[0] || physics.ball;
  }

  function positionFlipper(body, config, angle) {
    const centerX = config.pivotX + Math.cos(angle) * config.length * 0.5;
    const centerY = config.pivotY + Math.sin(angle) * config.length * 0.5;

    MatterLib.Body.setPosition(body, { x: centerX, y: centerY });
    MatterLib.Body.setAngle(body, angle);
  }

  function resetBall(ball, holdForLaunch) {
    if (!MatterLib || !ball) {
      return;
    }

    MatterLib.Body.setStatic(ball, Boolean(holdForLaunch));
    MatterLib.Body.setPosition(ball, getBallStartPosition());
    MatterLib.Body.setVelocity(ball, { x: 0, y: 0 });
    MatterLib.Body.setAngularVelocity(ball, 0);
  }

  function holdBallInLaunchLane() {
    if (!physics || !["ready", "charging", "between-balls", "game-over"].includes(gameState.status)) {
      return;
    }

    MatterLib.Body.setStatic(physics.ball, true);
    MatterLib.Body.setPosition(physics.ball, getBallStartPosition());
    MatterLib.Body.setVelocity(physics.ball, { x: 0, y: 0 });
    MatterLib.Body.setAngularVelocity(physics.ball, 0);
  }

  function getBallStartPosition() {
    const lane = TABLE.shooterLane;
    return {
      x: lane.plungerCenterX || TABLE.ballStart.x,
      y: TABLE.ballStart.y
    };
  }

  function launchBall() {
    if (!physics || gameState.status !== "charging") {
      return;
    }

    const power = Math.max(0.58, gameState.plungerPower);
    MatterLib.Body.setStatic(physics.ball, false);
    MatterLib.Body.setVelocity(physics.ball, {
      x: 0,
      y: -25 - power * 15
    });
    gameState.status = "playing";
    gameState.skillShotAvailableUntil = performance.now() + 2600;
    gameState.skillShotAwarded = false;
    gameState.ballSaveUntil = gameState.ballSaveUsed ? 0 : performance.now() + BALL_SAVE_DURATION;
    armSideShield();
    gameState.plungerPower = 0;
    inputState.chargingSince = 0;
    updateMetaRewardTimeout();
    audio.play("launch", { power });
    syncInspectableState(physics);
  }

  function addActiveBall(position, velocity) {
    if (!physics) {
      return null;
    }

    const ball = createBallBody(`ball-${physics.nextBallId}`, position);
    physics.nextBallId += 1;
    MatterLib.Composite.add(physics.engine.world, ball);
    physics.activeBalls.push(ball);
    MatterLib.Body.setVelocity(ball, velocity);
    MatterLib.Body.setAngularVelocity(ball, (velocity.x || 0) * 0.04);
    syncPrimaryBall();
    return ball;
  }

  function addLaunchedMultiball() {
    const ball = addActiveBall(getBallStartPosition(), MULTIBALL.launchVelocity);

    if (ball) {
      MatterLib.Body.setStatic(ball, false);
    }

    return ball;
  }

  function autoLaunchLockHouseReplacementBall() {
    const ball = addActiveBall(getBallStartPosition(), LOCK_HOUSE.autoLaunchVelocity);
    const now = performance.now();

    if (!ball) {
      return null;
    }

    MatterLib.Body.setStatic(ball, false);
    gameState.status = "playing";
    gameState.plungerPower = 0;
    gameState.skillShotAvailableUntil = 0;
    gameState.skillShotAwarded = false;
    gameState.ballSaveUsed = false;
    gameState.ballSaveUntil = Math.max(gameState.ballSaveUntil, now + BALL_SAVE_DURATION);
    gameState.resetAt = 0;
    gameState.upperOrbit.active = false;
    gameState.upperOrbit.stage = "idle";
    gameState.upperOrbit.ballId = "";
    armSideShield();

    recordDiagnosticEvent("lock-house-auto-launch", {
      ball,
      eventName: "lock-house:auto-launch",
      objectId: LOCK_HOUSE.id,
      label: "Lock house replacement ball",
      kind: "launched",
      metrics: {
        ballsLeft: gameState.ballsLeft,
        ballNumber: gameState.ballNumber,
        lockedCount: gameState.lockHouse.lockedCount
      }
    });
    audio.play("launch", { power: 1 });
    return ball;
  }

  function removeActiveBall(ball) {
    if (!physics || !ball) {
      return;
    }

    ball.isRemoved = true;
    MatterLib.Composite.remove(physics.engine.world, ball);
    physics.activeBalls = physics.activeBalls.filter((activeBall) => activeBall !== ball && !activeBall.isRemoved);
    syncPrimaryBall();
  }

  function removeBallFromActivePlayForHold(ball) {
    if (!physics || !ball) {
      return false;
    }

    MatterLib.Body.setStatic(ball, true);
    MatterLib.Body.setPosition(ball, {
      x: LOCK_HOUSE.mouth.x,
      y: LOCK_HOUSE.mouth.y
    });
    MatterLib.Body.setVelocity(ball, { x: 0, y: 0 });
    MatterLib.Body.setAngularVelocity(ball, 0);
    MatterLib.Composite.remove(physics.engine.world, ball);
    physics.activeBalls = physics.activeBalls.filter((activeBall) => activeBall !== ball);
    heldLockHouseBallBody = ball;
    syncPrimaryBall();
    return true;
  }

  function restoreHeldLockHouseBallToShooter() {
    if (!physics) {
      return null;
    }

    let ball = heldLockHouseBallBody;

    if (!ball) {
      ball = createBallBody(gameState.lockHouse.heldBallId || `ball-${physics.nextBallId}`, getBallStartPosition());
      if (!gameState.lockHouse.heldBallId) {
        physics.nextBallId += 1;
      }
    }

    ball.isRemoved = false;
    MatterLib.Composite.add(physics.engine.world, ball);
    if (!physics.activeBalls.includes(ball)) {
      physics.activeBalls.push(ball);
    }
    resetBall(ball, true);
    physics.ball = ball;
    heldLockHouseBallBody = null;
    syncPrimaryBall();
    return ball;
  }

  function clearHeldLockHouseBall(reason = "cleared") {
    if (!heldLockHouseBallBody && !gameState.lockHouse.heldBallId && gameState.lockHouse.state !== "holding" && gameState.lockHouse.state !== "kicking") {
      return;
    }

    if (heldLockHouseBallBody && physics) {
      MatterLib.Composite.remove(physics.engine.world, heldLockHouseBallBody);
      if (physics.ball === heldLockHouseBallBody) {
        physics.ball = physics.activeBalls[0] || null;
      }
    }

    heldLockHouseBallBody = null;
    gameState.lockHouse.heldBallId = "";
    gameState.lockHouse.holdStartedAt = 0;
    gameState.lockHouse.holdPosition = null;
    gameState.lockHouse.recoveryReason = reason;
    gameState.lockHouse.recoveryAt = performance.now();

    if (gameState.lockHouse.state === "holding" || gameState.lockHouse.state === "kicking") {
      gameState.lockHouse.state = isLockHouseQualified() ? "qualified" : "closed";
    }
  }

  function clearLockedLockHouseBalls(reason = "cleared") {
    if (!lockedLockHouseBallBodies.length && !lockHouseReleaseQueue.length && !(gameState.lockHouse.lockedCount || 0)) {
      return;
    }

    [...lockedLockHouseBallBodies, ...lockHouseReleaseQueue].forEach((ball) => {
      if (ball && physics) {
        MatterLib.Composite.remove(physics.engine.world, ball);
      }
    });
    lockedLockHouseBallBodies = [];
    lockHouseReleaseQueue = [];
    gameState.lockHouse.lockedBallIds = [];
    gameState.lockHouse.lockedCount = 0;
    gameState.lockHouse.lockMultiballStartedAt = 0;
    gameState.lockHouse.nextReleaseAt = 0;
    gameState.lockHouse.releaseCount = 0;
    gameState.lockHouse.recoveryReason = reason;
    gameState.lockHouse.recoveryAt = performance.now();
  }

  function ensurePrimaryBallBody() {
    if (!physics) {
      return null;
    }

    const activeBalls = getActiveBalls();

    if (activeBalls.length) {
      physics.ball = activeBalls[0];
      return physics.ball;
    }

    const ball = createBallBody(`ball-${physics.nextBallId}`, getBallStartPosition());
    physics.nextBallId += 1;
    MatterLib.Composite.add(physics.engine.world, ball);
    physics.activeBalls = [ball];
    physics.ball = ball;
    return ball;
  }

  function removeExtraBalls() {
    if (!physics) {
      return;
    }

    const primaryBall = physics.ball || physics.activeBalls[0];
    physics.activeBalls
      .filter((ball) => ball !== primaryBall)
      .forEach((ball) => removeActiveBall(ball));
    physics.activeBalls = primaryBall ? [primaryBall] : [];
    physics.ball = primaryBall;
  }

  function getMultiballRequirement() {
    const starts = gameState.multiball.starts || 0;
    const configuredRequirement = MULTIBALL.progressRequirements[starts];

    if (configuredRequirement) {
      return configuredRequirement;
    }

    const lastConfiguredRequirement = MULTIBALL.progressRequirements[MULTIBALL.progressRequirements.length - 1];
    const overflowStarts = starts - MULTIBALL.progressRequirements.length + 1;
    return Math.min(MULTIBALL.maxRequirement, lastConfiguredRequirement + overflowStarts * MULTIBALL.requirementStep);
  }

  function syncMultiballRequirement() {
    gameState.multiball.nextRequirement = getMultiballRequirement();
  }

  function resetMultiballState() {
    gameState.multiball.active = false;
    gameState.multiball.startedAt = 0;
    gameState.multiball.endedAt = 0;
    gameState.multiball.graceUntil = 0;
    gameState.multiball.peakBalls = 1;
    clearJackpots();
  }

  function lightJackpots() {
    const now = performance.now();
    gameState.jackpot = createJackpotState();
    gameState.jackpot.active = true;
    gameState.jackpot.startedAt = now;
    gameState.jackpot.litTargetIds = [...JACKPOT.normalTargetIds];
    gameState.jackpot.superLit = areAllRequiredMissionsComplete();
  }

  function clearJackpots() {
    if (!gameState.jackpot.active && !gameState.jackpot.startedAt) {
      return;
    }

    const endedAt = performance.now();
    gameState.jackpot.active = false;
    gameState.jackpot.litTargetIds = [];
    gameState.jackpot.superLit = false;
    gameState.jackpot.endedAt = endedAt;
  }

  function isJackpotLitForObject(object) {
    if (!object || !gameState.jackpot.active || !gameState.multiball.active) {
      return false;
    }

    if (object.id === JACKPOT.superTargetId) {
      return gameState.jackpot.superLit && !gameState.jackpot.superCollected;
    }

    return gameState.jackpot.litTargetIds.includes(object.id);
  }

  function getJackpotLitLabels() {
    if (!gameState.jackpot.active) {
      return [];
    }

    const normalLabels = gameState.jackpot.litTargetIds
      .map((targetId) => TABLE_CONFIG.targets.find((target) => target.id === targetId))
      .filter(Boolean)
      .map((target) => target.label);

    if (gameState.jackpot.superLit && !gameState.jackpot.superCollected) {
      normalLabels.push("KOSOVNICA SUPER");
    }

    return normalLabels;
  }

  function maybeAwardJackpot(object) {
    if (!isJackpotLitForObject(object)) {
      return false;
    }

    const isSuper = object.id === JACKPOT.superTargetId;
    const value = (isSuper ? JACKPOT.superValue : JACKPOT.normalValue) * getActiveMultiplier();
    gameState.score += value;
    setHighScore(gameState.score);

    if (isSuper) {
      gameState.jackpot.superCollected = true;
      gameState.jackpot.superLit = false;
    } else {
      gameState.jackpot.collectedTargetIds.push(object.id);
      gameState.jackpot.litTargetIds = gameState.jackpot.litTargetIds.filter((targetId) => targetId !== object.id);
      gameState.jackpot.superLit = true;
    }

    const label = isSuper ? "SUPER JACKPOT" : "JACKPOT";
    gameState.jackpot.lastAwardLabel = label;
    gameState.jackpot.lastAwardValue = value;
    setFeedback(`${label} +${value.toLocaleString("sl-SI")}`, isSuper ? 1800 : 1350, "jackpot");
    addHitFeedback({
      id: `${label.toLowerCase().replace(" ", "-")}-${object.id}`,
      x: object.x,
      y: object.y,
      accent: isSuper ? "#ffb967" : "#31a8ff",
      label,
      color: isSuper ? "#ffb967" : "#edf7fb"
    });
    audio.play(isSuper ? "super-jackpot" : "jackpot");
    return true;
  }

  function startMultiball(sourceLabel, options = {}) {
    if (!physics || gameState.status !== "playing") {
      return;
    }

    const wasActive = gameState.multiball.active;
    const activeBalls = getActiveBalls();
    const missingBalls = Math.max(0, MULTIBALL.maxBalls - activeBalls.length);

    for (let index = 0; index < missingBalls; index += 1) {
      addLaunchedMultiball();
    }

    const now = performance.now();
    gameState.multiball.active = true;
    gameState.multiball.startedAt = now;
    gameState.multiball.endedAt = 0;
    gameState.multiball.graceUntil = now + MULTIBALL.graceMs;
    gameState.multiball.peakBalls = getActiveBalls().length;
    gameState.multiball.lastStartSource = sourceLabel;
    lightJackpots();

    if (!wasActive && options.advanceDifficulty !== false) {
      gameState.multiball.starts += 1;
      gameState.multiball.progress = 0;
      syncMultiballRequirement();
    }

    recordDiagnosticEvent("multiball-start", {
      eventName: "multiball:start",
      objectId: "multiball",
      label: sourceLabel,
      kind: wasActive ? "already-active" : "started"
    });
    gameState.ballSaveUsed = false;
    gameState.ballSaveUntil = Math.max(gameState.ballSaveUntil, gameState.multiball.graceUntil);
    setFeedback(`${sourceLabel}: TWO-BALL MULTIBALL`, 2200, "multiball", now);
    addHitFeedback({
      id: "multiball-start",
      x: 450,
      y: 300,
      accent: "#31a8ff",
      label: "TWO-BALL MULTIBALL",
      color: "#edf7fb"
    });
    updateHud();
    syncInspectableState(physics);
  }

  function advanceMultiballProgressFromMission(mission) {
    if (gameState.status !== "playing" || gameState.multiball.active) {
      return;
    }

    syncMultiballRequirement();
    gameState.multiball.progress = Math.min(gameState.multiball.nextRequirement, gameState.multiball.progress + 1);

    if (gameState.multiball.progress >= gameState.multiball.nextRequirement) {
      startMultiball(`${mission.label} REWARD`);
      audio.play("multiball-start");
      return;
    }

    const remaining = gameState.multiball.nextRequirement - gameState.multiball.progress;
    if (remaining <= 1) {
      setFeedback(`MULTIBALL MISSIONS ${gameState.multiball.progress}/${gameState.multiball.nextRequirement}`, 850, "progress");
    }
  }

  function endMultiball() {
    if (!gameState.multiball.active) {
      return;
    }

    gameState.multiball.active = false;
    gameState.multiball.endedAt = performance.now();
    gameState.multiball.graceUntil = 0;
    clearJackpots();
    recordDiagnosticEvent("multiball-end", {
      eventName: "multiball:end",
      objectId: "multiball",
      label: "Multiball complete",
      kind: "ended"
    });
    setFeedback("MULTIBALL COMPLETE", 1300, "multiball");
    addHitFeedback({
      id: "multiball-end",
      x: 450,
      y: 948,
      accent: "#ffb967",
      label: "MULTIBALL ENDED",
      color: "#ffb967"
    });
  }

  function tryMultiballSave(ball) {
    if (!gameState.multiball.active || performance.now() > gameState.multiball.graceUntil) {
      return false;
    }

    MatterLib.Body.setStatic(ball, false);
    MatterLib.Body.setPosition(ball, getBallStartPosition());
    MatterLib.Body.setVelocity(ball, MULTIBALL.launchVelocity);
    MatterLib.Body.setAngularVelocity(ball, 0);
    setFeedback("MULTIBALL BALL SAVE", 1200, "save");
    recordDiagnosticEvent("multiball-save", {
      ball,
      eventName: "multiball:grace-save",
      objectId: ball.gameBallId || "ball",
      label: "Multiball grace save"
    });
    addHitFeedback({
      id: `multiball-save-${ball.gameBallId || "ball"}`,
      x: 450,
      y: 322,
      accent: "#7bdc6c",
      label: "MULTIBALL SAVE",
      color: "#7bdc6c"
    });
    audio.play("mission-progress");
    syncInspectableState(physics);
    return true;
  }

  function guideBallOutOfShooterLane(ball, reason = "exit-guide") {
    const lane = TABLE.shooterLane;

    if (ball.position.x < lane.innerX - 24 || ball.position.y > lane.exitY + 100) {
      return;
    }

    recordDiagnosticEvent("shooter-lane-exit", {
      ball,
      reason,
      eventName: "shooter-lane-exit",
      objectId: "shooter-lane",
      label: "Shooter lane exit"
    });
    MatterLib.Body.setPosition(ball, {
      x: lane.innerX - 22,
      y: Math.max(ball.position.y, lane.exitY + 30)
    });
    MatterLib.Body.setVelocity(ball, {
      x: -6.4,
      y: 2.2
    });
    awardSkillShot();
  }

  function awardSkillShot() {
    if (gameState.status !== "playing" || gameState.skillShotAwarded || performance.now() > gameState.skillShotAvailableUntil) {
      return;
    }

    const points = SCORING_RULES.values.skillShot * getActiveMultiplier();
    gameState.skillShotAwarded = true;
    gameState.score += points;
    setHighScore(gameState.score);
    gameState.lastEvent = "hit:SKILL_SHOT";
    setFeedback(`SKILL SHOT +${points.toLocaleString("sl-SI")}`, 1100, "progress");
    gameState.hitCounts["skill-shot"] = performance.now();
    updateCompanyForEvent(gameState.lastEvent);
    addHitFeedback({
      id: "skill-shot",
      x: 686,
      y: 278,
      accent: "#ff9b3d",
      label: `SKILL +${points.toLocaleString("sl-SI")}`,
      color: "#ffb967"
    });
    audio.play("skill-shot");
    updateHud();
    syncInspectableState(physics);
  }

  function getHitObject(pair) {
    if (pair.bodyA.label === "pinball" && pair.bodyB.gameObject) {
      return pair.bodyB.gameObject;
    }

    if (pair.bodyB.label === "pinball" && pair.bodyA.gameObject) {
      return pair.bodyA.gameObject;
    }

    return null;
  }

  function getLockHouseCaptureBlockedReason(ball) {
    if (!ball) {
      return "missing-ball";
    }

    if (gameState.status !== "playing") {
      return "not-playing";
    }

    if (!gameState.lockHouse.captureEnabled) {
      return "capture-disabled";
    }

    if (gameState.multiball.active || getActiveBalls().length !== 1) {
      return LOCK_HOUSE.multiballPolicy;
    }

    if (performance.now() < gameState.lockHouse.recaptureDisabledUntil) {
      return "recapture-disabled";
    }

    if (!isLockHouseEntranceOpen()) {
      return "not-qualified";
    }

    if (gameState.lockHouse.state === "holding" || gameState.lockHouse.heldBallId) {
      return "already-holding";
    }

    if (!isLockHouseContactFromBelow(ball)) {
      return "wrong-direction";
    }

    if (!getActiveBalls().includes(ball)) {
      return "ball-not-active";
    }

    return "";
  }

  function isLockHouseContactFromBelow(ball) {
    if (!ball) {
      return false;
    }

    const mouth = LOCK_HOUSE.mouth;
    const lowerEdge = mouth.y + mouth.height * 0.12;
    return ball.velocity.y <= LOCK_HOUSE.minimumUpwardLockVelocity && ball.position.y >= lowerEdge;
  }

  function captureLockHouseBall(ball) {
    const blockedReason = getLockHouseCaptureBlockedReason(ball);
    const now = performance.now();
    const state = gameState.lockHouse;

    if (blockedReason) {
      state.blockedCaptureCount += 1;
      state.lastCaptureBlockedReason = blockedReason;
      recordDiagnosticEvent("lock-house-capture-blocked", {
        ball,
        eventName: "lock-house:capture-blocked",
        objectId: LOCK_HOUSE.id,
        label: LOCK_HOUSE.label,
        kind: blockedReason
      });
      return false;
    }

    const heldBallId = ball.gameBallId || "ball";
    const lockedCountAfterCapture = Math.min(LOCK_HOUSE.maxLockedBalls, (state.lockedCount || 0) + 1);
    const removed = removeBallFromActivePlayForHold(ball);

    if (!removed) {
      state.blockedCaptureCount += 1;
      state.lastCaptureBlockedReason = "remove-failed";
      return false;
    }

    state.state = "holding";
    state.heldBallId = heldBallId;
    state.holdStartedAt = now;
    state.holdPosition = {
      x: Math.round(LOCK_HOUSE.mouth.x),
      y: Math.round(LOCK_HOUSE.mouth.y)
    };
    state.recoveryReason = "";
    state.recoveryAt = 0;
    state.captureCount += 1;
    state.lastCaptureBlockedReason = "";
    gameState.upperOrbit.active = false;
    gameState.upperOrbit.stage = "idle";
    gameState.upperOrbit.ballId = "";
    resetCombo();

    recordDiagnosticEvent("lock-house-capture", {
      ball,
      eventName: "lock-house:capture",
      objectId: LOCK_HOUSE.id,
      label: heldBallId,
      kind: "locked",
      metrics: {
        activeBallCount: getActiveBalls().length,
        captureCount: state.captureCount,
        lockedCount: lockedCountAfterCapture
      }
    });
    const startedLockMultiball = lockCapturedBallInHouse(now);
    if (!startedLockMultiball) {
      setFeedback(`BALL LOCKED ${state.lockedCount}/${LOCK_HOUSE.maxLockedBalls}`, 1500, "progress", now);
    }
    addHitFeedback({
      id: `${LOCK_HOUSE.id}-hold`,
      x: LOCK_HOUSE.mouth.x,
      y: LOCK_HOUSE.mouth.y,
      accent: LOCK_HOUSE.qualifiedAccent,
      label: startedLockMultiball ? "3-BALL" : `${state.lockedCount}/3`,
      color: "#7bdc6c"
    });
    audio.play("lock-house-locked");
    updateHud();
    syncInspectableState(physics);
    return true;
  }

  function lockCapturedBallInHouse(now = performance.now()) {
    const state = gameState.lockHouse;
    const ball = heldLockHouseBallBody;

    if (!ball || !state.heldBallId) {
      recoverLockHouseHold("inconsistent-lock");
      return false;
    }

    lockedLockHouseBallBodies.push(ball);
    state.lockedBallIds = lockedLockHouseBallBodies.map((lockedBall) => lockedBall.gameBallId || "ball");
    state.lockedCount = state.lockedBallIds.length;
    heldLockHouseBallBody = null;
    state.heldBallId = "";
    state.holdStartedAt = 0;
    state.holdPosition = null;
    state.lastKickoutAt = 0;
    state.kickoutStartedAt = 0;
    state.recoveryReason = "";
    state.recoveryAt = 0;
    state.requalificationLevel += 1;
    clearLockHouseQualificationProgress();

    recordDiagnosticEvent("lock-house-ball-locked", {
      ball,
      eventName: "lock-house:ball-locked",
      objectId: LOCK_HOUSE.id,
      label: ball.gameBallId || "ball",
      kind: state.lockedCount >= LOCK_HOUSE.maxLockedBalls ? "multiball-ready" : "stored",
      metrics: {
        lockedCount: state.lockedCount,
        lockedBallIds: [...state.lockedBallIds]
      }
    });

    if (state.lockedCount >= LOCK_HOUSE.maxLockedBalls) {
      return startLockHouseMultiball();
    }

    state.state = "closed";
    state.recaptureDisabledUntil = now + LOCK_HOUSE.kickoutGraceMs;
    autoLaunchLockHouseReplacementBall();
    return false;
  }

  function recoverLockHouseHold(reason = "hold-timeout", options = {}) {
    const state = gameState.lockHouse;

    if (state.state !== "holding" && !state.heldBallId && !heldLockHouseBallBody) {
      return false;
    }

    const ball = restoreHeldLockHouseBallToShooter();
    const now = performance.now();
    state.state = "closed";
    clearLockHouseQualificationProgress();
    state.heldBallId = "";
    state.holdStartedAt = 0;
    state.holdPosition = null;
    state.recoveryReason = reason;
    state.recoveryAt = now;
    state.lastCaptureBlockedReason = "";
    gameState.status = "ready";
    gameState.resetAt = 0;
    gameState.plungerPower = 0;
    gameState.ballSaveUntil = 0;
    gameState.ballSaveUsed = false;
    gameState.bomMode.active = false;
    gameState.bomMode.step = 0;
    gameState.bomMode.deadline = 0;
    resetCombo();

    recordDiagnosticEvent("lock-house-recovery", {
      ball,
      eventName: "lock-house:recovery",
      objectId: LOCK_HOUSE.id,
      label: LOCK_HOUSE.label,
      kind: reason,
      metrics: {
        activeBallCount: getActiveBalls().length
      }
    });

    if (!options.silent) {
      setFeedback("LOCK HOUSE RECOVERY", 1400, "system", now);
      addHitFeedback({
        id: `${LOCK_HOUSE.id}-recovery`,
        x: LOCK_HOUSE.mouth.x,
        y: LOCK_HOUSE.mouth.y,
        accent: LOCK_HOUSE.accent,
        label: "RECOVER",
        color: "#ffb967"
      });
    }

    updateHud();
    syncInspectableState(physics);
    return true;
  }

  function awardLockHouseReward(ball) {
    const state = gameState.lockHouse;
    const value = SCORING_RULES.values.lockHouseReward * getActiveMultiplier();
    const now = performance.now();

    gameState.score += value;
    setHighScore(gameState.score);
    state.lastRewardAt = now;
    state.lastRewardValue = value;

    recordDiagnosticEvent("lock-house-reward", {
      ball,
      eventName: "lock-house:reward",
      objectId: LOCK_HOUSE.id,
      label: LOCK_HOUSE.label,
      kind: "awarded",
      metrics: {
        value,
        score: gameState.score,
        multiplier: getActiveMultiplier()
      }
    });
    setFeedback(`LOCK HOUSE +${value.toLocaleString("sl-SI")}`, 1500, "progress", now);
    addHitFeedback({
      id: `${LOCK_HOUSE.id}-reward`,
      x: LOCK_HOUSE.mouth.x,
      y: LOCK_HOUSE.mouth.y,
      accent: "#ffb967",
      label: `+${value.toLocaleString("sl-SI")}`,
      color: "#ffb967"
    });
    audio.play("lock-house-reward");
    return value;
  }

  function restoreHeldLockHouseBallForKickout() {
    if (!physics) {
      return null;
    }

    let ball = heldLockHouseBallBody;

    if (!ball) {
      ball = createBallBody(gameState.lockHouse.heldBallId || `ball-${physics.nextBallId}`, LOCK_HOUSE.kickoutPosition);
      if (!gameState.lockHouse.heldBallId) {
        physics.nextBallId += 1;
      }
    }

    ball.isRemoved = false;
    MatterLib.Composite.add(physics.engine.world, ball);
    if (!physics.activeBalls.includes(ball)) {
      physics.activeBalls.push(ball);
    }

    MatterLib.Body.setStatic(ball, false);
    MatterLib.Body.setPosition(ball, LOCK_HOUSE.kickoutPosition);
    MatterLib.Body.setVelocity(ball, LOCK_HOUSE.kickoutVelocity);
    MatterLib.Body.setAngularVelocity(ball, -0.2);
    physics.ball = ball;
    heldLockHouseBallBody = null;
    syncPrimaryBall();
    return ball;
  }

  function kickoutLockHouseBall() {
    const state = gameState.lockHouse;

    if (state.state !== "holding" || !state.heldBallId || !heldLockHouseBallBody) {
      recoverLockHouseHold("inconsistent-kickout");
      return false;
    }

    const now = performance.now();
    state.state = "kicking";
    state.kickoutStartedAt = now;
    awardLockHouseReward(heldLockHouseBallBody);
    const ball = restoreHeldLockHouseBallForKickout();

    state.heldBallId = "";
    state.holdStartedAt = 0;
    state.holdPosition = null;
    state.lastKickoutAt = now;
    state.kickoutCount += 1;
    state.recaptureDisabledUntil = now + LOCK_HOUSE.kickoutGraceMs;
    state.requalificationLevel += 1;
    state.recoveryReason = "";
    state.recoveryAt = 0;
    state.lastCaptureBlockedReason = "";
    clearLockHouseQualificationProgress();
    gameState.status = "playing";
    gameState.ballSaveUntil = Math.max(gameState.ballSaveUntil, now + 1200);

    recordDiagnosticEvent("lock-house-kickout", {
      ball,
      eventName: "lock-house:kickout",
      objectId: LOCK_HOUSE.id,
      label: LOCK_HOUSE.label,
      kind: "kicked",
      metrics: {
        activeBallCount: getActiveBalls().length,
        velocityX: LOCK_HOUSE.kickoutVelocity.x,
        velocityY: LOCK_HOUSE.kickoutVelocity.y,
        recaptureDisabledUntil: state.recaptureDisabledUntil,
        requalificationLevel: state.requalificationLevel
      }
    });
    addHitFeedback({
      id: `${LOCK_HOUSE.id}-kickout`,
      x: LOCK_HOUSE.mouth.x,
      y: LOCK_HOUSE.mouth.y,
      accent: LOCK_HOUSE.accent,
      label: "KICKOUT",
      color: "#ffb967"
    });
    audio.play("lock-house-kickout");
    updateHud();
    syncInspectableState(physics);
    return true;
  }

  function updateLockHouseHold() {
    const state = gameState.lockHouse;

    if (state.state === "kicking") {
      const now = performance.now();
      releaseLockHouseQueuedBall(now);

      if (!lockHouseReleaseQueue.length && now >= state.recaptureDisabledUntil) {
        state.state = "closed";
        updateHud();
        syncInspectableState(physics);
      }
      return;
    }

    if (state.state !== "holding") {
      return;
    }

    if (!state.heldBallId || !heldLockHouseBallBody) {
      recoverLockHouseHold("inconsistent-hold");
      return;
    }

    const holdElapsedMs = performance.now() - state.holdStartedAt;

    if (holdElapsedMs >= LOCK_HOUSE.holdTimeoutMs) {
      recoverLockHouseHold("hold-timeout");
      return;
    }

    if (holdElapsedMs >= LOCK_HOUSE.holdDurationMs) {
      kickoutLockHouseBall();
    }
  }

  function handleLockHouseContact(ball) {
    if (gameState.status !== "playing") {
      return;
    }

    const now = performance.now();
    const state = gameState.lockHouse;
    state.lastContactAt = now;
    state.lastContactState = state.state;
    state.contactCount += 1;
    gameState.hitCounts[LOCK_HOUSE.id] = now;
    recordDiagnosticEvent("lock-house-contact", {
      ball,
      eventName: LOCK_HOUSE.event,
      objectId: LOCK_HOUSE.id,
      label: LOCK_HOUSE.label,
      kind: state.state
    });

    if (captureLockHouseBall(ball)) {
      return;
    }

    if (isLockHouseEntranceOpen()) {
      const blockedReason = state.lastCaptureBlockedReason;
      const blockedLabel = blockedReason === LOCK_HOUSE.multiballPolicy
        ? "LOCK DISABLED IN MULTIBALL"
        : blockedReason === "wrong-direction"
          ? "LOCK FROM BELOW"
          : "LOCK HOUSE READY";
      setFeedback(blockedLabel, 700, "progress", now);
      addHitFeedback({
        id: LOCK_HOUSE.id,
        x: LOCK_HOUSE.mouth.x,
        y: LOCK_HOUSE.mouth.y,
        accent: LOCK_HOUSE.qualifiedAccent,
        label: blockedReason === LOCK_HOUSE.multiballPolicy ? "MB OFF" : blockedReason === "wrong-direction" ? "BELOW" : "READY",
        color: "#7bdc6c"
      });
      audio.play(blockedReason === LOCK_HOUSE.multiballPolicy ? "lock-house-closed" : "lock-house-opening");
    } else {
      setFeedback(getLockHouseProgressLabel(), 620, "hit", now);
      audio.play("lock-house-closed");
    }

    updateHud();
    syncInspectableState(physics);
  }

  function releaseLockHouseQueuedBall(now = performance.now()) {
    const state = gameState.lockHouse;

    if (!physics || state.state !== "kicking" || !lockHouseReleaseQueue.length || now < state.nextReleaseAt) {
      return null;
    }

    const ball = lockHouseReleaseQueue.shift();
    const releaseIndex = state.releaseCount;
    const position = {
      x: LOCK_HOUSE.kickoutPosition.x + releaseIndex * 7,
      y: LOCK_HOUSE.kickoutPosition.y - releaseIndex * 9
    };
    const velocity = {
      x: LOCK_HOUSE.kickoutVelocity.x + releaseIndex * 0.65,
      y: LOCK_HOUSE.kickoutVelocity.y - releaseIndex * 0.2
    };

    ball.isRemoved = false;
    MatterLib.Composite.add(physics.engine.world, ball);
    if (!physics.activeBalls.includes(ball)) {
      physics.activeBalls.push(ball);
    }
    MatterLib.Body.setStatic(ball, false);
    MatterLib.Body.setPosition(ball, position);
    MatterLib.Body.setVelocity(ball, velocity);
    MatterLib.Body.setAngularVelocity(ball, -0.2 - releaseIndex * 0.08);
    syncPrimaryBall();

    state.releaseCount += 1;
    state.kickoutCount += 1;
    state.lastKickoutAt = now;
    state.nextReleaseAt = lockHouseReleaseQueue.length ? now + LOCK_HOUSE.multiballReleaseDelayMs : 0;
    state.recaptureDisabledUntil = Math.max(state.recaptureDisabledUntil, now + LOCK_HOUSE.kickoutGraceMs);
    gameState.multiball.peakBalls = Math.max(gameState.multiball.peakBalls, getActiveBalls().length + lockHouseReleaseQueue.length);

    recordDiagnosticEvent("lock-house-multiball-release", {
      ball,
      eventName: "lock-house:multiball-release",
      objectId: LOCK_HOUSE.id,
      label: ball.gameBallId || "locked-ball",
      kind: "released",
      metrics: {
        releaseIndex: releaseIndex + 1,
        remaining: lockHouseReleaseQueue.length,
        activeBallCount: getActiveBalls().length
      }
    });
    addHitFeedback({
      id: `${LOCK_HOUSE.id}-release-${releaseIndex + 1}`,
      x: LOCK_HOUSE.mouth.x,
      y: LOCK_HOUSE.mouth.y,
      accent: "#31a8ff",
      label: `MB ${releaseIndex + 1}`,
      color: "#edf7fb"
    });
    audio.play("lock-house-kickout");

    return ball;
  }

  function startLockHouseMultiball() {
    if (!physics || gameState.status !== "playing" || gameState.multiball.active) {
      return false;
    }

    const state = gameState.lockHouse;
    const now = performance.now();
    lockHouseReleaseQueue = lockedLockHouseBallBodies.splice(0, LOCK_HOUSE.maxLockedBalls);

    while (lockHouseReleaseQueue.length < LOCK_HOUSE.maxLockedBalls) {
      lockHouseReleaseQueue.push(createBallBody(`ball-${physics.nextBallId}`, LOCK_HOUSE.kickoutPosition));
      physics.nextBallId += 1;
    }

    state.state = "kicking";
    state.kickoutStartedAt = now;
    state.lockMultiballStartedAt = now;
    state.nextReleaseAt = now;
    state.releaseCount = 0;
    state.lockedBallIds = [];
    state.lockedCount = 0;
    state.heldBallId = "";
    state.holdStartedAt = 0;
    state.holdPosition = null;
    state.lastCaptureBlockedReason = "";
    clearLockHouseQualificationProgress();

    gameState.multiball.active = true;
    gameState.multiball.startedAt = now;
    gameState.multiball.endedAt = 0;
    gameState.multiball.graceUntil = now + MULTIBALL.graceMs;
    gameState.multiball.peakBalls = LOCK_HOUSE.maxLockedBalls;
    gameState.multiball.lastStartSource = LOCK_HOUSE.label;
    gameState.multiball.starts += 1;
    gameState.multiball.progress = 0;
    syncMultiballRequirement();
    lightJackpots();
    gameState.ballSaveUsed = false;
    gameState.ballSaveUntil = Math.max(gameState.ballSaveUntil, gameState.multiball.graceUntil);

    recordDiagnosticEvent("multiball-start", {
      eventName: "multiball:start",
      objectId: "multiball",
      label: LOCK_HOUSE.label,
      kind: "lock-house-started",
      metrics: {
        lockedBalls: LOCK_HOUSE.maxLockedBalls,
        releaseDelayMs: LOCK_HOUSE.multiballReleaseDelayMs
      }
    });
    recordDiagnosticEvent("lock-house-multiball-start", {
      eventName: "lock-house:multiball-start",
      objectId: LOCK_HOUSE.id,
      label: "Lock house three-ball multiball",
      kind: "started"
    });
    setFeedback("LOCK HOUSE: THREE-BALL MULTIBALL", 2400, "multiball", now);
    addHitFeedback({
      id: `${LOCK_HOUSE.id}-multiball`,
      x: LOCK_HOUSE.mouth.x,
      y: LOCK_HOUSE.mouth.y,
      accent: "#31a8ff",
      label: "3-BALL MB",
      color: "#edf7fb"
    });
    audio.play("multiball-start");
    releaseLockHouseQueuedBall(now);
    updateHud();
    syncInspectableState(physics);
    return true;
  }

  function getScoringObjectType(object) {
    if (object.id === UPPER_ORBIT.id) {
      return "route";
    }

    if (object.side && (object.type === "inlane" || object.type === "outlane")) {
      return "lane";
    }

    if (TABLE_CONFIG.lanes.some((lane) => lane.id === object.id)) {
      return "lane";
    }

    if (TABLE_CONFIG.rollovers.some((rollover) => rollover.id === object.id)) {
      return "rollover";
    }

    if (TABLE_CONFIG.slingshots.some((slingshot) => slingshot.id === object.id)) {
      return "slingshot";
    }

    if (TABLE_CONFIG.bumpers.some((bumper) => bumper.id === object.id)) {
      return "bumper";
    }

    if (TABLE_CONFIG.targets.some((target) => target.id === object.id)) {
      return "target";
    }

    return object.type || "default";
  }

  function getSensorRehitRule(object) {
    return SENSOR_REHIT_RULES[getScoringObjectType(object)] || SENSOR_REHIT_RULES.default;
  }

  function getBallObjectRehitKey(object, ball) {
    const ballId = ball?.gameBallId || "primary";
    return `${ballId}:${object.id}`;
  }

  function suppressScoringHit(object, ball, reason, now) {
    const rehits = gameState.scoringRehits;
    rehits.suppressedCounts[object.id] = (rehits.suppressedCounts[object.id] || 0) + 1;
    rehits.lastSuppressedAt = now;
    rehits.lastSuppressedObjectId = object.id;
    rehits.lastSuppressedReason = reason;
    recordDiagnosticEvent("suppressed-hit", {
      ball,
      eventName: object.event || "",
      objectId: object.id,
      label: object.label,
      kind: reason
    });
  }

  function tryRegisterScoringHit(object, ball) {
    if (!object?.id) {
      return true;
    }

    const now = performance.now();
    const rule = getSensorRehitRule(object);
    const lastObjectHitAt = gameState.scoringRehits.objectLastHitAt[object.id] || 0;

    if (lastObjectHitAt && now - lastObjectHitAt < rule.objectCooldownMs) {
      suppressScoringHit(object, ball, "object-cooldown", now);
      return false;
    }

    const ballObjectKey = getBallObjectRehitKey(object, ball);
    const lastBallObjectHitAt = gameState.scoringRehits.ballObjectLastHitAt[ballObjectKey] || 0;

    if (lastBallObjectHitAt && now - lastBallObjectHitAt < rule.ballObjectCooldownMs) {
      suppressScoringHit(object, ball, "ball-object-cooldown", now);
      return false;
    }

    gameState.scoringRehits.objectLastHitAt[object.id] = now;
    gameState.scoringRehits.ballObjectLastHitAt[ballObjectKey] = now;
    return true;
  }

  function getComboZone(object) {
    if (object.id === UPPER_ORBIT.id) {
      return "upper-route";
    }

    if (object.comboZone) {
      return object.comboZone;
    }

    const vertical = object.y < 520 ? "upper" : object.y < 820 ? "mid" : "lower";
    const side = object.x < 360 ? "left" : object.x > 540 ? "right" : "center";
    return `${vertical}-${side}`;
  }

  function isMeaningfulComboObject(object) {
    return !COMBO_PASSIVE_TYPES.has(getScoringObjectType(object));
  }

  function getDistinctCount(values) {
    return new Set(values.filter(Boolean)).size;
  }

  function appendComboHistory(history, value) {
    const nextHistory = [...history, value].slice(-COMBO_HISTORY_LIMIT);
    return nextHistory;
  }

  function getComboTier(count, zoneHistory, objectHistory) {
    if (count < COMBO_TIERS.small.minCount) {
      return "none";
    }

    const distinctZones = getDistinctCount(zoneHistory);
    const distinctObjects = getDistinctCount(objectHistory);

    if (
      count >= COMBO_TIERS.max.minCount &&
      distinctZones >= COMBO_TIERS.max.requiredZones &&
      distinctObjects >= COMBO_TIERS.max.requiredObjects
    ) {
      return "max";
    }

    if (
      count >= COMBO_TIERS.medium.minCount &&
      distinctZones >= COMBO_TIERS.medium.requiredZones &&
      distinctObjects >= COMBO_TIERS.medium.requiredObjects
    ) {
      return "medium";
    }

    return "small";
  }

  function getComboBonus(tier, count) {
    if (tier === "max") {
      return MAX_COMBO_BONUS;
    }

    if (tier === "medium") {
      if (count <= 4) {
        return COMBO_BONUS_BY_COUNT[4];
      }

      return count === 5 ? COMBO_BONUS_BY_COUNT[5] : SCORING_RULES.values.comboMediumSix;
    }

    if (tier === "small") {
      return COMBO_BONUS_BY_COUNT[Math.min(count, 3)] || COMBO_BONUS_BY_COUNT[2];
    }

    return 0;
  }

  function startComboChain(object, zone, now) {
    gameState.comboCount = 1;
    gameState.comboUntil = now + COMBO_WINDOW_MS;
    gameState.comboLastObjectId = object.id;
    gameState.comboLastZone = zone;
    gameState.comboTier = "none";
    gameState.comboZoneStreak = 1;
    gameState.comboObjectHistory = [object.id];
    gameState.comboZoneHistory = [zone];

    return {
      count: gameState.comboCount,
      tier: gameState.comboTier,
      bonus: 0,
      distinctZones: 1,
      distinctObjects: 1
    };
  }

  function formatComboLabel(combo = gameState) {
    const tier = combo.tier || gameState.comboTier;
    const tierLabel = tier && tier !== "none" ? `${COMBO_TIERS[tier].label.toUpperCase()} ` : "";
    return `${combo.count || gameState.comboCount}x ${tierLabel}COMBO`;
  }

  function handleTableHit(object, ball) {
    if (gameState.status !== "playing") {
      return;
    }

    if (object.type === "lane") {
      handleLaneHit(object, ball);
      return;
    }

    if (!tryRegisterScoringHit(object, ball)) {
      syncInspectableState(physics);
      return;
    }

    const points = object.points * getActiveMultiplier();
    const combo = registerComboHit(object);
    gameState.score += points + combo.bonus;
    setHighScore(gameState.score);
    gameState.lastEvent = object.event;
    recordDiagnosticEvent("hit", {
      ball,
      eventName: object.event,
      objectId: object.id,
      label: object.label
    });
    setFeedback(
      combo.bonus
        ? `${formatComboLabel(combo)} +${combo.bonus.toLocaleString("sl-SI")}`
        : `+${points.toLocaleString("sl-SI")} ${object.label}`,
      700,
      combo.bonus ? "combo" : "hit"
    );
    gameState.hitCounts[object.id] = performance.now();
    addHitFeedback({
      id: object.id,
      x: object.x,
      y: object.y,
      accent: object.accent,
      label: combo.bonus ? `${formatComboLabel(combo)} +${combo.bonus.toLocaleString("sl-SI")}` : `+${points.toLocaleString("sl-SI")}`,
      color: combo.bonus ? "#ffb967" : "#edf7fb"
    });
    const jackpotWillAward = isJackpotLitForObject(object);

    if (!jackpotWillAward && combo.bonus) {
      audio.play("combo");
    }

    updateCompanyForEvent(object.event);
    updateCompanyForCombo(object, combo);
    maybeOpenSideShieldFromScoring(object, combo);

    if (object.type === "bumper") {
      audio.play("bumper", { variant: object.id });
      kickBallFromObject(ball, object);
    } else if (object.type === "slingshot") {
      audio.play("bumper");
      kickBallFromSlingshot(ball, object);
    } else {
      audio.play("target");
    }

    if (object.type !== "slingshot" && object.type !== "rollover") {
      const didAdvanceMission = advanceMissions(object.event);
      const progressionCue = didAdvanceMission ? "" : getProgressionCueForEvent(object.event);
      if (progressionCue) {
        setFeedback(`${object.label}: ${progressionCue}`, 850, "progress");
      }
      updateBomMode(object.event);
    }
    advanceLockHouseQualification(object.event, ball);
    if (object.type === "rollover") {
      updateRolloverLamps(object);
    }
    maybeAwardJackpot(object);
    updateHud();
    syncInspectableState(physics);
  }

  function isCommittedOrbitEntry(ball) {
    return (
      ball.position.x <= UPPER_ORBIT.committedX &&
      ball.position.y <= UPPER_ORBIT.committedY &&
      ball.velocity.y < -2.2
    );
  }

  function startUpperOrbit(ball) {
    if (
      gameState.status !== "playing" ||
      !ball ||
      (gameState.upperOrbit.active && gameState.upperOrbit.ballId === ball.gameBallId)
    ) {
      return;
    }

    if (!isCommittedOrbitEntry(ball)) {
      if (ball.velocity.y < -2) {
        recordDiagnosticEvent("orbit-mouth-reject", {
          ball,
          eventName: "upper-orbit-mouth",
          objectId: UPPER_ORBIT.id,
          label: UPPER_ORBIT.label,
          kind: "not-committed"
        });
      }
      return;
    }

    gameState.upperOrbit.active = true;
    gameState.upperOrbit.stage = "ascending";
    gameState.upperOrbit.ballId = ball.gameBallId;
    gameState.upperOrbit.startedAt = performance.now();
    gameState.hitCounts["upper-orbit-entry"] = performance.now();
    recordDiagnosticEvent("orbit-entry", {
      ball,
      eventName: "upper-orbit-entry",
      objectId: UPPER_ORBIT.id,
      label: UPPER_ORBIT.label
    });
    setFeedback("ALU FLOW ORBIT", 700, "hit");
    MatterLib.Body.setVelocity(ball, {
      x: Math.max(0.8, Math.min(2.8, ball.velocity.x * 0.14 + 1.05)),
      y: Math.min(-13.8, ball.velocity.y - 0.65)
    });
    audio.play("orbit-entry");
    updateHud();
    syncInspectableState(physics);
  }

  function completeUpperOrbit(ball) {
    const state = gameState.upperOrbit;
    const now = performance.now();

    if (
      gameState.status !== "playing" ||
      !state.active ||
      state.stage !== "returning" ||
      state.ballId !== ball?.gameBallId ||
      now - state.startedAt > UPPER_ORBIT.timeoutMs ||
      ball.velocity.y <= 1
    ) {
      return;
    }

    if (!tryRegisterScoringHit(UPPER_ORBIT, ball)) {
      state.active = false;
      state.stage = "idle";
      state.ballId = "";
      syncInspectableState(physics);
      return;
    }

    const combo = registerComboHit(UPPER_ORBIT);
    const routePoints = UPPER_ORBIT.points * getActiveMultiplier();
    const award = routePoints + combo.bonus;
    gameState.score += award;
    setHighScore(gameState.score);
    state.active = false;
    state.stage = "idle";
    state.ballId = "";
    state.completedRuns += 1;
    state.lastCompletedAt = now;
    state.lastAward = award;
    gameState.lastEvent = UPPER_ORBIT.event;
    gameState.hitCounts[UPPER_ORBIT.id] = now;
    recordDiagnosticEvent("orbit-complete", {
      ball,
      eventName: UPPER_ORBIT.event,
      objectId: UPPER_ORBIT.id,
      label: UPPER_ORBIT.label
    });
    setFeedback(
      combo.bonus
        ? `ORBIT ${formatComboLabel(combo)} +${award.toLocaleString("sl-SI")}`
        : `ORBIT COMPLETE +${award.toLocaleString("sl-SI")}`,
      1200,
      combo.bonus ? "combo" : "progress",
      now
    );
    addHitFeedback({
      id: UPPER_ORBIT.id,
      x: UPPER_ORBIT.returnSensor.x,
      y: UPPER_ORBIT.returnSensor.y,
      accent: UPPER_ORBIT.accent
    });
    audio.play("combo");
    updateCompanyForEvent(UPPER_ORBIT.event);
    updateCompanyForCombo(UPPER_ORBIT, combo);
    advanceMissions(UPPER_ORBIT.event);
    advanceLockHouseQualification(UPPER_ORBIT.event, ball);
    updateHud();
    syncInspectableState(physics);
  }

  function failUpperOrbit(ball, reason) {
    const state = gameState.upperOrbit;

    if (!state.active) {
      return;
    }

    state.active = false;
    state.stage = "idle";
    state.ballId = "";
    state.lastFailedAt = performance.now();
    state.lastFailureReason = reason;
    recordDiagnosticEvent("orbit-fail-safe", {
      ball,
      eventName: "upper-orbit-fail-safe",
      objectId: UPPER_ORBIT.id,
      label: UPPER_ORBIT.label,
      kind: reason
    });

    if (ball && ball.position.y > 690 && ball.position.x < 285) {
      MatterLib.Body.setVelocity(ball, {
        x: Math.max(2.8, ball.velocity.x),
        y: Math.max(4.8, ball.velocity.y)
      });
    }

    updateHud();
    syncInspectableState(physics);
  }

  function isBallInOrbitReturnZone(ball) {
    const sensor = UPPER_ORBIT.returnSensor;
    const radius = ball?.circleRadius || 26;

    return (
      Boolean(ball) &&
      Math.abs(ball.position.x - sensor.x) <= sensor.width / 2 + radius * 0.42 &&
      Math.abs(ball.position.y - sensor.y) <= sensor.height / 2 + radius * 0.42
    );
  }

  function updateUpperOrbitGuide() {
    const state = gameState.upperOrbit;

    if (!state.active || gameState.status !== "playing") {
      return;
    }

    const ball = getActiveBalls().find((candidate) => candidate.gameBallId === state.ballId);
    const now = performance.now();

    if (!ball) {
      failUpperOrbit(null, "missing-ball");
      return;
    }

    if (now - state.startedAt > UPPER_ORBIT.timeoutMs) {
      failUpperOrbit(ball, "timeout");
      return;
    }

    if (state.stage === "ascending" && ball.position.y > 930 && ball.velocity.y > 1.4) {
      failUpperOrbit(ball, "rolled-out");
      return;
    }

    if (state.stage === "ascending" && ball.position.y < 246) {
      state.stage = "returning";
      MatterLib.Body.setVelocity(ball, {
        x: Math.max(7.4, ball.velocity.x),
        y: Math.max(4.8, Math.abs(ball.velocity.y) * 0.34)
      });
      updateHud();
      return;
    }

    if (state.stage === "ascending") {
      const targetX = ball.position.y < 330 ? 220 : ball.position.y < 720 ? 166 : 176;
      const correction = Math.max(-1.7, Math.min(1.7, (targetX - ball.position.x) * 0.075));
      MatterLib.Body.setVelocity(ball, {
        x: ball.velocity.x * 0.24 + correction,
        y: Math.min(-12.8, ball.velocity.y)
      });
      return;
    }

    if (state.stage === "returning" && ball.position.x > 175 && ball.position.x < 370 && ball.position.y < 440) {
      MatterLib.Body.setVelocity(ball, {
        x: Math.max(4.8, Math.min(8.2, ball.velocity.x)),
        y: Math.max(4.8, Math.min(7.2, ball.velocity.y))
      });

      if (isBallInOrbitReturnZone(ball)) {
        completeUpperOrbit(ball);
      }
    }
  }

  function maybeDetectUpperOrbitEntryOverlap() {
    if (!physics || gameState.status !== "playing") {
      return;
    }

    getActiveBalls().forEach((ball) => {
      if (
        !gameState.upperOrbit.active &&
        isBallInsideRotatedZone(ball, UPPER_ORBIT.entrySensor, 0.62)
      ) {
        startUpperOrbit(ball);
      }
    });
  }

  function updateRolloverLamps(rollover) {
    gameState.rollovers.lit[rollover.id] = true;

    const allLit = TABLE_CONFIG.rollovers.every((rolloverConfig) => gameState.rollovers.lit[rolloverConfig.id]);
    if (!allLit) {
      return;
    }

    const bonus = ROLLOVER_COMPLETE_BONUS * getActiveMultiplier();
    gameState.score += bonus;
    setHighScore(gameState.score);
    gameState.rollovers.completedSets += 1;
    gameState.rollovers.lastCompletedAt = performance.now();
    TABLE_CONFIG.rollovers.forEach((rolloverConfig) => {
      gameState.rollovers.lit[rolloverConfig.id] = false;
    });
    setFeedback(`ROLLOVERS COMPLETE +${bonus.toLocaleString("sl-SI")}`, 950, "progress");
    addHitFeedback({
      id: "rollover-complete",
      x: 450,
      y: 1000,
      accent: "#ffb967",
      label: `ROLL +${bonus.toLocaleString("sl-SI")}`,
      color: "#ffb967"
    });
    audio.play("combo");
  }

  function isSideShieldActive() {
    return gameState.status === "playing" && !gameState.lanes.sideShieldUsed && performance.now() <= gameState.lanes.sideShieldUntil;
  }

  function armSideShield(now = performance.now()) {
    gameState.lanes.sideShieldUntil = now + SIDE_SHIELD_DURATION;
    gameState.lanes.sideShieldUsed = false;
    gameState.lanes.sideShieldOpenedAt = 0;
    gameState.lanes.sideShieldOpenReason = "";
  }

  function openSideShield(reason) {
    if (!isSideShieldActive()) {
      return;
    }

    gameState.lanes.sideShieldUntil = 0;
    gameState.lanes.sideShieldOpenedAt = performance.now();
    gameState.lanes.sideShieldOpenReason = reason;
  }

  function updateSideShieldTimeout() {
    if (gameState.status !== "playing" || gameState.lanes.sideShieldUsed || !gameState.lanes.sideShieldUntil) {
      return;
    }

    if (performance.now() <= gameState.lanes.sideShieldUntil) {
      return;
    }

    gameState.lanes.sideShieldOpenedAt = performance.now();
    gameState.lanes.sideShieldOpenReason = "timer";
    gameState.lanes.sideShieldUntil = 0;
    updateHud();
    syncInspectableState(physics);
  }

  function maybeOpenSideShieldFromScoring(object, combo) {
    if (!isSideShieldActive() || object.type === "lane" || object.type === "rollover") {
      return;
    }

    if (object.type === "bumper") {
      openSideShield("first bumper");
      return;
    }

    if (combo.count >= 2 || combo.bonus > 0) {
      openSideShield("first scoring sequence");
    }
  }

  function rescueOutlaneWithSideShield(lane, ball) {
    if (!ball || lane.type !== "outlane" || !isSideShieldActive()) {
      return false;
    }

    gameState.lanes.sideShieldUsed = true;
    gameState.lanes.sideShieldUntil = 0;
    gameState.lanes.sideShieldOpenedAt = performance.now();
    gameState.lanes.sideShieldOpenReason = `${lane.side} shield save`;
    MatterLib.Body.setPosition(ball, {
      x: lane.returnX,
      y: lane.returnY
    });
    MatterLib.Body.setVelocity(ball, lane.returnVelocity);
    MatterLib.Body.setAngularVelocity(ball, lane.side === "left" ? 0.16 : -0.16);
    setFeedback("SIDE SHIELD SAVE", 1100, "save");
    recordDiagnosticEvent("side-shield-save", {
      ball,
      eventName: `hit:${lane.type.toUpperCase()}`,
      objectId: lane.id,
      label: lane.label,
      kind: lane.side
    });
    addHitFeedback({
      id: `side-shield-${lane.id}`,
      x: lane.x,
      y: lane.y,
      accent: "#7bdc6c",
      label: "SHIELD",
      color: "#7bdc6c"
    });
    audio.play("mission-progress");
    return true;
  }

  function handleLaneHit(lane, ball) {
    const now = performance.now();

    if (!tryRegisterScoringHit(lane, ball)) {
      syncInspectableState(physics);
      return;
    }

    gameState.lanes.lastHitAt[lane.id] = now;
    gameState.lanes.lit[lane.id] = true;
    gameState.hitCounts[lane.id] = now;
    gameState.lastEvent = `hit:${lane.type.toUpperCase()}`;
    recordDiagnosticEvent("hit", {
      ball,
      eventName: gameState.lastEvent,
      objectId: lane.id,
      label: lane.label
    });

    const points = lane.points * getActiveMultiplier();
    const combo = registerComboHit(lane);
    gameState.score += points + combo.bonus;
    setHighScore(gameState.score);
    setFeedback(
      combo.bonus
        ? `${formatComboLabel(combo)} +${combo.bonus.toLocaleString("sl-SI")}`
        : `${lane.label} +${points.toLocaleString("sl-SI")}`,
      700,
      combo.bonus ? "combo" : "hit",
      now
    );
    addHitFeedback({
      id: lane.id,
      x: lane.x,
      y: lane.y,
      accent: lane.accent,
      label: combo.bonus ? formatComboLabel(combo) : `+${points.toLocaleString("sl-SI")}`,
      color: lane.type === "outlane" ? "#ffb967" : "#edf7fb"
    });

    rescueOutlaneWithSideShield(lane, ball);
    updateLaneSetBonus();
    audio.play(lane.type === "outlane" ? "target" : "combo");
    updateHud();
    syncInspectableState(physics);
  }

  function updateLaneSetBonus() {
    const allLit = TABLE_CONFIG.lanes.every((lane) => gameState.lanes.lit[lane.id]);

    if (!allLit) {
      return;
    }

    const bonus = LANE_SET_BONUS * getActiveMultiplier();
    gameState.score += bonus;
    setHighScore(gameState.score);
    gameState.lanes.completedSets += 1;
    gameState.lanes.lastCompletedAt = performance.now();
    TABLE_CONFIG.lanes.forEach((lane) => {
      gameState.lanes.lit[lane.id] = false;
    });
    setFeedback(`LANES COMPLETE +${bonus.toLocaleString("sl-SI")}`, 950, "progress");
    addHitFeedback({
      id: "lane-complete",
      x: 450,
      y: 1194,
      accent: "#ffb967",
      label: `LANES +${bonus.toLocaleString("sl-SI")}`,
      color: "#ffb967"
    });
    audio.play("combo");
  }

  function addHitFeedback({ id, x, y, accent, label = "", color = "" }) {
    const now = performance.now();
    gameState.hitEffects.push({
      id,
      x,
      y,
      accent,
      label,
      color,
      radius: 26,
      duration: 520,
      until: now + 520
    });
  }

  function registerComboHit(object) {
    const now = performance.now();

    if (!isMeaningfulComboObject(object)) {
      if (gameState.comboUntil && now > gameState.comboUntil) {
        resetCombo();
      }

      return {
        count: gameState.comboCount,
        tier: gameState.comboTier,
        bonus: 0,
        passive: true,
        distinctZones: getDistinctCount(gameState.comboZoneHistory),
        distinctObjects: getDistinctCount(gameState.comboObjectHistory)
      };
    }

    const zone = getComboZone(object);
    const isWithinComboWindow = now <= gameState.comboUntil;
    const isSameObject = object.id === gameState.comboLastObjectId;
    const isSameZone = zone === gameState.comboLastZone;
    const nextZoneStreak = isSameZone ? gameState.comboZoneStreak + 1 : 1;

    if (!isWithinComboWindow || isSameObject || nextZoneStreak > COMBO_MAX_SAME_ZONE_STREAK) {
      return startComboChain(object, zone, now);
    }

    const objectHistory = appendComboHistory(gameState.comboObjectHistory, object.id);
    const zoneHistory = appendComboHistory(gameState.comboZoneHistory, zone);
    gameState.comboCount = Math.min(COMBO_MAX_COUNT, gameState.comboCount + 1);
    gameState.comboUntil = now + COMBO_WINDOW_MS;
    gameState.comboLastObjectId = object.id;
    gameState.comboLastZone = zone;
    gameState.comboZoneStreak = nextZoneStreak;
    gameState.comboObjectHistory = objectHistory;
    gameState.comboZoneHistory = zoneHistory;
    gameState.comboTier = getComboTier(gameState.comboCount, zoneHistory, objectHistory);

    if (gameState.comboCount < 2) {
      return {
        count: gameState.comboCount,
        tier: gameState.comboTier,
        bonus: 0,
        distinctZones: getDistinctCount(zoneHistory),
        distinctObjects: getDistinctCount(objectHistory)
      };
    }

    const baseBonus = getComboBonus(gameState.comboTier, gameState.comboCount);

    return {
      count: gameState.comboCount,
      tier: gameState.comboTier,
      bonus: baseBonus * getActiveMultiplier(),
      distinctZones: getDistinctCount(zoneHistory),
      distinctObjects: getDistinctCount(objectHistory)
    };
  }

  function resetCombo() {
    gameState.comboCount = 0;
    gameState.comboUntil = 0;
    gameState.comboLastObjectId = "";
    gameState.comboLastZone = "";
    gameState.comboTier = "none";
    gameState.comboZoneStreak = 0;
    gameState.comboObjectHistory = [];
    gameState.comboZoneHistory = [];
  }

  function updateComboTimeout() {
    if (gameState.comboUntil && performance.now() > gameState.comboUntil) {
      resetCombo();
      syncInspectableState(physics);
    }
  }

  function startBomMode() {
    gameState.bomMode.active = true;
    gameState.bomMode.step = 0;
    gameState.bomMode.deadline = performance.now() + BOM_MODE.duration;
    setFeedback("BOM ERROR: MANJKA REVIZIJA", 1400, "mode");
    audio.play("mission-progress");
  }

  function updateBomMode(eventName) {
    if (eventName === "hit:KOSOVNICA") {
      if (!gameState.missions.kosovnica.unlocked) {
        return;
      }

      startBomMode();
      return;
    }

    if (!gameState.bomMode.active) {
      return;
    }

    if (performance.now() > gameState.bomMode.deadline) {
      failBomMode("REVIZIJA ZAVRNJENA");
      return;
    }

    const expectedEvent = BOM_MODE.sequence[gameState.bomMode.step];

    if (eventName !== expectedEvent) {
      failBomMode("NAPAČNA POZICIJA");
      return;
    }

    gameState.bomMode.step += 1;
    gameState.bomMode.deadline = performance.now() + BOM_MODE.duration;

    if (gameState.bomMode.step >= BOM_MODE.sequence.length) {
      completeBomMode();
      return;
    }

    const nextLabel = BOM_MODE.labels[gameState.bomMode.step];
    setFeedback(`KOSOVNICA ${gameState.bomMode.step}/${BOM_MODE.sequence.length}: ${nextLabel}`, 1000, "mode");
    audio.play("mission-progress");
  }

  function completeBomMode() {
    const bonus = BOM_MODE.successBonus * getActiveMultiplier();
    gameState.bomMode.active = false;
    gameState.bomMode.step = 0;
    gameState.bomMode.deadline = 0;
    gameState.score += bonus;
    setHighScore(gameState.score);
    setCompanyStatus("rondal", "bonus", "Bonus");
    setFeedback(`KOSOVNICA USKLAJENA +${bonus.toLocaleString("sl-SI")}`, 1600, "mode");
    addHitFeedback({
      id: "kosovnica-complete",
      x: 450,
      y: 1040,
      accent: "#7bdc6c",
      label: `BOM OK +${bonus.toLocaleString("sl-SI")}`,
      color: "#7bdc6c"
    });
    audio.play("mission-complete");
  }

  function failBomMode(label) {
    gameState.bomMode.active = false;
    gameState.bomMode.step = 0;
    gameState.bomMode.deadline = 0;
    setFeedback(label, 1100, "mode");
    audio.play("target");
  }

  function updateBomModeTimeout() {
    if (!gameState.bomMode.active || gameState.status !== "playing") {
      return;
    }

    if (performance.now() > gameState.bomMode.deadline) {
      failBomMode("REVIZIJA ZAVRNJENA");
      updateHud();
      syncInspectableState(physics);
    }
  }

  function updateBallSaveTimeout() {
    if (gameState.ballSaveUntil && performance.now() > gameState.ballSaveUntil) {
      gameState.ballSaveUntil = 0;
    }
  }

  function updateMetaRewardTimeout() {
    if (!gameState.metaRewards.multiplierUntil && gameState.status === "playing" && gameState.metaRewards.multiplierRemainingMs > 0) {
      gameState.metaRewards.multiplierUntil = performance.now() + gameState.metaRewards.multiplierRemainingMs;
      updateHud();
      syncInspectableState(physics);
      return;
    }

    if (gameState.metaRewards.multiplierUntil && gameState.status !== "playing") {
      gameState.metaRewards.multiplierRemainingMs = getMetaMultiplierRemainingMs();
      gameState.metaRewards.multiplierUntil = 0;
      updateHud();
      syncInspectableState(physics);
      return;
    }

    if (gameState.metaRewards.multiplierUntil && performance.now() > gameState.metaRewards.multiplierUntil) {
      gameState.metaRewards.multiplierUntil = 0;
      gameState.metaRewards.multiplierRemainingMs = 0;
      gameState.metaRewards.multiplierValue = 1;
      updateHud();
      syncInspectableState(physics);
    }
  }

  function advanceMissions(eventName) {
    if (gameState.multiball.active) {
      return false;
    }

    const activeStageMissionIds = new Set(MISSION_STAGES[gameState.missionStageIndex] || []);
    let didAdvance = false;

    MISSION_CONFIG.forEach((mission) => {
      const state = gameState.missions[mission.id];

      if (state.completed || !state.unlocked || !activeStageMissionIds.has(mission.id) || mission.event !== eventName) {
        return;
      }

      state.progress = Math.min(mission.required, state.progress + 1);
      state.lastProgressAt = performance.now();
      gameState.activeMissionId = mission.id;
      didAdvance = true;
      updateCompanyForMissionProgress(mission);

      if (state.progress >= mission.required) {
        completeMission(mission, state);
      } else {
        setFeedback(`${mission.label} ${state.progress}/${mission.required}`, 850, "progress");
        audio.play("mission-progress");
      }
    });

    if (!didAdvance) {
      return false;
    }

    maybeUnlockNextMissionStage();
    setActiveMissionFromStage();
    return true;
  }

  function maybeUnlockNextMissionStage() {
    const currentStageMissionIds = MISSION_STAGES[gameState.missionStageIndex] || [];
    const isCurrentStageComplete = currentStageMissionIds.every((missionId) => gameState.missions[missionId].completed);

    if (!isCurrentStageComplete || gameState.missionStageIndex >= MISSION_STAGES.length - 1) {
      return;
    }

    gameState.missionStageIndex += 1;

    const nextStageMissionIds = MISSION_STAGES[gameState.missionStageIndex] || [];
    nextStageMissionIds.forEach((missionId) => {
      gameState.missions[missionId].unlocked = true;
    });

    const nextStageLabel = formatMissionNames(nextStageMissionIds);
    setFeedback(`STAGE ${gameState.missionStageIndex + 1} UNLOCKED: ${nextStageLabel}`, 1500, "progress");

    nextStageMissionIds.forEach((missionId) => {
      const mission = getMissionById(missionId);
      if (!mission) {
        return;
      }

      addHitFeedback({
        id: `unlock-${missionId}`,
        x: 450,
        y: 1006,
        accent: "#ff9b3d",
        label: `UNLOCK: ${mission.label}`,
        color: "#ffb967"
      });
    });

    audio.play("mission-progress");
  }

  function completeMission(mission, state) {
    state.completed = true;
    gameState.lastCompletedMissionId = mission.id;
    gameState.score += mission.bonus;
    setHighScore(gameState.score);
    updateCompanyForMissionComplete(mission);

    if (mission.multiplierReward) {
      gameState.multiplier = Math.max(gameState.multiplier, mission.multiplierReward);
      audio.play("multiplier");
    } else {
      audio.play("mission-complete");
    }

    setFeedback(`${mission.label} COMPLETE +${mission.bonus.toLocaleString("sl-SI")}`, 1300, "progress");
    advanceMultiballProgressFromMission(mission);
    maybeAwardMissionMetaReward();
  }

  function kickBallFromObject(ball, object) {
    const now = performance.now();
    const previousBumperHitAt = ball.lastBumperHitAt || 0;
    const previousBumperId = ball.lastBumperObjectId || "";
    const isFastBumperExchange = previousBumperId && previousBumperId !== object.id && now - previousBumperHitAt < 1050;
    const pingPongCount = isFastBumperExchange ? (ball.bumperPingPongCount || 0) + 1 : 0;
    const dx = ball.position.x - object.x;
    const dy = ball.position.y - object.y;
    const length = Math.max(1, Math.hypot(dx, dy));
    const radialX = dx / length;
    const radialY = dy / length;
    const tangentX = -radialY;
    const tangentY = radialX;
    const speed = Math.hypot(ball.velocity.x, ball.velocity.y);
    const tangentDot = ball.velocity.x * tangentX + ball.velocity.y * tangentY;
    const tangentDirection = Math.sign(tangentDot) || (ball.position.x < object.x ? -1 : 1);
    const radialKick = pingPongCount >= 3 ? 4.2 : 5.8;
    const tangentKick = pingPongCount >= 3 ? 1.4 : Math.min(4.2, Math.max(2.1, speed * 0.32));
    const retainedVelocity = pingPongCount >= 3 ? 0.24 : 0.38;
    let nextVelocity = {
      x: ball.velocity.x * retainedVelocity + radialX * radialKick + tangentX * tangentDirection * tangentKick,
      y: ball.velocity.y * retainedVelocity + radialY * radialKick + tangentY * tangentDirection * tangentKick
    };

    const outgoingSpeed = Math.hypot(nextVelocity.x, nextVelocity.y);
    const minOutgoingSpeed = pingPongCount >= 3
      ? 5.8
      : Math.min(10.8, Math.max(7.2, speed * 0.7));

    if (outgoingSpeed < minOutgoingSpeed) {
      const scale = minOutgoingSpeed / Math.max(0.1, outgoingSpeed);
      nextVelocity = {
        x: nextVelocity.x * scale,
        y: nextVelocity.y * scale
      };
    }

    if (pingPongCount >= 3) {
      const centerX = TABLE.width / 2;
      const exitDirection = object.x < centerX
        ? -1
        : object.x > centerX
          ? 1
          : Math.sign(ball.velocity.x || ball.position.x - centerX) || 1;
      nextVelocity = {
        x: exitDirection * Math.max(4.6, Math.abs(nextVelocity.x) * 0.72),
        y: Math.min(1.8, Math.max(-2.4, nextVelocity.y * 0.34))
      };
      ball.bumperPingPongCount = 0;
    } else {
      ball.bumperPingPongCount = pingPongCount;
    }

    ball.lastBumperHitAt = now;
    ball.lastBumperObjectId = object.id;
    MatterLib.Body.setVelocity(ball, nextVelocity);
  }

  function kickBallFromSlingshot(ball, slingshot) {
    const now = performance.now();
    const previousSlingshotHitAt = ball.lastSlingshotHitAt || 0;
    const previousSlingshotId = ball.lastSlingshotObjectId || "";
    const isFastSlingshotExchange = previousSlingshotId && previousSlingshotId !== slingshot.id && now - previousSlingshotHitAt < 950;
    const slingshotPingPongCount = isFastSlingshotExchange ? (ball.slingshotPingPongCount || 0) + 1 : 0;
    const speed = Math.hypot(ball.velocity.x, ball.velocity.y);
    const retainedVelocity = 0.42;
    const impulseScale = Math.min(1.2, Math.max(0.78, speed / 9));
    let nextVelocity = {
      x: ball.velocity.x * retainedVelocity + slingshot.impulse.x * impulseScale,
      y: Math.min(ball.velocity.y * retainedVelocity + slingshot.impulse.y * impulseScale, -5.2)
    };

    if (slingshotPingPongCount >= 2) {
      const breakDirection = slingshot.x < TABLE.width / 2 ? 1 : -1;
      nextVelocity = {
        x: breakDirection * Math.max(6.6, Math.abs(nextVelocity.x) * 0.82),
        y: Math.max(-5.8, Math.min(-3.2, nextVelocity.y * 0.28))
      };
      ball.slingshotPingPongCount = 0;
    } else {
      ball.slingshotPingPongCount = slingshotPingPongCount;
    }

    ball.lastSlingshotHitAt = now;
    ball.lastSlingshotObjectId = slingshot.id;
    MatterLib.Body.setVelocity(ball, nextVelocity);
  }

  function tryBallSave(ball) {
    if (gameState.ballSaveUsed || performance.now() > gameState.ballSaveUntil) {
      return false;
    }

    gameState.ballSaveUsed = true;
    gameState.ballSaveUntil = 0;
    gameState.status = "ready";
    gameState.resetAt = 0;
    gameState.plungerPower = 0;
    gameState.bomMode.active = false;
    gameState.bomMode.step = 0;
    gameState.bomMode.deadline = 0;
    gameState.upperOrbit.active = false;
    gameState.upperOrbit.stage = "idle";
    gameState.upperOrbit.ballId = "";
    clearHeldLockHouseBall("ball-save");
    resetCombo();
    resetBall(ball, true);
    setFeedback("BALL SAVE", 1400, "save");
    recordDiagnosticEvent("ball-save", {
      ball,
      eventName: "ball-save",
      objectId: ball.gameBallId || "ball",
      label: "Ball save"
    });
    addHitFeedback({
      id: "ball-save",
      x: 450,
      y: 1218,
      accent: "#7bdc6c",
      label: "BALL SAVE",
      color: "#7bdc6c"
    });
    audio.play("mission-progress");
    updateHud();
    syncInspectableState(physics);
    return true;
  }

  function drainBall(ball) {
    if (gameState.status !== "playing" || !ball || ball.isRemoved) {
      return;
    }

    clearHeldLockHouseBall("drain");

    if (tryMultiballSave(ball)) {
      return;
    }

    if (gameState.multiball.active && getActiveBalls().length > 1) {
      removeActiveBall(ball);
      gameState.drainCount += 1;
      resetCombo();

      if (getActiveBalls().length <= 1) {
        endMultiball();
      }

      updateHud();
      syncInspectableState(physics);
      return;
    }

    if (tryBallSave(ball)) {
      return;
    }

    gameState.drainCount += 1;
    gameState.ballSaveUntil = 0;
    gameState.ballSaveUsed = false;
    gameState.bomMode.active = false;
    gameState.bomMode.step = 0;
    gameState.bomMode.deadline = 0;
    gameState.upperOrbit.active = false;
    gameState.upperOrbit.stage = "idle";
    gameState.upperOrbit.ballId = "";
    resetCombo();
    gameState.ballsLeft = Math.max(0, gameState.ballsLeft - 1);
    setHighScore(gameState.score);

    if (gameState.ballsLeft === 0) {
      startGameOver(ball);
    } else {
      gameState.status = "between-balls";
      gameState.ballNumber += 1;
      gameState.resetAt = performance.now() + 900;
      endMultiball();
      removeExtraBalls();
      resetBall(ball, true);
      audio.play("drain");
    }

    updateHud();
    syncInspectableState(physics);
  }

  function startGameOver(ball) {
    const now = performance.now();

    gameState.status = "game-over";
    gameState.gameOverStartedAt = now;
    gameState.gameOverRestartAt = now + GAME_OVER_RESTART_DELAY_MS;
    gameState.finalScore = gameState.score;
    gameState.finalHighScore = gameState.highScore;
    gameState.finalWasRecord = gameState.score > gameState.previousHighScore;
    clearFeedback();
    inputState.space = false;
    inputState.chargingSince = 0;
    resetMultiballState();
    clearHeldLockHouseBall("game-over");
    clearLockedLockHouseBalls("game-over");
    removeExtraBalls();
    resetBall(ball, true);
    audio.play("game-over");
  }

  function restartGame() {
    if (!canRestartGameOver()) {
      updateRestartUi();
      return;
    }

    gameState.previousHighScore = gameState.highScore;
    gameState.score = 0;
    gameState.ballNumber = 1;
    gameState.ballsLeft = TABLE.totalBalls;
    gameState.multiplier = 1;
    gameState.status = "ready";
    gameState.resetAt = 0;
    gameState.drainCount = 0;
    gameState.plungerPower = 0;
    gameState.lastEvent = "";
    clearFeedback();
    gameState.gameOverStartedAt = 0;
    gameState.gameOverRestartAt = 0;
    gameState.finalScore = 0;
    gameState.finalHighScore = gameState.highScore;
    gameState.finalWasRecord = false;
    gameState.hitCounts = {};
    gameState.hitEffects = [];
    resetCombo();
    gameState.scoringRehits = createScoringRehitState();
    gameState.lowerTrapSince = 0;
    gameState.upperTrapSince = 0;
    gameState.upperTrapBallId = "";
    gameState.skillShotAvailableUntil = 0;
    gameState.skillShotAwarded = false;
    gameState.ballSaveUntil = 0;
    gameState.ballSaveUsed = false;
    gameState.multiball = createMultiballState();
    gameState.jackpot = createJackpotState();
    gameState.bomMode = {
      active: false,
      step: 0,
      deadline: 0
    };
    gameState.rollovers = createRolloverState();
    gameState.lanes = createLaneState();
    gameState.upperOrbit = createUpperOrbitState();
    clearHeldLockHouseBall("restart");
    clearLockedLockHouseBalls("restart");
    gameState.lockHouse = createLockHouseState();
    gameState.missionStageIndex = 0;
    gameState.activeMissionId = "measurement";
    gameState.lastCompletedMissionId = "";
    gameState.missions = createMissionState();
    gameState.activeCompanyId = "impol";
    gameState.companies = createCompanyState();
    gameState.metaRewards = createMetaRewardState();

    if (physics) {
      ensurePrimaryBallBody();
      removeExtraBalls();
      resetBall(physics.ball, true);
    }

    updateHud();
    syncInspectableState(physics);
  }

  function maybeFinishBetweenBalls() {
    if (gameState.status === "between-balls" && performance.now() >= gameState.resetAt) {
      resetBall(physics.ball, true);
      gameState.status = "ready";
      audio.play("reset");
      syncInspectableState(physics);
    }
  }

  function maybeCatchLostBall() {
    if (!physics || gameState.status !== "playing") {
      return;
    }

    getActiveBalls().forEach((ball) => {
      if (ball.position.y > TABLE.height + 80) {
        drainBall(ball);
      }
    });
  }

  function maybeRescueLowerFlipperTrap() {
    if (!physics || gameState.status !== "playing") {
      return;
    }

    const trappedBall = getActiveBalls().find((ball) => {
      const speed = Math.hypot(ball.velocity.x, ball.velocity.y);
      const inLowerTrap =
        ball.position.y > 1090 &&
        ball.position.y < 1290 &&
        ((ball.position.x > 72 && ball.position.x < 330) || (ball.position.x > 570 && ball.position.x < 828));
      return inLowerTrap && speed <= 0.34;
    });

    if (!trappedBall) {
      gameState.lowerTrapSince = 0;
      return;
    }

    if (!gameState.lowerTrapSince) {
      gameState.lowerTrapSince = performance.now();
      return;
    }

    if (performance.now() - gameState.lowerTrapSince < 950) {
      return;
    }

    const direction = trappedBall.position.x < TABLE.width / 2 ? 1 : -1;
    MatterLib.Body.setVelocity(trappedBall, {
      x: direction * 1.35,
      y: -2.8
    });
    recordDiagnosticEvent("trap-rescue", {
      ball: trappedBall,
      eventName: "trap-rescue:lower",
      objectId: trappedBall.gameBallId || "ball",
      label: "Lower trap rescue",
      kind: "lower"
    });
    gameState.lowerTrapSince = 0;
  }

  function maybeRescueUpperPlayfieldTrap() {
    if (!physics || gameState.status !== "playing") {
      return;
    }

    const trappedBall = getActiveBalls().find((ball) => {
      const speed = Math.hypot(ball.velocity.x, ball.velocity.y);
      const inUpperPocket =
        ball.position.x > 255 &&
        ball.position.x < 660 &&
        ball.position.y > 210 &&
        ball.position.y < 470;
      return inUpperPocket && speed <= 0.48;
    });

    if (!trappedBall) {
      gameState.upperTrapSince = 0;
      gameState.upperTrapBallId = "";
      return;
    }

    if (gameState.upperTrapBallId !== trappedBall.gameBallId) {
      gameState.upperTrapBallId = trappedBall.gameBallId;
      gameState.upperTrapSince = performance.now();
      return;
    }

    if (performance.now() - gameState.upperTrapSince < 850) {
      return;
    }

    const direction = trappedBall.position.x < TABLE.width / 2 ? 1 : -1;
    MatterLib.Body.setVelocity(trappedBall, {
      x: direction * 2.4,
      y: 4.2
    });
    recordDiagnosticEvent("trap-rescue", {
      ball: trappedBall,
      eventName: "trap-rescue:upper",
      objectId: trappedBall.gameBallId || "ball",
      label: "Upper trap rescue",
      kind: "upper"
    });
    gameState.upperTrapSince = 0;
    gameState.upperTrapBallId = "";
  }

  function maybeGuideShooterLaneExit() {
    if (!physics || gameState.status !== "playing") {
      return;
    }

    const lane = TABLE.shooterLane;
    getActiveBalls().forEach((ball) => {
      const isInShooterLane = ball.position.x > lane.innerX + 8 && ball.position.x < lane.outerX + 12;
      const reachedExit = ball.position.y < lane.exitY + 98;

      if (isInShooterLane && reachedExit && ball.velocity.y < 0) {
        guideBallOutOfShooterLane(ball);
      }
    });
  }

  function isBallInsideRotatedZone(ball, zone, marginScale = 0.36) {
    if (!ball || !zone) {
      return false;
    }

    const angle = zone.angle || 0;
    const cos = Math.cos(-angle);
    const sin = Math.sin(-angle);
    const dx = ball.position.x - zone.x;
    const dy = ball.position.y - zone.y;
    const localX = dx * cos - dy * sin;
    const localY = dx * sin + dy * cos;
    const margin = (ball.circleRadius || 26) * marginScale;

    return Math.abs(localX) <= zone.width / 2 + margin && Math.abs(localY) <= zone.height / 2 + margin;
  }

  function maybeDetectLaneSensorOverlaps() {
    if (!physics || gameState.status !== "playing") {
      return;
    }

    getActiveBalls().forEach((ball) => {
      TABLE_CONFIG.lanes.forEach((lane) => {
        if (isBallInsideRotatedZone(ball, lane)) {
          handleLaneHit(lane, ball);
        }
      });
    });
  }

  function setControlActive(element, isActive) {
    element.classList.toggle("is-active", isActive);
  }

  function updateControlsUi() {
    setControlActive(ui.leftControl, inputState.left);
    setControlActive(ui.rightControl, inputState.right);
    setControlActive(ui.spaceControl, inputState.space);
  }

  function handleKeyDown(event) {
    if (event.code === "ArrowLeft" || event.code === "KeyA") {
      unlockAudio();
      if (!inputState.left) {
        inputState.leftPulse = true;
        audio.play("flipper");
      }
      inputState.left = true;
      event.preventDefault();
    }

    if (event.code === "ArrowRight" || event.code === "KeyD") {
      unlockAudio();
      if (!inputState.right) {
        inputState.rightPulse = true;
        audio.play("flipper");
      }
      inputState.right = true;
      event.preventDefault();
    }

    if (event.code === "Space") {
      event.preventDefault();
      unlockAudio();

      if (!inputState.space) {
        if (gameState.status === "game-over") {
          if (canRestartGameOver()) {
            restartGame();
            inputState.space = true;
          }
        } else if (gameState.status === "ready") {
          gameState.status = "charging";
          inputState.chargingSince = performance.now();
          inputState.space = true;
        }
      }
    }

    updateControlsUi();
    syncInspectableState(physics);
  }

  function handleKeyUp(event) {
    if (event.code === "ArrowLeft" || event.code === "KeyA") {
      inputState.left = false;
      event.preventDefault();
    }

    if (event.code === "ArrowRight" || event.code === "KeyD") {
      inputState.right = false;
      event.preventDefault();
    }

    if (event.code === "Space") {
      inputState.space = false;
      event.preventDefault();
      launchBall();
    }

    updateControlsUi();
    syncInspectableState(physics);
  }

  function beginControl(control) {
    unlockAudio();

    if (control === "left") {
      if (!inputState.left) {
        inputState.leftPulse = true;
        audio.play("flipper");
      }
      inputState.left = true;
    }

    if (control === "right") {
      if (!inputState.right) {
        inputState.rightPulse = true;
        audio.play("flipper");
      }
      inputState.right = true;
    }

    if (control === "space") {
      if (gameState.status === "game-over") {
        if (canRestartGameOver()) {
          restartGame();
          inputState.space = true;
        }
      } else if (gameState.status === "ready") {
        gameState.status = "charging";
        inputState.chargingSince = performance.now();
        inputState.space = true;
      }
    }

    updateControlsUi();
    syncInspectableState(physics);
  }

  function endControl(control) {
    if (control === "left") {
      inputState.left = false;
    }

    if (control === "right") {
      inputState.right = false;
    }

    if (control === "space") {
      inputState.space = false;
      launchBall();
    }

    updateControlsUi();
    syncInspectableState(physics);
  }

  function endAllControls() {
    inputState.left = false;
    inputState.right = false;

    if (inputState.space) {
      inputState.space = false;
      launchBall();
    }

    inputState.touchPointers.clear();
    updateControlsUi();
    syncInspectableState(physics);
  }

  function getCanvasPoint(event) {
    const rect = canvas.getBoundingClientRect();

    return {
      x: ((event.clientX - rect.left) / rect.width) * TABLE.width,
      y: ((event.clientY - rect.top) / rect.height) * TABLE.height
    };
  }

  function getCanvasTouchControl(event) {
    const point = getCanvasPoint(event);
    const lowerPlayfield = point.y > TABLE.height * 0.58;
    const flipperZone = point.y > TABLE.height * 0.68;
    const shooterZone = point.x > TABLE.shooterLane.innerX - 24 && point.y > TABLE.height * 0.58;

    if ((gameState.status === "ready" || gameState.status === "charging") && shooterZone) {
      return "space";
    }

    if (!lowerPlayfield) {
      return null;
    }

    if (flipperZone && point.x < TABLE.width / 2) {
      return "left";
    }

    if (flipperZone) {
      return "right";
    }

    if (point.x < TABLE.width * 0.34) {
      return "left";
    }

    if (point.x > TABLE.width * 0.66) {
      return "right";
    }

    return null;
  }

  function wireCanvasTouchControls() {
    canvas.addEventListener("pointerdown", (event) => {
      if (event.pointerType === "mouse") {
        unlockAudio();
        return;
      }

      const control = getCanvasTouchControl(event);

      if (!control) {
        unlockAudio();
        return;
      }

      event.preventDefault();
      canvas.setPointerCapture(event.pointerId);
      inputState.touchPointers.set(event.pointerId, control);
      beginControl(control);
    });

    canvas.addEventListener("pointerup", (event) => {
      const control = inputState.touchPointers.get(event.pointerId);

      if (!control) {
        return;
      }

      event.preventDefault();
      inputState.touchPointers.delete(event.pointerId);
      endControl(control);
    });

    canvas.addEventListener("pointercancel", (event) => {
      const control = inputState.touchPointers.get(event.pointerId);

      if (!control) {
        return;
      }

      inputState.touchPointers.delete(event.pointerId);
      endControl(control);
    });

    canvas.addEventListener("lostpointercapture", (event) => {
      const control = inputState.touchPointers.get(event.pointerId);

      if (!control) {
        return;
      }

      inputState.touchPointers.delete(event.pointerId);
      endControl(control);
    });
  }

  function wireHoldButton(element, control) {
    element.addEventListener("pointerdown", (event) => {
      event.preventDefault();
      element.setPointerCapture(event.pointerId);
      beginControl(control);
    });

    element.addEventListener("pointerup", (event) => {
      event.preventDefault();
      endControl(control);
    });

    element.addEventListener("pointercancel", () => {
      endControl(control);
    });

    element.addEventListener("lostpointercapture", () => {
      if (control === "left" && inputState.left) {
        endControl(control);
      }

      if (control === "right" && inputState.right) {
        endControl(control);
      }

      if (control === "space" && inputState.space) {
        endControl(control);
      }
    });
  }

  function updatePlungerPower() {
    if (gameState.status !== "charging") {
      return;
    }

    const elapsed = performance.now() - inputState.chargingSince;
    gameState.plungerPower = Math.min(1, elapsed / 1200);
  }

  function updateFlippers() {
    if (!physics) {
      return;
    }

    const leftConfig = TABLE.flippers.left;
    const rightConfig = TABLE.flippers.right;
    const leftTarget = inputState.left ? leftConfig.activeAngle : leftConfig.restAngle;
    const rightTarget = inputState.right ? rightConfig.activeAngle : rightConfig.restAngle;
    const leftAngle = physics.flippers.left.angle + (leftTarget - physics.flippers.left.angle) * 0.52;
    const rightAngle = physics.flippers.right.angle + (rightTarget - physics.flippers.right.angle) * 0.52;

    positionFlipper(physics.flippers.left, leftConfig, leftAngle);
    positionFlipper(physics.flippers.right, rightConfig, rightAngle);

    applyFlipperKick();
  }

  function applyFlipperKick() {
    const activeBalls = getActiveBalls();

    if (gameState.status !== "playing" || activeBalls.length === 0) {
      inputState.leftPulse = false;
      inputState.rightPulse = false;
      return;
    }

    activeBalls.forEach((ball) => {
      const leftContact = getFlipperContact(ball, physics.flippers.left, TABLE.flippers.left, false);
      const rightContact = getFlipperContact(ball, physics.flippers.right, TABLE.flippers.right, true);

      if (inputState.leftPulse && leftContact.isValid && ball.velocity.y > -12) {
        const tipFactor = leftContact.tipFactor;
        const tipLift = leftContact.isTipContact ? 3.4 : 0;
        const lift = 11.6 + tipFactor * 11.2 + tipLift;
        const push = 3.1 + tipFactor * 5.1;

        MatterLib.Body.setVelocity(ball, {
          x: Math.max(ball.velocity.x + push, push),
          y: -lift
        });
      }

      if (inputState.rightPulse && rightContact.isValid && ball.velocity.y > -12) {
        const tipFactor = rightContact.tipFactor;
        const tipLift = rightContact.isTipContact ? 3.4 : 0;
        const lift = 11.6 + tipFactor * 11.2 + tipLift;
        const push = 3.1 + tipFactor * 5.1;

        MatterLib.Body.setVelocity(ball, {
          x: Math.min(ball.velocity.x - push, -push),
          y: -lift
        });
      }
    });

    stabilizeFlipperTipContact(activeBalls);

    inputState.leftPulse = false;
    inputState.rightPulse = false;
  }

  function stabilizeFlipperTipContact(activeBalls) {
    if (!inputState.left && !inputState.right) {
      return;
    }

    activeBalls.forEach((ball) => {
      if (inputState.left) {
        const leftContact = getFlipperContact(ball, physics.flippers.left, TABLE.flippers.left, false);
        if (leftContact.isValid && leftContact.isTipContact && ball.velocity.y > 0.6) {
          const lift = 6.2 + leftContact.tipFactor * 5.4;
          const push = 2.2 + leftContact.tipFactor * 3.8;
          MatterLib.Body.setVelocity(ball, {
            x: Math.max(ball.velocity.x, push),
            y: -lift
          });
        }
      }

      if (inputState.right) {
        const rightContact = getFlipperContact(ball, physics.flippers.right, TABLE.flippers.right, true);
        if (rightContact.isValid && rightContact.isTipContact && ball.velocity.y > 0.6) {
          const lift = 6.2 + rightContact.tipFactor * 5.4;
          const push = 2.2 + rightContact.tipFactor * 3.8;
          MatterLib.Body.setVelocity(ball, {
            x: Math.min(ball.velocity.x, -push),
            y: -lift
          });
        }
      }
    });
  }

  function getFlipperContact(ball, flipperBody, config, isRight) {
    const dx = ball.position.x - config.pivotX;
    const dy = ball.position.y - config.pivotY;
    const cos = Math.cos(flipperBody.angle);
    const sin = Math.sin(flipperBody.angle);
    const localX = dx * cos + dy * sin;
    const localY = -dx * sin + dy * cos;
    const tipFactor = localX / config.length;
    const clampedTipFactor = Math.max(0, Math.min(1, tipFactor));
    const playfieldSideDistance = isRight ? localY : -localY;
    const isValid =
      tipFactor > 0.08 &&
      tipFactor < 1 + FLIPPER_TIP_EXTENSION &&
      playfieldSideDistance > -8 &&
      playfieldSideDistance < 48 &&
      Math.abs(localY) < 52;

    return {
      isValid,
      isTipContact: tipFactor > 0.9,
      tipFactor: clampedTipFactor,
      playfieldSideDistance
    };
  }

  window.addEventListener("keydown", handleKeyDown);
  window.addEventListener("keyup", handleKeyUp);
  window.addEventListener("blur", endAllControls);
  window.addEventListener("pagehide", endAllControls);
  wireCanvasTouchControls();
  wireHoldButton(ui.leftControl, "left");
  wireHoldButton(ui.rightControl, "right");
  wireHoldButton(ui.spaceControl, "space");
  ui.restartButton.addEventListener("click", () => {
    unlockAudio();
    restartGame();
  });
  ui.audioToggle.addEventListener("click", toggleAudioMute);
  if (physics) {
    resetBall(physics.ball, true);
  }
  if (DIAGNOSTICS_ENABLED) {
    diagnosticHarness = createDiagnosticHarness();
    const requestedDiagnosticRun = diagnosticQuery.get(DIAGNOSTIC_QUERY_PARAM);

    if (requestedDiagnosticRun && requestedDiagnosticRun !== "1" && requestedDiagnosticRun !== "true") {
      window.setTimeout(() => {
        if (requestedDiagnosticRun === "all") {
          diagnosticHarness.runAll();
        } else {
          diagnosticHarness.runScenario(requestedDiagnosticRun);
        }
      }, 0);
    }
  }
  renderMissionList();
  renderCompanyList();
  updateHud();
  updateAudioUi();
  updateControlsUi();
  syncInspectableState(physics);

  function stepPhysics() {
    if (physics) {
      updatePlungerPower();
      if (diagnosticHarness) {
        diagnosticHarness.updateBeforeStep();
      }
      updateFlippers();
      updateBomModeTimeout();
      updateComboTimeout();
      updateBallSaveTimeout();
      updateSideShieldTimeout();
      updateMetaRewardTimeout();
      updateLockHouseHold();
      holdBallInLaunchLane();
      MatterLib.Engine.update(physics.engine, physicsClock.step * physicsClock.simulationScale);
      maybeDetectLaneSensorOverlaps();
      maybeDetectUpperOrbitEntryOverlap();
      updateUpperOrbitGuide();
      maybeGuideShooterLaneExit();
      maybeCatchLostBall();
      maybeRescueLowerFlipperTrap();
      maybeRescueUpperPlayfieldTrap();
      maybeFinishBetweenBalls();
      if (diagnosticHarness) {
        diagnosticHarness.updateAfterStep();
      }
    }
  }

  function update(now) {
    if (!physicsClock.lastTime) {
      physicsClock.lastTime = now || performance.now();
    }

    if (physics) {
      const frameDelta = Math.min((now || performance.now()) - physicsClock.lastTime, physicsClock.maxFrameDelta);
      physicsClock.lastTime = now || performance.now();
      physicsClock.accumulator += frameDelta;

      let steps = 0;
      while (physicsClock.accumulator >= physicsClock.step && steps < physicsClock.maxSteps) {
        stepPhysics();
        physicsClock.accumulator -= physicsClock.step;
        steps += 1;
      }

      if (steps === physicsClock.maxSteps) {
        physicsClock.accumulator = 0;
      }
    }

    drawPlayfieldFrame();

    if (physics) {
      drawPhysicsOverlay([...physics.staticBodies, ...physics.bumperBodies, ...physics.targetBodies, ...physics.rolloverBodies, ...physics.laneBodies, ...physics.orbitRailBodies, ...physics.orbitSensorBodies, ...physics.lockHouseSensorBodies]);
      drawFlipper(physics.flippers.left, inputState.left);
      drawFlipper(physics.flippers.right, inputState.right);
      drawPlungerCharge();
      getActiveBalls().forEach((ball) => drawBall(ball));
      drawStatusBadge();
      drawComboBadge();
      drawMetaRewardBadge();
      drawMultiballBadge();
      drawJackpotBadge();
      drawBallSaveBadge();
      drawSideShieldBadge();
      drawBomModeBadge();
      drawHitEffects();
      drawGameOverPresentation();
    } else {
      fillRoundedRect(104, 100, 210, 44, 6, "rgba(120, 36, 28, 0.76)");
      drawLabel("MATTER.JS NOT LOADED", 209, 123, "#ff7567", 16);
    }

    updateRestartUi();
    updateScoreFeed();
    if (gameState.status === "game-over") {
      syncInspectableState(physics);
    }
    window.requestAnimationFrame(update);
  }

  update();
})();
