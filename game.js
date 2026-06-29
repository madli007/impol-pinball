(function () {
  const canvas = document.getElementById("game-canvas");
  const context = canvas.getContext("2d");
  const MatterLib = window.Matter;
  const {
    TABLE,
    DEBUG_PHYSICS,
    DIAGNOSTIC_QUERY_PARAM,
    HIGH_SCORE_BASE_KEY,
    AUDIO_MUTED_KEY,
    SCORING_RULES,
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
    ASSET_CONFIG,
    TABLE_CONFIG,
    MISSION_CONFIG,
    MISSION_STAGES,
    COMPANY_STATUS,
    COMPANY_CONFIG,
    COMPANY_BY_EVENT,
    COMPANY_BY_MISSION,
    MISSION_TARGET_LABELS,
    BOM_MODE,
    META_REWARDS,
    BALL_SAVE_DURATION
  } = window.ImpolPinballConfig;
  const {
    storage: storageRuntime,
    assets: assetRuntime,
    audio: audioRuntime,
    physics: physicsRuntime,
    diagnostics: diagnosticsRuntime
  } = window.ImpolPinballRuntime;
  const {
    loadHighScore,
    saveHighScore,
    separateLegacyHighScore,
    loadLegacyHighScore
  } = storageRuntime;
  const {
    loadAssets,
    createAssetReadiness
  } = assetRuntime;
  const {
    createAudioManager,
    createAudioControls
  } = audioRuntime;
  const {
    createBallBody: createBallBodyRuntime,
    createMatterWorld: createMatterWorldRuntime,
    positionFlipper: positionFlipperRuntime
  } = physicsRuntime;
  const {
    createDiagnosticHarness: createDiagnosticHarnessRuntime
  } = diagnosticsRuntime;
  const {
    createRenderer
  } = window.ImpolPinballRender;
  const diagnosticQuery = new URLSearchParams(window.location.search);
  const DIAGNOSTICS_ENABLED = diagnosticQuery.has(DIAGNOSTIC_QUERY_PARAM);
  const ui = {
    score: document.getElementById("score-value"),
    ball: document.getElementById("ball-value"),
    ballsLeft: document.getElementById("balls-left-value"),
    multiplier: document.getElementById("multiplier-value"),
    highScore: document.getElementById("high-score-value"),
    devMode: document.getElementById("dev-mode-value"),
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
    devMode: false,
    devModeUsed: false,
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
  const isAssetReady = createAssetReadiness(assets);
  const audio = createAudioManager();
  const audioControls = createAudioControls({
    ui,
    audio,
    syncInspectable: () => syncInspectableState(physics)
  });
  const unlockAudio = audioControls.unlockAudio;
  const toggleAudioMute = audioControls.toggleAudioMute;
  const updateAudioUi = audioControls.updateAudioUi;
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
      pending: false,
      pendingStartAt: 0,
      pendingSourceLabel: "",
      pendingKind: "",
      pendingOptions: null,
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
      !gameState.multiball.pending &&
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
      gameState.multiball.pending ||
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

    if (gameState.multiball.active || gameState.multiball.pending) {
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
      passiveContacts: values.slingshot * 10 + values.rollover * 6 + values.inlane * 4 + values.outlane * 2,
      setBonuses: values.rolloverSet + values.laneSet,
      routes: values.upperOrbit * 3,
      intentionalTargets: values.targets["measurement-left"] * 3 + values.bumpers.mes * 5,
      missionCompletion: values.missions.measurement + values.missions.mes
    };
    const competentParts = {
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

  function setHighScore(candidate) {
    if (gameState.devMode || gameState.devModeUsed) {
      return;
    }

    if (candidate <= gameState.highScore) {
      return;
    }

    gameState.highScore = candidate;
    saveHighScore(gameState.highScore);
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

  function isBallSaveActive() {
    return gameState.status === "playing" && !gameState.ballSaveUsed && performance.now() <= gameState.ballSaveUntil;
  }

  function updateHud() {
    ui.score.textContent = gameState.score.toLocaleString("sl-SI");
    ui.ball.textContent = String(gameState.ballNumber);
    ui.ballsLeft.textContent = String(gameState.ballsLeft);
    ui.multiplier.textContent = `${getActiveMultiplier()}x`;
    ui.highScore.textContent = gameState.highScore.toLocaleString("sl-SI");
    if (ui.devMode) {
      ui.devMode.textContent = gameState.devMode ? "On" : gameState.devModeUsed ? "Locked" : "Off";
      ui.devMode.classList.toggle("is-dev-enabled", gameState.devMode || gameState.devModeUsed);
    }
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
      const multiballStatus = gameState.multiball.pending
        ? "MB ready"
        : gameState.multiball.active
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

    if (gameState.multiball.active || gameState.multiball.pending) {
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
      devMode: {
        active: gameState.devMode,
        usedThisGame: gameState.devModeUsed,
        highScoreRecording: !gameState.devMode && !gameState.devModeUsed
      },
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
        pending: gameState.multiball.pending,
        pendingKind: gameState.multiball.pendingKind,
        pendingRemainingMs: Math.max(0, Math.round(gameState.multiball.pendingStartAt - performance.now())),
        multiplier: gameState.multiball.active ? MULTIBALL.multiplier : 1,
        missionProgressPaused: gameState.multiball.active || gameState.multiball.pending,
        companyProgressPaused: gameState.multiball.active || gameState.multiball.pending,
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
    const diagnosticsRefs = {};
    Object.defineProperties(diagnosticsRefs, {
      heldLockHouseBallBody: {
        get: () => heldLockHouseBallBody
      },
      lockedLockHouseBallBodies: {
        get: () => lockedLockHouseBallBodies
      },
      lockHouseReleaseQueue: {
        get: () => lockHouseReleaseQueue
      }
    });

    return createDiagnosticHarnessRuntime({
      AUDIO_MUTED_KEY,
      COMBO_MAX_COUNT,
      COMPANY_BY_EVENT,
      COMPANY_CONFIG,
      COMPANY_STATUS,
      DIAGNOSTIC_QUERY_PARAM,
      FEEDBACK_ZONES,
      HIGH_SCORE_BASE_KEY,
      LOCK_HOUSE,
      MISSION_CONFIG,
      MISSION_STAGES,
      MatterLib,
      SCORING_RULES,
      TABLE,
      TABLE_CONFIG,
      UPPER_ORBIT,
      addActiveBall,
      advanceLockHouseQualification,
      advanceMissions,
      areAllCompaniesBonus,
      areAllRequiredMissionsComplete,
      armSideShield,
      audio,
      clearHeldLockHouseBall,
      clearJackpots,
      clearLockedLockHouseBalls,
      createLockHouseState,
      createMultiballState,
      createScoringRehitState,
      diagnosticsRefs,
      drainBall,
      endMultiball,
      ensurePrimaryBallBody,
      formatComboLabel,
      gameState,
      getActiveBalls,
      getBallStartPosition,
      getBonusCompanyCount,
      getCompanyById,
      getCompletedMissionCount,
      getLockHousePresentation,
      getLockHouseProgressCount,
      getLockHouseProgressLabel,
      getLockHouseProgressTotal,
      getMissionById,
      getObjectiveCopy,
      getScoreEconomyReport,
      handleLaneHit,
      handleLockHouseContact,
      handleTableHit,
      inputState,
      isLockHouseQualified,
      launchBall,
      maybeFinishBetweenBalls,
      physics,
      recordDiagnosticEvent,
      registerComboHit,
      removeExtraBalls,
      resetBall,
      resetCombo,
      restartGame,
      saveHighScore,
      separateLegacyHighScore,
      setFeedback,
      setHighScore,
      startMultiball,
      syncInspectableState,
      updateCompanyForCombo,
      updateHud,
      updateLockHouseHold
    });
  }

  function handleMatterCollisionPair(pair) {
    const labels = [pair.bodyA.label, pair.bodyB.label];
    const pairBall = getPairBall(pair);
    if (pairBall && labels.includes("drain-sensor") && labels.includes("pinball")) {
      recordDiagnosticEvent("drain", { ball: pairBall, reason: "drain-sensor" });
      drainBall(pairBall);
    }

    if (pairBall && labels.includes("launch-lane-top-exit") && labels.includes("pinball")) {
      guideBallOutOfShooterLane(pairBall, "top-exit-sensor");
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
  }

  const physics = createMatterWorldRuntime({
    MatterLib,
    TABLE,
    TABLE_CONFIG,
    getBallStartPosition,
    onCollisionPair: handleMatterCollisionPair
  });
  const renderer = createRenderer({
    canvas,
    context,
    assets,
    isAssetReady,
    gameState,
    TABLE,
    DEBUG_PHYSICS,
    SCORING_RULES,
    COMBO_WINDOW_MS,
    GAME_OVER_RESTART_DELAY_MS,
    MULTIBALL,
    JACKPOT,
    FEEDBACK_ZONES,
    SIDE_SHIELD_DURATION,
    UPPER_ORBIT,
    LOCK_HOUSE,
    LOCK_HOUSE_VISUAL,
    LOCK_RELEASE_INDICATOR,
    TABLE_CONFIG,
    MISSION_STAGES,
    BOM_MODE,
    META_REWARDS,
    BALL_SAVE_DURATION,
    isCurrentMissionEvent,
    isLockHouseQualified,
    getLockHousePresentation,
    isSideShieldActive,
    getHudMissions,
    formatComboLabel,
    getMetaMultiplierRemainingMs,
    getActiveBalls,
    getJackpotLitLabels
  });
  const {
    fillRoundedRect,
    drawLabel,
    drawPhysicsOverlay,
    drawPlayfieldFrame,
    drawFlipper,
    drawPlungerCharge,
    drawBall,
    drawStatusBadge,
    drawComboBadge,
    drawMetaRewardBadge,
    drawMultiballBadge,
    drawJackpotBadge,
    drawBallSaveBadge,
    drawSideShieldBadge,
    drawBomModeBadge,
    drawHitEffects,
    drawGameOverPresentation
  } = renderer;

  function createBallBody(id, position) {
    return createBallBodyRuntime({
      MatterLib,
      id,
      position
    });
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
    positionFlipperRuntime({
      MatterLib,
      body,
      config,
      angle
    });
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

  function removeInactiveExtraBalls(preferredBall, reason = "single-ball-recovery") {
    if (!physics || gameState.multiball.active) {
      return 0;
    }

    const activeBalls = getActiveBalls();

    if (activeBalls.length <= 1) {
      return 0;
    }

    const primaryBall = activeBalls.includes(preferredBall) ? preferredBall : activeBalls[0];
    const extras = activeBalls.filter((ball) => ball !== primaryBall);

    extras.forEach((ball) => removeActiveBall(ball));
    physics.ball = primaryBall;
    syncPrimaryBall();

    recordDiagnosticEvent("single-ball-recovery", {
      eventName: "single-ball:recovery",
      objectId: "active-balls",
      label: "Removed stale extra balls outside multiball",
      kind: reason,
      metrics: {
        removedCount: extras.length,
        activeBallCount: getActiveBalls().length,
        preferredBallId: primaryBall?.gameBallId || ""
      }
    });
    return extras.length;
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
    clearPendingMultiballStart();
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

  function clearPendingMultiballStart() {
    gameState.multiball.pending = false;
    gameState.multiball.pendingStartAt = 0;
    gameState.multiball.pendingSourceLabel = "";
    gameState.multiball.pendingKind = "";
    gameState.multiball.pendingOptions = null;
  }

  function getMultiballStartDelay(options = {}) {
    if (typeof options.delayMs === "number") {
      return Math.max(0, options.delayMs);
    }

    return diagnosticHarness ? 0 : MULTIBALL.preStartDelayMs;
  }

  function scheduleMultiballStart(sourceLabel, options = {}) {
    if (!physics || gameState.status !== "playing" || gameState.multiball.active || gameState.multiball.pending) {
      return false;
    }

    const delayMs = getMultiballStartDelay(options);

    if (delayMs <= 0) {
      return options.kind === "lock-house" ? beginLockHouseMultiball(options) : beginMultiball(sourceLabel, options);
    }

    const now = performance.now();
    gameState.multiball.pending = true;
    gameState.multiball.pendingStartAt = now + delayMs;
    gameState.multiball.pendingSourceLabel = sourceLabel;
    gameState.multiball.pendingKind = options.kind || "standard";
    gameState.multiball.pendingOptions = { ...options, delayMs: 0 };

    const message = options.kind === "lock-house" ? "Lock House multiball ready" : "Multiball ready";
    setFeedback(message, delayMs + 900, "multiball", now);
    addHitFeedback({
      id: "multiball-ready",
      x: options.kind === "lock-house" ? LOCK_HOUSE.mouth.x : 450,
      y: options.kind === "lock-house" ? LOCK_HOUSE.mouth.y : 300,
      accent: "#ffb967",
      label: "MULTIBALL READY",
      color: "#ffb967"
    });
    audio.play("multiball-warning");
    recordDiagnosticEvent("multiball-pending", {
      eventName: "multiball:pending",
      objectId: "multiball",
      label: sourceLabel,
      kind: gameState.multiball.pendingKind,
      metrics: {
        delayMs
      }
    });
    updateHud();
    syncInspectableState(physics);
    return true;
  }

  function startMultiball(sourceLabel, options = {}) {
    return scheduleMultiballStart(sourceLabel, options);
  }

  function beginMultiball(sourceLabel, options = {}) {
    if (!physics || gameState.status !== "playing") {
      return false;
    }

    const wasActive = gameState.multiball.active;
    const activeBalls = getActiveBalls();
    const missingBalls = Math.max(0, MULTIBALL.maxBalls - activeBalls.length);

    for (let index = 0; index < missingBalls; index += 1) {
      addLaunchedMultiball();
    }

    const now = performance.now();
    clearPendingMultiballStart();
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
    audio.play("multiball-start");
    updateHud();
    syncInspectableState(physics);
    return true;
  }

  function updatePendingMultiballStart() {
    if (!gameState.multiball.pending) {
      return;
    }

    if (gameState.status !== "playing") {
      clearPendingMultiballStart();
      updateHud();
      syncInspectableState(physics);
      return;
    }

    if (performance.now() < gameState.multiball.pendingStartAt) {
      return;
    }

    const sourceLabel = gameState.multiball.pendingSourceLabel;
    const options = gameState.multiball.pendingOptions || {};

    if (gameState.multiball.pendingKind === "lock-house") {
      beginLockHouseMultiball(options);
    } else {
      beginMultiball(sourceLabel, options);
    }
  }

  function advanceMultiballProgressFromMission(mission) {
    if (gameState.status !== "playing" || gameState.multiball.active || gameState.multiball.pending) {
      return;
    }

    syncMultiballRequirement();
    gameState.multiball.progress = Math.min(gameState.multiball.nextRequirement, gameState.multiball.progress + 1);

    if (gameState.multiball.progress >= gameState.multiball.nextRequirement) {
      startMultiball(`${mission.label} REWARD`);
      return;
    }

    const remaining = gameState.multiball.nextRequirement - gameState.multiball.progress;
    if (remaining <= 1) {
      setFeedback(`MULTIBALL MISSIONS ${gameState.multiball.progress}/${gameState.multiball.nextRequirement}`, 850, "progress");
    }
  }

  function endMultiball() {
    if (gameState.multiball.pending) {
      clearPendingMultiballStart();
    }

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

  function reconcileExpiredSingleBallMultiball(reason = "state-check") {
    if (!gameState.multiball.active || gameState.status !== "playing") {
      return false;
    }

    const activeBallCount = getActiveBalls().length;
    const graceActive = performance.now() <= gameState.multiball.graceUntil;

    if (activeBallCount > 1 || graceActive) {
      return false;
    }

    recordDiagnosticEvent("multiball-recovery", {
      eventName: "multiball:recovery",
      objectId: "multiball",
      label: "Expired single-ball multiball recovered",
      kind: reason,
      metrics: {
        activeBallCount
      }
    });
    endMultiball();
    return true;
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

    if (gameState.multiball.active || gameState.multiball.pending) {
      return LOCK_HOUSE.multiballPolicy;
    }

    if (getActiveBalls().length !== 1) {
      return "extra-ball-active";
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
    const lowerEntryEdge = mouth.y - mouth.height * 0.05;
    const notFallingFromAbove = ball.velocity.y <= 0.8;
    return notFallingFromAbove && ball.position.y >= lowerEntryEdge;
  }

  function captureLockHouseBall(ball) {
    reconcileExpiredSingleBallMultiball("lock-house-capture");
    removeInactiveExtraBalls(ball, "lock-house-capture");

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

  function startLockHouseMultiball(options = {}) {
    if (!physics || gameState.status !== "playing" || gameState.multiball.active || gameState.multiball.pending) {
      return false;
    }

    const state = gameState.lockHouse;
    const now = performance.now();
    const delayMs = getMultiballStartDelay({ ...options, kind: "lock-house" });
    const startAt = now + delayMs;
    lockHouseReleaseQueue = lockedLockHouseBallBodies.splice(0, LOCK_HOUSE.maxLockedBalls);

    while (lockHouseReleaseQueue.length < LOCK_HOUSE.maxLockedBalls) {
      lockHouseReleaseQueue.push(createBallBody(`ball-${physics.nextBallId}`, LOCK_HOUSE.kickoutPosition));
      physics.nextBallId += 1;
    }

    state.state = "kicking";
    state.kickoutStartedAt = now;
    state.lockMultiballStartedAt = 0;
    state.nextReleaseAt = startAt;
    state.releaseCount = 0;
    state.lockedBallIds = [];
    state.lockedCount = 0;
    state.heldBallId = "";
    state.holdStartedAt = 0;
    state.holdPosition = null;
    state.lastCaptureBlockedReason = "";
    clearLockHouseQualificationProgress();

    if (delayMs > 0) {
      return scheduleMultiballStart(LOCK_HOUSE.label, { ...options, kind: "lock-house" });
    }

    return beginLockHouseMultiball({ ...options, delayMs: 0 });
  }

  function beginLockHouseMultiball(options = {}) {
    if (!physics || gameState.status !== "playing" || gameState.multiball.active || !lockHouseReleaseQueue.length) {
      return false;
    }

    const state = gameState.lockHouse;
    const now = performance.now();
    clearPendingMultiballStart();
    state.state = "kicking";
    state.lockMultiballStartedAt = now;
    state.nextReleaseAt = Math.min(state.nextReleaseAt || now, now);
    gameState.multiball.active = true;
    gameState.multiball.startedAt = now;
    gameState.multiball.endedAt = 0;
    gameState.multiball.graceUntil = now + MULTIBALL.graceMs;
    gameState.multiball.peakBalls = LOCK_HOUSE.maxLockedBalls;
    gameState.multiball.lastStartSource = LOCK_HOUSE.label;
    if (options.advanceDifficulty !== false) {
      gameState.multiball.starts += 1;
      gameState.multiball.progress = 0;
      syncMultiballRequirement();
    }
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
    if (gameState.multiball.active || gameState.multiball.pending) {
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
    gameState.finalWasRecord = !gameState.devMode && !gameState.devModeUsed && gameState.score > gameState.previousHighScore;
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
    gameState.devModeUsed = gameState.devMode;
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

  function toggleDevMode() {
    gameState.devMode = !gameState.devMode;
    if (gameState.devMode) {
      gameState.devModeUsed = true;
      gameState.finalWasRecord = false;
    }
    setFeedback(gameState.devMode ? "DEV MODE ON: HIGHSCORE OFF" : "DEV MODE OFF", 1600, "system");
    updateHud();
    syncInspectableState(physics);
  }

  function addDevBallCredit() {
    gameState.ballsLeft += 1;
    setFeedback(`DEV +1 BALL (${gameState.ballsLeft})`, 1200, "system");
    updateHud();
    syncInspectableState(physics);
  }

  function reloadWithQueryParamUpdates(updates, removals = [], shouldBustCache = false) {
    const nextUrl = new URL(window.location.href);
    updates.forEach(([key, value]) => {
      nextUrl.searchParams.set(key, value);
    });
    removals.forEach((key) => {
      nextUrl.searchParams.delete(key);
    });
    if (shouldBustCache) {
      nextUrl.searchParams.set("bust", `shortcut-${Date.now()}`);
    }
    window.location.assign(nextUrl);
  }

  function runDiagnosticsFromShortcut() {
    reloadWithQueryParamUpdates([[DIAGNOSTIC_QUERY_PARAM, "all"]], [], true);
  }

  function returnToGameFromShortcut() {
    reloadWithQueryParamUpdates([], [DIAGNOSTIC_QUERY_PARAM, "bust"]);
  }

  function isShortcutCombo(event, code) {
    return event.ctrlKey && event.altKey && !event.shiftKey && event.code === code;
  }

  function handleShortcutCombo(event) {
    if (event.repeat) {
      return false;
    }

    if (isShortcutCombo(event, "KeyD")) {
      event.preventDefault();
      runDiagnosticsFromShortcut();
      return true;
    }

    if (isShortcutCombo(event, "KeyG")) {
      event.preventDefault();
      returnToGameFromShortcut();
      return true;
    }

    return false;
  }

  function handleKeyDown(event) {
    if (handleShortcutCombo(event)) {
      return;
    }

    if (event.ctrlKey && event.shiftKey && event.code === "KeyD") {
      event.preventDefault();
      toggleDevMode();
      return;
    }

    if (event.ctrlKey || event.altKey || event.metaKey) {
      return;
    }

    if (gameState.devMode && !event.repeat && (event.key === "+" || event.code === "NumpadAdd")) {
      event.preventDefault();
      addDevBallCredit();
      return;
    }

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
      updatePendingMultiballStart();
      updateLockHouseHold();
      holdBallInLaunchLane();
      MatterLib.Engine.update(physics.engine, physicsClock.step * physicsClock.simulationScale);
      maybeDetectLaneSensorOverlaps();
      maybeDetectUpperOrbitEntryOverlap();
      updateUpperOrbitGuide();
      maybeGuideShooterLaneExit();
      maybeCatchLostBall();
      reconcileExpiredSingleBallMultiball("physics-step");
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
