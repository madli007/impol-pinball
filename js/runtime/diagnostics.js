(function () {
  const runtime = window.ImpolPinballRuntime || (window.ImpolPinballRuntime = {});
  const diagnostics = runtime.diagnostics || (runtime.diagnostics = {});

  function createDiagnosticHarness(dependencies) {
    const {
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
    } = dependencies;
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
          diagnosticsRefs.lockedLockHouseBallBodies.includes(ball) &&
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

      clearHeldLockHouseBall("diagnostic-reset");
      clearLockedLockHouseBalls("diagnostic-reset");
      gameState.lockHouse = createLockHouseState();
      qualifyLockHouseForDiagnostic();
      const slowApproachBall = prepareLockHouseDiagnosticBall();
      MatterLib.Body.setVelocity(slowApproachBall, { x: 0, y: 0.2 });
      handleLockHouseContact(slowApproachBall);
      const slowApproachCaptured =
        gameState.lockHouse.lockedCount === 1 &&
        gameState.lockHouse.lockedBallIds.includes(slowApproachBall.gameBallId) &&
        gameState.lockHouse.lastCaptureBlockedReason === "";

      clearHeldLockHouseBall("diagnostic-reset");
      clearLockedLockHouseBalls("diagnostic-reset");
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
      gameState.lockHouse = createLockHouseState();
      qualifyLockHouseForDiagnostic();
      const stalePrimaryBall = prepareLockHouseDiagnosticBall();
      const staleExtraBall = addActiveBall({ x: 380, y: 720 }, { x: 1.2, y: -0.4 });
      const staleActiveCountBefore = getActiveBalls().length;
      handleLockHouseContact(stalePrimaryBall);
      const staleActiveBallIds = getActiveBalls().map((activeBall) => activeBall.gameBallId);
      const staleExtraRecovered =
        staleActiveCountBefore === 2 &&
        gameState.lockHouse.lockedCount === 1 &&
        gameState.lockHouse.lockedBallIds.includes(stalePrimaryBall.gameBallId) &&
        !staleActiveBallIds.includes(stalePrimaryBall.gameBallId) &&
        !staleActiveBallIds.includes(staleExtraBall.gameBallId) &&
        getActiveBalls().length === 1;

      gameState.multiball.active = false;
      gameState.multiball.graceUntil = 0;
      clearJackpots();
      removeExtraBalls();
      resetBall(physics.ball, true);
      gameState.status = "ready";

      const passed =
        locks === 20 &&
        autoLaunches === 20 &&
        lifeCountersPreserved === 20 &&
        closedBlocked &&
        slowApproachCaptured &&
        multiballBlocked &&
        staleExtraRecovered &&
        !duplicateOrLostBall;

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
          slowApproachCaptured,
          multiballBlocked,
          staleExtraRecovered,
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
        diagnosticsRefs.lockHouseReleaseQueue.length === 0;
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
        !diagnosticsRefs.heldLockHouseBallBody;
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

    function triggerMultiballLifeCounterDiagnostic() {
      clearHeldLockHouseBall("diagnostic-reset");
      clearLockedLockHouseBalls("diagnostic-reset");
      gameState.lockHouse = createLockHouseState();
      gameState.status = "playing";
      gameState.ballNumber = 1;
      gameState.ballsLeft = TABLE.totalBalls;
      gameState.drainCount = 0;
      gameState.ballSaveUsed = true;
      gameState.ballSaveUntil = 0;
      gameState.multiball = createMultiballState();
      gameState.multiball.active = true;
      gameState.multiball.startedAt = performance.now();
      gameState.multiball.graceUntil = 0;
      gameState.multiball.peakBalls = 2;
      clearJackpots();
      removeExtraBalls();

      const firstBall = ensurePrimaryBallBody();
      MatterLib.Body.setStatic(firstBall, false);
      MatterLib.Body.setPosition(firstBall, { x: 420, y: 760 });
      MatterLib.Body.setVelocity(firstBall, { x: 0, y: 0 });
      const secondBall = addActiveBall({ x: 480, y: 760 }, { x: 0, y: 0 });
      const ballsLeftBefore = gameState.ballsLeft;
      const ballNumberBefore = gameState.ballNumber;
      const activeBefore = getActiveBalls().length;

      drainBall(secondBall);
      const firstDrainPreservedLife =
        gameState.ballsLeft === ballsLeftBefore &&
        gameState.ballNumber === ballNumberBefore &&
        getActiveBalls().length === activeBefore - 1 &&
        !gameState.multiball.active;

      gameState.status = "playing";
      gameState.ballSaveUsed = true;
      gameState.ballSaveUntil = 0;
      const remainingBall = getActiveBalls()[0];
      drainBall(remainingBall);
      const finalDrainConsumedLife =
        gameState.ballsLeft === ballsLeftBefore - 1 &&
        gameState.ballNumber === ballNumberBefore + 1 &&
        gameState.status === "between-balls";

      recordDiagnosticEvent("multiball-life-counter", {
        eventName: "multiball:life-counter",
        objectId: "multiball",
        label: "Multiball drains preserve life until final ball",
        kind: firstDrainPreservedLife && finalDrainConsumedLife ? "passed" : "failed",
        metrics: {
          activeBefore,
          ballsLeftBefore,
          ballsLeftAfterFinalDrain: gameState.ballsLeft,
          firstDrainPreservedLife,
          finalDrainConsumedLife
        }
      });

      gameState.gameOverRestartAt = 0;
      restartGame();
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
      {
        id: "multiball-life-counter",
        name: "Multiball life counter",
        start: { x: 450, y: 760 },
        velocity: { x: 0, y: 0 },
        durationMs: 500,
        expectedEvents: ["multiball-life-counter"],
        setup: triggerMultiballLifeCounterDiagnostic,
        successWhen: (result) => {
          return result.events.some((event) => event.type === "multiball-life-counter" && event.kind === "passed");
        }
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
      saveHighScore(gameState.highScore);
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

  diagnostics.createDiagnosticHarness = createDiagnosticHarness;
})();
