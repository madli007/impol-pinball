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
  const HIGH_SCORE_KEY = "impol-pinball.high-score";
  const AUDIO_MUTED_KEY = "impol-pinball.audio-muted";
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
  const FLIPPER_TIP_EXTENSION = 0.16;
  const COMBO_BONUS_BY_COUNT = {
    2: 1000,
    3: 2500,
    4: 4500,
    5: 7000
  };
  const MAX_COMBO_BONUS = 10000;
  const ASSET_CONFIG = {
    furnace: { src: "assets/images/furnace-target.png", width: 154, height: 132, yOffset: -8 },
    coil: { src: "assets/images/coil-collector.png", width: 184, height: 120, yOffset: -8 },
    mes: { src: "assets/images/mes-bumper.png", width: 124, height: 118, yOffset: -4 },
    erp: { src: "assets/images/erp-core-bumper.png", width: 126, height: 126, yOffset: -6 },
    co2: { src: "assets/images/green-aluminium-bumper.png", width: 124, height: 110, yOffset: -4 },
    "measurement-left": { src: "assets/images/measurement-target.png", width: 116, height: 116, yOffset: -12 },
    "measurement-right": { src: "assets/images/measurement-target.png", width: 116, height: 116, yOffset: -12 },
    "e-odprema": { src: "assets/images/e-odprema-truck.png", width: 138, height: 116, yOffset: -10 },
    alcad: { src: "assets/images/alcad-marker.png", width: 132, height: 116, yOffset: -10 },
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
      { id: "mes", label: "MES", x: 300, y: 392, radius: 56, accent: "#31a8ff", event: "hit:MES", points: 1000 },
      { id: "erp", label: "ERP", x: 450, y: 344, radius: 60, accent: "#ff9b3d", event: "hit:ERP", points: 1500 },
      { id: "co2", label: "CO2", x: 600, y: 392, radius: 56, accent: "#7bdc6c", event: "hit:GREEN", points: 1000 }
    ],
    targets: [
      { id: "measurement-left", label: "MERILNI", x: 275, y: 592, width: 178, height: 52, accent: "#31a8ff", event: "hit:MEASUREMENT", points: 500 },
      { id: "measurement-right", label: "PROTOKOL", x: 625, y: 592, width: 178, height: 52, accent: "#31a8ff", event: "hit:MEASUREMENT", points: 500 },
      { id: "furnace", label: "FURNACE", x: 450, y: 696, width: 200, height: 56, accent: "#ff9b3d", event: "hit:FURNACE", points: 750 },
      { id: "coil", label: "COIL COLLECTOR", x: 450, y: 899, width: 234, height: 58, accent: "#7bdc6c", event: "hit:COIL", points: 750 },
      { id: "alcad", label: "ALCAD", x: 254, y: 784, width: 128, height: 48, accent: "#9ab3bf", event: "hit:ALCAD", points: 500 },
      { id: "e-odprema", label: "E-ODPREMA", x: 646, y: 784, width: 156, height: 48, accent: "#9ab3bf", event: "hit:EODPREMA", points: 500 },
      { id: "kosovnica", label: "KOSOVNICA", x: 450, y: 508, width: 168, height: 34, accent: "#ff9b3d", event: "hit:KOSOVNICA", points: 700 }
    ],
    slingshots: [
      { id: "left-slingshot", label: "SEVAL", x: 286, y: 1098, width: 100, height: 22, angle: 0.72, visualX: 258, visualY: 1098, visualWidth: 108, visualHeight: 115, visualAngle: 0, accent: "#31a8ff", event: "hit:LEFT_SLINGSHOT", points: 350, impulse: { x: 6.8, y: -7.8 } },
      { id: "right-slingshot", label: "IMPOL-PC", x: 614, y: 1098, width: 100, height: 22, angle: -0.72, visualX: 642, visualY: 1098, visualWidth: 108, visualHeight: 115, visualAngle: 0, accent: "#31a8ff", event: "hit:RIGHT_SLINGSHOT", points: 350, impulse: { x: -6.8, y: -7.8 } }
    ]
  };
  const MISSION_CONFIG = [
    {
      id: "measurement",
      label: "MERILNI PROTOKOL",
      event: "hit:MEASUREMENT",
      required: 3,
      bonus: 5000,
      reward: "Quality bonus"
    },
    {
      id: "mes",
      label: "MES ONLINE",
      event: "hit:MES",
      required: 5,
      bonus: 8000,
      reward: "Real-time bonus"
    },
    {
      id: "erp",
      label: "ERP GO-LIVE",
      event: "hit:ERP",
      required: 3,
      bonus: 10000,
      multiplierReward: 2,
      reward: "2x multiplier"
    },
    {
      id: "green",
      label: "GREEN ALUMINIUM",
      event: "hit:GREEN",
      required: 4,
      bonus: 9000,
      reward: "CO2 bonus"
    },
    {
      id: "coil",
      label: "COIL COLLECTOR",
      event: "hit:COIL",
      required: 3,
      bonus: 8500,
      reward: "Coil bonus"
    },
    {
      id: "eodprema",
      label: "E-ODPREMA",
      event: "hit:EODPREMA",
      required: 2,
      bonus: 7000,
      reward: "Dispatch bonus"
    },
    {
      id: "alcad",
      label: "ALCAD SORTIRANJE",
      event: "hit:ALCAD",
      required: 2,
      bonus: 7000,
      reward: "Recycle bonus"
    },
    {
      id: "furnace",
      label: "LIVARNA READY",
      event: "hit:FURNACE",
      required: 3,
      bonus: 9500,
      reward: "Furnace bonus"
    },
    {
      id: "kosovnica",
      label: "KOSOVNICA MIRNA",
      event: "hit:KOSOVNICA",
      required: 2,
      bonus: 11000,
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
      events: ["hit:MEASUREMENT", "hit:MES", "hit:ERP"],
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
  const BOM_MODE = {
    sequence: ["hit:MES", "hit:ERP", "hit:COIL"],
    labels: ["MES", "ERP", "COIL"],
    duration: 10000,
    successBonus: 15000
  };
  const META_REWARDS = {
    missions: {
      label: "INDUSTRY 4.0 JACKPOT",
      bonus: 40000,
      multiplier: 3,
      duration: 22000,
      ballSaveExtension: 9000,
      color: "#ffb967"
    },
    companies: {
      label: "IMPOL GROUP SYNERGY",
      bonus: 30000,
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
    statusCopy: document.querySelector(".status-copy")
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
    gameOverStartedAt: 0,
    gameOverRestartAt: 0,
    finalScore: 0,
    finalHighScore: 0,
    finalWasRecord: false,
    hitCounts: {},
    hitEffects: [],
    floatingTexts: [],
    comboCount: 0,
    comboUntil: 0,
    comboLastObjectId: "",
    lowerTrapSince: 0,
    upperTrapSince: 0,
    upperTrapBallId: "",
    skillShotAvailableUntil: 0,
    skillShotAwarded: false,
    ballSaveUntil: 0,
    ballSaveUsed: false,
    multiball: createMultiballState(),
    bomMode: {
      active: false,
      step: 0,
      deadline: 0
    },
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

  function formatMissionNames(missionIds) {
    return missionIds
      .map((id) => getMissionById(id))
      .filter(Boolean)
      .map((mission) => mission.label)
      .join(" / ");
  }

  function getNextStageMissionIds() {
    return MISSION_STAGES[gameState.missionStageIndex + 1] || [];
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

  function updateCompanyForEvent(eventName) {
    const companyId = COMPANY_BY_EVENT[eventName];

    if (!companyId) {
      return;
    }

    setCompanyStatus(companyId, "online", "Online");
  }

  function updateCompanyForMissionProgress(mission) {
    const companyId = COMPANY_BY_MISSION[mission.id];

    if (!companyId) {
      return;
    }

    setCompanyStatus(companyId, "online", "Online");
  }

  function updateCompanyForMissionComplete(mission) {
    const companyId = COMPANY_BY_MISSION[mission.id];
    const company = getCompanyById(companyId);

    if (!companyId || !company) {
      return;
    }

    const completedCount = company.missions.filter((missionId) => gameState.missions[missionId].completed).length;
    const isCompanyComplete = completedCount === company.missions.length;
    setCompanyStatus(companyId, isCompanyComplete ? "complete" : "online", isCompanyComplete ? "Complete" : `${completedCount}/${company.missions.length} Complete`);
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
    gameState.feedback = `${reward.label} +${bonus.toLocaleString("sl-SI")}`;
    gameState.feedbackUntil = performance.now() + 1900;
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
      const stored = window.localStorage.getItem(HIGH_SCORE_KEY);
      const parsed = Number.parseInt(stored || "0", 10);
      return Number.isFinite(parsed) ? parsed : 0;
    } catch (_error) {
      return 0;
    }
  }

  function saveHighScore() {
    try {
      window.localStorage.setItem(HIGH_SCORE_KEY, String(gameState.highScore));
    } catch (_error) {
      // Keep the game playable if browser storage is unavailable.
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
      const isLit = wasRecentlyHit(bumper.id);
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
      const isLit = wasRecentlyHit(target.id);
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

    fillRoundedRect(590, 100, 210, 42, 6, "rgba(5, 11, 16, 0.72)");
    context.fillStyle = color;
    context.font = "800 18px Arial, Helvetica, sans-serif";
    context.textAlign = "center";
    context.textBaseline = "middle";
    context.fillText(label, 695, 121);
  }

  function drawScoreFeedback() {
    if (!gameState.feedback || performance.now() > gameState.feedbackUntil) {
      return;
    }

    fillRoundedRect(300, 1048, 300, 44, 8, "rgba(5, 11, 16, 0.72)");
    context.fillStyle = "#ff9b3d";
    context.font = "800 20px Arial, Helvetica, sans-serif";
    context.textAlign = "center";
    context.textBaseline = "middle";
    context.fillText(gameState.feedback, 450, 1070);
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
    gameState.floatingTexts = gameState.floatingTexts.filter((text) => now < text.until);

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
      context.restore();
    });

    gameState.floatingTexts.forEach((text) => {
      const progress = 1 - (text.until - now) / text.duration;
      const alpha = Math.max(0, 1 - progress);
      const y = text.y - progress * 42;

      context.save();
      context.globalAlpha = alpha;
      context.font = `800 ${text.size}px Arial, Helvetica, sans-serif`;
      context.textAlign = "center";
      context.textBaseline = "middle";
      context.lineWidth = 5;
      context.strokeStyle = "rgba(5, 11, 16, 0.82)";
      context.strokeText(text.label, text.x, y);
      context.fillStyle = text.color;
      context.fillText(text.label, text.x, y);
      context.restore();
    });
  }

  function drawComboBadge() {
    if (gameState.comboCount < 2 || performance.now() > gameState.comboUntil) {
      return;
    }

    const remaining = Math.max(0, gameState.comboUntil - performance.now()) / COMBO_WINDOW_MS;
    fillRoundedRect(332, 1000, 236, 40, 8, "rgba(5, 11, 16, 0.74)");
    context.fillStyle = "#31a8ff";
    context.font = "800 18px Arial, Helvetica, sans-serif";
    context.textAlign = "center";
    context.textBaseline = "middle";
    context.fillText(`${gameState.comboCount}x COMBO`, 450, 1019);

    context.fillStyle = "rgba(255, 155, 61, 0.86)";
    context.fillRect(354, 1034, 192 * remaining, 4);
  }

  function drawBomModeBadge() {
    if (!gameState.bomMode.active) {
      return;
    }

    const remaining = Math.max(0, gameState.bomMode.deadline - performance.now()) / BOM_MODE.duration;
    const label = BOM_MODE.labels[gameState.bomMode.step] || "APPROVE";

    fillRoundedRect(292, 928, 316, 48, 8, "rgba(5, 11, 16, 0.78)");
    context.fillStyle = "#ff9b3d";
    context.font = "800 16px Arial, Helvetica, sans-serif";
    context.textAlign = "center";
    context.textBaseline = "middle";
    context.fillText(`BOM ERROR: HIT ${label}`, 450, 946);

    context.fillStyle = "rgba(49, 168, 255, 0.88)";
    context.fillRect(326, 968, 248 * remaining, 4);
  }

  function isBallSaveActive() {
    return gameState.status === "playing" && !gameState.ballSaveUsed && performance.now() <= gameState.ballSaveUntil;
  }

  function drawBallSaveBadge() {
    if (!isBallSaveActive()) {
      return;
    }

    const remaining = Math.max(0, gameState.ballSaveUntil - performance.now()) / BALL_SAVE_DURATION;
    fillRoundedRect(328, 882, 244, 38, 8, "rgba(5, 11, 16, 0.72)");
    context.fillStyle = "#7bdc6c";
    context.font = "800 15px Arial, Helvetica, sans-serif";
    context.textAlign = "center";
    context.textBaseline = "middle";
    context.fillText("BALL SAVE ACTIVE", 450, 901);

    context.fillStyle = "rgba(123, 220, 108, 0.88)";
    context.fillRect(354, 914, 192 * remaining, 4);
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
    fillRoundedRect(292, 832, 316, 44, 8, "rgba(5, 11, 16, 0.78)");
    context.fillStyle = gameState.metaRewards.multiplierValue >= META_REWARDS.companies.multiplier ? "#7bdc6c" : "#ffb967";
    context.font = "800 16px Arial, Helvetica, sans-serif";
    context.textAlign = "center";
    context.textBaseline = "middle";
    context.fillText(`${gameState.metaRewards.multiplierValue}x ${gameState.metaRewards.lastAwardLabel}`, 450, 850);

    context.fillStyle = "rgba(255, 155, 61, 0.88)";
    context.fillRect(326, 870, 248 * Math.min(1, remaining), 4);
  }

  function drawMultiballBadge() {
    if (!gameState.multiball.active) {
      return;
    }

    const graceRemaining = Math.max(0, gameState.multiball.graceUntil - performance.now());
    const activeBallCount = getActiveBalls().length;
    fillRoundedRect(318, 774, 264, 46, 8, "rgba(5, 11, 16, 0.78)");
    context.fillStyle = "#edf7fb";
    context.font = "800 16px Arial, Helvetica, sans-serif";
    context.textAlign = "center";
    context.textBaseline = "middle";
    context.fillText(`MULTIBALL ${activeBallCount} BALLS / ${MULTIBALL.multiplier}x`, 450, 792);

    if (graceRemaining > 0) {
      const remaining = graceRemaining / MULTIBALL.graceMs;
      context.fillStyle = "rgba(123, 220, 108, 0.9)";
      context.fillRect(344, 812, 212 * remaining, 4);
    }
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
    drawDecorAsset("multiball-lock-release", 450, 300, 260, 116, {
      alpha: 0.08,
      shadowColor: "rgba(49, 168, 255, 0.12)",
      shadowBlur: 5,
      shadowOffsetY: 4
    });
    drawDecorAsset("jackpot-furnace-insert", 568, 662, 102, 90, {
      alpha: 0.11,
      rotation: 0.08,
      shadowBlur: 4,
      shadowOffsetY: 3
    });
    drawDecorAsset("jackpot-coil-insert", 324, 876, 96, 84, {
      alpha: 0.1,
      rotation: -0.08,
      shadowBlur: 4,
      shadowOffsetY: 3
    });
    drawDecorAsset("jackpot-final-insert", 576, 876, 96, 84, {
      alpha: 0.09,
      rotation: 0.08,
      shadowBlur: 4,
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

    context.save();

    const lanes = [
      {
        rail: [
          [128, 1168],
          [230, 1232],
          [306, 1282]
        ],
        label: "OUTLANE",
        labelX: 188,
        labelY: 1210,
        lampX: 152,
        lampY: 1188,
        angle: 0.56
      },
      {
        rail: [
          [772, 1168],
          [670, 1232],
          [594, 1282]
        ],
        label: "RETURN",
        labelX: 712,
        labelY: 1210,
        lampX: 748,
        lampY: 1188,
        angle: -0.56
      }
    ];

    lanes.forEach((lane) => {
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

        context.strokeStyle = "rgba(49, 168, 255, 0.45)";
        context.lineWidth = 4;
        context.beginPath();
        context.moveTo(lane.rail[0][0] + (lane.angle > 0 ? 8 : -8), lane.rail[0][1] + 3);
        context.quadraticCurveTo(lane.rail[1][0], lane.rail[1][1] + 4, lane.rail[2][0], lane.rail[2][1] - 4);
        context.stroke();
      }

      context.save();
      context.translate(lane.labelX, lane.labelY);
      context.rotate(lane.angle);
      context.globalAlpha = hasLowerPlasticArt ? 0.36 : 1;
      if (!hasLowerPlasticArt) {
        fillRoundedRect(-42, -12, 84, 24, 6, "rgba(5, 11, 16, 0.68)");
      }
      context.fillStyle = hasLowerPlasticArt ? "rgba(154, 179, 191, 0.68)" : "#9ab3bf";
      context.font = "800 12px Arial, Helvetica, sans-serif";
      context.textAlign = "center";
      context.textBaseline = "middle";
      context.fillText(lane.label, 0, 1);
      context.restore();

      const lampGlow = context.createRadialGradient(lane.lampX, lane.lampY, 2, lane.lampX, lane.lampY, 22);
      lampGlow.addColorStop(0, hasLowerPlasticArt ? "rgba(255, 155, 61, 0.46)" : "rgba(255, 155, 61, 0.9)");
      lampGlow.addColorStop(1, "rgba(255, 155, 61, 0)");
      context.fillStyle = lampGlow;
      context.beginPath();
      context.arc(lane.lampX, lane.lampY, 22, 0, Math.PI * 2);
      context.fill();
      if (!hasLowerPlasticArt) {
        drawRailBolt(lane.lampX, lane.lampY, 6);
      }
    });

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
    updateCompanyUi();
    updateRestartUi();
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
    const nextStageMissionIds = getNextStageMissionIds();
    const lastCompletedMission = getMissionById(gameState.lastCompletedMissionId);
    const allMissionsComplete = areAllRequiredMissionsComplete();

    ui.missionStage.textContent = `${gameState.missionStageIndex + 1}/${MISSION_STAGES.length}`;
    ui.missionNext.textContent = allMissionsComplete ? "META REWARD LIT" : nextStageMissionIds.length ? formatMissionNames(nextStageMissionIds) : "FINAL READY";
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
      const metaLabel = gameState.metaRewards.lastAwardLabel ? ` Last reward: ${gameState.metaRewards.lastAwardLabel}.` : "";
      const multiballStatus = gameState.multiball.active
        ? " Multiball active: 2x scoring, missions and companies paused."
        : ` Multiball missions ${gameState.multiball.progress}/${gameState.multiball.nextRequirement}.`;
      ui.statusCopy.textContent = `${activeCompany.label}: ${activeState.detail}. Group bonus ${bonusCompanyCount}/${COMPANY_CONFIG.length}.${multiballStatus}${metaLabel}`;
    }
  }

  function syncInspectableState(physics) {
    const activeBalls = physics ? getActiveBalls() : [];

    window.ImpolPinball = {
      phase: "13.6",
      matterLoaded: Boolean(MatterLib),
      staticBodyCount: physics ? physics.staticBodies.length : 0,
      tableObjectCount: physics ? physics.bumperBodies.length + physics.targetBodies.length + physics.slingshotBodies.length : 0,
      slingshotCount: physics ? physics.slingshotBodies.length : 0,
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
      comboActive: gameState.status === "playing" && gameState.comboUntil > performance.now(),
      comboRemainingMs: Math.max(0, Math.round(gameState.comboUntil - performance.now())),
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
      ballSave: {
        active: gameState.status === "playing" && !gameState.ballSaveUsed && performance.now() <= gameState.ballSaveUntil,
        used: gameState.ballSaveUsed,
        remainingMs: Math.max(0, Math.round(gameState.ballSaveUntil - performance.now()))
      },
      bomMode: gameState.bomMode,
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
      input: { ...inputState }
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
      restitution: 0.48,
      friction: 0.02,
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
          restitution: 0.16,
          friction: 0.08
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
          restitution: 0.16,
          friction: 0.08
        }
      )
    };
    const bumperBodies = TABLE_CONFIG.bumpers.map((bumper) => {
      const body = Bodies.circle(bumper.x, bumper.y, bumper.radius, {
        isStatic: true,
        label: `bumper:${bumper.id}`,
        restitution: 1.04,
        friction: 0.01
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

    const ball = createBallBody("ball-1", getBallStartPosition());

    Composite.add(engine.world, [...staticBodies, ...bumperBodies, ...targetBodies, ...slingshotBodies, flippers.left, flippers.right, ball]);

    [...staticBodies, ...bumperBodies, ...targetBodies, ...slingshotBodies, flippers.left, flippers.right].forEach((body) => {
      Body.setStatic(body, true);
    });

    positionFlipper(flippers.left, TABLE.flippers.left, TABLE.flippers.left.restAngle);
    positionFlipper(flippers.right, TABLE.flippers.right, TABLE.flippers.right.restAngle);

    Events.on(engine, "collisionStart", (event) => {
      event.pairs.forEach((pair) => {
        const labels = [pair.bodyA.label, pair.bodyB.label];
        const pairBall = getPairBall(pair);
        if (pairBall && labels.includes("drain-sensor") && labels.includes("pinball")) {
          drainBall(pairBall);
        }

        if (pairBall && labels.includes("launch-lane-top-exit") && labels.includes("pinball")) {
          guideBallOutOfShooterLane(pairBall);
        }

        if (labels.includes("skill-shot-sensor") && labels.includes("pinball")) {
          awardSkillShot();
        }

        const hitObject = getHitObject(pair);
        if (hitObject) {
          handleTableHit(hitObject, ball);
        }
      });
    });

    return {
      engine,
      staticBodies,
      bumperBodies,
      targetBodies,
      slingshotBodies,
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
      restitution: 0.82,
      friction: 0.005,
      frictionAir: 0.0008,
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

  function removeActiveBall(ball) {
    if (!physics || !ball) {
      return;
    }

    ball.isRemoved = true;
    MatterLib.Composite.remove(physics.engine.world, ball);
    physics.activeBalls = physics.activeBalls.filter((activeBall) => activeBall !== ball && !activeBall.isRemoved);
    syncPrimaryBall();
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

    if (!wasActive && options.advanceDifficulty !== false) {
      gameState.multiball.starts += 1;
      gameState.multiball.progress = 0;
      syncMultiballRequirement();
    }

    gameState.ballSaveUsed = false;
    gameState.ballSaveUntil = Math.max(gameState.ballSaveUntil, gameState.multiball.graceUntil);
    gameState.feedback = `${sourceLabel}: TWO-BALL MULTIBALL`;
    gameState.feedbackUntil = now + 2200;
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
      gameState.feedback = `MULTIBALL MISSIONS ${gameState.multiball.progress}/${gameState.multiball.nextRequirement}`;
      gameState.feedbackUntil = performance.now() + 850;
    }
  }

  function endMultiball() {
    if (!gameState.multiball.active) {
      return;
    }

    gameState.multiball.active = false;
    gameState.multiball.endedAt = performance.now();
    gameState.multiball.graceUntil = 0;
    gameState.feedback = "MULTIBALL COMPLETE";
    gameState.feedbackUntil = performance.now() + 1300;
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
    gameState.feedback = "MULTIBALL BALL SAVE";
    gameState.feedbackUntil = performance.now() + 1200;
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

  function guideBallOutOfShooterLane(ball) {
    const lane = TABLE.shooterLane;

    if (ball.position.x < lane.innerX - 24 || ball.position.y > lane.exitY + 100) {
      return;
    }

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

    const points = 3500 * getActiveMultiplier();
    gameState.skillShotAwarded = true;
    gameState.score += points;
    setHighScore(gameState.score);
    gameState.lastEvent = "hit:SKILL_SHOT";
    gameState.feedback = `SKILL SHOT +${points.toLocaleString("sl-SI")}`;
    gameState.feedbackUntil = performance.now() + 1100;
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

  function handleTableHit(object, ball) {
    if (gameState.status !== "playing") {
      return;
    }

    const points = object.points * getActiveMultiplier();
    const combo = registerComboHit(object);
    gameState.score += points + combo.bonus;
    setHighScore(gameState.score);
    gameState.lastEvent = object.event;
    gameState.feedback = combo.bonus
      ? `${combo.count}x COMBO +${combo.bonus.toLocaleString("sl-SI")}`
      : `+${points.toLocaleString("sl-SI")} ${object.label}`;
    gameState.feedbackUntil = performance.now() + 700;
    gameState.hitCounts[object.id] = performance.now();
    addHitFeedback({
      id: object.id,
      x: object.x,
      y: object.y,
      accent: object.accent,
      label: combo.bonus ? `${combo.count}x COMBO +${combo.bonus.toLocaleString("sl-SI")}` : `+${points.toLocaleString("sl-SI")}`,
      color: combo.bonus ? "#ffb967" : "#edf7fb"
    });

    if (combo.bonus) {
      audio.play("combo");
    }

    updateCompanyForEvent(object.event);
    updateCompanyForCombo(object, combo);

    if (object.type === "bumper") {
      audio.play("bumper", { variant: object.id });
      kickBallFromObject(ball, object);
    } else if (object.type === "slingshot") {
      audio.play("bumper");
      kickBallFromSlingshot(ball, object);
    } else {
      audio.play("target");
    }

    if (object.type !== "slingshot") {
      advanceMissions(object.event);
      updateBomMode(object.event);
    }
    updateHud();
    syncInspectableState(physics);
  }

  function addHitFeedback({ id, x, y, accent, label, color }) {
    const now = performance.now();
    gameState.hitEffects.push({
      id,
      x,
      y,
      accent,
      radius: 26,
      duration: 520,
      until: now + 520
    });
    gameState.floatingTexts.push({
      label,
      x,
      y: y - 36,
      color,
      size: label.length > 20 ? 17 : 19,
      duration: 820,
      until: now + 820
    });
  }

  function registerComboHit(object) {
    const now = performance.now();
    const isWithinComboWindow = now <= gameState.comboUntil;
    const isSameObject = object.id === gameState.comboLastObjectId;
    const isContinuation = isWithinComboWindow && !isSameObject;

    if (!isWithinComboWindow) {
      gameState.comboCount = 1;
    } else if (isContinuation) {
      gameState.comboCount += 1;
    }

    gameState.comboUntil = now + COMBO_WINDOW_MS;
    gameState.comboLastObjectId = object.id;

    if (!isContinuation || gameState.comboCount < 2) {
      return {
        count: gameState.comboCount,
        bonus: 0
      };
    }

    const baseBonus = COMBO_BONUS_BY_COUNT[gameState.comboCount] || Math.min(MAX_COMBO_BONUS, COMBO_BONUS_BY_COUNT[5] + (gameState.comboCount - 5) * 1000);

    return {
      count: gameState.comboCount,
      bonus: baseBonus * getActiveMultiplier()
    };
  }

  function resetCombo() {
    gameState.comboCount = 0;
    gameState.comboUntil = 0;
    gameState.comboLastObjectId = "";
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
    gameState.feedback = "BOM ERROR: MANJKA REVIZIJA";
    gameState.feedbackUntil = performance.now() + 1400;
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
    gameState.feedback = `KOSOVNICA ${gameState.bomMode.step}/${BOM_MODE.sequence.length}: ${nextLabel}`;
    gameState.feedbackUntil = performance.now() + 1000;
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
    gameState.feedback = `KOSOVNICA USKLAJENA +${bonus.toLocaleString("sl-SI")}`;
    gameState.feedbackUntil = performance.now() + 1600;
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
    gameState.feedback = label;
    gameState.feedbackUntil = performance.now() + 1100;
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
      return;
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
        gameState.feedback = `${mission.label} ${state.progress}/${mission.required}`;
        gameState.feedbackUntil = performance.now() + 850;
        audio.play("mission-progress");
      }
    });

    if (!didAdvance) {
      return;
    }

    maybeUnlockNextMissionStage();
    setActiveMissionFromStage();
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
    gameState.feedback = `STAGE ${gameState.missionStageIndex + 1} UNLOCKED: ${nextStageLabel}`;
    gameState.feedbackUntil = performance.now() + 1500;

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

    gameState.feedback = `${mission.label} COMPLETE +${mission.bonus.toLocaleString("sl-SI")}`;
    gameState.feedbackUntil = performance.now() + 1300;
    advanceMultiballProgressFromMission(mission);
    maybeAwardMissionMetaReward();
  }

  function kickBallFromObject(ball, object) {
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
    const radialKick = 7.6;
    const tangentKick = Math.min(5.8, Math.max(2.8, speed * 0.42));
    const retainedVelocity = 0.55;
    let nextVelocity = {
      x: ball.velocity.x * retainedVelocity + radialX * radialKick + tangentX * tangentDirection * tangentKick,
      y: ball.velocity.y * retainedVelocity + radialY * radialKick + tangentY * tangentDirection * tangentKick
    };

    const outgoingSpeed = Math.hypot(nextVelocity.x, nextVelocity.y);
    const minOutgoingSpeed = Math.min(13.5, Math.max(9.4, speed * 0.92));

    if (outgoingSpeed < minOutgoingSpeed) {
      const scale = minOutgoingSpeed / Math.max(0.1, outgoingSpeed);
      nextVelocity = {
        x: nextVelocity.x * scale,
        y: nextVelocity.y * scale
      };
    }

    MatterLib.Body.setVelocity(ball, nextVelocity);
  }

  function kickBallFromSlingshot(ball, slingshot) {
    const speed = Math.hypot(ball.velocity.x, ball.velocity.y);
    const retainedVelocity = 0.42;
    const impulseScale = Math.min(1.2, Math.max(0.78, speed / 9));
    const nextVelocity = {
      x: ball.velocity.x * retainedVelocity + slingshot.impulse.x * impulseScale,
      y: Math.min(ball.velocity.y * retainedVelocity + slingshot.impulse.y * impulseScale, -5.2)
    };

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
    resetCombo();
    resetBall(ball, true);
    gameState.feedback = "BALL SAVE";
    gameState.feedbackUntil = performance.now() + 1400;
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
    gameState.feedback = "";
    gameState.feedbackUntil = 0;
    inputState.space = false;
    inputState.chargingSince = 0;
    resetMultiballState();
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
    gameState.feedback = "";
    gameState.feedbackUntil = 0;
    gameState.gameOverStartedAt = 0;
    gameState.gameOverRestartAt = 0;
    gameState.finalScore = 0;
    gameState.finalHighScore = gameState.highScore;
    gameState.finalWasRecord = false;
    gameState.hitCounts = {};
    gameState.hitEffects = [];
    gameState.floatingTexts = [];
    resetCombo();
    gameState.lowerTrapSince = 0;
    gameState.upperTrapSince = 0;
    gameState.upperTrapBallId = "";
    gameState.skillShotAvailableUntil = 0;
    gameState.skillShotAwarded = false;
    gameState.ballSaveUntil = 0;
    gameState.ballSaveUsed = false;
    gameState.multiball = createMultiballState();
    gameState.bomMode = {
      active: false,
      step: 0,
      deadline: 0
    };
    gameState.missionStageIndex = 0;
    gameState.activeMissionId = "measurement";
    gameState.lastCompletedMissionId = "";
    gameState.missions = createMissionState();
    gameState.activeCompanyId = "impol";
    gameState.companies = createCompanyState();
    gameState.metaRewards = createMetaRewardState();

    if (physics) {
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
      return inUpperPocket && speed <= 0.28;
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
  renderMissionList();
  renderCompanyList();
  updateHud();
  updateAudioUi();
  updateControlsUi();
  syncInspectableState(physics);

  function stepPhysics() {
    if (physics) {
      updatePlungerPower();
      updateFlippers();
      updateBomModeTimeout();
      updateComboTimeout();
      updateBallSaveTimeout();
      updateMetaRewardTimeout();
      holdBallInLaunchLane();
      MatterLib.Engine.update(physics.engine, physicsClock.step * physicsClock.simulationScale);
      maybeGuideShooterLaneExit();
      maybeCatchLostBall();
      maybeRescueLowerFlipperTrap();
      maybeRescueUpperPlayfieldTrap();
      maybeFinishBetweenBalls();
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
      drawPhysicsOverlay([...physics.staticBodies, ...physics.bumperBodies, ...physics.targetBodies]);
      drawFlipper(physics.flippers.left, inputState.left);
      drawFlipper(physics.flippers.right, inputState.right);
      drawPlungerCharge();
      getActiveBalls().forEach((ball) => drawBall(ball));
      drawStatusBadge();
      drawScoreFeedback();
      drawComboBadge();
      drawMetaRewardBadge();
      drawMultiballBadge();
      drawBallSaveBadge();
      drawBomModeBadge();
      drawHitEffects();
      drawGameOverPresentation();
    } else {
      fillRoundedRect(104, 100, 210, 44, 6, "rgba(120, 36, 28, 0.76)");
      drawLabel("MATTER.JS NOT LOADED", 209, 123, "#ff7567", 16);
    }

    updateRestartUi();
    if (gameState.status === "game-over") {
      syncInspectableState(physics);
    }
    window.requestAnimationFrame(update);
  }

  update();
})();
