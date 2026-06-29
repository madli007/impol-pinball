(function () {
  const config = window.ImpolPinballConfig || (window.ImpolPinballConfig = {});
  const { SCORING_RULES } = config;
  const TABLE = {
    width: 900,
    height: 1400,
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
  const COMBO_WINDOW_MS = 1800;
  const GAME_OVER_RESTART_DELAY_MS = 1400;
  const MULTIBALL = {
    maxBalls: 2,
    multiplier: 2,
    graceMs: 9000,
    progressRequirements: [2, 3, 4],
    requirementStep: 1,
    maxRequirement: 5,
    preStartDelayMs: 1400,
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
  const LOCK_HOUSE_VISUAL = {
    assetId: "lock-house-alcad",
    width: 96,
    height: 142,
    lampOffsetY: 67
  };
  const LOCK_RELEASE_INDICATOR = {
    x: 646,
    y: 286,
    width: 188,
    height: 84
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
  Object.assign(config, {
    TABLE,
    DEBUG_PHYSICS,
    DIAGNOSTIC_QUERY_PARAM,
    COMBO_WINDOW_MS,
    GAME_OVER_RESTART_DELAY_MS,
    MULTIBALL,
    JACKPOT,
    FLIPPER_TIP_EXTENSION,
    COMBO_BONUS_BY_COUNT,
    MAX_COMBO_BONUS,
    COMBO_MAX_COUNT,
    COMBO_MAX_SAME_ZONE_STREAK,
    COMBO_HISTORY_LIMIT,
    COMBO_PASSIVE_TYPES,
    COMBO_TIERS,
    FEEDBACK_PRIORITIES,
    FEEDBACK_ZONES,
    SENSOR_REHIT_RULES,
    ROLLOVER_COMPLETE_BONUS,
    LANE_SET_BONUS,
    SIDE_SHIELD_DURATION,
    UPPER_ORBIT,
    LOCK_HOUSE,
    LOCK_HOUSE_PRESENTATION,
    LOCK_HOUSE_VISUAL,
    LOCK_RELEASE_INDICATOR,
    TABLE_CONFIG
  });
})();
