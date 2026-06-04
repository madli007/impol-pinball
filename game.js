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
      exitY: 214
    },
    totalBalls: 3,
    flippers: {
      left: { pivotX: 244, pivotY: 1218, length: 166, height: 32, restAngle: 0.22, activeAngle: -0.58 },
      right: { pivotX: 656, pivotY: 1218, length: 166, height: 32, restAngle: Math.PI - 0.22, activeAngle: Math.PI + 0.58 }
    }
  };
  const DEBUG_PHYSICS = false;
  const HIGH_SCORE_KEY = "impol-pinball.high-score";
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
    "drain-apron": { src: "assets/images/drain-apron.png", width: 336, height: 102 }
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
      { id: "e-odprema", label: "E-ODPREMA", x: 646, y: 784, width: 156, height: 48, accent: "#9ab3bf", event: "hit:EODPREMA", points: 500 }
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
    }
  ];
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
    missions: {
      measurement: {
        row: document.getElementById("mission-measurement"),
        progress: document.getElementById("mission-measurement-progress")
      },
      mes: {
        row: document.getElementById("mission-mes"),
        progress: document.getElementById("mission-mes-progress")
      },
      erp: {
        row: document.getElementById("mission-erp"),
        progress: document.getElementById("mission-erp-progress")
      }
    }
  };
  const gameState = {
    score: 0,
    ballNumber: 1,
    ballsLeft: TABLE.totalBalls,
    multiplier: 1,
    highScore: loadHighScore(),
    status: "ready",
    resetAt: 0,
    drainCount: 0,
    plungerPower: 0,
    lastEvent: "",
    feedback: "",
    feedbackUntil: 0,
    hitCounts: {},
    hitEffects: [],
    floatingTexts: [],
    comboCount: 0,
    comboUntil: 0,
    lowerTrapSince: 0,
    skillShotAvailableUntil: 0,
    skillShotAwarded: false,
    activeMissionId: "measurement",
    missions: createMissionState()
  };
  const inputState = {
    left: false,
    right: false,
    leftPulse: false,
    rightPulse: false,
    space: false,
    chargingSince: 0
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

  function createMissionState() {
    return MISSION_CONFIG.reduce((missions, mission) => {
      missions[mission.id] = {
        progress: 0,
        completed: false,
        lastProgressAt: 0
      };
      return missions;
    }, {});
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
    context.fillStyle = "rgba(0, 0, 0, 0.34)";
    context.beginPath();
    context.ellipse(x, baseY + 12, baseWidth * 0.58, baseHeight * 0.58, 0, 0, Math.PI * 2);
    context.fill();

    const baseGradient = context.createLinearGradient(x, baseY - baseHeight / 2, x, baseY + baseHeight / 2);
    baseGradient.addColorStop(0, "rgba(126, 147, 156, 0.42)");
    baseGradient.addColorStop(0.5, "rgba(16, 39, 54, 0.92)");
    baseGradient.addColorStop(1, "rgba(5, 11, 16, 0.9)");
    context.fillStyle = baseGradient;
    context.beginPath();
    context.ellipse(x, baseY, baseWidth / 2, baseHeight / 2, 0, 0, Math.PI * 2);
    context.fill();

    context.strokeStyle = isLit ? "#edf7fb" : "rgba(126, 147, 156, 0.86)";
    context.lineWidth = isLit ? 4 : 3;
    context.stroke();

    context.strokeStyle = isLit ? accent : `${accent}99`;
    context.lineWidth = 4;
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

    context.save();
    context.globalAlpha = options.alpha ?? 1;
    context.shadowColor = options.shadowColor || "rgba(0, 0, 0, 0.38)";
    context.shadowBlur = options.shadowBlur ?? 12;
    context.shadowOffsetY = options.shadowOffsetY ?? 6;

    if (options.flipX) {
      context.translate(x, y);
      context.scale(-1, 1);
      context.drawImage(asset.image, -width / 2, -height / 2, width, height);
    } else {
      context.drawImage(asset.image, x - width / 2, y - height / 2, width, height);
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

    const remaining = Math.max(0, gameState.comboUntil - performance.now()) / 1800;
    fillRoundedRect(332, 1000, 236, 40, 8, "rgba(5, 11, 16, 0.74)");
    context.fillStyle = "#31a8ff";
    context.font = "800 18px Arial, Helvetica, sans-serif";
    context.textAlign = "center";
    context.textBaseline = "middle";
    context.fillText(`${gameState.comboCount}x COMBO`, 450, 1019);

    context.fillStyle = "rgba(255, 155, 61, 0.86)";
    context.fillRect(354, 1034, 192 * remaining, 4);
  }

  function drawMissionLights() {
    MISSION_CONFIG.forEach((mission, index) => {
      const state = gameState.missions[mission.id];
      const x = 316 + index * 134;
      const y = 964;
      const isActive = gameState.activeMissionId === mission.id;

      context.fillStyle = state.completed ? "#7bdc6c" : isActive ? "#ff9b3d" : "#304f5d";
      context.beginPath();
      context.arc(x, y, isActive ? 15 : 11, 0, Math.PI * 2);
      context.fill();
      context.strokeStyle = "rgba(237, 247, 251, 0.62)";
      context.lineWidth = 3;
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
      alpha: 0.72,
      shadowBlur: 0,
      shadowOffsetY: 0
    });

    drawDecorAsset("table-frame-trim", 450, 700, 900, 1344, {
      alpha: 0.34,
      shadowBlur: 18,
      shadowOffsetY: 7
    });
  }

  function drawPlungerCharge() {
    if (gameState.status !== "charging" && gameState.status !== "ready") {
      return;
    }

    const lane = TABLE.shooterLane;
    const barX = lane.outerX + 18;
    const barY = 1014;
    const barWidth = 18;
    const barHeight = 168;
    const filled = barHeight * gameState.plungerPower;
    fillRoundedRect(barX, barY, barWidth, barHeight, 8, "rgba(5, 11, 16, 0.78)");
    fillRoundedRect(barX, barY + barHeight - filled, barWidth, filled, 8, "#ff9b3d");
    strokeRoundedRect(barX, barY, barWidth, barHeight, 8, "#7e939c", 3);
  }

  function drawShooterChannel() {
    const lane = TABLE.shooterLane;
    const laneWidth = lane.outerX - lane.innerX;
    const laneX = lane.innerX;
    const laneHeight = lane.bottomY - lane.topY;

    context.save();

    const laneGradient = context.createLinearGradient(laneX, 0, lane.outerX, 0);
    laneGradient.addColorStop(0, "rgba(4, 11, 16, 0.86)");
    laneGradient.addColorStop(0.45, "rgba(15, 42, 55, 0.92)");
    laneGradient.addColorStop(1, "rgba(120, 148, 158, 0.32)");
    fillRoundedRect(laneX, lane.topY, laneWidth, laneHeight, 28, laneGradient);

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

    fillRoundedRect(lane.innerX - 96, lane.bottomY - 62, 82, 52, 12, "#0a1820");
    strokeRoundedRect(lane.innerX - 96, lane.bottomY - 62, 82, 52, 12, "#ff9b3d", 4);
    drawLabel("LAUNCH", lane.innerX - 55, lane.bottomY - 36, "#ff9b3d", 16);

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

      context.save();
      context.translate(lane.labelX, lane.labelY);
      context.rotate(lane.angle);
      fillRoundedRect(-42, -12, 84, 24, 6, "rgba(5, 11, 16, 0.68)");
      context.fillStyle = "#9ab3bf";
      context.font = "800 12px Arial, Helvetica, sans-serif";
      context.textAlign = "center";
      context.textBaseline = "middle";
      context.fillText(lane.label, 0, 1);
      context.restore();

      const lampGlow = context.createRadialGradient(lane.lampX, lane.lampY, 2, lane.lampX, lane.lampY, 22);
      lampGlow.addColorStop(0, "rgba(255, 155, 61, 0.9)");
      lampGlow.addColorStop(1, "rgba(255, 155, 61, 0)");
      context.fillStyle = lampGlow;
      context.beginPath();
      context.arc(lane.lampX, lane.lampY, 22, 0, Math.PI * 2);
      context.fill();
      drawRailBolt(lane.lampX, lane.lampY, 6);
    });

    context.restore();
  }

  function drawDrainAssembly() {
    context.save();

    drawDecorAsset("drain-apron", 450, 1330, 336, 102, {
      alpha: 0.84,
      shadowBlur: 18,
      shadowOffsetY: 8
    });

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
    ui.multiplier.textContent = `${gameState.multiplier}x`;
    ui.highScore.textContent = gameState.highScore.toLocaleString("sl-SI");
    updateMissionUi();
  }

  function updateMissionUi() {
    MISSION_CONFIG.forEach((mission) => {
      const state = gameState.missions[mission.id];
      const missionUi = ui.missions[mission.id];
      missionUi.progress.textContent = state.completed ? "DONE" : `${state.progress}/${mission.required}`;
      missionUi.row.classList.toggle("is-complete", state.completed);
      missionUi.row.classList.toggle("is-active", gameState.activeMissionId === mission.id && !state.completed);
    });
  }

  function syncInspectableState(physics) {
    window.ImpolPinball = {
      phase: "9.2",
      matterLoaded: Boolean(MatterLib),
      staticBodyCount: physics ? physics.staticBodies.length : 0,
      tableObjectCount: physics ? physics.bumperBodies.length + physics.targetBodies.length : 0,
      assetLoadedCount: Object.values(assets).filter((asset) => asset.loaded).length,
      ballSpawned: Boolean(physics && physics.ball),
      ballsLeft: gameState.ballsLeft,
      ballNumber: gameState.ballNumber,
      status: gameState.status,
      drainCount: gameState.drainCount,
      plungerPower: Number(gameState.plungerPower.toFixed(2)),
      score: gameState.score,
      lastEvent: gameState.lastEvent,
      comboCount: gameState.comboCount,
      skillShotAwarded: gameState.skillShotAwarded,
      activeMissionId: gameState.activeMissionId,
      missions: gameState.missions,
      input: { ...inputState }
    };
  }

  function drawPlayfieldFrame() {
    context.clearRect(0, 0, canvas.width, canvas.height);

    const gradient = context.createLinearGradient(0, 0, 0, canvas.height);
    gradient.addColorStop(0, "#183d4d");
    gradient.addColorStop(0.48, "#102733");
    gradient.addColorStop(1, "#081016");
    context.fillStyle = gradient;
    context.fillRect(0, 0, canvas.width, canvas.height);

    drawTableArtAssets();

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

    context.save();
    context.strokeStyle = "#6d8794";
    context.lineWidth = 8;
    context.beginPath();
    context.moveTo(150, 230);
    context.quadraticCurveTo(196, 116, 450, 104);
    context.quadraticCurveTo(704, 116, 750, 230);
    context.stroke();
    context.restore();

    context.fillStyle = "rgba(49, 168, 255, 0.08)";
    context.beginPath();
    context.moveTo(130, 238);
    context.quadraticCurveTo(450, 30, 770, 238);
    context.lineTo(714, 386);
    context.quadraticCurveTo(450, 230, 186, 386);
    context.closePath();
    context.fill();

    drawLabel("IMPOL", canvas.width / 2, 178, "#edf7fb", 68);
    drawLabel("ALUMINIUM INDUSTRY", canvas.width / 2, 230, "#9ab3bf", 24);

    drawConfiguredBumpers();
    drawLowerLanePolish();

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

    drawConfiguredTargets();
    drawDecorativeLamps();

    drawShooterChannel();
    drawSkillShotMarker();
    drawDrainAssembly();

    context.fillStyle = "#31a8ff";
    context.beginPath();
    context.arc(450, 1026, 18, 0, Math.PI * 2);
    context.fill();

    drawLabel("INNOVATION", 450, 1084, "#31a8ff", 28);
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

    const ball = Bodies.circle(TABLE.ballStart.x, TABLE.ballStart.y, 26, {
      label: "pinball",
      restitution: 0.82,
      friction: 0.005,
      frictionAir: 0.0008,
      density: 0.0011
    });

    Composite.add(engine.world, [...staticBodies, ...bumperBodies, ...targetBodies, flippers.left, flippers.right, ball]);

    [...staticBodies, ...bumperBodies, ...targetBodies, flippers.left, flippers.right].forEach((body) => {
      Body.setStatic(body, true);
    });

    positionFlipper(flippers.left, TABLE.flippers.left, TABLE.flippers.left.restAngle);
    positionFlipper(flippers.right, TABLE.flippers.right, TABLE.flippers.right.restAngle);

    Events.on(engine, "collisionStart", (event) => {
      event.pairs.forEach((pair) => {
        const labels = [pair.bodyA.label, pair.bodyB.label];
        if (labels.includes("drain-sensor") && labels.includes("pinball")) {
          drainBall(ball);
        }

        if (labels.includes("launch-lane-top-exit") && labels.includes("pinball")) {
          guideBallOutOfShooterLane(ball);
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
      flippers,
      ball
    };
  }

  const physics = createMatterWorld();

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
    MatterLib.Body.setPosition(ball, TABLE.ballStart);
    MatterLib.Body.setVelocity(ball, { x: 0, y: 0 });
    MatterLib.Body.setAngularVelocity(ball, 0);
  }

  function holdBallInLaunchLane() {
    if (!physics || !["ready", "charging", "between-balls", "game-over"].includes(gameState.status)) {
      return;
    }

    MatterLib.Body.setStatic(physics.ball, true);
    MatterLib.Body.setPosition(physics.ball, TABLE.ballStart);
    MatterLib.Body.setVelocity(physics.ball, { x: 0, y: 0 });
    MatterLib.Body.setAngularVelocity(physics.ball, 0);
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
    gameState.plungerPower = 0;
    inputState.chargingSince = 0;
    syncInspectableState(physics);
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
      x: -8.4,
      y: 3.2
    });
    awardSkillShot();
  }

  function awardSkillShot() {
    if (gameState.status !== "playing" || gameState.skillShotAwarded || performance.now() > gameState.skillShotAvailableUntil) {
      return;
    }

    const points = 3500 * gameState.multiplier;
    gameState.skillShotAwarded = true;
    gameState.score += points;
    setHighScore(gameState.score);
    gameState.lastEvent = "hit:SKILL_SHOT";
    gameState.feedback = `SKILL SHOT +${points.toLocaleString("sl-SI")}`;
    gameState.feedbackUntil = performance.now() + 1100;
    gameState.hitCounts["skill-shot"] = performance.now();
    addHitFeedback({
      id: "skill-shot",
      x: 686,
      y: 278,
      accent: "#ff9b3d",
      label: `SKILL +${points.toLocaleString("sl-SI")}`,
      color: "#ffb967"
    });
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

    const points = object.points * gameState.multiplier;
    const comboBonus = registerComboHit(object);
    gameState.score += points + comboBonus;
    setHighScore(gameState.score);
    gameState.lastEvent = object.event;
    gameState.feedback = comboBonus
      ? `COMBO +${(points + comboBonus).toLocaleString("sl-SI")} ${object.label}`
      : `+${points.toLocaleString("sl-SI")} ${object.label}`;
    gameState.feedbackUntil = performance.now() + 700;
    gameState.hitCounts[object.id] = performance.now();
    addHitFeedback({
      id: object.id,
      x: object.x,
      y: object.y,
      accent: object.accent,
      label: comboBonus ? `+${points.toLocaleString("sl-SI")}  COMBO +${comboBonus.toLocaleString("sl-SI")}` : `+${points.toLocaleString("sl-SI")}`,
      color: comboBonus ? "#ffb967" : "#edf7fb"
    });

    if (object.type === "bumper") {
      kickBallFromObject(ball, object);
    }

    advanceMissions(object.event);
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

    if (now <= gameState.comboUntil) {
      gameState.comboCount += 1;
    } else {
      gameState.comboCount = 1;
    }

    gameState.comboUntil = now + 1800;

    if (gameState.comboCount < 3) {
      return 0;
    }

    return Math.min(4000, 350 * (gameState.comboCount - 2)) * gameState.multiplier;
  }

  function advanceMissions(eventName) {
    MISSION_CONFIG.forEach((mission) => {
      const state = gameState.missions[mission.id];

      if (state.completed || mission.event !== eventName) {
        return;
      }

      state.progress = Math.min(mission.required, state.progress + 1);
      state.lastProgressAt = performance.now();
      gameState.activeMissionId = mission.id;

      if (state.progress >= mission.required) {
        completeMission(mission, state);
      } else {
        gameState.feedback = `${mission.label} ${state.progress}/${mission.required}`;
        gameState.feedbackUntil = performance.now() + 850;
      }
    });

    const nextMission = MISSION_CONFIG.find((mission) => !gameState.missions[mission.id].completed);
    if (nextMission) {
      gameState.activeMissionId = nextMission.id;
    }
  }

  function completeMission(mission, state) {
    state.completed = true;
    gameState.score += mission.bonus;
    setHighScore(gameState.score);

    if (mission.multiplierReward) {
      gameState.multiplier = Math.max(gameState.multiplier, mission.multiplierReward);
    }

    gameState.feedback = `${mission.label} COMPLETE +${mission.bonus.toLocaleString("sl-SI")}`;
    gameState.feedbackUntil = performance.now() + 1300;
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

  function drainBall(ball) {
    if (gameState.status !== "playing") {
      return;
    }

    gameState.drainCount += 1;
    gameState.ballsLeft = Math.max(0, gameState.ballsLeft - 1);
    setHighScore(gameState.score);

    if (gameState.ballsLeft === 0) {
      gameState.status = "game-over";
      resetBall(ball, true);
    } else {
      gameState.status = "between-balls";
      gameState.ballNumber += 1;
      gameState.resetAt = performance.now() + 900;
      resetBall(ball, true);
    }

    updateHud();
    syncInspectableState(physics);
  }

  function restartGame() {
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
    gameState.hitCounts = {};
    gameState.hitEffects = [];
    gameState.floatingTexts = [];
    gameState.comboCount = 0;
    gameState.comboUntil = 0;
    gameState.lowerTrapSince = 0;
    gameState.skillShotAvailableUntil = 0;
    gameState.skillShotAwarded = false;
    gameState.activeMissionId = "measurement";
    gameState.missions = createMissionState();

    if (physics) {
      resetBall(physics.ball, true);
    }

    updateHud();
    syncInspectableState(physics);
  }

  function maybeFinishBetweenBalls() {
    if (gameState.status === "between-balls" && performance.now() >= gameState.resetAt) {
      resetBall(physics.ball, true);
      gameState.status = "ready";
      syncInspectableState(physics);
    }
  }

  function maybeCatchLostBall() {
    if (!physics || gameState.status !== "playing") {
      return;
    }

    if (physics.ball.position.y > TABLE.height + 80) {
      drainBall(physics.ball);
    }
  }

  function maybeRescueLowerFlipperTrap() {
    if (!physics || gameState.status !== "playing") {
      return;
    }

    const ball = physics.ball;
    const speed = Math.hypot(ball.velocity.x, ball.velocity.y);
    const inLowerTrap =
      ball.position.y > 1090 &&
      ball.position.y < 1290 &&
      ((ball.position.x > 72 && ball.position.x < 330) || (ball.position.x > 570 && ball.position.x < 828));

    if (!inLowerTrap || speed > 0.34) {
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

    const direction = ball.position.x < TABLE.width / 2 ? 1 : -1;
    MatterLib.Body.setVelocity(ball, {
      x: direction * 1.35,
      y: -2.8
    });
    gameState.lowerTrapSince = 0;
  }

  function maybeGuideShooterLaneExit() {
    if (!physics || gameState.status !== "playing") {
      return;
    }

    const lane = TABLE.shooterLane;
    const ball = physics.ball;
    const isInShooterLane = ball.position.x > lane.innerX + 8 && ball.position.x < lane.outerX + 12;
    const reachedExit = ball.position.y < lane.exitY + 98;

    if (isInShooterLane && reachedExit && ball.velocity.y < 0) {
      guideBallOutOfShooterLane(ball);
    }
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
      if (!inputState.left) {
        inputState.leftPulse = true;
      }
      inputState.left = true;
      event.preventDefault();
    }

    if (event.code === "ArrowRight" || event.code === "KeyD") {
      if (!inputState.right) {
        inputState.rightPulse = true;
      }
      inputState.right = true;
      event.preventDefault();
    }

    if (event.code === "Space") {
      event.preventDefault();

      if (!inputState.space) {
        if (gameState.status === "game-over") {
          restartGame();
        } else if (gameState.status === "ready") {
          gameState.status = "charging";
          inputState.chargingSince = performance.now();
        }
      }

      inputState.space = true;
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
    if (control === "left") {
      if (!inputState.left) {
        inputState.leftPulse = true;
      }
      inputState.left = true;
    }

    if (control === "right") {
      if (!inputState.right) {
        inputState.rightPulse = true;
      }
      inputState.right = true;
    }

    if (control === "space") {
      if (gameState.status === "game-over") {
        restartGame();
      } else if (gameState.status === "ready") {
        gameState.status = "charging";
        inputState.chargingSince = performance.now();
      }

      inputState.space = true;
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
    if (gameState.status !== "playing" || !physics.ball) {
      inputState.leftPulse = false;
      inputState.rightPulse = false;
      return;
    }

    const ball = physics.ball;
    const leftContact = getFlipperContact(ball, physics.flippers.left, TABLE.flippers.left, false);
    const rightContact = getFlipperContact(ball, physics.flippers.right, TABLE.flippers.right, true);

    if (inputState.leftPulse && leftContact.isValid && ball.velocity.y > -12) {
      const tipFactor = leftContact.tipFactor;
      const lift = 11.6 + tipFactor * 11.2;
      const push = 3.1 + tipFactor * 5.1;

      MatterLib.Body.setVelocity(ball, {
        x: Math.max(ball.velocity.x + push, push),
        y: -lift
      });
    }

    if (inputState.rightPulse && rightContact.isValid && ball.velocity.y > -12) {
      const tipFactor = rightContact.tipFactor;
      const lift = 11.6 + tipFactor * 11.2;
      const push = 3.1 + tipFactor * 5.1;

      MatterLib.Body.setVelocity(ball, {
        x: Math.min(ball.velocity.x - push, -push),
        y: -lift
      });
    }

    inputState.leftPulse = false;
    inputState.rightPulse = false;
  }

  function getFlipperContact(ball, flipperBody, config, isRight) {
    const dx = ball.position.x - config.pivotX;
    const dy = ball.position.y - config.pivotY;
    const cos = Math.cos(flipperBody.angle);
    const sin = Math.sin(flipperBody.angle);
    const localX = dx * cos + dy * sin;
    const localY = -dx * sin + dy * cos;
    const tipFactor = localX / config.length;
    const playfieldSideDistance = isRight ? localY : -localY;
    const isValid =
      tipFactor > 0.08 &&
      tipFactor < 0.98 &&
      playfieldSideDistance > -8 &&
      playfieldSideDistance < 48 &&
      Math.abs(localY) < 52;

    return {
      isValid,
      tipFactor: Math.max(0, Math.min(1, tipFactor))
    };
  }

  window.addEventListener("keydown", handleKeyDown);
  window.addEventListener("keyup", handleKeyUp);
  wireHoldButton(ui.leftControl, "left");
  wireHoldButton(ui.rightControl, "right");
  wireHoldButton(ui.spaceControl, "space");
  ui.restartButton.addEventListener("click", restartGame);
  if (physics) {
    resetBall(physics.ball, true);
  }
  updateHud();
  updateControlsUi();
  syncInspectableState(physics);

  function stepPhysics() {
    if (physics) {
      updatePlungerPower();
      updateFlippers();
      holdBallInLaunchLane();
      MatterLib.Engine.update(physics.engine, physicsClock.step * physicsClock.simulationScale);
      maybeGuideShooterLaneExit();
      maybeCatchLostBall();
      maybeRescueLowerFlipperTrap();
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
      drawBall(physics.ball);
      drawStatusBadge();
      drawScoreFeedback();
      drawComboBadge();
      drawHitEffects();
      drawMissionLights();
    } else {
      fillRoundedRect(104, 100, 210, 44, 6, "rgba(120, 36, 28, 0.76)");
      drawLabel("MATTER.JS NOT LOADED", 209, 123, "#ff7567", 16);
    }

    window.requestAnimationFrame(update);
  }

  update();
})();
