(function () {
  const render = window.ImpolPinballRender || (window.ImpolPinballRender = {});

  function createRenderer(dependencies) {
    const {
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
    } = dependencies;

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

  function getLockHouseLockedCount() {
    return Math.max(0, Math.min(LOCK_HOUSE.maxLockedBalls, gameState.lockHouse.lockedCount || 0));
  }

  function drawLockHouseQualificationLamps(startX, lampY, spacing = 36) {
    LOCK_HOUSE.qualificationEvents.forEach((requirement, index) => {
      const lampX = startX + index * spacing;
      const lit = (gameState.lockHouse.progress[requirement.id] || 0) >= requirement.required;
      context.fillStyle = lit ? requirement.id === "alu-flow-orbit" ? "#31a8ff" : "#7bdc6c" : "rgba(8, 18, 25, 0.9)";
      context.beginPath();
      context.arc(lampX, lampY, lit ? 8 : 6, 0, Math.PI * 2);
      context.fill();
      context.strokeStyle = lit ? "#edf7fb" : "rgba(126, 147, 156, 0.8)";
      context.lineWidth = 2;
      context.stroke();
    });
  }

  function drawLockReleaseFallback(x, y, width, height, lockedCount, isLit) {
    fillRoundedRect(x - width / 2, y - height / 2, width, height, 8, "rgba(5, 14, 18, 0.88)");
    strokeRoundedRect(x - width / 2, y - height / 2, width, height, 8, isLit ? "#7bdc6c" : "rgba(126, 147, 156, 0.72)", isLit ? 3 : 2);
    drawFeedbackText("MULTIBALL LOCK", x, y - height * 0.24, width - 24, isLit ? "#7bdc6c" : "#9ab3bf", 11, {
      minSize: 8,
      weight: 900
    });

    const ballSpacing = Math.min(width * 0.22, 34);
    const startX = x - ballSpacing;
    for (let index = 0; index < LOCK_HOUSE.maxLockedBalls; index += 1) {
      const ballX = startX + index * ballSpacing;
      const filled = index < lockedCount;
      context.fillStyle = filled ? "#edf7fb" : "rgba(8, 18, 25, 0.92)";
      context.beginPath();
      context.arc(ballX, y + height * 0.16, 12, 0, Math.PI * 2);
      context.fill();
      context.strokeStyle = filled ? "#31a8ff" : "rgba(49, 168, 255, 0.56)";
      context.lineWidth = 3;
      context.stroke();
    }
  }

  function drawLockReleaseIndicator() {
    const lockedCount = getLockHouseLockedCount();
    const isLit = lockedCount > 0 || isLockHouseQualified() || gameState.lockHouse.state === "holding" || gameState.lockHouse.state === "kicking";
    const pulse = isLit ? 0.52 + Math.sin(performance.now() / 170) * 0.18 : 0;
    const indicator = LOCK_RELEASE_INDICATOR;
    const assetId = `multiball-lock-release-${lockedCount}`;

    context.save();
    if (pulse > 0) {
      const glow = context.createRadialGradient(indicator.x, indicator.y, 18, indicator.x, indicator.y, 104);
      glow.addColorStop(0, `rgba(123, 220, 108, ${0.18 + pulse * 0.22})`);
      glow.addColorStop(0.58, `rgba(49, 168, 255, ${0.08 + pulse * 0.14})`);
      glow.addColorStop(1, "rgba(0, 0, 0, 0)");
      context.fillStyle = glow;
      context.beginPath();
      context.ellipse(indicator.x, indicator.y, indicator.width * 0.58, indicator.height * 0.72, 0, 0, Math.PI * 2);
      context.fill();
    }

    const drewAsset = drawDecorAsset(assetId, indicator.x, indicator.y, indicator.width, indicator.height, {
      alpha: isLit ? 0.9 : 0.52,
      shadowColor: isLit ? "rgba(49, 168, 255, 0.28)" : "rgba(0, 0, 0, 0.34)",
      shadowBlur: isLit ? 12 : 5,
      shadowOffsetY: 4
    });

    if (!drewAsset) {
      drawLockReleaseFallback(indicator.x, indicator.y, indicator.width, indicator.height, lockedCount, isLit);
    }

    context.restore();
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

    const drewLockHouseAsset = drawDecorAsset(LOCK_HOUSE_VISUAL.assetId, x, y, LOCK_HOUSE_VISUAL.width, LOCK_HOUSE_VISUAL.height, {
      shadowColor: isQualified ? "rgba(123, 220, 108, 0.32)" : "rgba(0, 0, 0, 0.42)",
      shadowBlur: isQualified ? 16 : 10,
      shadowOffsetY: 7
    });

    if (drewLockHouseAsset) {
      if (isHolding || isKicking || isQualified) {
        context.fillStyle = isHolding ? "rgba(49, 168, 255, 0.22)" : isKicking ? "rgba(255, 185, 103, 0.26)" : "rgba(123, 220, 108, 0.22)";
        context.beginPath();
        context.ellipse(config.mouth.x, config.mouth.y + 10, config.mouth.width * 0.46, config.mouth.height * 0.44, config.mouth.angle, 0, Math.PI * 2);
        context.fill();
      }

      fillRoundedRect(x - 36, config.mouth.y - 3, 72, 24, 5, "rgba(5, 11, 16, 0.9)");
      strokeRoundedRect(x - 36, config.mouth.y - 3, 72, 24, 5, presentation.color, 2);
      drawFeedbackText(presentation.label, x, config.mouth.y + 9, 62, presentation.color, 15, {
        minSize: 10,
        weight: 900
      });
      drawLockHouseQualificationLamps(x - 18, y + LOCK_HOUSE_VISUAL.lampOffsetY);
      context.restore();
      return;
    }

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

    drawFeedbackText("ALCAD", x, top + 52, width - 18, "#edf7fb", 16, { minSize: 11, weight: 900 });
    drawLockHouseQualificationLamps(x - 18, top + 116);
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
    if (gameState.multiball.pending) {
      const remaining = Math.max(0, gameState.multiball.pendingStartAt - performance.now());
      const label = gameState.multiball.pendingKind === "lock-house" ? "Lock House multiball ready" : "Multiball ready";
      drawFeedbackZone("multiball", label, {
        color: "#ffb967",
        fontSize: 16,
        progress: 1 - Math.min(1, remaining / MULTIBALL.preStartDelayMs),
        progressColor: "rgba(255, 155, 61, 0.9)",
        background: "rgba(5, 11, 16, 0.82)"
      });
      return;
    }

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
    drawLockReleaseIndicator();

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


    return {
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
    };
  }

  render.createRenderer = createRenderer;
})();
